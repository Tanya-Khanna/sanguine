# Sanguine

**The allocation engine that guarantees the same blood unit is never promised to two hospitals at once — even under a stampede of simultaneous requests.**

Built for the **H0 Hackathon** (Vercel/v0 + AWS Databases) · Track 2 — Monetizable B2B App
Database: **Amazon Aurora DSQL** (strong-consistency distributed SQL) · Front end: **Next.js on Vercel**

---

## The problem

Hospitals run short of blood not for lack of supply, but because the **same unit gets promised to two places at once**. When demand surges, naïve inventory systems let two requests both "win" the same bag — one patient's transfusion silently evaporates. This is a **strong-consistency problem** wearing a logistics costume.

Sanguine is the shared allocation layer that sits *between* blood centers and hospital networks and makes that double-promise **physically impossible** — then proves it live, on camera, under contention.

## What makes the database the hero

Aurora DSQL is **always strongly consistent** and uses **optimistic concurrency control (OCC)**: conflicting concurrent writes are detected at `COMMIT` and rejected (SQLSTATE `40001`). Sanguine leans into that instead of fighting it:

- **Strong path** (`/api/allocate`) routes *every* claim through the authoritative `blood_units` row (a version-checked conditional `UPDATE`) **and** a `PRIMARY KEY` on `allocations.unit_id`. Two hospitals racing for unit #1182 collide at commit → the loser retries → FEFO reroutes it onto the next compatible unit (#1190) → a `rerouted` custody event fires. **Double-allocations: 0, always.**
- **Naïve path** (`/api/allocate-naive`) deliberately sidesteps the authoritative row — it just records its own promise in an unconstrained table. Two concurrent promises touch disjoint rows, so **both commit** and the same unit is promised twice. This is the contrast the toggle exposes; the bug is the demonstration.

> Because DSQL can't be made "inconsistent" by removing locks, the naïve-vs-strong demo isn't *locks vs. no locks* — it's *routing contention through one authoritative, uniqueness-protected row* vs. *not*. That's a sharper illustration of why the database choice matters.

## Features

| Feature | What it shows |
|---|---|
| **Bag-state canvas** | ~52 live unit tiles across 3 centers; status color + freshness bar; tiles flip in real time. The UI *is* the table. |
| **Counter strip** | `Units Allocated`, **`Double-Allocations` (green at 0, red if >0)**, `Fill Rate %`, `Near Expiry`. |
| **Simulate Surge** | Fires N concurrent requests through a barrier so they deterministically collide on the same unit. |
| **Strong / Naïve toggle** | Same surge, two engines: strong holds at 0, naïve double-promises a unit (tile shows `DOUBLE-CLAIMED ×2`). |
| **Conflict → reroute** | The losing transaction retries onto the next FEFO unit; a toast + `rerouted` ledger event put contention in lights. |
| **FEFO + expiry** | Allocator prefers soonest-to-expire compatible units; expired units are refused and greyed. |
| **Hold TTL** | Unconfirmed holds auto-release to the pool (`released` custody event) — watch a tile go amber → green. |
| **Custody ledger** | Append-only, never updated/deleted — every decision auditable and replayable. |
| **Intake Agent** | Plain-English requests ("half a dozen units of the universal donor type") parsed by **Claude Haiku 4.5 on Amazon Bedrock**, validated, then fed to the engine (deterministic regex fallback if Bedrock is off). |

## Architecture

See [`public/architecture.svg`](public/architecture.svg). Top to bottom: **agents make it usable → the engine makes it correct → Aurora DSQL guarantees it.**

```
Browser (Vercel) ── Next.js App Router + dashboard (polls /api/state ~1s)
   │
   ├─ Intake Agent  ── Claude Haiku 4.5 on Amazon Bedrock (NL → structured order)
   │
   └─ API routes (Node serverless)
        ├─ POST /api/allocate        ← the strong-consistency transaction (the spine)
        ├─ POST /api/allocate-naive  ← the deliberately-wrong path
        ├─ POST /api/surge           ← seeded, barrier-synced load generator
        ├─ POST /api/intake          ← Bedrock parse → /api/allocate
        ├─ POST /api/confirm /reset /sweep
        └─ GET  /api/state  /api/ledger
   │
   └─ Amazon Aurora DSQL  (strong consistency — THE HERO)
```

## Data model

- **`blood_units`** — one row per physical bag; `version` (OCC token), `status`, `expires_at`, `held_until`.
- **`requests`** — a hospital's ask.
- **`allocations`** — `unit_id` is the **PRIMARY KEY**: the DB physically cannot record a unit allocated twice (the safety net).
- **`naive_allocations`** — deliberately unconstrained, to demonstrate what happens *without* that protection.
- **`custody_events`** — append-only audit ledger.

DSQL adaptations baked in: no sequences (`uuid` defaults), no foreign keys (app-level integrity), no `SELECT ... FOR UPDATE` (optimistic `version` checks + commit-time OCC).

## The B2B story (Impact)

Sanguine is a **multi-tenant network platform** blood centers and hospital systems subscribe to — the shared allocation layer that guarantees no unit is promised twice across the whole network.

- **Who pays:** hospital networks and blood banks — per-facility SaaS + per-allocation transaction fee.
- **Why:** every wrongly-failed allocation is wasted blood, missed SLAs, and patient risk. Sanguine recovers that and gives auditable compliance proof.
- **Why it's defensible:** network effects (more centers + hospitals = better fill rates) plus a strong-consistency guarantee naïve stacks can't make.

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

Routes: **`/`** is the product landing page; **`/console`** is the live allocation
console. In the console: **Simulate a demand surge** (Sanguine engine) → watch the
reroute and `Double-promised units: 0`. Flip to **Legacy system** → re-run → watch
it climb. **Reset** between runs.

## Deploy

See [`DEPLOY.md`](DEPLOY.md) for the Vercel + IAM setup (the serverless functions need AWS credentials to mint DSQL auth tokens and call Bedrock).

## Submission

- **Track:** Monetizable B2B App
- **AWS database:** Amazon Aurora DSQL — chosen for its *strong-consistency guarantee under concurrency*, the exact property this product sells.
- **Live app:** _<Vercel URL — see DEPLOY.md>_
- **Vercel Team ID:** _<fill in>_
- **Demo video:** _<YouTube URL>_

---

*"Sanguine makes sure no patient loses their blood because the same unit was promised to someone else — proven live on Aurora DSQL, where the database itself guarantees it can't happen twice."*
