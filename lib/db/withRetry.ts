import type { Pool, PoolClient } from "pg";

/**
 * Run `fn` inside a transaction, retrying on DSQL's optimistic-concurrency
 * conflict. DSQL has no row locks — instead a write/write conflict surfaces as
 * SQLSTATE 40001 (OC000) AT COMMIT TIME. Our schema is built so genuine
 * conflicts are rare, but when two requests really do race the same key we just
 * roll back and retry with jittered backoff.
 *
 * Pair this with idempotent statements (ON CONFLICT DO NOTHING + an idempotency
 * key) so a retry — or a connection dropped after a successful commit — is a
 * safe no-op.
 */
export async function withTxn<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if (isConflict(err) && attempt < maxRetries) {
        attempt += 1;
        await sleep(backoffMs(attempt));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

export function isConflict(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "40001";
}

function backoffMs(attempt: number): number {
  const cap = Math.min(20 * 2 ** attempt, 500); // 40, 80, 160, ... capped at 500ms
  return cap / 2 + Math.random() * (cap / 2); // full jitter on the upper half
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
