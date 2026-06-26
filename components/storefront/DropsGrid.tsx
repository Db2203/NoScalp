import { Container, Kicker } from "./ui";
import { ProductCard } from "./ProductCard";
import type { DropView } from "@/lib/catalog";

export function DropsGrid({ drops, title }: { drops: DropView[]; title: string }) {
  return (
    <section id="drops" className="border-b border-edge">
      <Container className="py-16 sm:py-20">
        <div className="flex items-end justify-between">
          <div>
            <Kicker>Live &amp; upcoming</Kicker>
            <h2 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          </div>
          <span className="hidden text-sm text-mute sm:block">{drops.length} drops</span>
        </div>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {drops.map((d) => (
            <ProductCard key={d.id} d={d} />
          ))}
        </div>
      </Container>
    </section>
  );
}
