import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { applySeed } from "@/lib/seed-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-seed to the deterministic initial state so every demo run is identical.
export async function POST() {
  try {
    const { units } = await applySeed(getPool());
    return NextResponse.json({ ok: true, units });
  } catch (err) {
    console.error("[/api/reset]", err);
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }
}
