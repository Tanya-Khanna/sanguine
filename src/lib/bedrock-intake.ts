import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { isBloodType, type BloodType } from "./blood";
import type { ParsedRequest } from "./intake";

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";

let _client: BedrockRuntimeClient | undefined;
function client() {
  if (!_client) _client = new BedrockRuntimeClient({ region: REGION });
  return _client;
}

const SYSTEM = `You are the intake agent for a hospital blood-allocation system.
Extract a structured blood request from the clinician's message.
Reply with ONLY a JSON object, no prose, no code fences:
{"blood_type": "<one of O-,O+,A-,A+,B-,B+,AB-,AB+>", "units": <integer 1-20>, "hours": <integer hours until needed>}
Rules:
- Normalize "O negative" -> "O-", "A positive" -> "A+", etc.
- "tomorrow" => 24 hours. "within 3 days" => 72. If no time given, use 72.
- If units not given, use 1.
- If you cannot determine a valid blood type, reply {"error": "reason"}.`;

const Schema = z.object({
  blood_type: z.string(),
  units: z.number().int().min(1).max(20),
  hours: z.number().int().min(1).max(24 * 30),
});

/**
 * Parse a plain-English blood request with Claude (Haiku) on Amazon Bedrock.
 * Returns null when Bedrock is disabled or the response can't be validated, so
 * the caller transparently falls back to the deterministic regex parser. The
 * engine guarantees correctness regardless of which parser produced the order.
 */
export async function parseWithBedrock(
  text: string,
): Promise<ParsedRequest | { error: string } | null> {
  if (process.env.BEDROCK_ENABLED !== "1") return null;
  try {
    const resp = await client().send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM }],
        messages: [{ role: "user", content: [{ text }] }],
        inferenceConfig: { maxTokens: 200, temperature: 0 },
      }),
    );
    const raw = resp.output?.message?.content?.[0]?.text?.trim();
    if (!raw) return null;
    const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const obj = JSON.parse(json);
    if (obj && typeof obj.error === "string") return { error: obj.error };

    const parsed = Schema.parse(obj);
    if (!isBloodType(parsed.blood_type)) {
      return { error: `unsupported blood type: ${parsed.blood_type}` };
    }
    return {
      bloodType: parsed.blood_type as BloodType,
      units: parsed.units,
      deadline: new Date(Date.now() + parsed.hours * 3600_000).toISOString(),
    };
  } catch (err) {
    console.warn("[bedrock-intake] falling back to regex:", (err as Error).message);
    return null; // fall back to regex
  }
}
