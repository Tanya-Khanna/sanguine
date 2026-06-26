import { NextResponse } from "next/server";
import { getPool, withRetryTx } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Promote a request's held units to a confirmed allocation: cancels the hold
 * TTL so the sweep won't reclaim them, flips status to 'allocated', and writes
 * a 'confirmed' custody event. Body: { requestId }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const requestId = body.requestId;
  if (typeof requestId !== "string") {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  try {
    const { result } = await withRetryTx(async (client) => {
      const { rows: held } = await client.query<{ unit_id: string }>(
        `SELECT unit_id FROM allocations WHERE request_id = $1 AND status = 'held'`,
        [requestId],
      );
      for (const { unit_id } of held) {
        await client.query(
          `UPDATE allocations SET status = 'allocated' WHERE unit_id = $1`,
          [unit_id],
        );
        await client.query(
          `UPDATE blood_units
              SET status = 'allocated', held_until = NULL,
                  version = version + 1, updated_at = now()
            WHERE id = $1`,
          [unit_id],
        );
        await client.query(
          `INSERT INTO custody_events (unit_id, request_id, event_type, detail)
           VALUES ($1, $2, 'confirmed', $3)`,
          [unit_id, requestId, JSON.stringify({ confirmed: true })],
        );
      }
      return held.length;
    });
    return NextResponse.json({ ok: true, confirmed: result });
  } catch (err) {
    console.error("[/api/confirm]", err);
    return NextResponse.json({ error: "confirm_failed" }, { status: 500 });
  }
}
