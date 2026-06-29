import { NextResponse } from "next/server";
import { discoverCenters } from "@/lib/discover";
import { isBloodType, type BloodType } from "@/lib/blood";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bt = url.searchParams.get("type");
  const units = Math.max(1, Math.min(20, Number(url.searchParams.get("units") ?? 1)));
  if (!isBloodType(bt)) {
    return NextResponse.json({ error: `invalid blood type: ${bt}` }, { status: 400 });
  }
  try {
    const centers = await discoverCenters(bt as BloodType, units);
    const networkTotal = centers.reduce((a, c) => a + c.compatibleUnits, 0);
    return NextResponse.json({ bloodType: bt, unitsNeeded: units, networkTotal, centers });
  } catch (err) {
    console.error("[/api/discover]", err);
    return NextResponse.json({ error: "discover_failed" }, { status: 500 });
  }
}
