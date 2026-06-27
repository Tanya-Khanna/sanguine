---
title: "How I built a database that can never promise the same blood unit twice (Aurora DSQL + Vercel)"
published: false
tags: aws, database, webdev, hackathon
---

> *I built this project for the H0 Hackathon (Vercel v0 + AWS Databases). #H0Hackathon*

A hospital runs short on blood, a patient is waiting, and somewhere in the network the right unit exists — but it just got promised to a different hospital five seconds ago. Nobody did anything wrong. The system simply let the same physical bag be allocated twice.

That failure mode is the whole reason I built **Sanguine**: a blood-unit allocation engine where the *database itself* guarantees one unit goes to exactly one hospital, even when thousands of requests land at the same instant. Here's how I built it on **Amazon Aurora DSQL** and **Vercel** — and how I made the guarantee something you can actually watch happen.

## Why this is a database problem, not an app problem

First, the scale, because it surprised me. The US transfuses **more than 16 million units of blood a year** and needs **over 45,000 units a day** (American Hospital Association, 2026). In **January 2026**, the Red Cross declared a severe shortage after national supply **fell ~35% in a single month**. Blood is perishable and slow to ready — it can take **up to three days** to test and process.

But here's the part that reframed the problem for me: a leading, documented cause of *waste* is the **inability to reissue or redistribute units before they expire** — and even formal redistribution programs **lose a meaningful share of units to coordination failures** (Transfusion/Wiley, 2024). The units exist. Coordination loses them.

So the core requirement isn't a prettier dashboard. It's a **correctness guarantee under concurrency**: when many hospitals draw from one shared pool of scarce units, no unit may ever be allocated twice. That's a **distributed strong-consistency** problem — and it's exactly what Aurora DSQL is for.

## Why Aurora DSQL

I considered a NoSQL store and an eventually-consistent design, and rejected both. In this domain, "eventually consistent" means a patient's allocation silently failing. I needed:

- **Strong consistency** so two concurrent transactions can't both claim the last unit.
- **Distributed** scale, so correctness doesn't force a single-writer bottleneck.
- A **relational** model — units, requests, allocations, compatibility, expiry are inherently relational.
- **Serverless** ops, because I had three days, not three weeks.

Aurora DSQL gives all four. The database choice *is* the product.

One thing to know going in: DSQL is **always strongly consistent**, and it gets there with **optimistic concurrency control**, not locks. It has no sequences, no foreign keys, and **no `SELECT ... FOR UPDATE`**. At first that felt like a constraint to fight. It turned out to be the thing that made the demo land.

## The schema that makes double-allocation impossible

Before any clever logic, I let the storage layer enforce correctness. On DSQL the clean way to say "a unit appears at most once" is to make `unit_id` the **primary key** of the allocations table:

```sql
CREATE TABLE allocations (
  unit_id      uuid PRIMARY KEY,        -- the guarantee: a unit appears at most once
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'held',
  allocated_at timestamptz NOT NULL DEFAULT now()
);
```

That primary key means that even with a logic bug, a double-allocation **cannot be persisted**. Belt and suspenders. (A non-PK `UNIQUE` column would work too, but on DSQL that needs an asynchronous secondary index — making `unit_id` the PK is the native, synchronous choice.)

## The allocation transaction

```sql
BEGIN;  -- strong-consistency transaction
  -- FEFO: compatible, available, non-expired units — soonest expiry first.
  -- Note: no FOR UPDATE. DSQL has no pessimistic locks; we use OCC.
  SELECT id, unit_no, version FROM blood_units
   WHERE blood_type = ANY (compatible_types(:requested_type))
     AND status = 'available'
     AND expires_at > now()
   ORDER BY expires_at ASC, unit_no ASC
   LIMIT :units_needed;

  -- Optimistic claim — matches only if still available at our seen version
  UPDATE blood_units
     SET status = 'held', held_by_request = :req, version = version + 1
   WHERE id = :unit AND version = :seen_version AND status = 'available';

  INSERT INTO allocations (unit_id, request_id);
  INSERT INTO custody_events (unit_id, request_id, event_type);
COMMIT;
```

The magic is at `COMMIT`. Two transactions racing for the same unit both pass the `UPDATE` in their own snapshot — but DSQL detects the write-write conflict and lets exactly one commit. The other gets a serialization failure (`SQLSTATE 40001`).

Two design choices I'm proud of:

1. **First-Expiry-First-Out (FEFO).** The allocator always reaches for the soonest-to-expire compatible unit, which directly attacks the waste problem. That's query *design*, not CRUD.
2. **Reroute, don't fail.** When a transaction loses the OCC race, it doesn't error — the app retries, finds the contested unit already taken, FEFO picks the next one, and logs a `rerouted` event. The loser of a contention race still gets served.

## The twist: you can't make DSQL "naïve"

I wanted a "naïve vs. strong" toggle — flip a switch and watch the bad system double-allocate. The obvious approach is "strong = locks, naïve = no locks." But **DSQL is always strongly consistent.** If two transactions write the same row, one *will* fail at commit, no matter how sloppy the code.

So the real contrast isn't locks vs. no-locks. It's **whether you route contention through one authoritative, uniqueness-protected row.** My naïve path skips the shared `blood_units` row entirely and just records its own promise in a separate, *unconstrained* table:

```sql
-- naïve: no version check, never touches the authoritative row
INSERT INTO naive_allocations (unit_id, request_id) VALUES (:unit, :req);
```

Two concurrent naïve promises touch *disjoint* rows (different primary keys), so **both commit** — and the same unit is now promised to two hospitals. That's a sharper lesson than "you forgot a lock": consistency comes from *modeling the contended resource as one authoritative row*, which is exactly what DSQL makes safe.

## Making the invisible visible

A strong-consistency guarantee is worthless to a viewer if they can't *see* it. So I built two things.

**A live "Sanguine vs. legacy" toggle.** The app fires the *same* simulated surge at both engines. The legacy path double-promises a unit and a counter climbs; Sanguine on Aurora DSQL holds **double-promised units: 0**. To make the collision land every time, the surge uses a small barrier so every racing transaction reads the contested unit before any of them commits. Flip the switch, watch it break; flip back, watch it never happen.

**An append-only custody ledger.** Every state change — reserved, allocated, rerouted, released, expired — is an immutable event row. After the surge, you scroll a perfect chronological audit trail. Auditability isn't a feature bolted on; it's the same data model, read back.

## The agent on top

A clinician shouldn't fill out a form mid-trauma, so the front door is an intake agent: **Claude Haiku 4.5 on Amazon Bedrock** turns "*half a dozen units of the universal donor type, ASAP*" into `{blood_type: "O-", units: 6, hours: ~3}`, which the engine then allocates. A deterministic regex parser is the fallback, so the chat box works even if Bedrock is unavailable. The agent makes it usable; the database makes it trustworthy.

## Deploying on Vercel

The frontend is a Next.js App Router app on Vercel, with the API routes as serverless functions talking to Aurora DSQL via short-lived IAM auth tokens (`@aws-sdk/dsql-signer`). For the live "units flipping state in real time" view, I skipped WebSockets and simply **poll a `/api/state` aggregate endpoint every second** — visually identical, a fraction of the work. Provisioning DSQL was genuinely fast because it's serverless: no VPC wrangling, no cluster to babysit.

## What I learned

- **Pick the database for the guarantee you need.** Strong consistency wasn't a nice-to-have here; it was the entire value proposition. Choosing Aurora DSQL *because* the problem demands it made every downstream decision simpler.
- **Show the guarantee, don't assert it.** The toggle taught me that the most convincing thing you can do with a correctness property is let people watch the wrong approach fail next to the right one.
- **Work with the database's grain.** DSQL has no `FOR UPDATE` — and embracing its optimistic concurrency produced a *better* story than pessimistic locking would have.

## What's next

The same engine generalizes to any scarce, perishable, must-not-double-allocate inventory: transplant organ offers, vaccine doses, clinical-trial slots, reagents. Blood is the beachhead; the allocation guarantee is the platform.

---

*Built for the H0 Hackathon with Amazon Aurora DSQL and Vercel. #H0Hackathon*

*Stats cited from the American Hospital Association (2026), the American Red Cross (2026), and Transfusion/Wiley (2024) — please verify against the originals before sharing widely.*
