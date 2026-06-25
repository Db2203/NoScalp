import { Pool } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

/**
 * Two database pools, one per region ("A" and "B").
 *
 * In `dsql` mode each points at a different regional endpoint of the SAME
 * Aurora DSQL multi-region cluster, so a write through A is strongly consistent
 * with a read through B — that's the property the demo shows off.
 *
 * In `local` mode (DATABASE_URL set) both pools share one Postgres so the app
 * runs and the logic can be tested without provisioning AWS.
 */

export type RegionKey = "A" | "B";

const MODE: "dsql" | "local" =
  (process.env.NOSCALP_DB_MODE as "dsql" | "local") ||
  (process.env.DATABASE_URL ? "local" : "dsql");

export const regionLabels: Record<RegionKey, string> = {
  A: process.env.DSQL_REGION_A || "us-east-1",
  B: process.env.DSQL_REGION_B || "us-east-2",
};

// DSQL hands out short-lived IAM tokens (~15 min). Cache per endpoint and let
// pg call this for each new physical connection.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function authToken(endpoint: string, region: string, user: string): Promise<string> {
  const key = `${endpoint}:${user}`;
  const now = Date.now();
  const hit = tokenCache.get(key);
  if (hit && hit.expiresAt > now) return hit.token;

  const signer = new DsqlSigner({ hostname: endpoint, region });
  const token =
    user === "admin"
      ? await signer.getDbConnectAdminAuthToken()
      : await signer.getDbConnectAuthToken();

  tokenCache.set(key, { token, expiresAt: now + 10 * 60 * 1000 });
  return token;
}

function dsqlPool(region: RegionKey): Pool {
  const endpoint =
    region === "A"
      ? process.env.DSQL_ENDPOINT_A
      : process.env.DSQL_ENDPOINT_B || process.env.DSQL_ENDPOINT_A;
  if (!endpoint) {
    throw new Error(
      `Missing DSQL endpoint for region ${region}. Set DSQL_ENDPOINT_A (and DSQL_ENDPOINT_B), or use DATABASE_URL for local mode.`,
    );
  }
  const user = process.env.DSQL_USER || "admin";
  const awsRegion = regionLabels[region];

  return new Pool({
    host: endpoint,
    port: 5432,
    user,
    database: process.env.DSQL_DATABASE || "postgres",
    ssl: { rejectUnauthorized: true },
    // small pool — DSQL caps NEW connections at 100/sec, so we reuse warm ones
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    password: () => authToken(endpoint, awsRegion, user),
  });
}

function localPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 30_000,
  });
}

function build(): Record<RegionKey, Pool> {
  if (MODE === "local") {
    const shared = localPool();
    return { A: shared, B: shared };
  }
  return { A: dsqlPool("A"), B: dsqlPool("B") };
}

// Reuse across hot reloads (dev) and warm serverless invocations (prod).
const g = globalThis as unknown as { __noscalpPools?: Record<RegionKey, Pool> };
function pools(): Record<RegionKey, Pool> {
  if (!g.__noscalpPools) g.__noscalpPools = build();
  return g.__noscalpPools;
}

export const dbMode = MODE;
export function pool(region: RegionKey = "A"): Pool {
  return pools()[region];
}
