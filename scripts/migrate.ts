// Apply db/schema.sql to Aurora DSQL. DSQL runs each DDL statement in its own
// implicit transaction, so we split the file and execute statements one by one.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPool } from "../src/lib/db";

async function main() {
  const raw = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  // Strip full-line comments so statements aren't mistaken for comment blocks.
  const sql = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const pool = getPool();
  for (const stmt of statements) {
    const label = stmt.slice(0, 60).replace(/\s+/g, " ");
    process.stdout.write(`→ ${label}…\n`);
    await pool.query(stmt);
  }
  console.log(`\n✅ Migrated ${statements.length} statements.`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
