# Even — drops, decided fairly

Bots win roughly 80% of every hyped drop — PS5s, GPUs, sneakers, concert tickets — by being faster than humans and by faking thousands of accounts. Even is a drop platform where that doesn't work.

The idea is simple: stop fighting bots on their terms.

1. **Fair lottery, not first-come.** Registration opens a window; winners are drawn at random. Clicking 10,000×/second buys a bot nothing.
2. **One entry per verified human.** A thousand fake accounts collapse to one entry — deduplicated atomically in the database, across every region at once.
3. **Exactly-once allocation.** 100 units means exactly 100 winners and zero oversells, even when two regions write to the same drop in the same millisecond.

All three are **database invariants**, not app-level hopes — which is why this is built on **Amazon Aurora DSQL** (distributed SQL, strong consistency, multi-region active-active).

## Why Aurora DSQL

The hard part of a fair drop isn't the UI — it's correctness under a global stampede. DSQL gives us:

- **Strong consistency across regions.** A write through `us-east-1` is immediately visible through `us-east-2`. No replication lag to oversell into.
- **Optimistic concurrency (no locks).** Conflicting writes are rejected at commit (`40001`) instead of blocking. We lean into this with a schema that almost never conflicts (below) and a retry wrapper for the rare genuine race.

### How the schema makes the guarantees hold

The design rule: **never keep a hot counter, and encode every uniqueness rule as a derived primary key.**

- **Inventory is one row per unit** (`drop_units`), so allocation writes spread across the keyspace — there's no single `stock_remaining` row to contend on, and overselling is structurally impossible.
- **One entry per human** = `entries.id = uuidv5(drop_id + identity_hash)`. A duplicate computes the *same* id and hits `ON CONFLICT (id) DO NOTHING`. The dedup is a single primary-key probe, enforced identically from any region.
- **One verified human** = `identity_index` keyed by an HMAC of the normalized email/phone (gmail dots and `+aliases` stripped).
- **Per-user purchase limit** = one `purchase_slots` row per allowed purchase, keyed by `uuidv5(drop + identity + slot_index)` — a limit with no counter.
- The **draw** is single-leader, idempotent, and seeded with a published value so anyone can recompute it. It paginates to stay within DSQL's 3,000-rows-per-transaction limit.

See [`lib/engine.ts`](lib/engine.ts) for the transactions and [`lib/db/migrations.ts`](lib/db/migrations.ts) for the schema.

## Quickstart

```bash
npm install
cp .env.example .env.local   # set EVEN_IDENTITY_SECRET; pick local or DSQL
npm run db:migrate           # create tables
npm run db:seed              # seed the demo PS5 drop
npm run dev                  # http://localhost:3000
```

- **No AWS handy?** Set `DATABASE_URL` to any Postgres and it runs in local mode (both regions share one DB).
- **Real thing?** Provision Aurora DSQL and set the `DSQL_*` vars — see [SETUP.md](SETUP.md).

Then open:

- `/` — the pitch
- `/drops/<id>` — the consumer drop experience (verify → enter → win → claim)
- `/control` — **Mission Control**: two region panels, the bot flood, the draw, and the cross-region consistency proof

## Verify it

```bash
npm run test:engine
```

Seeds a drop and asserts the real guarantees: duplicate humans collapse to one entry, a same-human race across two regions yields exactly one entry, a bot flood inserts only distinct identities, the draw produces exactly `stock` winners with **zero oversold** and unique units, double-claims are idempotent, and both regions agree on the totals.

## Stack

Next.js (App Router) on Vercel · Amazon Aurora DSQL · `pg` with IAM token auth · Tailwind v4 · Framer Motion.
