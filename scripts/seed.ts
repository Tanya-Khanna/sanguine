// Deterministically (re)seed the demo inventory.
import { getPool } from "../src/lib/db";
import { applySeed } from "../src/lib/seed-data";

async function main() {
  const pool = getPool();
  const { units } = await applySeed(pool);
  console.log(`✅ Seeded ${units} blood units across 3 centers.`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
