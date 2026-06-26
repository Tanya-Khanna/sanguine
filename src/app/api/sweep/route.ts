import { NextResponse } from "next/server";
import { runSweep } from "@/lib/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/sweep]", err);
    return NextResponse.json({ error: "sweep_failed" }, { status: 500 });
  }
}
