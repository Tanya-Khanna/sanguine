# How I built a database that can never promise the same blood unit twice (Aurora DSQL + Vercel)

*Written for the H0 Hackathon. #H0Hackathon*

Hospitals don't usually run short of blood because the blood isn't there. They run short because the **same unit got promised to two places at once**. When a mass-casualty event hits and a dozen requests land in the same second, a naïve inventory system happily tells two hospitals "unit #1182 is yours." One of those transfusions silently evaporates.

That's not a logistics problem. It's a **strong-consistency problem** wearing a logistics costume. So I built **Sanguine**: an allocation engine where the *database itself* guarantees a unit can never be double-promised — and a UI that makes you watch it happen live.

## Why this is a strong-consistency problem

The dangerous moment is concurrency: N requests, one scarce unit, no global referee. You can paper over it with application locks, queues, or a single-writer service — but those are exactly the things that buckle under a surge, and they don't *prove* anything to a skeptical hospital network.

What you actually want is a database that, when two transactions try to claim the same row at the same time, lets **exactly one** win and makes the other provably fail. That's **Amazon Aurora DSQL**: distributed, serverless, and *always strongly consistent*, using **optimistic concurrency control**. Conflicting concurrent writes are detected at `COMMIT` and rejected with serialization failure `40001`.

## The allocation transaction

The core is one transaction. For a request of N units of a blood type, pick compatible, available, non-expired units soonest-to-expire first (FEFO), and claim them with a version-checked conditional update:

```sql
BEGIN;  -- Aurora DSQL strong-consistency transaction

-- FEFO candidates
SELECT id, version FROM blood_units
 WHERE blood_type = ANY($compatible)
   AND status = 'available'
   AND expires_at > now()
 ORDER BY expires_at ASC, unit_no ASC
 LIMIT $units_needed;

-- conditional claim on the authoritative row
UPDATE blood_units
   SET status = 'held', held_until = now() + interval '90 seconds',
       version = version + 1
 WHERE id = $unit AND version = $seen_version AND status = 'available';

-- the safety net: unit_id is the PRIMARY KEY of allocations
INSERT INTO allocations (unit_id, request_id, status) VALUES ($unit, $req, 'held');
INSERT INTO custody_events (unit_id, request_id, event_type) VALUES ($unit, $req, 'held');
COMMIT;
```

Two things conspire to make a double-promise impossible:

1. **The version check + DSQL's OCC.** Every claim goes through the *same authoritative `blood_units` row*. If two transactions both try to claim unit #1182, their write sets collide; DSQL commits one and fails the other with `40001`.
2. **The `PRIMARY KEY` on `allocations.unit_id`.** Even if application logic ever slipped, the database physically cannot store the same unit allocated twice.

When a transaction loses the OCC race, the app retries. On retry, #1182 is no longer `available`, so FEFO naturally picks the next compatible unit (#1190) and writes a `rerouted` custody event. The losing hospital still gets blood — just a different bag. **No patient loses out, and the counter never moves off zero.**

## The twist: you can't make DSQL "naïve"

Here's the subtle part that actually made the demo *better*. I wanted a "naïve vs. strong" toggle — flip a switch and watch the bad system double-allocate. The obvious approach is "strong = locks, naïve = no locks." But **DSQL is always strongly consistent.** You can't remove the safety by removing locks; if two transactions write the same row, one *will* fail no matter how sloppy your code is.

So the real contrast isn't locks vs. no-locks. It's **whether you route contention through a single authoritative, uniqueness-protected row.** The naïve path skips the shared `blood_units` row entirely and just records its own promise in a separate, unconstrained table:

```sql
-- naïve: no version check, never touches the authoritative row
INSERT INTO naive_allocations (unit_id, request_id) VALUES ($unit, $req);
```

Two concurrent naïve promises touch *disjoint* rows (different primary keys), so **both commit** — and the same unit is now promised to two hospitals. That's a sharper lesson than "you forgot a lock": it shows that consistency comes from *modeling the contended resource as one authoritative row*, which is exactly what DSQL makes safe.

## Putting contention in lights

The database is the hero, so the UI is a live window onto it. A dashboard (Next.js on Vercel) renders ~52 unit tiles, polls `/api/state` every second, and shows four counters — the important one being **Double-Allocations**, big and green at `0`.

To make the collision deterministic on camera, the "Simulate Surge" endpoint fires N concurrent requests through a **barrier**: each transaction reads the contested unit, then waits until *all* of them have read it before any commits. Guaranteed collision, every run.

- **Strong mode:** surge → tiles flip, one hospital gets #1182, the other's toast reads *"Unit #1182 contested → rerouted to #1190."* Double-Allocations: **0**.
- **Naïve mode:** same surge → tile #1182 turns red and reads `DOUBLE-CLAIMED ×2`, both hospitals show `allocated #1182` in the ledger, and the counter climbs.

Every state change appends to a `custody_events` ledger that's never updated or deleted — so after the surge you can scroll back and replay exactly who got what, and why. That's the compliance story B2B buyers actually pay for.

## The agent on top

A clinician shouldn't fill out a form mid-trauma. So the front door is an **Intake Agent**: **Claude Haiku 4.5 on Amazon Bedrock** turns "*half a dozen units of the universal donor type, ASAP*" into `{blood_type: "O-", units: 6, hours: ~3}`, which the engine then allocates. A deterministic regex parser is the fallback, so the chat box works even if Bedrock is unavailable. The agent makes it *usable*; the database makes it *trustworthy*.

## Deploying

The app is a stock Next.js App Router project on Vercel. The only wrinkle is that the serverless functions need AWS credentials at runtime to mint short-lived DSQL auth tokens (via `@aws-sdk/dsql-signer`) and to call Bedrock — so those go in Vercel's environment variables. Schema migration and the deterministic seed run once from your machine against the cluster.

## Takeaway

If your product's core promise is "this can't happen twice," don't bury that guarantee in application code where you have to *argue* it's correct. Put it in a database that *enforces* it, and build a UI that lets people watch it hold under fire. With Aurora DSQL, the strongest sentence in the pitch — *"the database itself guarantees it can't happen twice"* — is literally true.

*Built with Aurora DSQL, Next.js, Vercel, and Amazon Bedrock.*
