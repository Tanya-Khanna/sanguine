# Demo video shot list (< 3 minutes)

Real screen recording of the live app, narrated. No slides-only, no copyrighted
music/logos. Pre-step: open `/console`, click **Reset**, set engine to **Sanguine (Aurora DSQL)**.

## 0:00–0:20 — Landing page (the product)
- Open `/` (the landing page). Let the hero land: *"Never promise the same blood unit twice."*
- Say: *"Sanguine is the allocation network for blood centers and hospitals — built on Amazon Aurora DSQL."*
- Click **Open live console →**.

## 0:20–0:40 — Problem + agent front door
- On screen: the console, Double-promised units at **0** (green).
- Say: *"Hospitals run short not for lack of blood, but because the same unit gets promised to two places at once."*
- Type into the request box: `we need 4 units of A negative within 72 hours` → Send.
- Say: *"A clinician just talks to it — an AI agent on Amazon Bedrock parses it. Underneath is Aurora DSQL."*

## 0:25–1:30 — The money-shot (strong)
- Click **Reset demo** (clean slate), keep **Strong**.
- Click **⚡ Simulate Surge**.
- Say: *"Two hospitals want the same unit, #1182, at the same instant."*
- Point to the toast: *"One wins — the other instantly reroutes to #1190."*
- Zoom the **Double-Allocations: 0** counter. Hold on it.
- Scroll the ledger: point to `held #1182`, `rerouted #1190`.

## 1:30–2:10 — The contrast (naïve)
- Click **Reset demo**. Flip toggle to **Naïve**.
- Click **⚡ Simulate Surge**.
- Say: *"Same surge — but this path skips the database's authoritative claim."*
- Point to tile #1182 now red, `DOUBLE-CLAIMED ×2`, and the counter at **1** (red).
- Flip back to **Strong**, reset, surge again → **0**. *"That's the database choice, made visible."*

## 2:10–2:40 — Depth
- Point to a near-expiry tile's red freshness bar and the greyed **expired** unit:
  *"FEFO prefers soonest-to-expire; expired units are refused — less waste."*
- Scroll the **Custody Ledger**: *"Append-only. Every decision auditable and replayable."*

## 2:40–3:00 — Close (B2B / monetization)
- Say: *"Sanguine is the network layer blood centers and hospitals subscribe to — agents make it usable, the database makes it trustworthy. Shippable on AWS today."*
- End on **Double-Allocations: 0**.

Rehearse the Reset → Surge rhythm so the collision lands every time.
