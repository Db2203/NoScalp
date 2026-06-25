import { pool } from "./db/pools";
import { DEMO_BRAND_ID, DEMO_DROP_ID } from "./constants";

export { DEMO_BRAND_ID, DEMO_DROP_ID };

/** Reset + (re)create the demo drop. Clears this drop's transactional rows so
 *  the demo always starts clean. Does not close the pool. */
export async function seedDemo(stock = 100): Promise<{ dropId: string; stock: number }> {
  const db = pool("A");

  for (const t of ["orders", "purchase_slots", "allocations", "drop_units", "entries", "audit_log"]) {
    await db.query(`DELETE FROM ${t} WHERE drop_id = $1`, [DEMO_DROP_ID]);
  }

  await db.query(`INSERT INTO brands (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
    DEMO_BRAND_ID,
    "NovaTech",
    "novatech",
  ]);

  await db.query(
    `INSERT INTO drops
       (id, brand_id, title, subtitle, image_url, price_cents, total_stock, per_user_limit,
        register_open_at, register_close_at, draw_at, claim_window_secs, status, draw_seed, meta_json)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8,
        now(), now() + interval '1 day', now() + interval '1 day', 600, 'registration_open', NULL, '{}'::jsonb)
     ON CONFLICT (id) DO UPDATE SET
        total_stock = EXCLUDED.total_stock,
        per_user_limit = EXCLUDED.per_user_limit,
        register_open_at = now(),
        register_close_at = now() + interval '1 day',
        draw_at = now() + interval '1 day',
        status = 'registration_open',
        draw_seed = NULL`,
    [DEMO_DROP_ID, DEMO_BRAND_ID, "PlayStation 5 — Restock Drop", `${stock} units. Bots not invited.`, null, 49999, stock, 1],
  );

  const values: string[] = [];
  const params: unknown[] = [DEMO_DROP_ID];
  for (let i = 0; i < stock; i++) {
    values.push(`($1, $${i + 2})`);
    params.push(i);
  }
  await db.query(`INSERT INTO drop_units (drop_id, unit_no) VALUES ${values.join(",")}`, params);

  return { dropId: DEMO_DROP_ID, stock };
}
