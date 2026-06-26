import { isBloodType, type BloodType } from "./blood";

export interface ParsedRequest {
  bloodType: BloodType;
  units: number;
  deadline: string; // ISO
}

/**
 * Deterministic regex fallback parser for plain-English blood requests. Used
 * when Bedrock is unavailable and as a validation backstop for the agent's
 * JSON. Handles e.g. "need 4 units A- within 72h", "2 bags of O negative by
 * tomorrow", "send A positive, 3 units, 24 hours".
 */
export function parseRequestText(text: string): ParsedRequest | { error: string } {
  const t = text.toLowerCase();

  // Blood type: AB/A/B/O + Rh sign (longest group first so "AB" wins over "A").
  const typeMatch = t.match(
    /\b(ab|a|b|o)\s*(\+|-|pos(?:itive)?|neg(?:ative)?)/i,
  );
  if (!typeMatch) return { error: "could not find a blood type in the request" };
  const group = typeMatch[1].toUpperCase();
  const rhRaw = typeMatch[2].toLowerCase();
  const rh = rhRaw.startsWith("+") || rhRaw.startsWith("p") ? "+" : "-";
  const bloodType = `${group}${rh}`;
  if (!isBloodType(bloodType)) return { error: `unsupported blood type: ${bloodType}` };

  // Units: a number directly tied to units/bags, else the first standalone int.
  let units = 1;
  const unitMatch = t.match(/(\d+)\s*(?:units?|bags?)/);
  if (unitMatch) {
    units = parseInt(unitMatch[1], 10);
  } else {
    const numMatch = t.match(/\b(\d+)\b/);
    if (numMatch) units = parseInt(numMatch[1], 10);
  }
  units = Math.max(1, Math.min(20, units));

  // Deadline: hours / days; "tomorrow" => 24h. Default 72h.
  let hours = 72;
  const hMatch = t.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
  const dMatch = t.match(/(\d+)\s*(?:d|day|days)\b/);
  if (hMatch) hours = parseInt(hMatch[1], 10);
  else if (dMatch) hours = parseInt(dMatch[1], 10) * 24;
  else if (/tomorrow/.test(t)) hours = 24;
  hours = Math.max(1, Math.min(24 * 30, hours));

  return {
    bloodType: bloodType as BloodType,
    units,
    deadline: new Date(Date.now() + hours * 3600_000).toISOString(),
  };
}
