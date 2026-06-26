import { NextResponse } from "next/server";
import { allocateRequest, allocateNaiveRequest, type AllocateResult } from "@/lib/allocate";
import { HOSPITALS, isBloodType, type BloodType } from "@/lib/blood";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A barrier that releases all participants only once `n` of them have arrived.
 * Used to guarantee every racing transaction reads the contested unit as
 * available before any of them commits — so the collision happens every run.
 */
class Barrier {
  private arrived = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly n: number) {}
  arrive = (): Promise<void> => {
    this.arrived += 1;
    if (this.arrived >= this.n) {
      this.waiters.forEach((w) => w());
      this.waiters = [];
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const mode = body.mode === "naive" ? "naive" : "strong";
  const count = Math.max(2, Math.min(8, Number(body.count ?? 2)));
  const unitsPerRequest = Math.max(1, Math.min(5, Number(body.unitsPerRequest ?? 1)));
  const bt = (body.bloodType ?? "A-") as unknown;
  const bloodType: BloodType = isBloodType(bt) ? bt : "A-";
  const deadline = new Date(Date.now() + 72 * 3600_000).toISOString();

  // N hospitals all ask for the same scarce type at once.
  const inputs = Array.from({ length: count }, (_, i) => {
    const h = HOSPITALS[i % HOSPITALS.length];
    return {
      hospitalId: h.id,
      hospitalName: h.name,
      bloodType,
      unitsNeeded: unitsPerRequest,
      deadline,
    };
  });

  try {
    let results: AllocateResult[];
    if (mode === "naive") {
      results = await Promise.all(inputs.map((inp) => allocateNaiveRequest(inp)));
    } else {
      const barrier = new Barrier(count);
      results = await Promise.all(
        inputs.map((inp) => allocateRequest(inp, { gate: barrier.arrive })),
      );
    }

    const reroutes = results.flatMap((r) => r.reroutes);
    const totalClaimed = results.reduce((a, r) => a + r.claimed.length, 0);

    return NextResponse.json({
      mode,
      count,
      bloodType,
      reroutes,
      totalClaimed,
      results,
    });
  } catch (err) {
    console.error("[/api/surge]", err);
    return NextResponse.json({ error: "surge_failed" }, { status: 500 });
  }
}
