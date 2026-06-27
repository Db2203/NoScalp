import Link from "next/link";
import { Container } from "./ui";
import { CATEGORIES } from "@/lib/catalog";

export function CategoryTiles() {
  return (
    <section className="border-b border-edge">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/shop?category=${c.key}`}
              className="lift group flex aspect-[4/3] flex-col justify-between rounded-2xl border border-edge bg-soft p-6 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.22)]"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{c.blurb}</span>
              <span className="display flex items-end justify-between text-2xl font-bold tracking-tight">
                {c.label}
                <span className="text-accent transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
