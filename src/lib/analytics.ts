import { getPool } from "./db";
import { BLOOD_TYPES, CENTERS } from "./blood";

const NEAR_EXPIRY_HOURS = 24;

export interface NetworkAnalytics {
  totals: {
    units: number;
    available: number;
    reserved: number;
    expired: number;
    nearExpiry: number;
    doublePromisesPrevented: number;
    fillRate: number;
  };
  byType: { type: string; available: number }[];
  byCenter: {
    centerId: string;
    centerName: string;
    available: number;
    reserved: number;
    nearExpiry: number;
    total: number;
  }[];
}

interface UnitRow {
  id: string;
  blood_type: string;
  center_id: string;
  status: string;
  expires_at: Date;
}

/**
 * Network-wide inventory analytics — pure DSQL aggregation. Reservations are
 * counted from both engines (allocations ∪ naive_allocations). "Double-promises
 * prevented" = the number of times the strong path detected a collision and
 * rerouted instead of double-booking.
 */
export async function getAnalytics(): Promise<NetworkAnalytics> {
  const pool = getPool();
  const now = Date.now();

  const [unitsRes, reservedRes, reroutesRes, reqRes, claimRes] = await Promise.all([
    pool.query<UnitRow>(`SELECT id, blood_type, center_id, status, expires_at FROM blood_units`),
    pool.query<{ unit_id: string }>(
      `SELECT unit_id FROM allocations UNION SELECT unit_id FROM naive_allocations`,
    ),
    pool.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM custody_events WHERE event_type = 'rerouted'`,
    ),
    pool.query<{ requested: number | null }>(`SELECT sum(units_needed)::int AS requested FROM requests`),
    pool.query<{ claimed: string | null }>(
      `SELECT (SELECT count(*) FROM allocations) + (SELECT count(*) FROM naive_allocations) AS claimed`,
    ),
  ]);

  const reserved = new Set(reservedRes.rows.map((r) => r.unit_id));

  const typeAvail = new Map<string, number>(BLOOD_TYPES.map((t) => [t, 0]));
  type CenterAgg = {
    centerId: string;
    centerName: string;
    available: number;
    reserved: number;
    nearExpiry: number;
    total: number;
  };
  const centerAgg = new Map<string, CenterAgg>(
    CENTERS.map((c) => [
      c.id,
      { centerId: c.id, centerName: c.name, available: 0, reserved: 0, nearExpiry: 0, total: 0 },
    ]),
  );

  let available = 0;
  let reservedCount = 0;
  let expired = 0;
  let nearExpiry = 0;

  for (const u of unitsRes.rows) {
    const expMs = new Date(u.expires_at).getTime();
    const isExpired = u.status === "expired" || expMs <= now;
    const isReserved = reserved.has(u.id);
    const center = centerAgg.get(u.center_id);
    if (center) center.total += 1;

    if (isExpired) {
      expired += 1;
    } else if (isReserved) {
      reservedCount += 1;
      if (center) center.reserved += 1;
    } else {
      available += 1;
      typeAvail.set(u.blood_type, (typeAvail.get(u.blood_type) ?? 0) + 1);
      if (center) center.available += 1;
      if (expMs - now <= NEAR_EXPIRY_HOURS * 3600_000) {
        nearExpiry += 1;
        if (center) center.nearExpiry += 1;
      }
    }
  }

  const requested = Number(reqRes.rows[0]?.requested ?? 0);
  const claimed = Number(claimRes.rows[0]?.claimed ?? 0);
  const fillRate = requested > 0 ? Math.min(100, Math.round((claimed / requested) * 100)) : 100;

  return {
    totals: {
      units: unitsRes.rows.length,
      available,
      reserved: reservedCount,
      expired,
      nearExpiry,
      doublePromisesPrevented: reroutesRes.rows[0]?.c ?? 0,
      fillRate,
    },
    byType: BLOOD_TYPES.map((t) => ({ type: t, available: typeAvail.get(t) ?? 0 })),
    byCenter: [...centerAgg.values()],
  };
}
