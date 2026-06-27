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
          <Kicker>The story</Kicker>
          <h2 className="display mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Built for the people who actually wanted one.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-mute">
            Hype drops became a bot sport — real fans never stood a chance. NoScalp flips it: a
            random draw where being faster or running a hundred accounts buys you nothing. Just a
            fair shot, every time.
          </p>
          <div className="mt-7">
            <Button href="/#drops" variant="accent">
              Shop the drops
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
