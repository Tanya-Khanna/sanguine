import { NextResponse } from "next/server";
import { allocateNaiveRequest } from "@/lib/allocate";
import { parseAllocateBody } from "@/lib/request-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deliberately the unsafe, last-write-wins path. Do not "fix" this — the
// double-promise it produces under contention is the whole point of the demo.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = parseAllocateBody(body);
    if ("error" in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const result = await allocateNaiveRequest(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/allocate-naive]", err);
    return NextResponse.json({ error: "allocate_naive_failed" }, { status: 500 });
  }
}
