import { NextResponse } from "next/server";
import { allocateRequest } from "@/lib/allocate";
import { parseAllocateBody } from "@/lib/request-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = parseAllocateBody(body);
    if ("error" in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const result = await allocateRequest(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/allocate]", err);
    return NextResponse.json({ error: "allocate_failed" }, { status: 500 });
  }
}
