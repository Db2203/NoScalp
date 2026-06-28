import type { Pool, PoolClient } from "pg";
import { pool, type RegionKey } from "./db/pools";
import { withTxn } from "./db/withRetry";
import {
  allocationIdFor,
  committedSeed,
  entryId,
  identityHash as hashContact,
  identityIdFor,
  newId,
  orderIdFor,
  slotId,
} from "./ids";

/**
 * The NoScalp engine. Every guarantee lives here:
 *  - one verified human  -> identity_index (hash is the PK)
 *  - one entry per human  -> entries.id = uuidv5(drop + hash)
 *  - exactly-once allocation / zero oversell -> one row per unit, guarded updates
 *  - per-user purchase limit -> purchase_slots (no counter)
 */

export class EngineError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function audit(
  c: PoolClient,
  dropId: string | null,
  action: string,
  region: RegionKey,
  detail: Record<string, unknown> = {},
) {
  await c.query(
    `INSERT INTO audit_log (drop_id, action, region, detail_json) VALUES ($1,$2,$3,$4)`,
    [dropId, action, region, JSON.stringify(detail)],
  );
}

/** Resolve-or-create a verified identity. Idempotent: id is derived from the hash. */
async function ensureIdentity(
  c: PoolClient,
  identityHash: string,
  opts: { displayName?: string | null; verifiedVia?: string; deviceFp?: string | null } = {},
): Promise<{ identityId: string; isNew: boolean }> {
  const identityId = identityIdFor(identityHash);
  const ins = await c.query(
    `INSERT INTO identity_index (identity_hash, identity_id) VALUES ($1,$2)
     ON CONFLICT (identity_hash) DO NOTHING RETURNING identity_id`,
    [identityHash, identityId],
  );
  const isNew = (ins.rowCount ?? 0) > 0;
  await c.query(
    `INSERT INTO identities (id, identity_hash, display_name, verified_via, device_fp)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
    [identityId, identityHash, opts.displayName ?? null, opts.verifiedVia ?? "otp_email", opts.deviceFp ?? null],
  );
  return { identityId, isNew };
}

/**
 * Verify a human (post-OTP) and return their identity. The same email/phone
 * always maps to the same identity, enforced atomically on identity_index — so
 * a bot with 1,000 fake logins still resolves to 1,000... no, to as many real
 * inboxes as it controls. That's the wall.
 */
export async function verifyIdentity(
  contact: string,
  opts: { displayName?: string; deviceFp?: string; region?: RegionKey } = {},
): Promise<{ identityId: string; identityHash: string; isNew: boolean }> {
  const region = opts.region ?? "A";
  const identityHash = hashContact(contact);
  const { identityId, isNew } = await withTxn(pool(region), (c) =>
    ensureIdentity(c, identityHash, { displayName: opts.displayName, deviceFp: opts.deviceFp }),
  );
  return { identityId, identityHash, isNew };
}

/** Register one lottery entry for a verified human. Duplicate = harmless no-op. */
export async function registerEntry(args: {
  dropId: string;
  contact?: string;
  identityHash?: string;
  region?: RegionKey;
  source?: "human" | "bot";
  displayName?: string;
  deviceFp?: string;
}): Promise<{ entryId: string; identityId: string; created: boolean; alreadyEntered: boolean }> {
  const region = args.region ?? "A";
  const source = args.source ?? "human";
  const identityHash = args.identityHash ?? hashContact(args.contact ?? "");
  if (!identityHash) throw new EngineError("bad_request", "contact or identityHash required");

  return withTxn(pool(region), async (c) => {
    const drop = (
      await c.query(`SELECT status FROM drops WHERE id = $1`, [args.dropId])
    ).rows[0] as { status: string } | undefined;
    if (!drop) throw new EngineError("not_found", "drop not found");
    if (drop.status !== "registration_open") {
      throw new EngineError("closed", "registration is not open for this drop");
    }

    const { identityId } = await ensureIdentity(c, identityHash, {
      displayName: args.displayName,
      deviceFp: args.deviceFp,
    });

    const id = entryId(args.dropId, identityHash);
    const res = await c.query(
      `INSERT INTO entries (id, drop_id, identity_id, identity_hash, region_written, source)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [id, args.dropId, identityId, identityHash, region, source],
    );
    const created = (res.rowCount ?? 0) > 0;
    if (created) await audit(c, args.dropId, "entry_registered", region, { entryId: id, source });
    return { entryId: id, identityId, created, alreadyEntered: !created };
  });
}

/**
 * Simulate a scalper bot flood. We insert one real entry per *distinct* bot
 * identity; the rest of the attempts are duplicate-human requests the entry
 * primary key rejects. Returns honest counts. Batched to stay well within
 * DSQL's 3,000-rows/txn limit and the 100-new-conn/sec ceiling.
 */
export async function floodBots(args: {
  dropId: string;
  attempts?: number;
  distinct?: number;
  region?: RegionKey;
}): Promise<{ attempts: number; distinct: number; inserted: number; blocked: number; region: RegionKey }> {
  const region = args.region ?? "A";
  const attempts = args.attempts ?? 5000;
  // a fraction of attempts come from genuinely distinct (fake) identities; the
  // rest are the same bots retrying = duplicate humans. Never exceed `attempts`.
  const distinct = Math.min(args.distinct ?? Math.max(1, Math.round(attempts * 0.06)), attempts);

  // only meaningful while registration is open (don't pollute a drawn drop)
  const status = (await pool(region).query(`SELECT status FROM drops WHERE id = $1`, [args.dropId])).rows[0]?.status as
    | string
    | undefined;
  if (!status) throw new EngineError("not_found", "drop not found");
  if (status !== "registration_open") throw new EngineError("closed", "registration is not open for this drop");

  // fresh per call so each demo run draws a different set of winners
  const nonce = newId();
  const hashes = Array.from({ length: distinct }, (_, i) =>
    hashContact(`bot-${args.dropId.slice(0, 8)}-${nonce}-${i}@flood.noscalp`),
  );

  let inserted = 0;
  const BATCH = 1000;
  for (let start = 0; start < hashes.length; start += BATCH) {
    const chunk = hashes.slice(start, start + BATCH);
    inserted += await withTxn(pool(region), async (c) => {
      const values: string[] = [];
      const params: unknown[] = [args.dropId, region];
      chunk.forEach((h, i) => {
        const base = i * 3 + 3; // $3, $4, $5 ...
        values.push(`($${base}, $1, $${base + 1}, $${base + 2}, $2, 'bot')`);
        params.push(entryId(args.dropId, h), identityIdFor(h), h);
      });
      const res = await c.query(
        `INSERT INTO entries (id, drop_id, identity_id, identity_hash, region_written, source)
         VALUES ${values.join(",")}
         ON CONFLICT (id) DO NOTHING`,
        params,
      );
      return res.rowCount ?? 0;
    });
  }

  await withTxn(pool(region), (c) => audit(c, args.dropId, "bot_flood", region, { attempts, distinct, inserted }));
  return { attempts, distinct, inserted, blocked: attempts - inserted, region };
}

/**
 * Seed a pool of genuine verified fans (one entry each) so a draw is decided
 * among real people, not just the bot flood. Demo helper — same batched insert
 * shape as floodBots, but source='human' and every identity is distinct.
 */
export async function seedHumans(args: {
  dropId: string;
  count?: number;
  region?: RegionKey;
}): Promise<{ count: number; inserted: number; region: RegionKey }> {
  const region = args.region ?? "A";
  const count = Math.min(Math.max(args.count ?? 9000, 0), 20000);

  const status = (await pool(region).query(`SELECT status FROM drops WHERE id = $1`, [args.dropId])).rows[0]?.status as
    | string
    | undefined;
  if (!status) throw new EngineError("not_found", "drop not found");
  if (status !== "registration_open") throw new EngineError("closed", "registration is not open for this drop");

  // fresh per call so each demo run has a different pool of fans (different winners)
  const nonce = newId();
  const hashes = Array.from({ length: count }, (_, i) =>
    hashContact(`fan-${args.dropId.slice(0, 8)}-${nonce}-${i}@fans.noscalp`),
  );

  let inserted = 0;
  const BATCH = 1000;
  for (let start = 0; start < hashes.length; start += BATCH) {
    const chunk = hashes.slice(start, start + BATCH);
    inserted += await withTxn(pool(region), async (c) => {
      const values: string[] = [];
      const params: unknown[] = [args.dropId, region];
      chunk.forEach((h, i) => {
        const base = i * 3 + 3;
        values.push(`($${base}, $1, $${base + 1}, $${base + 2}, $2, 'human')`);
        params.push(entryId(args.dropId, h), identityIdFor(h), h);
      });
      const res = await c.query(
        `INSERT INTO entries (id, drop_id, identity_id, identity_hash, region_written, source)
         VALUES ${values.join(",")}
         ON CONFLICT (id) DO NOTHING`,
        params,
      );
      return res.rowCount ?? 0;
    });
  }

  await withTxn(pool(region), (c) => audit(c, args.dropId, "fans_registered", region, { count, inserted }));
  return { count, inserted, region };
}

/** Current standings for a drop, readable from a pool or inside a transaction. */
async function standings(
  q: Pool | PoolClient,
  dropId: string,
): Promise<{ winners: number; units: number; entries: number }> {
  const r = (
    await q.query(
      `SELECT
         (SELECT count(*) FROM drop_units WHERE drop_id = $1 AND state IN ('allocated','claimed'))::int AS winners,
         (SELECT count(*) FROM drop_units WHERE drop_id = $1)::int AS units,
         (SELECT count(*) FROM entries WHERE drop_id = $1)::int AS entries`,
      [dropId],
    )
  ).rows[0];
  return { winners: r.winners, units: r.units, entries: r.entries };
}

/**
 * Run the lottery draw. Single-leader, idempotent, paginated.
 *  1. close registration + fix a public seed
 *  2. assign each entry a deterministic rank = md5(entry_id || seed)
 *  3. allocate the N best-ranked entries to the N unit rows (zero oversell)
 *  4. mark the rest as lost, flip the drop to 'drawn'
 */
export async function runDraw(args: {
  dropId: string;
  region?: RegionKey;
}): Promise<{ winners: number; units: number; entries: number; seed: string; alreadyDrawn: boolean }> {
  const region = args.region ?? "A";
  const db = pool(region);
  // Reveal the seed committed when the drop was created (commit-reveal). It's
  // derived from a secret, so it was fixed in advance but only disclosed now.
  const newSeed = committedSeed(args.dropId);

  // 1. LEADER GATE. Only the transaction that actually flips
  //    registration_open -> drawing performs the draw. A concurrent call (double
  //    click, second region) or a re-run on a finished drop just returns the
  //    current standings — so an entry can never be allocated twice.
  const lead = await withTxn(db, async (c) => {
    const claimed = await c.query(
      `UPDATE drops SET status = 'drawing', draw_seed = $2
       WHERE id = $1 AND status = 'registration_open'
       RETURNING claim_window_secs`,
      [args.dropId, newSeed],
    );
    if ((claimed.rowCount ?? 0) > 0) {
      await audit(c, args.dropId, "draw_started", region, { seed: newSeed });
      return { isLeader: true, seed: newSeed, claimWindow: claimed.rows[0].claim_window_secs as number };
    }
    const cur = (await c.query(`SELECT status, draw_seed FROM drops WHERE id = $1`, [args.dropId])).rows[0] as
      | { status: string; draw_seed: string | null }
      | undefined;
    if (!cur) throw new EngineError("not_found", "drop not found");
    return { isLeader: false, seed: cur.draw_seed ?? newSeed, claimWindow: 600 };
  });

  if (!lead.isLeader) {
    return { ...(await standings(db, args.dropId)), seed: lead.seed, alreadyDrawn: true };
  }
  const seed = lead.seed;
  const claimWindow = lead.claimWindow ?? 600;

  // 2. assign deterministic ranks (UPDATE has no LIMIT in pg -> id subquery)
  for (;;) {
    const n = await withTxn(
      db,
      async (c) =>
        (
          await c.query(
            `UPDATE entries SET lottery_rank = md5(id::text || $2)
             WHERE id IN (
               SELECT id FROM entries
               WHERE drop_id = $1 AND status = 'registered' AND lottery_rank IS NULL
               ORDER BY id LIMIT 2000
             )`,
            [args.dropId, seed],
          )
        ).rowCount ?? 0,
    );
    if (n === 0) break;
  }

  // 3. allocate best-ranked entries to free units, exactly once
  let winners = 0;
  for (;;) {
    const placed = await withTxn(db, async (c) => {
      const units = (
        await c.query(
          `SELECT unit_no FROM drop_units WHERE drop_id = $1 AND state = 'available' ORDER BY unit_no LIMIT 500`,
          [args.dropId],
        )
      ).rows as { unit_no: number }[];
      if (units.length === 0) return 0;

      const cand = (
        await c.query(
          `SELECT id, identity_id FROM entries
           WHERE drop_id = $1 AND status = 'registered'
           ORDER BY lottery_rank ASC, id ASC LIMIT $2`,
          [args.dropId, units.length],
        )
      ).rows as { id: string; identity_id: string }[];
      if (cand.length === 0) return 0;

      let placedHere = 0;
      for (let i = 0; i < Math.min(units.length, cand.length); i++) {
        const unitNo = units[i].unit_no;
        const w = cand[i];
        // claim the entry first (guarded) so it can never win two units
        const won = await c.query(`UPDATE entries SET status = 'won' WHERE id = $1 AND status = 'registered'`, [w.id]);
        if ((won.rowCount ?? 0) === 0) continue;
        await c.query(
          `UPDATE drop_units SET state = 'allocated', allocated_to = $3, allocated_at = now()
           WHERE drop_id = $1 AND unit_no = $2 AND state = 'available'`,
          [args.dropId, unitNo, w.id],
        );
        // deterministic id per unit => retries can't create duplicate allocations
        await c.query(
          `INSERT INTO allocations (id, drop_id, entry_id, identity_id, unit_no, claim_close_at)
           VALUES ($1, $2, $3, $4, $5, now() + ($6::text || ' seconds')::interval)
           ON CONFLICT (id) DO NOTHING`,
          [allocationIdFor(args.dropId, unitNo), args.dropId, w.id, w.identity_id, unitNo, claimWindow],
        );
        placedHere++;
      }
      return placedHere;
    });
    if (placed === 0) break;
    winners += placed;
  }

  // 4. mark the rest as lost, then finalize
  for (;;) {
    const n = await withTxn(
      db,
      async (c) =>
        (
          await c.query(
            `UPDATE entries SET status = 'lost'
             WHERE id IN (SELECT id FROM entries WHERE drop_id = $1 AND status = 'registered' ORDER BY id LIMIT 2000)`,
            [args.dropId],
          )
        ).rowCount ?? 0,
    );
    if (n === 0) break;
  }

  const totals = await withTxn(db, async (c) => {
    await c.query(`UPDATE drops SET status = 'drawn' WHERE id = $1 AND status = 'drawing'`, [args.dropId]);
    await audit(c, args.dropId, "draw_completed", region, { winners, seed });
    return standings(c, args.dropId);
  });

  return { winners, units: totals.units, entries: totals.entries, seed, alreadyDrawn: false };
}

/** A winner claims their reserved unit. Atomic purchase-limit + exactly-once order. */
export async function claimUnit(args: {
  allocationId: string;
  identityId: string;
  idempotencyKey: string;
  region?: RegionKey;
}): Promise<{ orderId: string; unitNo: number; alreadyClaimed: boolean }> {
  const region = args.region ?? "B";
  const orderId = orderIdFor(args.idempotencyKey);
  return withTxn(pool(region), async (c) => {
    const alloc = (
      await c.query(
        `SELECT id, drop_id, unit_no, state FROM allocations WHERE id = $1 AND identity_id = $2`,
        [args.allocationId, args.identityId],
      )
    ).rows[0] as { id: string; drop_id: string; unit_no: number; state: string } | undefined;
    if (!alloc) throw new EngineError("not_found", "allocation not found for this identity");

    const drop = (
      await c.query(`SELECT per_user_limit, price_cents FROM drops WHERE id = $1`, [alloc.drop_id])
    ).rows[0] as { per_user_limit: number; price_cents: number };

    // Order is the idempotency anchor: a replay (double click / retry) computes
    // the same id, fails to insert, and returns the existing claim as success.
    const ord = await c.query(
      `INSERT INTO orders (id, drop_id, identity_id, allocation_id, unit_no, amount_cents, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [orderId, alloc.drop_id, args.identityId, alloc.id, alloc.unit_no, drop.price_cents, args.idempotencyKey],
    );
    if ((ord.rowCount ?? 0) === 0) {
      return { orderId, unitNo: alloc.unit_no, alreadyClaimed: true };
    }

    // per-user limit without a counter: take the first free slot index
    let acquired = false;
    for (let idx = 0; idx < drop.per_user_limit; idx++) {
      const r = await c.query(
        `INSERT INTO purchase_slots (id, drop_id, identity_id, slot_index, order_id)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [slotId(alloc.drop_id, args.identityId, idx), alloc.drop_id, args.identityId, idx, orderId],
      );
      if ((r.rowCount ?? 0) > 0) {
        acquired = true;
        break;
      }
    }
    if (!acquired) throw new EngineError("limit", "purchase limit reached"); // rolls back the order insert

    // the DB clock is the authority on the claim window
    const claimed = await c.query(
      `UPDATE allocations SET state = 'claimed', order_id = $2
       WHERE id = $1 AND state = 'reserved' AND claim_close_at > now()`,
      [alloc.id, orderId],
    );
    if ((claimed.rowCount ?? 0) === 0) throw new EngineError("expired", "claim window has closed");

    await c.query(
      `UPDATE drop_units SET state = 'claimed', claimed_by = $3, order_id = $2
       WHERE drop_id = $1 AND unit_no = $4 AND state = 'allocated'`,
      [alloc.drop_id, orderId, args.identityId, alloc.unit_no],
    );
    await audit(c, alloc.drop_id, "unit_claimed", region, { unitNo: alloc.unit_no, orderId });
    return { orderId, unitNo: alloc.unit_no, alreadyClaimed: false };
  });
}
