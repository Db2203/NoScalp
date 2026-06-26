/**
 * Apply the schema. Each statement runs on its own (no surrounding BEGIN) so it
 * satisfies DSQL's "one DDL per transaction" rule. Re-runnable: "already exists"
 * errors are ignored.
 *
 *   npm run db:migrate
 */
import { loadEnv } from "./_env";
loadEnv();

import { pool, dbMode } from "../lib/db/pools";
import { ddlStatements } from "../lib/db/migrations";

async function main() {
  const db = pool("A");
  console.log(`Migrating (mode: ${dbMode()})...`);

  for (const { name, sql } of ddlStatements()) {
    try {
      await db.query(sql);
      console.log(`  ✓ ${name}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === "42P07" || /already exists/i.test(e.message || "")) {
        console.log(`  • ${name} (exists)`);
        continue;
      }
      console.error(`  ✗ ${name}: ${e.message}`);
      throw err;
    }
  }

  if (dbMode() === "dsql") {
    // CREATE INDEX ASYNC returns before the build finishes; give it a moment.
    console.log("Waiting for async indexes to build...");
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("Done.");
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
