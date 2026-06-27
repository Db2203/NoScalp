import Link from "next/link";
import { Card, Chip } from "./ui";
import { money, num } from "@/lib/format";
import { statusChip, type DropView } from "@/lib/catalog";

export function ProductCard({ d }: { d: DropView }) {
  const chip = statusChip(d.status);
  return (
    <Link href={`/drops/${d.id}`} className="group block">
      <Card lift className="overflow-hidden transition-colors duration-300 ease-out-cubic group-hover:border-accent/50">
        <div className="img-vignette relative aspect-[4/5] overflow-hidden bg-soft">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.image}
              alt={d.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 ease-out-cubic group-hover:scale-[1.05]"
            />
          ) : (
            <div className="display grid size-full place-items-center text-2xl text-mute">{d.brand}</div>
          )}

          <div className="absolute left-3 top-3">
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>

          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-colors hover:text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z" />
            </svg>
          </span>

          {/* enter-draw pill reveals on hover */}
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
  );
}
