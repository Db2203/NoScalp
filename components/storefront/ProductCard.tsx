import Link from "next/link";
import { Card, Chip } from "./ui";
import { WishlistButton } from "./WishlistButton";
import { money, num } from "@/lib/format";
import { statusChip, type DropView } from "@/lib/catalog";

export function ProductCard({ d }: { d: DropView }) {
  const chip = statusChip(d.status);
  return (
    <div className="group relative">
      <Link href={`/drops/${d.id}`} className="block">
        <Card lift className="overflow-hidden transition-colors duration-300 ease-out-cubic group-hover:border-accent/50">
          <div className="img-vignette relative aspect-[4/5] overflow-hidden bg-soft">
            {d.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.image}
                alt={d.title}
                loading="lazy"
                style={{ viewTransitionName: `d-${d.id}` }}
                className="size-full object-cover transition-transform duration-500 ease-out-cubic group-hover:scale-[1.05]"
              />
            ) : (
              <div className="display grid size-full place-items-center text-2xl text-mute">{d.brand}</div>
            )}

            <div className="absolute left-3 top-3">
              <Chip tone={chip.tone}>{chip.label}</Chip>
            </div>

            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 ease-out-cubic group-hover:translate-y-0 group-hover:opacity-100">
              <span className="flex h-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                {d.status === "registration_open" ? "Enter the draw" : "View drop"}
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">{d.brand}</span>
              <span className="text-[11px] text-mute">{d.category}</span>
            </div>
            <div className="mt-1.5 line-clamp-1 font-medium">{d.title}</div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="display text-lg font-bold">{money(d.price)}</span>
              <span className="text-xs text-mute">{num(d.stock)} units</span>
            </div>
          </div>
        </Card>
      </Link>

      <WishlistButton id={d.id} className="absolute right-3 top-3 z-10" />
    </div>
  );
}
