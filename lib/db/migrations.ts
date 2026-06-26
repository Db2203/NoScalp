import { dbMode } from "./pools";

/**
 * Schema as a list of single DDL statements. Aurora DSQL allows only one DDL
 * statement per transaction and can't mix DDL with DML, so we run these one at
 * a time (see scripts/migrate.ts). No foreign keys (DSQL has none — relations
 * are enforced in app code), no SERIAL (UUID keys), no triggers.
 */
export function ddlStatements(): { name: string; sql: string }[] {
  // DSQL requires CREATE INDEX ASYNC; plain Postgres doesn't understand ASYNC.
  const idx = (name: string, table: string, cols: string) =>
    dbMode() === "dsql"
      ? `CREATE INDEX ASYNC ${name} ON ${table} (${cols})`
      : `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`;

  return [
    {
      name: "brands",
      sql: `CREATE TABLE IF NOT EXISTS brands (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        slug        TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "drops",
      sql: `CREATE TABLE IF NOT EXISTS drops (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id           UUID NOT NULL,
        title              TEXT NOT NULL,
        subtitle           TEXT,
        image_url          TEXT,
        price_cents        INT NOT NULL DEFAULT 0,
        total_stock        INT NOT NULL,              -- display only; never decremented
        per_user_limit     INT NOT NULL DEFAULT 1,
        register_open_at   TIMESTAMPTZ NOT NULL,
        register_close_at  TIMESTAMPTZ NOT NULL,
        draw_at            TIMESTAMPTZ NOT NULL,
        claim_window_secs  INT NOT NULL DEFAULT 600,
        status             TEXT NOT NULL DEFAULT 'registration_open',
        draw_seed          TEXT,
        meta_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // one row per physical unit — this is what spreads allocation writes so
      // there is never a hot "stock_remaining" counter to fight over.
      name: "drop_units",
      sql: `CREATE TABLE IF NOT EXISTS drop_units (
        drop_id       UUID NOT NULL,
        unit_no       INT  NOT NULL,
        state         TEXT NOT NULL DEFAULT 'available', -- available|allocated|claimed
        allocated_to  UUID,                              -- winning entry id
        allocated_at  TIMESTAMPTZ,
        claimed_by    UUID,                              -- identity id
        order_id      UUID,
        PRIMARY KEY (drop_id, unit_no)
      )`,
    },
    {
      name: "identities",
      sql: `CREATE TABLE IF NOT EXISTS identities (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_hash TEXT NOT NULL,
        display_name  TEXT,
        verified_via  TEXT NOT NULL DEFAULT 'otp_email',
        device_fp     TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // global "one human" guard: the hash IS the primary key, so a second
      // verification of the same contact collides instead of creating a twin.
      name: "identity_index",
      sql: `CREATE TABLE IF NOT EXISTS identity_index (
        identity_hash TEXT PRIMARY KEY,
        identity_id   UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // PK is uuidv5(drop_id + identity_hash) — a duplicate entry self-collides.
      name: "entries",
      sql: `CREATE TABLE IF NOT EXISTS entries (
        id             UUID PRIMARY KEY,
        drop_id        UUID NOT NULL,
        identity_id    UUID NOT NULL,
        identity_hash  TEXT NOT NULL,
        region_written TEXT NOT NULL DEFAULT 'A',
        source         TEXT NOT NULL DEFAULT 'human',   -- human|bot (demo labeling)
        lottery_rank   TEXT,                            -- md5(id||seed); ordered for the draw
        status         TEXT NOT NULL DEFAULT 'registered',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "allocations",
      sql: `CREATE TABLE IF NOT EXISTS allocations (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drop_id        UUID NOT NULL,
        entry_id       UUID NOT NULL,
        identity_id    UUID NOT NULL,
        unit_no        INT  NOT NULL,
        state          TEXT NOT NULL DEFAULT 'reserved', -- reserved|claimed|expired
        claim_open_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        claim_close_at TIMESTAMPTZ NOT NULL,
        order_id       UUID,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // id derived from the idempotency key => double-click buys collapse to one.
      name: "orders",
      sql: `CREATE TABLE IF NOT EXISTS orders (
        id              UUID PRIMARY KEY,
        drop_id         UUID NOT NULL,
        identity_id     UUID NOT NULL,
        allocation_id   UUID NOT NULL,
        unit_no         INT  NOT NULL,
        amount_cents    INT  NOT NULL DEFAULT 0,
        idempotency_key TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'paid',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // per-user purchase limit without a counter: one slot row per allowed buy,
      // keyed by uuidv5(drop + identity + slot_index).
      name: "purchase_slots",
      sql: `CREATE TABLE IF NOT EXISTS purchase_slots (
        id          UUID PRIMARY KEY,
        drop_id     UUID NOT NULL,
        identity_id UUID NOT NULL,
        slot_index  INT  NOT NULL,
        order_id    UUID,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },
    {
      // append-only, random PK => zero contention. The public proof surface,
      // readable from either region.
      name: "audit_log",
      sql: `CREATE TABLE IF NOT EXISTS audit_log (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drop_id     UUID,
        action      TEXT NOT NULL,
        region      TEXT,
        detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    },

    // indexes
    { name: "idx_drops_status", sql: idx("idx_drops_status", "drops", "status") },
    { name: "idx_units_state", sql: idx("idx_units_state", "drop_units", "drop_id, state") },
    { name: "idx_entries_drop_status", sql: idx("idx_entries_drop_status", "entries", "drop_id, status") },
    { name: "idx_entries_rank", sql: idx("idx_entries_rank", "entries", "drop_id, lottery_rank") },
    { name: "idx_alloc_identity", sql: idx("idx_alloc_identity", "allocations", "identity_id, drop_id") },
    { name: "idx_audit_drop_at", sql: idx("idx_audit_drop_at", "audit_log", "drop_id, at") },
  ];
}
