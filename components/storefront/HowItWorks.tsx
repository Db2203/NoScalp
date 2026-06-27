import { Container, Kicker } from "./ui";

const steps = [
  {
    label: "Enter the window",
    body: "When a drop goes live, verify you're a real person and enter. There's a window — not a race — so clicking fast does nothing.",
  },
  {
    label: "We draw at random",
    body: "When entry closes, winners are picked by a random draw from one entry per verified person. A thousand fake accounts count as one.",
  },
  {
    label: "Winners check out",
    body: "If you're drawn, the item is held for you with a window to buy at retail. You're only charged if you win — and you can verify the draw was fair.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-b border-edge">
      <Container className="py-16 sm:py-20">
        <Kicker>How drops work</Kicker>
        <h2 className="display mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Fair isn&apos;t a feature. It&apos;s the whole point.
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
