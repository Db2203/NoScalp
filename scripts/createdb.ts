/**
 * Create the target database named in DATABASE_URL (default: noscalp) by
 * connecting to the server's maintenance "postgres" database.
 *
 *   npm run db:create
 */
import { loadEnv } from "./_env";
loadEnv();

import pg from "pg";

async function main() {
  const raw = process.env.DATABASE_URL;
  // ignore the leftover template placeholder so discrete PG* vars take over
  const url = raw && !raw.includes("REPLACE_WITH_YOUR_PASSWORD") ? raw : undefined;

  // Connect to the maintenance "postgres" db to issue CREATE DATABASE. Support
  // either a DATABASE_URL or discrete PG* env vars (so passwords with special
  // characters don't need URL-encoding).
  let target: string;
  let client: pg.Client;
  if (url) {
    const u = new URL(url);
    target = (u.pathname.replace(/^\//, "") || "noscalp").replace(/"/g, "");
    u.pathname = "/postgres";
    client = new pg.Client({ connectionString: u.toString() });
  } else {
    target = (process.env.PGDATABASE || "noscalp").replace(/"/g, "");
    client = new pg.Client({ database: "postgres" }); // host/user/password from PG* env vars
  }
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [target]);
  if ((exists.rowCount ?? 0) > 0) {
    console.log(`Database "${target}" already exists.`);
  } else {
    await client.query(`CREATE DATABASE "${target}"`);
    console.log(`Created database "${target}".`);
  }
  await client.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
