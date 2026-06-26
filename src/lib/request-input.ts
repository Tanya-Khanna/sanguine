import { isBloodType, HOSPITALS, type BloodType } from "./blood";
import type { AllocateInput } from "./allocate";

interface RawBody {
  bloodType?: unknown;
  blood_type?: unknown;
  unitsNeeded?: unknown;
  units?: unknown;
  deadline?: unknown;
  hospitalId?: unknown;
  hospitalName?: unknown;
}

/**
 * Normalize a loose request body into a validated AllocateInput. Fills sensible
 * defaults (a rotating hospital, a 72h deadline) so the chat box / curl can
 * send a minimal payload.
 */
export function parseAllocateBody(
  body: RawBody,
  hospitalIndex = Math.floor(Math.random() * HOSPITALS.length),
): AllocateInput | { error: string } {
  const bt = (body.bloodType ?? body.blood_type) as unknown;
  if (!isBloodType(bt)) {
    return { error: `invalid blood_type: ${String(bt)}` };
  }
  const unitsRaw = Number(body.unitsNeeded ?? body.units ?? 1);
  const unitsNeeded = Number.isFinite(unitsRaw)
    ? Math.max(1, Math.min(20, Math.trunc(unitsRaw)))
    : 1;

  let deadline: string;
  if (typeof body.deadline === "string" && !Number.isNaN(Date.parse(body.deadline))) {
    deadline = new Date(body.deadline).toISOString();
  } else {
    deadline = new Date(Date.now() + 72 * 3600_000).toISOString();
  }

  const hospital = HOSPITALS[hospitalIndex % HOSPITALS.length];
  const hospitalId = typeof body.hospitalId === "string" ? body.hospitalId : hospital.id;
  const hospitalName =
    typeof body.hospitalName === "string" ? body.hospitalName : hospital.name;

  return {
    bloodType: bt as BloodType,
    unitsNeeded,
    deadline,
    hospitalId,
    hospitalName,
  };
}
