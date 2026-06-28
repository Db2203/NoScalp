import type { DropRow } from "./queries";

export type Spec = { k: string; v: string };

export type DropView = {
  id: string;
  title: string;
  brand: string;
  category: string;
  image: string | null;
  images: string[];
  price: number;
  retail?: number;
  resale?: number;
  tagline: string;
  specs: Spec[];
  status: string;
  openAt: string;
  closeAt: string;
  stock: number;
};

type Meta = {
  brand?: string;
  category?: string;
  images?: string[];
  tagline?: string;
  specs?: Spec[];
  retail_cents?: number;
  resale_cents?: number;
};

/** Map a DB drop row to a presentation view model (display extras live in meta_json). */
export function toView(d: DropRow): DropView {
  const m = ((d as unknown as { meta_json?: Meta }).meta_json ?? {}) as Meta;
  const images = m.images?.length ? m.images : d.image_url ? [d.image_url] : [];
  return {
    id: d.id,
    title: d.title,
    brand: m.brand ?? d.brand_name ?? "NoScalp",
    category: m.category ?? "Drop",
    image: d.image_url ?? images[0] ?? null,
    images,
    price: d.price_cents,
    retail: m.retail_cents,
    resale: m.resale_cents,
    tagline: m.tagline ?? d.subtitle ?? "",
    specs: m.specs ?? [],
    status: d.status,
    openAt: d.register_open_at,
    closeAt: d.register_close_at,
    stock: d.total_stock,
  };
}

export function statusChip(status: string): { tone: "live" | "upcoming" | "closed"; label: string } {
  if (status === "registration_open") return { tone: "live", label: "Live" };
  if (status === "upcoming") return { tone: "upcoming", label: "Upcoming" };
  return { tone: "closed", label: status === "drawn" ? "Drawn" : "Closed" };
}

export const CATEGORIES = [
  { label: "Sneakers", key: "Sneakers", blurb: "The pairs everyone's chasing." },
  { label: "Tickets", key: "Tickets", blurb: "Seats at the price on the ticket." },
  { label: "Tech", key: "Tech", blurb: "The stuff that sells out in seconds." },
  { label: "Apparel", key: "Apparel", blurb: "Limited runs, one each." },
];
