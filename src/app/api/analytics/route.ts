import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getAnalytics());
  } catch (err) {
    console.error("[/api/analytics]", err);
    return NextResponse.json({ error: "analytics_failed" }, { status: 500 });
  }
}
