import Link from "next/link";
import { Card, Chip } from "./ui";
import { money } from "@/lib/format";
import { statusChip, type DropView } from "@/lib/catalog";

export function ProductCard({ d }: { d: DropView }) {
  const chip = statusChip(d.status);
  return (
    <Link href={`/drops/${d.id}`} className="group block">
      <Card lift className="overflow-hidden">
        <div className="relative aspect-[4/5] bg-soft">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt={d.title} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="display grid size-full place-items-center text-2xl text-mute">{d.brand}</div>
          )}
          <div className="absolute left-3 top-3">
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-mute">{d.brand}</div>
          <div className="mt-1 line-clamp-1 font-medium">{d.title}</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="display text-lg font-bold">{money(d.price)}</span>
            <span className="text-sm font-medium text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Enter →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
