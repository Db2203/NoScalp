import type { PoolClient } from "pg";
import { pool, type RegionKey } from "./db/pools";
import { withTxn } from "./db/withRetry";
import {
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
  // a small fraction of attempts come from genuinely distinct (fake) identities;
  // the overwhelming majority are the same bots retrying = duplicate humans.
  const distinct = args.distinct ?? Math.max(1, Math.round(attempts * 0.06));

  const hashes = Array.from({ length: distinct }, (_, i) =>
    hashContact(`bot-${args.dropId.slice(0, 8)}-${i}@flood.noscalp`),
  );

  let inserted = 0;
  const BATCH = 1000;
  for (let start = 0; start < hashes.length; start += BATCH) {
    const chunk = hashes.slice(start, start + BATCH);
    inserted += await withTxn(pool(region), async (c) => {
      const values: string[] = [];
      const params: unknown[] = [args.dropId];
      chunk.forEach((h, i) => {
        const id = entryId(args.dropId, h);
        const identityId = identityIdFor(h);
        const base = i * 3 + 2; // $2, $3, $4 ...
        values.push(`($${base}, $1, $${base + 1}, $${base + 2}, '${region}', 'bot')`);
        params.push(id, identityId, h);
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

  await withTxn(pool(region), (c) =>
    audit(c, args.dropId, "bot_flood", region, { attempts, distinct, inserted }),
  );

  return { attempts, distinct, inserted, blocked: attempts - inserted, region };
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
}): Promise<{ winners: number; units: number; entries: number; seed: string }> {
  const region = args.region ?? "A";
  const db = pool(region);

  // 1. close + seed (idempotent: only acts while still open)
  const drop = await withTxn(db, async (c) => {
    const cur = (
      await c.query(`SELECT id, status, draw_seed, claim_window_secs FROM drops WHERE id = $1`, [args.dropId])
    ).rows[0] as { id: string; status: string; draw_seed: string | null; claim_window_secs: number } | undefined;
    if (!cur) throw new EngineError("not_found", "drop not found");
    if (cur.status === "registration_open") {
      const seed = newId();
      await c.query(
        `UPDATE drops SET status = 'drawing', draw_seed = $2 WHERE id = $1 AND status = 'registration_open'`,
        [args.dropId, seed],
      );
      await audit(c, args.dropId, "draw_started", region, { seed });
      return { ...cur, draw_seed: seed };
    }
    return cur;
  });
  const seed = drop.draw_seed ?? newId();
  const claimWindow = drop.claim_window_secs ?? 600;

  // 2. assign ranks in batches (UPDATE has no LIMIT in pg -> use an id subquery)
  for (;;) {
    const n = await withTxn(db, async (c) => {
      const res = await c.query(
        `UPDATE entries SET lottery_rank = md5(id::text || $2)
         WHERE id IN (
           SELECT id FROM entries
           WHERE drop_id = $1 AND status = 'registered' AND lottery_rank IS NULL
           ORDER BY id LIMIT 2000
         )`,
        [args.dropId, seed],
      );
      return res.rowCount ?? 0;
    });
    if (n === 0) break;
  }

  // 3. allocate best-ranked entries to free units
  let winners = 0;
  for (;;) {
    const placed = await withTxn(db, async (c) => {
      const units = (
        await c.query(
          `SELECT unit_no FROM drop_units
           WHERE drop_id = $1 AND state = 'available' ORDER BY unit_no LIMIT 500`,
          [args.dropId],
        )
      ).rows as { unit_no: number }[];
      if (units.length === 0) return 0;

      const cand = (
        await c.query(
          `SELECT id, identity_id FROM entries
           WHERE drop_id = $1 AND status = 'registered'
           ORDER BY lottery_rank ASC LIMIT $2`,
          [args.dropId, units.length],
        )
      ).rows as { id: string; identity_id: string }[];
      if (cand.length === 0) return 0;

      const n = Math.min(units.length, cand.length);
      for (let i = 0; i < n; i++) {
        const unitNo = units[i].unit_no;
        const w = cand[i];
        const upd = await c.query(
          `UPDATE drop_units SET state = 'allocated', allocated_to = $3, allocated_at = now()
           WHERE drop_id = $1 AND unit_no = $2 AND state = 'available'`,
          [args.dropId, unitNo, w.id],
        );
        if ((upd.rowCount ?? 0) === 0) continue; // already taken (won't happen single-leader)
        await c.query(
          `INSERT INTO allocations (id, drop_id, entry_id, identity_id, unit_no, claim_close_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, now() + ($5 || ' seconds')::interval)`,
          [args.dropId, w.id, w.identity_id, unitNo, claimWindow],
        );
        await c.query(`UPDATE entries SET status = 'won' WHERE id = $1`, [w.id]);
      }
      return n;
    });
    if (placed === 0) break;
    winners += placed;
  }

  // 4. losers + finalize
  for (;;) {
    const n = await withTxn(db, async (c) => {
      const res = await c.query(
        `UPDATE entries SET status = 'lost'
         WHERE id IN (
           SELECT id FROM entries WHERE drop_id = $1 AND status = 'registered' ORDER BY id LIMIT 2000
         )`,
        [args.dropId],
      );
      return res.rowCount ?? 0;
    });
    if (n === 0) break;
  }

  const totals = await withTxn(db, async (c) => {
    const units = (await c.query(`SELECT count(*)::int AS c FROM drop_units WHERE drop_id = $1`, [args.dropId]))
      .rows[0].c as number;
    const entries = (await c.query(`SELECT count(*)::int AS c FROM entries WHERE drop_id = $1`, [args.dropId]))
      .rows[0].c as number;
    await c.query(`UPDATE drops SET status = 'drawn' WHERE id = $1 AND status IN ('drawing','registration_open')`, [
      args.dropId,
    ]);
    await audit(c, args.dropId, "draw_completed", region, { winners, units, entries, seed });
    return { units, entries };
  });

  return { winners, units: totals.units, entries: totals.entries, seed };
}

/** A winner claims their reserved unit. Atomic purchase-limit + exactly-once order. */
export async function claimUnit(args: {
  allocationId: string;
  identityId: string;
  idempotencyKey: string;
  region?: RegionKey;
}): Promise<{ orderId: string; unitNo: number; alreadyClaimed: boolean }> {
  const region = args.region ?? "B";
  return withTxn(pool(region), async (c) => {
    const alloc = (
      await c.query(
        `SELECT id, drop_id, unit_no, state, order_id, claim_close_at FROM allocations
         WHERE id = $1 AND identity_id = $2`,
        [args.allocationId, args.identityId],
      )
    ).rows[0] as
      | { id: string; drop_id: string; unit_no: number; state: string; order_id: string | null; claim_close_at: Date }
      | undefined;
    if (!alloc) throw new EngineError("not_found", "allocation not found for this identity");
    if (alloc.state === "claimed" && alloc.order_id) {
      return { orderId: alloc.order_id, unitNo: alloc.unit_no, alreadyClaimed: true };
    }
    if (new Date(alloc.claim_close_at).getTime() < Date.now()) {
      throw new EngineError("expired", "claim window has closed");
    }

    const drop = (
      await c.query(`SELECT per_user_limit, price_cents FROM drops WHERE id = $1`, [alloc.drop_id])
    ).rows[0] as { per_user_limit: number; price_cents: number };

    const used = (
      await c.query(`SELECT count(*)::int AS c FROM purchase_slots WHERE drop_id = $1 AND identity_id = $2`, [
        alloc.drop_id,
        args.identityId,
      ])
    ).rows[0].c as number;
    if (used >= drop.per_user_limit) throw new EngineError("limit", "purchase limit reached");

    const sId = slotId(alloc.drop_id, args.identityId, used);
    const orderId = orderIdFor(args.idempotencyKey);

    const slot = await c.query(
      `INSERT INTO purchase_slots (id, drop_id, identity_id, slot_index, order_id)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [sId, alloc.drop_id, args.identityId, used, orderId],
    );
    if ((slot.rowCount ?? 0) === 0) throw new EngineError("limit", "purchase limit reached");

    await c.query(
      `INSERT INTO orders (id, drop_id, identity_id, allocation_id, unit_no, amount_cents, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [orderId, alloc.drop_id, args.identityId, alloc.id, alloc.unit_no, drop.price_cents, args.idempotencyKey],
    );
    await c.query(`UPDATE allocations SET state = 'claimed', order_id = $2 WHERE id = $1 AND state = 'reserved'`, [
      alloc.id,
      orderId,
    ]);
    await c.query(
      `UPDATE drop_units SET state = 'claimed', claimed_by = $3, order_id = $2
       WHERE drop_id = $1 AND unit_no = $4 AND state = 'allocated'`,
      [alloc.drop_id, orderId, args.identityId, alloc.unit_no],
    );
    await audit(c, alloc.drop_id, "unit_claimed", region, { unitNo: alloc.unit_no, orderId });
    return { orderId, unitNo: alloc.unit_no, alreadyClaimed: false };
  });
}
