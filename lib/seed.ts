import { pool } from "./db/pools";
import { DEMO_BRAND_ID, DEMO_DROP_ID } from "./constants";

export { DEMO_BRAND_ID, DEMO_DROP_ID };

type SeedDrop = {
  id: string;
  title: string;
  brand: string;
  category: string;
  tagline: string;
  image: string;
  price_cents: number;
  retail_cents?: number;
  resale_cents?: number;
  stock: number;
  per_user_limit: number;
  status: "registration_open" | "upcoming";
  specs: { k: string; v: string }[];
};

// The demo catalog. Display extras (brand/category/images/specs) live in meta_json
// so no schema/query changes are needed.
export const CATALOG: SeedDrop[] = [
  {
    id: DEMO_DROP_ID,
    title: "PlayStation 5 — Restock Drop",
    brand: "PlayStation",
    category: "Consoles",
    tagline: "The console that's been impossible to buy since launch. This time, a bot can't take it.",
    image: "/drops/ps5.jpg",
    price_cents: 49999,
    retail_cents: 49999,
    resale_cents: 89900,
    stock: 100,
    per_user_limit: 1,
    status: "registration_open",
    specs: [
      { k: "Edition", v: "Disc · 1TB" },
      { k: "Retail", v: "$499.99" },
      { k: "Allocation", v: "1 per person" },
    ],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Retro High 'Cobalt'",
    brand: "Studio 23",
    category: "Sneakers",
    tagline: "A 1,200-pair release that usually sells out in nine seconds. Not to a sneaker bot.",
    image: "/drops/sneakers.jpg",
    price_cents: 19000,
    retail_cents: 19000,
    resale_cents: 42000,
    stock: 80,
    per_user_limit: 1,
    status: "registration_open",
    specs: [
      { k: "Colorway", v: "Cobalt / Bone" },
      { k: "Sizes", v: "US 6–14" },
      { k: "Retail", v: "$190" },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Aurora — World Tour, Night 1",
    brand: "Live Nation-free",
    category: "Tickets",
    tagline: "Floor tickets at face value, drawn by lottery. No queue, no scalpers, no 4x markup.",
    image: "/drops/tickets.jpg",
    price_cents: 12500,
    retail_cents: 12500,
    resale_cents: 48000,
    stock: 120,
    per_user_limit: 2,
    status: "registration_open",
    specs: [
      { k: "Section", v: "GA Floor" },
      { k: "Limit", v: "2 per person" },
      { k: "Face value", v: "$125" },
    ],
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "RTX 5090 — Founders Drop",
    brand: "NV-class",
    category: "Tech",
    tagline: "Flagship GPUs vanish to scalper rigs in milliseconds. Here, speed buys nothing.",
    image: "/drops/gpu.jpg",
    price_cents: 199900,
    retail_cents: 199900,
    resale_cents: 320000,
    stock: 60,
    per_user_limit: 1,
    status: "registration_open",
    specs: [
      { k: "Memory", v: "32GB GDDR7" },
      { k: "Edition", v: "Founders" },
      { k: "Retail", v: "$1,999" },
    ],
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    title: "Chrono Diver 'Midnight'",
    brand: "Meridian",
    category: "Tech",
    tagline: "A 300-piece automatic. Opens Friday — register now for a fair shot.",
    image: "/drops/watch.jpg",
    price_cents: 78000,
    retail_cents: 78000,
    resale_cents: 150000,
    stock: 40,
    per_user_limit: 1,
    status: "upcoming",
    specs: [
      { k: "Movement", v: "Automatic" },
      { k: "Edition", v: "300 pieces" },
      { k: "Retail", v: "$780" },
    ],
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    title: "Designer Figure 'Macaron'",
    brand: "Pop Lab",
    category: "Collectibles",
    tagline: "The blind-box hype piece resellers love to hoard. One per person, drawn fairly.",
    image: "/drops/figure.jpg",
    price_cents: 8500,
    retail_cents: 8500,
    resale_cents: 26000,
    stock: 150,
    per_user_limit: 1,
    status: "registration_open",
    specs: [
      { k: "Series", v: "Macaron" },
      { k: "Limit", v: "1 per person" },
      { k: "Retail", v: "$85" },
    ],
  },
];

async function seedOne(d: SeedDrop) {
  const db = pool("A");
  for (const t of ["orders", "purchase_slots", "allocations", "drop_units", "entries", "audit_log"]) {
    await db.query(`DELETE FROM ${t} WHERE drop_id = $1`, [d.id]);
  }

  const meta = {
    brand: d.brand,
    category: d.category,
    tagline: d.tagline,
    images: [d.image],
    specs: d.specs,
    retail_cents: d.retail_cents,
    resale_cents: d.resale_cents,
  };

  // upcoming drops open in the future; live ones are open now
  const opensExpr = d.status === "upcoming" ? "now() + interval '2 days'" : "now()";
  const closesExpr = d.status === "upcoming" ? "now() + interval '4 days'" : "now() + interval '1 day'";

  await db.query(
    `INSERT INTO drops
       (id, brand_id, title, subtitle, image_url, price_cents, total_stock, per_user_limit,
        register_open_at, register_close_at, draw_at, claim_window_secs, status, draw_seed, meta_json)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8,
        ${opensExpr}, ${closesExpr}, ${closesExpr}, 600, $9, NULL, $10::jsonb)
     ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url,
        price_cents = EXCLUDED.price_cents, total_stock = EXCLUDED.total_stock,
        per_user_limit = EXCLUDED.per_user_limit, register_open_at = ${opensExpr},
        register_close_at = ${closesExpr}, draw_at = ${closesExpr}, status = EXCLUDED.status,
        draw_seed = NULL, meta_json = EXCLUDED.meta_json`,
    [d.id, DEMO_BRAND_ID, d.title, d.tagline, d.image, d.price_cents, d.stock, d.per_user_limit, d.status, JSON.stringify(meta)],
  );

  const values: string[] = [];
  const params: unknown[] = [d.id];
  for (let i = 0; i < d.stock; i++) {
    values.push(`($1, $${i + 2})`);
    params.push(i);
  }
  await db.query(`INSERT INTO drop_units (drop_id, unit_no) VALUES ${values.join(",")}`, params);
}

/** Reset + (re)create the demo catalog. `stock` overrides the featured drop's stock. */
export async function seedDemo(stock = 100): Promise<{ dropId: string; drops: number }> {
  const db = pool("A");
  await db.query(`INSERT INTO brands (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
    DEMO_BRAND_ID,
    "NoScalp",
    "noscalp",
  ]);

  for (const d of CATALOG) {
    await seedOne(d.id === DEMO_DROP_ID ? { ...d, stock } : d);
  }
  return { dropId: DEMO_DROP_ID, drops: CATALOG.length };
}
