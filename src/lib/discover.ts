import { getPool } from "./db";
import { compatibleTypes, CENTERS, type BloodType } from "./blood";

// Simulated drive-time per center (deterministic) — stands in for a real
// Maps/ETA lookup so the demo ranks the network without external calls.
const ETA_MINUTES: Record<string, number> = {
  [CENTERS[0].id]: 14, // Red Cross North
  [CENTERS[1].id]: 27, // Mercy Central Bank
  [CENTERS[2].id]: 41, // Bay Area Blood Co-op
};

export interface CenterMatch {
  centerId: string;
  centerName: string;
  compatibleUnits: number;
  soonestExpiry: string | null;
  etaMinutes: number;
  canFulfill: boolean;
  fillsPartial: boolean;
}

/**
 * "Discovery Agent", done honestly as a DSQL query: rank every center in the
 * network by how well it can fulfil a request — full fills first, then by ETA,
 * then by available stock. Centers with no compatible stock are still shown
 * (as 0) so the coordinator sees the whole network.
 */
export async function discoverCenters(
  bloodType: BloodType,
  unitsNeeded: number,
): Promise<CenterMatch[]> {
  const compatible = compatibleTypes(bloodType);
  const { rows } = await getPool().query<{
    center_id: string;
    compatible_units: number;
    soonest: Date | null;
  }>(
    `SELECT center_id,
            count(*)::int AS compatible_units,
            min(expires_at) AS soonest
       FROM blood_units
      WHERE blood_type = ANY($1)
        AND status = 'available'
        AND expires_at > now()
      GROUP BY center_id`,
    [compatible],
  );

  const byCenter = new Map(rows.map((r) => [r.center_id, r]));

  return CENTERS.map((c) => {
    const row = byCenter.get(c.id);
    const compatibleUnits = row?.compatible_units ?? 0;
    return {
      centerId: c.id,
      centerName: c.name,
      compatibleUnits,
      soonestExpiry: row?.soonest ? new Date(row.soonest).toISOString() : null,
      etaMinutes: ETA_MINUTES[c.id] ?? 30,
      canFulfill: compatibleUnits >= unitsNeeded,
      fillsPartial: compatibleUnits > 0 && compatibleUnits < unitsNeeded,
    };
  }).sort(
    (a, b) =>
      Number(b.canFulfill) - Number(a.canFulfill) ||
      a.etaMinutes - b.etaMinutes ||
      b.compatibleUnits - a.compatibleUnits,
  );
}
