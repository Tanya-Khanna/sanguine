import type { PoolClient } from "pg";
import { getPool, withRetryTx } from "./db";
import { compatibleTypes, type BloodType } from "./blood";

const HOLD_TTL_SECONDS = Number(process.env.HOLD_TTL_SECONDS ?? 90);

export interface AllocateInput {
  hospitalId: string;
  hospitalName: string;
  bloodType: BloodType;
  unitsNeeded: number;
  deadline: string; // ISO timestamp
}

export interface ClaimedUnit {
  unitId: string;
  unitNo: number;
  bloodType: string;
  centerName: string;
}

export interface Reroute {
  fromUnitNo: number;
  toUnitNo: number;
  reason: string;
}

export interface AllocateResult {
  requestId: string;
  mode: "strong" | "naive";
  status: "filled" | "partially_filled" | "failed";
  hospitalName: string;
  claimed: ClaimedUnit[];
  reroutes: Reroute[];
  attempts: number;
}

interface Candidate {
  id: string;
  unit_no: number;
  blood_type: string;
  center_name: string;
  version: number;
}

const FEFO_SQL = `
  SELECT id, unit_no, blood_type, center_name, version
  FROM blood_units
  WHERE blood_type = ANY($1)
    AND status = 'available'
    AND expires_at > now()
  ORDER BY expires_at ASC, unit_no ASC
  LIMIT $2`;

async function createRequest(input: AllocateInput): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO requests (hospital_id, hospital_name, blood_type, units_needed, deadline)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.hospitalId, input.hospitalName, input.bloodType, input.unitsNeeded, input.deadline],
  );
  const requestId = rows[0].id;
  await pool.query(
    `INSERT INTO custody_events (request_id, event_type, detail)
     VALUES ($1, 'requested', $2)`,
    [
      requestId,
      JSON.stringify({
        hospital: input.hospitalName,
        blood_type: input.bloodType,
        units: input.unitsNeeded,
      }),
    ],
  );
  return requestId;
}

async function finalizeRequest(requestId: string, needed: number, got: number) {
  const status =
    got >= needed ? "filled" : got > 0 ? "partially_filled" : "failed";
  await getPool().query(`UPDATE requests SET status = $1 WHERE id = $2`, [
    status,
    requestId,
  ]);
  return status as AllocateResult["status"];
}

/**
 * STRONG path — the spine. Claims units by routing every contender through the
 * authoritative `blood_units` row (version-checked) and the unique
 * `allocations.unit_id`. Concurrent claims collide at COMMIT (DSQL OCC); we
 * retry, and on a retry the contested unit is gone, so FEFO reroutes to the
 * next unit and we emit a `rerouted` custody event — the money-shot.
 */
export async function allocateRequest(
  input: AllocateInput,
  opts?: { gate?: () => Promise<void> },
): Promise<AllocateResult> {
  const requestId = await createRequest(input);
  const compatible = compatibleTypes(input.bloodType);

  // Persisted across retries so we can detect when our first-choice unit was
  // stolen and we had to reroute.
  let intendedTopNo: number | null = null;

  const { result, attempts } = await withRetryTx(async (client, ctx) => {
    const claimed: ClaimedUnit[] = [];
    const { rows: candidates } = await client.query<Candidate>(FEFO_SQL, [
      compatible,
      input.unitsNeeded,
    ]);

    if (ctx.attempt === 0 && candidates.length > 0) {
      intendedTopNo = candidates[0].unit_no;
      // Surge barrier: hold here until every racer has read the same snapshot,
      // so they all contend for the same unit and the collision is deterministic.
      if (opts?.gate) await opts.gate();
    }

    for (const c of candidates) {
      if (claimed.length >= input.unitsNeeded) break;
      // Conditional claim on the authoritative row (optimistic version check).
      const upd = await client.query(
        `UPDATE blood_units
            SET status = 'held',
                held_by_request = $1,
                held_until = now() + ($2 || ' seconds')::interval,
                version = version + 1,
                updated_at = now()
          WHERE id = $3 AND version = $4 AND status = 'available'`,
        [requestId, String(HOLD_TTL_SECONDS), c.id, c.version],
      );
      if (upd.rowCount !== 1) continue; // lost within snapshot — try next

      // Safety net: PRIMARY KEY on unit_id physically blocks a double-allocate.
      await client.query(
        `INSERT INTO allocations (unit_id, request_id, status) VALUES ($1, $2, 'held')`,
        [c.id, requestId],
      );
      await client.query(
        `INSERT INTO custody_events (unit_id, unit_no, request_id, event_type, detail)
         VALUES ($1, $2, $3, 'held', $4)`,
        [
          c.id,
          c.unit_no,
          requestId,
          JSON.stringify({ hospital: input.hospitalName, blood_type: c.blood_type }),
        ],
      );
      claimed.push({
        unitId: c.id,
        unitNo: c.unit_no,
        bloodType: c.blood_type,
        centerName: c.center_name,
      });
    }

    // If our first-choice unit changed across a retry, this was a reroute.
    const reroutes: Reroute[] = [];
    if (
      ctx.attempt > 0 &&
      intendedTopNo !== null &&
      claimed.length > 0 &&
      claimed[0].unitNo !== intendedTopNo
    ) {
      const r: Reroute = {
        fromUnitNo: intendedTopNo,
        toUnitNo: claimed[0].unitNo,
        reason: "concurrency_conflict",
      };
      reroutes.push(r);
      await client.query(
        `INSERT INTO custody_events (unit_id, unit_no, request_id, event_type, detail)
         VALUES ($1, $2, $3, 'rerouted', $4)`,
        [
          claimed[0].unitId,
          claimed[0].unitNo,
          requestId,
          JSON.stringify({
            hospital: input.hospitalName,
            from_unit: intendedTopNo,
            to_unit: claimed[0].unitNo,
            reason: "contested by another hospital",
          }),
        ],
      );
    }

    return { claimed, reroutes };
  });

  const status = await finalizeRequest(requestId, input.unitsNeeded, result.claimed.length);

  return {
    requestId,
    mode: "strong",
    status,
    hospitalName: input.hospitalName,
    claimed: result.claimed,
    reroutes: result.reroutes,
    attempts,
  };
}

/**
 * NAIVE path — deliberately broken. It never claims the authoritative
 * `blood_units` row; it just records its own promise in the unconstrained
 * `naive_allocations` table. Two concurrent promises touch disjoint rows, so
 * BOTH commit — the same unit gets promised twice. Do not "fix" this; the bug
 * is the demonstration.
 */
export async function allocateNaiveRequest(input: AllocateInput): Promise<AllocateResult> {
  const requestId = await createRequest(input);
  const compatible = compatibleTypes(input.bloodType);
  const pool = getPool();
  const client: PoolClient = await pool.connect();
  const claimed: ClaimedUnit[] = [];
  try {
    await client.query("BEGIN");
    const { rows: candidates } = await client.query<Candidate>(FEFO_SQL, [
      compatible,
      input.unitsNeeded,
    ]);
    for (const c of candidates) {
      if (claimed.length >= input.unitsNeeded) break;
      // No version check, no claim on the shared row — just promise it.
      await client.query(
        `INSERT INTO naive_allocations (unit_id, request_id) VALUES ($1, $2)`,
        [c.id, requestId],
      );
      await client.query(
        `INSERT INTO custody_events (unit_id, unit_no, request_id, event_type, detail)
         VALUES ($1, $2, $3, 'allocated', $4)`,
        [
          c.id,
          c.unit_no,
          requestId,
          JSON.stringify({ hospital: input.hospitalName, naive: true }),
        ],
      );
      claimed.push({
        unitId: c.id,
        unitNo: c.unit_no,
        bloodType: c.blood_type,
        centerName: c.center_name,
      });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const status = await finalizeRequest(requestId, input.unitsNeeded, claimed.length);
  return {
    requestId,
    mode: "naive",
    status,
    hospitalName: input.hospitalName,
    claimed,
    reroutes: [],
    attempts: 1,
  };
}
