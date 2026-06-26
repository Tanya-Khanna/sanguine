import { getPool } from "./db";

/**
 * Idempotent maintenance pass:
 *  - Hold TTL: units 'held' past held_until auto-release to 'available'
 *    (allocation row removed, 'released' custody event).
 *  - FEFO expiry: units past expires_at are marked 'expired'.
 * Both are guarded by a cheap existence check so polling stays write-free when
 * there's nothing to do.
 */
export async function runSweep(): Promise<{ released: number; expired: number }> {
  const pool = getPool();
  let released = 0;
  let expired = 0;

  // --- Hold TTL auto-release ---
  const { rows: lapsed } = await pool.query<{ id: string; unit_no: number }>(
    `SELECT id, unit_no FROM blood_units
      WHERE status = 'held' AND held_until IS NOT NULL AND held_until < now()`,
  );
  for (const u of lapsed) {
    try {
      const upd = await pool.query(
        `UPDATE blood_units
            SET status = 'available', held_by_request = NULL, held_until = NULL,
                version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'held' AND held_until < now()`,
        [u.id],
      );
      // Only the sweep that actually flipped the row records the release, so
      // concurrent sweeps (e.g. parallel /api/state polls) don't double-log.
      if (upd.rowCount !== 1) continue;
      await pool.query(`DELETE FROM allocations WHERE unit_id = $1`, [u.id]);
      await pool.query(
        `INSERT INTO custody_events (unit_id, unit_no, event_type, detail)
         VALUES ($1, $2, 'released', $3)`,
        [u.id, u.unit_no, JSON.stringify({ reason: "hold TTL expired" })],
      );
      released += 1;
    } catch {
      // contention with a confirm/allocate — leave for the next sweep
    }
  }

  // --- FEFO expiry ---
  const { rows: stale } = await pool.query<{ id: string; unit_no: number }>(
    `SELECT id, unit_no FROM blood_units
      WHERE status <> 'expired' AND expires_at <= now()`,
  );
  for (const u of stale) {
    try {
      const upd = await pool.query(
        `UPDATE blood_units SET status = 'expired', version = version + 1, updated_at = now()
          WHERE id = $1 AND status <> 'expired' AND expires_at <= now()`,
        [u.id],
      );
      if (upd.rowCount !== 1) continue;
      await pool.query(
        `INSERT INTO custody_events (unit_id, unit_no, event_type, detail)
         VALUES ($1, $2, 'expired', $3)`,
        [u.id, u.unit_no, JSON.stringify({ reason: "past shelf life" })],
      );
      expired += 1;
    } catch {
      // ignore
    }
  }

  return { released, expired };
}
