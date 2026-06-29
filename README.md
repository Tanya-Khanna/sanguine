# Sanguine — the allocation layer that never promises the same blood unit twice

> A multi-tenant network platform for blood centers and hospitals, built on **Amazon Aurora DSQL** and deployed on **Vercel**. The database itself guarantees that one physical unit is allocated to exactly one hospital — even when thousands of requests arrive at the same instant.

Built for the **H0 Hackathon** (Vercel/v0 + AWS Databases) · Track 2 — Monetizable B2B App.

---

## The problem (and its scale)

Blood shortages are rarely a pure donation problem — they're a **coordination** problem. The right units often exist somewhere in the network, but getting them to the right hospital before they expire is hard, and the same physical unit can be promised to two hospitals at once.

- The US transfuses **more than 16 million units annually**, and needs **more than 45,000 units every day**. *(American Hospital Association, 2026)*
- In **January 2026**, the Red Cross declared a **severe shortage after supply fell ~35% in a month**. *(American Red Cross, 2026)*
- Blood is perishable and slow to ready — it can take **up to 3 days** to test and process, so shelf inventory is what saves lives in an emergency. *(AHA, 2026)*
- A leading, documented cause of waste is the **inability to reissue/redistribute units before they expire**; even formal redistribution programs **lose a meaningful share of units to coordination failures**. *(Transfusion / Wiley, 2024)*

**Sanguine targets exactly that coordination gap:** never double-promise a unit, always allocate the soonest-to-expire compatible unit first, and keep an auditable trail of every decision.

## Why Aurora DSQL (the deliberate database choice)

The core requirement is a **correctness guarantee under concurrency**: when N hospitals request from a shared pool of scarce units, no unit may be allocated twice — ever, even under a write storm. That is a **distributed strong-consistency** problem, and it is the reason we chose **Aurora DSQL** rather than a NoSQL store or an eventually-consistent design.

| Requirement | Why it points to Aurora DSQL |
|---|---|
| No double-allocation under contention | DSQL is **strongly consistent** and uses **optimistic concurrency control**; two concurrent transactions that touch the same row cannot both commit. |
| Correctness without a single bottleneck | DSQL is **distributed** — strong consistency without giving up horizontal scale, which a single-writer Postgres instance would force. |
| A relational allocation model (units ↔ requests ↔ allocations, compatibility, expiry) | The domain is inherently relational; SQL expresses FEFO ordering, ABO/Rh compatibility, and the join that proves no double-promise. |
| Serverless operations on a 3-day timeline | DSQL is **serverless** — no cluster/VPC babysitting, fast to provision, scales to zero. |

We deliberately did **not** use an eventually-consistent design: in this domain, "eventually" means a patient's allocation silently failing. Strong consistency is the product, not an optimization.

> **What DSQL is *not*:** it has no sequences, no foreign keys, and **no `SELECT ... FOR UPDATE`** (no pessimistic row locks). Instead of fighting that, Sanguine leans into DSQL's optimistic concurrency — which, as it turns out, makes the demo sharper (see below).

## The safety net: the database physically cannot double-allocate

Beyond transactional logic, the schema enforces correctness at the storage layer. On DSQL the clean, native way to do this is to make `unit_id` the **primary key** of the allocations table (a separate `UNIQUE` constraint would require an asynchronous secondary index):

```sql
-- One row per active allocation; unit_id is the PRIMARY KEY,
-- so a unit can appear at most once. This is the safety net.
CREATE TABLE allocations (
  unit_id      uuid PRIMARY KEY,        -- ← the guarantee: no unit allocated twice
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'held',
  allocated_at timestamptz NOT NULL DEFAULT now()
);
```

Even if application logic had a bug, that primary key makes a double-allocation **impossible to persist**. The transaction and the constraint are belt-and-suspenders.

## The allocation transaction (the heart of the system)

```sql
BEGIN;  -- Aurora DSQL strong-consistency transaction
  -- FEFO: compatible, available, non-expired units, soonest expiry first.
  -- No FOR UPDATE — DSQL has no pessimistic locks; we use OCC instead.
  SELECT id, unit_no, version FROM blood_units
   WHERE blood_type = ANY (compatible_types(:requested_type))
     AND status = 'available'
     AND expires_at > now()
   ORDER BY expires_at ASC, unit_no ASC
   LIMIT :units_needed;

  -- Optimistic claim on the authoritative row: only matches if still 'available'
  -- at our seen version. Two racers both pass here in their own snapshot...
  UPDATE blood_units
     SET status = 'held', held_by_request = :req,
         held_until = now() + interval '90 seconds', version = version + 1
   WHERE id = :unit AND version = :seen_version AND status = 'available';

  INSERT INTO allocations (unit_id, request_id, status) VALUES (:unit, :req, 'held');
  INSERT INTO custody_events (unit_id, request_id, event_type) VALUES (:unit, :req, 'held');
COMMIT;
-- ...but only one COMMIT wins. The other hits an OCC conflict (SQLSTATE 40001);
-- the app retries, the contested unit is now taken, FEFO picks the next one, and a
-- 'rerouted' custody event is written. The loser of the race still gets served.
```

Deliberate engineering decisions a reviewer can verify in the code:

- **FEFO (first-expiry-first-out):** allocate soonest-to-expire compatible units first, reducing waste — query design, not just CRUD.
- **Optimistic concurrency:** a `version` token plus DSQL's commit-time conflict detection makes the losing transaction detectable; it **reroutes** to the next unit and emits a `rerouted` custody event instead of failing.
- **ABO/Rh compatibility:** `compatible_types()` encodes the real domain rule (O− is universal donor; AB+ universal recipient).
- **Hold TTL:** an unconfirmed hold lapses (`held_until`) and auto-releases the unit back to the pool — the lifecycle state machine in action.
- **Append-only custody log:** every state change is an immutable event row — auditable and replayable, which matters for clinical compliance.

## Proving the database choice matters: naïve vs. strong

The app ships **two** allocation paths and a UI toggle (**Sanguine (Aurora DSQL)** vs. **Legacy system**):

- `/api/allocate` — the strong-consistency transaction above. It routes every claim through the authoritative `blood_units` row + the `allocations.unit_id` primary key. Under a simulated surge, **double-promises stay at 0**.
- `/api/allocate-naive` — the deliberately-wrong path. Because DSQL can't be made "inconsistent" just by removing locks, the naïve path instead **sidesteps the authoritative row entirely** and records its own promise in a separate, *unconstrained* `naive_allocations` table. Two concurrent promises touch disjoint rows, so **both commit** — and the same unit is promised twice.

This makes an invisible guarantee visible: flip to the legacy engine and watch a unit get promised to two hospitals; flip back and watch it never happen. The real lesson is sharper than "you forgot a lock" — **consistency comes from modeling the contended resource as one authoritative, uniqueness-protected row**, which is exactly what Aurora DSQL makes safe.

## Unit lifecycle (the data model as a state machine)

```
available → held → allocated → confirmed
   ↑          │
   └── hold TTL lapses / released ──┘
available → expired   (expires_at passes; refused by allocator, shown greyed)
```

See [`public/architecture.svg`](public/architecture.svg) for the full diagram (lifecycle + transaction boundary).

## Architecture

```
Browser (Vercel · Next.js)
  /        → product landing page (problem, workflow, buyers)
  /console → live allocation console (guided demo + surge)
        ├─ Request blood (plain English)   ← Bedrock Intake Agent front door
        ├─ Live blood inventory (unit tiles) ← a live render of the blood_units table
        ├─ Counter strip (double-promised units: 0)
        └─ Activity log (append-only event feed)
              │  poll /api/state every ~1s
  /network → regional supply overview (network-wide analytics + center discovery)
  /access  → facility onboarding / request access
              ▼
Next.js API routes (serverless on Vercel)
  ├─ /api/intake     → Amazon Bedrock (Claude Haiku 4.5) parse → /api/allocate
  ├─ /api/allocate   → strong-consistency transaction   ← THE SPINE
  ├─ /api/allocate-naive → deliberately-wrong path (for the toggle)
  ├─ /api/surge      → seeded, barrier-synced concurrent load generator
  ├─ /api/discover   → ranks centers by compatible stock + ETA (DSQL query)
  ├─ /api/analytics  → network-wide inventory aggregation
  ├─ /api/confirm · /api/reset · /api/sweep
  └─ /api/state · /api/ledger
              ▼
Amazon Aurora DSQL  (strong consistency — THE GUARANTEE)
```

Read top-to-bottom: **agents make it usable, the engine makes it correct, the database guarantees it.**

## Features

| Feature | What it shows |
|---|---|
| **Live blood inventory** | ~52 unit tiles across 3 centers; status color + freshness bar; tiles flip in real time. The UI *is* the table. |
| **Counter strip** | `Units reserved`, **`Double-promised units` (green at 0, red if >0)**, `Fill rate %`, `Expiring soon`. |
| **Simulate a demand surge** | Fires N concurrent requests through a barrier so they deterministically collide on the same unit. |
| **Sanguine / Legacy toggle** | Same surge, two engines: Sanguine holds at 0, legacy double-promises a unit (tile shows `DOUBLE-PROMISED ×2`). |
| **Conflict → reroute** | The losing transaction retries onto the next FEFO unit; a toast + `rerouted` event put contention in lights. |
| **FEFO + expiry** | Allocator prefers soonest-to-expire compatible units; expired units are refused and greyed. |
| **Hold TTL** | Unconfirmed holds auto-release to the pool (`released` event) — watch a tile go amber → green. |
| **Activity log** | Append-only, never updated/deleted — every decision auditable and replayable. |
| **Intake Agent** | Plain-English requests parsed by **Claude Haiku 4.5 on Amazon Bedrock**, validated, then fed to the engine (deterministic regex fallback if Bedrock is off). |
| **Emergency vs Standard tiers** | Requests carry a priority: emergency draws only pre-tested, available-now stock with a tight SLA window; standard can wait for restock. |
| **Center discovery & ranking** | `/api/discover` ranks every center by compatible available stock + ETA — the "which center can fill this?" decision, as a DSQL query. |
| **Regional network overview** | `/network` aggregates the whole network: inventory by blood type, per-center utilization, expiry/waste risk, and **double-promises prevented**. |
| **Guided demo** | The console narrates itself — a first-time viewer runs the surge and sees, in plain English, one reservation confirmed and the other rerouted. |

## Components used

- **Amazon Aurora DSQL** — primary database; strong-consistency allocation. *(The AWS database for this submission.)*
- **Vercel** — Next.js App Router frontend + serverless API routes.
- **Amazon Bedrock** — Claude Haiku 4.5 natural-language intake agent.
- **v0 / Next.js** — UI for the landing page and operations console.

## The B2B story (Impact)

Sanguine is a **multi-tenant network platform** blood centers and hospital systems subscribe to — the shared allocation layer that guarantees no unit is promised twice across the whole network.

- **Who pays:** hospital networks and blood banks — per-facility SaaS + per-allocation transaction fee.
- **Why:** every wrongly-failed allocation is wasted blood, missed SLAs, and patient risk. Sanguine recovers that and gives auditable compliance proof.
- **Why it's defensible:** network effects (more centers + hospitals = better fill rates) plus a strong-consistency guarantee naïve stacks can't make.

**Why it generalizes (impact beyond blood):** the same engine applies to any scarce, perishable, must-not-double-allocate inventory — transplant organ offers, vaccine doses, clinical-trial slots, reagents. Blood is the beachhead; the allocation guarantee is the platform.

## Run it locally

```bash
npm install

# 1. Provision an Aurora DSQL cluster (us-east-1) and put its config in .env.local:
#    DSQL_ENDPOINT=<cluster>.dsql.us-east-1.on.aws
#    DSQL_DATABASE=postgres   DSQL_USER=admin   AWS_REGION=us-east-1
#    BEDROCK_ENABLED=1        BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
#    (AWS credentials come from the standard AWS credential chain.)

npm run db:migrate   # create tables on DSQL
npm run db:seed      # deterministic inventory (~52 units, 3 centers)
npm run dev          # http://localhost:3000
```

Routes: **`/`** product landing page · **`/console`** live allocation console · **`/network`** regional supply overview · **`/access`** facility onboarding. In the console: follow the **guided demo**, or hit **Simulate a demand surge** (Sanguine engine) → watch the reroute and `Double-promised units: 0`. Flip to **Legacy system** → re-run → watch it climb. **Reset** between runs.

## Deploy

Deploy on Vercel as a standard Next.js app. The serverless functions need AWS credentials at runtime to mint Aurora DSQL auth tokens and call Bedrock, so set `DSQL_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and the `BEDROCK_*` variables in the Vercel project settings (a scoped IAM user with `dsql:DbConnectAdmin` + `bedrock:InvokeModel` is sufficient). Run `npm run db:migrate && npm run db:seed` once against the cluster.

## Submission

- **Track:** Monetizable B2B App
- **AWS database:** Amazon Aurora DSQL — chosen for its *strong-consistency guarantee under concurrency*, the exact property this product sells.
- **Live app:** https://sanguine-eight.vercel.app
- **Vercel Team ID:** `team_A6UdbR4yNuNesNOluGNjyBPp`
- **Demo video:** _<YouTube URL>_

---

*"Sanguine makes sure no patient loses their blood because the same unit was promised to someone else — proven live on Aurora DSQL, where the database itself guarantees it can't happen twice."*

*Sources: American Hospital Association (2026); American Red Cross (2026); Transfusion/Wiley (2024). Figures are cited for context — verify against the linked originals before publication.*
