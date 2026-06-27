import { Suspense } from "react";
import { Nav, Footer } from "@/components/chrome";
import { Container, Kicker } from "@/components/storefront/ui";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ShopFilter } from "@/components/storefront/ShopFilter";
import { listDrops } from "@/lib/queries";
import { toView, type DropView } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category;
  const q = sp.q?.toLowerCase().trim();

  let drops: DropView[] = [];
  try {
    drops = (await listDrops("A")).map(toView);
  } catch {
    // DB unreachable — render empty catalog gracefully
  }

  let filtered = drops;
  if (category) filtered = filtered.filter((d) => d.category === category);
  if (q) filtered = filtered.filter((d) => `${d.title} ${d.brand} ${d.category}`.toLowerCase().includes(q));

  const heading = category ?? (q ? `Results for “${sp.q}”` : "All drops");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <Container className="py-12">
          <Kicker>Shop</Kicker>
          <h1 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          <div className="mt-7">
            <Suspense fallback={null}>
              <ShopFilter />
            </Suspense>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((d) => (
                <ProductCard key={d.id} d={d} />
              ))}
            </div>
          ) : (
            <div className="mt-16 rounded-2xl border border-edge bg-soft/50 py-20 text-center">
              <p className="text-mute">No drops match that yet.</p>
              <a href="/shop" className="mt-3 inline-block text-sm text-accent hover:underline">
                Clear filters →
              </a>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
