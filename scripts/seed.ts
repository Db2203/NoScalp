/**
 * Reset + seed the demo drop (a PS5 restock).
 *
 *   npm run db:seed
 */
import { loadEnv } from "./_env";
loadEnv();

import { pool, dbMode } from "../lib/db/pools";
import { seedDemo } from "../lib/seed";

async function main() {
  const stock = Number(process.env.SEED_STOCK || 100);
  console.log(`Seeding demo drop (mode: ${dbMode}, stock: ${stock})...`);
  const { dropId } = await seedDemo(stock);
  console.log(`  ✓ drop ${dropId} with ${stock} units`);
  console.log("Done.");
  await pool("A").end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
