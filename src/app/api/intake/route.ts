import { NextResponse } from "next/server";
import { allocateRequest } from "@/lib/allocate";
import { parseRequestText } from "@/lib/intake";
import { parseWithBedrock } from "@/lib/bedrock-intake";
import { HOSPITALS } from "@/lib/blood";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Intake Agent front door. Turns plain English into a structured request and
 * feeds the strong-consistency engine. Tries Bedrock (Claude) first for natural
 * language; falls back to the deterministic regex parser if Bedrock is
 * unconfigured or errors. Either way the engine guarantees correctness.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  let parsed = await parseWithBedrock(text);
  let source: "bedrock" | "regex" = "bedrock";
  if (!parsed) {
    parsed = parseRequestText(text);
    source = "regex";
  }
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error, source }, { status: 422 });
  }

  // A request typed by a clinician comes from a rotating hospital identity.
  const h = HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)];
  const result = await allocateRequest({
    hospitalId: h.id,
    hospitalName: h.name,
    bloodType: parsed.bloodType,
    unitsNeeded: parsed.units,
    deadline: parsed.deadline,
  });

  return NextResponse.json({ parsed, source, result });
}
