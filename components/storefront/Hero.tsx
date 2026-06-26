import { Countdown } from "../Countdown";
import { Button, Chip, Container, Kicker } from "./ui";
import { money } from "@/lib/format";
import { statusChip, type DropView } from "@/lib/catalog";

export function Hero({ d }: { d: DropView }) {
  const chip = statusChip(d.status);
  return (
    <section className="border-b border-edge">
      <Container className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <Kicker>This week&apos;s drop</Kicker>
          <h1 className="display mt-4 text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            {d.title}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-mute">
            {d.tagline ||
              "Enter the draw for a fair shot. No bots, no scalpers, no carts gone in four seconds."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button href={`/drops/${d.id}`} size="lg">
              Enter the draw
            </Button>
            <Button href="/#drops" variant="secondary" size="lg">
              View all drops
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-sm text-mute">
            <span className="font-medium text-fg">{money(d.price)}</span>
            <span>·</span>
            {d.status === "registration_open" ? (
              <span>
                entry closes in <Countdown to={d.closeAt} />
              </span>
            ) : (
              <span>{chip.label}</span>
            )}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-soft shadow-[0_40px_90px_-40px_rgba(0,0,0,0.4)]">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt={d.title} className="size-full object-cover" />
          ) : null}
          <div className="absolute left-4 top-4">
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
        </div>
      </Container>
    </section>
  );
}
