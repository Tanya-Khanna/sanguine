import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(
    200,
    Number(new URL(req.url).searchParams.get("limit") ?? 60),
  );
  try {
    const { rows } = await getPool().query(
      `SELECT id, unit_no, event_type, detail, created_at
         FROM custody_events
        ORDER BY created_at DESC, id DESC
        LIMIT $1`,
      [limit],
    );
    return NextResponse.json({ events: rows });
  } catch (err) {
    console.error("[/api/ledger]", err);
    return NextResponse.json({ error: "ledger_failed" }, { status: 500 });
  }
}
