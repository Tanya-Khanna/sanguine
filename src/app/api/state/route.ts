import { NextResponse } from "next/server";
import { getState } from "@/lib/state";
import { runSweep } from "@/lib/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Auto-release lapsed holds and expire stale units so the canvas reflects
    // TTL + FEFO expiry just by polling. Best-effort; never block the read.
    await runSweep().catch(() => {});
    const state = await getState();
    return NextResponse.json(state);
  } catch (err) {
    console.error("[/api/state]", err);
    return NextResponse.json({ error: "state_failed" }, { status: 500 });
  }
}
