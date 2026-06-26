// ABO/Rh red-blood-cell compatibility. A recipient of a given type can safely
// receive donor units of these types. (O- is the universal donor; AB+ the
// universal recipient.) This small, deliberate domain model is what the
// allocator uses to widen the candidate pool beyond an exact-type match.

export const BLOOD_TYPES = [
  "O-",
  "O+",
  "A-",
  "A+",
  "B-",
  "B+",
  "AB-",
  "AB+",
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

const COMPATIBLE_DONORS: Record<BloodType, BloodType[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

/** Donor unit types a recipient of `recipient` can receive, soonest-first ABO. */
export function compatibleTypes(recipient: BloodType): BloodType[] {
  return COMPATIBLE_DONORS[recipient] ?? [recipient];
}

export function isBloodType(x: unknown): x is BloodType {
  return typeof x === "string" && (BLOOD_TYPES as readonly string[]).includes(x);
}

// Fixed identities so the demo (and its collision) is deterministic run-to-run.
export const CENTERS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Red Cross North" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Mercy Central Bank" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Bay Area Blood Co-op" },
] as const;

export const HOSPITALS = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "St. Vincent General" },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Lakeshore Medical" },
  { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Summit Children's" },
] as const;
