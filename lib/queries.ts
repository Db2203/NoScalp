import { pool, regionLabels, type RegionKey } from "./db/pools";

export type DropRow = {
  id: string;
  brand_id: string;
  brand_name: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price_cents: number;
  total_stock: number;
  per_user_limit: number;
  register_open_at: string;
  register_close_at: string;
  draw_at: string;
  claim_window_secs: number;
  status: string;
  draw_seed: string | null;
};

export async function listDrops(region: RegionKey = "A"): Promise<DropRow[]> {
  const res = await pool(region).query(
    `SELECT d.*, b.name AS brand_name
     FROM drops d LEFT JOIN brands b ON b.id = d.brand_id
     ORDER BY d.register_close_at ASC`,
  );
  return res.rows;
}

export async function getDrop(dropId: string, region: RegionKey = "A"): Promise<DropRow | null> {
  const res = await pool(region).query(
    `SELECT d.*, b.name AS brand_name
     FROM drops d LEFT JOIN brands b ON b.id = d.brand_id
     WHERE d.id = $1`,
    [dropId],
  );
  return res.rows[0] ?? null;
}

export type DropStats = {
  region: RegionKey;
  regionLabel: string;
  entriesTotal: number;
  humans: number;
  bots: number;
  won: number;
  wonHumans: number;
  wonBots: number;
  lost: number;
  registered: number;
  units: { total: number; available: number; allocated: number; claimed: number };
};

/** All the live counters for a drop, read from a specific region (proves consistency). */
export async function getDropStats(dropId: string, region: RegionKey = "A"): Promise<DropStats> {
  const db = pool(region);
  const [entries, units] = await Promise.all([
    db.query(
      `SELECT
         count(*)::int AS entries_total,
         coalesce(sum(case when source='human' then 1 else 0 end),0)::int AS humans,
         coalesce(sum(case when source='bot'   then 1 else 0 end),0)::int AS bots,
         coalesce(sum(case when status='won'        then 1 else 0 end),0)::int AS won,
         coalesce(sum(case when status='won' and source='human' then 1 else 0 end),0)::int AS won_humans,
         coalesce(sum(case when status='won' and source='bot'   then 1 else 0 end),0)::int AS won_bots,
         coalesce(sum(case when status='lost'       then 1 else 0 end),0)::int AS lost,
         coalesce(sum(case when status='registered' then 1 else 0 end),0)::int AS registered
       FROM entries WHERE drop_id = $1`,
      [dropId],
    ),
    db.query(
      `SELECT
         count(*)::int AS total,
         coalesce(sum(case when state='available' then 1 else 0 end),0)::int AS available,
         coalesce(sum(case when state='allocated' then 1 else 0 end),0)::int AS allocated,
         coalesce(sum(case when state='claimed'   then 1 else 0 end),0)::int AS claimed
       FROM drop_units WHERE drop_id = $1`,
      [dropId],
    ),
  ]);
  const e = entries.rows[0];
  const u = units.rows[0];
  return {
    region,
    regionLabel: regionLabels[region],
    entriesTotal: e.entries_total,
    humans: e.humans,
    bots: e.bots,
    won: e.won,
    wonHumans: e.won_humans,
    wonBots: e.won_bots,
    lost: e.lost,
    registered: e.registered,
    units: { total: u.total, available: u.available, allocated: u.allocated, claimed: u.claimed },
  };
}

export type Winner = { unitNo: number; source: string; id: string };

/** The real allocations for a drawn drop — one per unit, with the winner's source. */
export async function getWinners(dropId: string, region: RegionKey = "A"): Promise<Winner[]> {
  const res = await pool(region).query(
    `SELECT a.unit_no, e.source, a.identity_id
     FROM allocations a JOIN entries e ON e.id = a.entry_id
     WHERE a.drop_id = $1 ORDER BY a.unit_no`,
    [dropId],
  );
  return res.rows.map((r) => ({ unitNo: r.unit_no, source: r.source, id: String(r.identity_id).slice(0, 4) }));
}

export type IdentityStatus = {
  entryId: string;
  entryStatus: string;
  lotteryRank: string | null;
  allocationId: string | null;
  unitNo: number | null;
  allocationState: string | null;
  claimCloseAt: string | null;
  orderId: string | null;
} | null;

export async function getIdentityStatus(
  dropId: string,
  identityId: string,
  region: RegionKey = "A",
): Promise<IdentityStatus> {
  const res = await pool(region).query(
    `SELECT e.id AS entry_id, e.status AS entry_status, e.lottery_rank,
            a.id AS allocation_id, a.unit_no, a.state AS allocation_state,
            a.claim_close_at, a.order_id
     FROM entries e
     LEFT JOIN allocations a ON a.entry_id = e.id
     WHERE e.drop_id = $1 AND e.identity_id = $2
     LIMIT 1`,
    [dropId, identityId],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    entryId: r.entry_id,
    entryStatus: r.entry_status,
    lotteryRank: r.lottery_rank,
    allocationId: r.allocation_id,
    unitNo: r.unit_no,
    allocationState: r.allocation_state,
    claimCloseAt: r.claim_close_at,
    orderId: r.order_id,
  };
}

export type AuditRow = {
  id: string;
  action: string;
  region: string | null;
  detail: Record<string, unknown>;
  at: string;
};

export async function getAuditLog(dropId: string, region: RegionKey = "A", limit = 40): Promise<AuditRow[]> {
  const res = await pool(region).query(
    `SELECT id, action, region, detail_json, at FROM audit_log
     WHERE drop_id = $1 ORDER BY at DESC LIMIT $2`,
    [dropId, limit],
  );
  return res.rows.map((r) => ({
    id: r.id,
    action: r.action,
    region: r.region,
    detail: r.detail_json,
    at: r.at,
  }));
}

export type MyEntry = {
  dropId: string;
  title: string;
  image: string | null;
  price: number;
  entryStatus: string;
  unitNo: number | null;
  allocState: string | null;
  orderId: string | null;
  dropStatus: string;
  closeAt: string;
};

/** Every drop a verified identity has entered, with its outcome. Read-only. */
export async function getMyEntries(identityId: string, region: RegionKey = "A"): Promise<MyEntry[]> {
  const res = await pool(region).query(
    `SELECT e.drop_id, e.status AS entry_status, e.created_at,
            a.unit_no, a.state AS alloc_state, a.order_id,
            d.title, d.image_url, d.price_cents, d.status AS drop_status, d.register_close_at
     FROM entries e
     JOIN drops d ON d.id = e.drop_id
     LEFT JOIN allocations a ON a.entry_id = e.id
     WHERE e.identity_id = $1
     ORDER BY e.created_at DESC`,
    [identityId],
  );
  return res.rows.map((r) => ({
    dropId: r.drop_id,
    title: r.title,
    image: r.image_url,
    price: r.price_cents,
    entryStatus: r.entry_status,
    unitNo: r.unit_no,
    allocState: r.alloc_state,
    orderId: r.order_id,
    dropStatus: r.drop_status,
    closeAt: r.register_close_at,
  }));
}
