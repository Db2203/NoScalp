import { demoPool } from "./db/pools";

/**
 * The "normal store" — a first-come checkout with NO per-unit guard.
 *
 * Each buyer counts how many orders already exist and, if that's under the
 * stock, inserts an order. It's the classic check-then-act race: under a
 * concurrent stampede, dozens of buyers read the same "still in stock" count
 * before any of them commits, so they ALL check out — and the store oversells.
 *
 * This is a REAL race, not a simulation. Orders are independent rows (random
 * PK), so they don't contend on a single counter — which means it oversells the
 * same way on plain Postgres and on Aurora DSQL. The bug is the missing guard,
 * not the database. NoScalp survives the identical flood because every unit is
 * its own row, claimed exactly once.
 */

const NAIVE_DDL = `CREATE TABLE IF NOT EXISTS naive_orders (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL,
  buyer   TEXT NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  // standalone DDL (its own statement/txn) — safe on DSQL's one-DDL-per-txn rule
  await demoPool().query(NAIVE_DDL);
  ensured = true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runNaiveDrop(args: {
  dropId: string;
  stock?: number;
  attempts?: number;
}): Promise<{ stock: number; attempts: number; sold: number; oversold: number; toRealFans: number }> {
  const stock = Math.min(Math.max(args.stock ?? 100, 1), 1000);
  const attempts = Math.min(Math.max(args.attempts ?? 5000, 1), 20000);
  const db = demoPool();
  await ensureTable();
  await db.query(`DELETE FROM naive_orders WHERE drop_id = $1`, [args.dropId]);

  const CONCURRENCY = 30;
  let next = 0;
  let soldOut = false;

  async function buyer() {
    while (!soldOut) {
      const i = next++;
      if (i >= attempts) return;
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const n = (
          await client.query(`SELECT count(*)::int AS n FROM naive_orders WHERE drop_id = $1`, [args.dropId])
        ).rows[0].n as number;
        if (n < stock) {
          // widen the read-then-write window so the race is reliable, not luck
          await sleep(6 + Math.random() * 10);
          await client.query(`INSERT INTO naive_orders (drop_id, buyer) VALUES ($1, $2)`, [args.dropId, `bot-${i}`]);
          await client.query("COMMIT");
        } else {
          await client.query("COMMIT");
          soldOut = true; // counter says we're full — stop the stampede
          return;
        }
      } catch {
        await client.query("ROLLBACK").catch(() => {});
      } finally {
        client.release();
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => buyer()));

  const sold = (
    await db.query(`SELECT count(*)::int AS n FROM naive_orders WHERE drop_id = $1`, [args.dropId])
  ).rows[0].n as number;

  return { stock, attempts, sold, oversold: Math.max(0, sold - stock), toRealFans: 0 };
}
