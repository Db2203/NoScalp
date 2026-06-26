import { Nav, Footer } from "@/components/chrome";
import { Hero } from "@/components/storefront/Hero";
import { DropsGrid } from "@/components/storefront/DropsGrid";
import { CategoryTiles } from "@/components/storefront/CategoryTiles";
import { StoryBand } from "@/components/storefront/StoryBand";
import { HowItWorks } from "@/components/storefront/HowItWorks";
import { Newsletter } from "@/components/storefront/Newsletter";
import { listDrops } from "@/lib/queries";
import { toView, type DropView } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  let drops: DropView[] = [];
  try {
    drops = (await listDrops("A")).map(toView);
  } catch {
    // DB not reachable — still render the static storefront shell
  }
  const featured = drops.find((d) => d.status === "registration_open") ?? drops[0];

  return (
    <>
      <Nav />
      <main className="flex-1">
        {featured && <Hero d={featured} />}
        {drops.length > 0 && <DropsGrid drops={drops} title="Dropping now" />}
        <CategoryTiles />
        <StoryBand />
        <HowItWorks />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
