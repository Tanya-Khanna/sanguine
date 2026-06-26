import { getPool } from "./db";

export interface UnitView {
  unitNo: number;
  bloodType: string;
  status: "available" | "held" | "allocated" | "in_transit" | "expired" | "double";
  centerName: string;
  expiresAt: string;
  nearExpiry: boolean;
  claimants: number;
}

export interface Counters {
  allocated: number;
  doubleAllocations: number;
  fillRate: number; // percent
  nearExpiry: number;
  totalUnits: number;
  available: number;
}

export interface StateView {
  units: UnitView[];
  counters: Counters;
  serverTime: string;
}

const NEAR_EXPIRY_HOURS = 24;

interface UnitRow {
  unit_no: number;
  blood_type: string;
  status: string;
  center_name: string;
  expires_at: Date;
  strong_count: number;
  strong_status: string | null;
  naive_claimants: number;
}

export async function getState(): Promise<StateView> {
  const pool = getPool();
  const now = Date.now();

  const { rows } = await pool.query<UnitRow>(`
    SELECT
      bu.unit_no, bu.blood_type, bu.status, bu.center_name, bu.expires_at,
      (SELECT count(*)::int FROM allocations a WHERE a.unit_id = bu.id) AS strong_count,
      (SELECT a.status FROM allocations a WHERE a.unit_id = bu.id LIMIT 1) AS strong_status,
      (SELECT count(DISTINCT na.request_id)::int FROM naive_allocations na WHERE na.unit_id = bu.id) AS naive_claimants
    FROM blood_units bu
    ORDER BY bu.unit_no`);

  let allocated = 0;
  let doubleAllocations = 0;
  let nearExpiry = 0;
  let available = 0;

  const units: UnitView[] = rows.map((r) => {
    const expMs = new Date(r.expires_at).getTime();
    const expired = r.status === "expired" || expMs <= now;
    const claimants = (r.strong_count ?? 0) + (r.naive_claimants ?? 0);
    const isNearExpiry = !expired && expMs - now <= NEAR_EXPIRY_HOURS * 3600_000;

    let status: UnitView["status"];
    if (expired) {
      status = "expired";
    } else if (claimants >= 2) {
      status = "double";
    } else if (claimants === 1) {
      status =
        r.strong_count === 1
          ? r.strong_status === "held"
            ? "held"
            : "allocated"
          : "allocated";
    } else if (r.status === "held" || r.status === "allocated" || r.status === "in_transit") {
      status = r.status as UnitView["status"];
    } else {
      status = "available";
    }

    if (status === "double") doubleAllocations += 1;
    if (status === "double" || status === "held" || status === "allocated" || status === "in_transit")
      allocated += 1;
    if (status === "available") available += 1;
    if (isNearExpiry) nearExpiry += 1;

    return {
      unitNo: r.unit_no,
      bloodType: r.blood_type,
      status,
      centerName: r.center_name,
      expiresAt: new Date(r.expires_at).toISOString(),
      nearExpiry: isNearExpiry,
      claimants,
    };
  });

  // Fill rate = claimed units / requested units across all requests so far.
  const { rows: reqAgg } = await pool.query<{ requested: string | null }>(
    `SELECT sum(units_needed)::int AS requested FROM requests`,
  );
  const { rows: claimAgg } = await pool.query<{ claimed: string | null }>(
    `SELECT
       (SELECT count(*) FROM allocations) +
       (SELECT count(*) FROM naive_allocations) AS claimed`,
  );
  const requested = Number(reqAgg[0]?.requested ?? 0);
  const claimed = Number(claimAgg[0]?.claimed ?? 0);
  const fillRate = requested > 0 ? Math.min(100, Math.round((claimed / requested) * 100)) : 100;

  return {
    units,
    counters: {
      allocated,
      doubleAllocations,
      fillRate,
      nearExpiry,
      totalUnits: units.length,
      available,
    },
    serverTime: new Date(now).toISOString(),
  };
}
