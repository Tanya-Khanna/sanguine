import { CENTERS, BLOOD_TYPES, type BloodType } from "./blood";
import type { Pool, PoolClient } from "pg";

export interface SeedUnit {
  unit_no: number;
  blood_type: BloodType;
  centerIndex: number;
  expiresInHours: number; // relative to seed time; negative => already expired
  expired?: boolean;
}

// Deterministic inventory. The surge contests type A- (compatible donors O-/A-).
// The soonest-expiring compatible AVAILABLE unit is #1182 — every racing
// request FEFO-picks it first. The reroute cascade is #1190 -> #1205 -> #1206.
// No other O-/A- unit expires sooner than #1182, so the collision is stable.
const HERO_UNITS: SeedUnit[] = [
  { unit_no: 1182, blood_type: "O-", centerIndex: 0, expiresInHours: 6 }, // contested
  { unit_no: 1190, blood_type: "A-", centerIndex: 1, expiresInHours: 18 }, // reroute #1
  { unit_no: 1205, blood_type: "O-", centerIndex: 2, expiresInHours: 30 }, // reroute #2
  { unit_no: 1206, blood_type: "A-", centerIndex: 0, expiresInHours: 48 }, // reroute #3
  // Expired compatible unit: filtered by FEFO, marked expired, shown greyed.
  { unit_no: 1150, blood_type: "O-", centerIndex: 1, expiresInHours: -2, expired: true },
  // Near-expiry, NON-compatible with A- (B types) so they don't steal the
  // collision but still show red freshness bars + "near expiry" counter.
  { unit_no: 1301, blood_type: "B+", centerIndex: 2, expiresInHours: 3 },
  { unit_no: 1302, blood_type: "B-", centerIndex: 0, expiresInHours: 5 },
  { unit_no: 1303, blood_type: "AB+", centerIndex: 1, expiresInHours: 9 },
];

// Fill out a realistic mix to ~52 total units. Deterministic by index.
function buildBackground(start: number, count: number): SeedUnit[] {
  const out: SeedUnit[] = [];
  for (let i = 0; i < count; i++) {
    const t = BLOOD_TYPES[(i * 3 + 1) % BLOOD_TYPES.length];
    // Spread expiries from ~2 to ~22 days; a deterministic sprinkle nearer term.
    const days = 2 + ((i * 7) % 21);
    const jitterH = (i * 5) % 24;
    out.push({
      unit_no: start + i,
      blood_type: t,
      centerIndex: i % CENTERS.length,
      expiresInHours: days * 24 + jitterH,
    });
  }
  return out;
}

export const SEED_UNITS: SeedUnit[] = [
  ...HERO_UNITS,
  ...buildBackground(1400, 44),
];

type Queryable = Pool | PoolClient;

/**
 * Wipe and re-seed all tables to the deterministic initial state. Used by the
 * seed script and the /api/reset endpoint so every demo run starts identical.
 */
export async function applySeed(db: Queryable): Promise<{ units: number }> {
  // Order doesn't matter (no FKs in DSQL) — clear everything.
  for (const tbl of [
    "custody_events",
    "allocations",
    "naive_allocations",
    "requests",
    "blood_units",
  ]) {
    await db.query(`DELETE FROM ${tbl}`);
  }

  const now = Date.now();
  const values: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  for (const u of SEED_UNITS) {
    const center = CENTERS[u.centerIndex];
    const expiresAt = new Date(now + u.expiresInHours * 3600_000).toISOString();
    const status = u.expired ? "expired" : "available";
    values.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, 0, now())`,
    );
    params.push(u.unit_no, u.blood_type, status, center.id, center.name, expiresAt);
  }
  await db.query(
    `INSERT INTO blood_units
       (unit_no, blood_type, status, center_id, center_name, expires_at, version, updated_at)
     VALUES ${values.join(", ")}`,
    params,
  );

  // Custody record for pre-expired units so the ledger reflects reality.
  for (const u of SEED_UNITS.filter((x) => x.expired)) {
    await db.query(
      `INSERT INTO custody_events (unit_no, event_type, detail)
       VALUES ($1, 'expired', $2)`,
      [u.unit_no, JSON.stringify({ reason: "past shelf life at seed" })],
    );
  }

  return { units: SEED_UNITS.length };
}
