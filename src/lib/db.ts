import { Pool, type PoolClient } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

const endpoint = process.env.DSQL_ENDPOINT!;
const region = process.env.AWS_REGION || "us-east-1";

if (!endpoint) {
  // Surface a clear error early instead of an opaque connection failure.
  console.warn("[db] DSQL_ENDPOINT is not set — set it in .env.local");
}

const signer = new DsqlSigner({ hostname: endpoint, region });

// One pool per warm serverless instance. Token is regenerated per new
// physical connection because DSQL auth tokens are short-lived.
let _pool: Pool | undefined;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      host: endpoint,
      port: 5432,
      database: process.env.DSQL_DATABASE || "postgres",
      user: process.env.DSQL_USER || "admin",
      // pg accepts an async function for password — called per connection.
      password: async () => signer.getDbConnectAdminAuthToken(),
      ssl: { rejectUnauthorized: true },
      max: 12,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    _pool.on("error", (err) => console.error("[db] idle client error", err));
  }
  return _pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]) {
  const pool = getPool();
  return pool.query<T extends Record<string, unknown> ? T : never>(
    text,
    params as unknown[],
  );
}

/**
 * Returns true if an error is an Aurora DSQL optimistic-concurrency conflict.
 * DSQL surfaces these as serialization failures (SQLSTATE 40001) and/or an
 * "OC" class message ("change conflicts with another transaction").
 */
export function isOccConflict(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();
  return (
    code === "40001" ||
    code === "40P01" ||
    code.startsWith("OC") ||
    msg.includes("conflicts with another transaction") ||
    msg.includes("serializ") ||
    msg.includes("retry")
  );
}

export interface TxContext {
  attempt: number; // 0 on first try, increments on each OCC retry
}

/**
 * Run a transaction, retrying automatically on DSQL OCC conflicts. The
 * callback receives the live client and a context with the current attempt
 * number (used by the allocator to emit "rerouted" events on a retry).
 */
export async function withRetryTx<T>(
  fn: (client: PoolClient, ctx: TxContext) => Promise<T>,
  maxRetries = 8,
): Promise<{ result: T; attempts: number }> {
  const pool = getPool();
  let attempt = 0;
  // Small jitter between retries reduces livelock under heavy contention.
  for (;;) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client, { attempt });
      await client.query("COMMIT");
      return { result, attempts: attempt + 1 };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if (isOccConflict(err) && attempt < maxRetries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 20));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
