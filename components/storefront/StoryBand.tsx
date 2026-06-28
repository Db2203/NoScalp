import { Button, Container, Kicker } from "./ui";

export function StoryBand() {
  return (
    <section className="border-b border-edge">
      <Container className="grid items-stretch gap-0 py-16 sm:py-20 lg:grid-cols-2">
        <div className="relative min-h-[280px] overflow-hidden rounded-3xl bg-soft lg:rounded-r-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/story.jpg" alt="Fans at a drop" className="size-full object-cover" />
          <div className="scrim absolute inset-0" />
        </div>
        <div className="flex flex-col justify-center rounded-3xl bg-soft p-10 text-fg lg:rounded-l-none">
          <Kicker>Why we built this</Kicker>
          <h2 className="display mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            I got tired of losing to bots.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-mute">
            In 2020 I lost six hyped drops in a row to bots. Sneakers, concert tickets, keyboards, same
            story: gone in seconds, back online an hour later at triple the price. NoScalp is the fix I
            wanted. A random draw, one entry per real person, where being fast or running fifty accounts
            gets you nowhere.
          </p>
          <div className="mt-7">
            <Button href="/shop" variant="accent">
              See what&apos;s dropping
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
