import { Container, Kicker } from "./ui";

const steps = [
  {
    label: "Enter the window",
    body: "When a drop opens you get a window to enter, not a countdown to win. Entering in the first second or the last makes no difference.",
  },
  {
    label: "We draw at random",
    body: "Once it closes we pick winners at random, one entry per verified person. Spin up a hundred accounts and you still get one entry.",
  },
  {
    label: "Winners check out",
    body: "If you're picked, your item is held so you can buy it at the normal price. You only pay if you win, and you can check the draw wasn't rigged.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-b border-edge">
      <Container className="py-16 sm:py-20">
        <Kicker>How it works</Kicker>
        <h2 className="display mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          It&apos;s a raffle, done properly.
        </h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.label} className="bg-canvas p-7">
              <div className="text-sm font-semibold tracking-tight text-accent">{s.label}</div>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
