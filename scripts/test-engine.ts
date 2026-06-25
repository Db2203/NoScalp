/**
 * End-to-end proof of the NoScalp guarantees. Runs against whatever DB is
 * configured (local Postgres or Aurora DSQL).
 *
 *   npm run test:engine
 */
import { loadEnv } from "./_env";
loadEnv();

import { pool, dbMode } from "../lib/db/pools";
import { seedDemo } from "../lib/seed";
import { DEMO_DROP_ID } from "../lib/constants";
import { registerEntry, floodBots, runDraw, claimUnit, verifyIdentity } from "../lib/engine";
import { getDropStats, getIdentityStatus } from "../lib/queries";
import { identityHash } from "../lib/ids";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

async function main() {
  const STOCK = 20;
  console.log(`\nNoScalp engine test (mode: ${dbMode}, stock: ${STOCK})\n`);
  await seedDemo(STOCK);

  // 1. dedup: same human enters 5 times -> 1 entry
  const me = identityHash("dupe@test.noscalp");
  let created = 0;
  for (let i = 0; i < 5; i++) {
    const r = await registerEntry({ dropId: DEMO_DROP_ID, identityHash: me, source: "human" });
    if (r.created) created++;
  }
  check("5 entries from one human collapse to 1", created === 1, `created=${created}`);

  // 2. concurrent same-human across regions A+B -> 1 entry
  const racer = identityHash("racer@test.noscalp");
  const both = await Promise.all([
    registerEntry({ dropId: DEMO_DROP_ID, identityHash: racer, region: "A", source: "human" }),
    registerEntry({ dropId: DEMO_DROP_ID, identityHash: racer, region: "B", source: "human" }),
  ]);
  check("same human racing A+B -> exactly 1 entry", both.filter((x) => x.created).length === 1);

  // 3. a pool of real humans + a bot flood
  const HUMANS = 30;
  for (let i = 0; i < HUMANS; i++) {
    await registerEntry({ dropId: DEMO_DROP_ID, identityHash: identityHash(`human-${i}@test.noscalp`), source: "human" });
  }
  const flood = await floodBots({ dropId: DEMO_DROP_ID, attempts: 4000, distinct: 200 });
  check("bot flood inserts only distinct identities", flood.inserted === 200, `inserted=${flood.inserted}`);

  // 4. draw: exactly STOCK winners, zero oversold
  const draw = await runDraw({ dropId: DEMO_DROP_ID });
  check("winners === stock (fully allocated)", draw.winners === STOCK, `winners=${draw.winners}`);
  const stats = await getDropStats(DEMO_DROP_ID, "A");
  const oversold = stats.units.allocated + stats.units.claimed - stats.units.total;
  check("zero oversold", oversold === 0, `over=${oversold}`);
  check("available units === 0 after full draw", stats.units.available === 0);

  // 5. winners are unique units
  const dupUnits = await pool("A").query(
    `SELECT unit_no, count(*) c FROM allocations WHERE drop_id=$1 GROUP BY unit_no HAVING count(*) > 1`,
    [DEMO_DROP_ID],
  );
  check("every allocated unit is unique", dupUnits.rowCount === 0);

  // 6. claim + idempotent double-claim
  const winnerHash = identityHash("dupe@test.noscalp");
  const winner = await verifyIdentity("dupe@test.noscalp");
  const st = await getIdentityStatus(DEMO_DROP_ID, winner.identityId, "A");
  if (st?.entryStatus === "won" && st.allocationId) {
    const c1 = await claimUnit({ allocationId: st.allocationId, identityId: winner.identityId, idempotencyKey: `${st.allocationId}:${winner.identityId}` });
    const c2 = await claimUnit({ allocationId: st.allocationId, identityId: winner.identityId, idempotencyKey: `${st.allocationId}:${winner.identityId}` });
    check("double claim yields the same order (idempotent)", c1.orderId === c2.orderId, c1.orderId);
  } else {
    console.log(`  • winner ${winnerHash.slice(0, 8)} didn't win this draw — skipping claim check (re-run to retry)`);
  }

  // 7. cross-region read
  const a = await getDropStats(DEMO_DROP_ID, "A");
  const b = await getDropStats(DEMO_DROP_ID, "B");
  check("region A and B agree on entry total", a.entriesTotal === b.entriesTotal, `${a.entriesTotal} vs ${b.entriesTotal}`);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED ✓" : `${failures} CHECK(S) FAILED ✗`}\n`);
  await pool("A").end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
