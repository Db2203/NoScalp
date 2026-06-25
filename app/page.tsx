import { Nav, Footer } from "@/components/chrome";
import { Button, Panel, Pill, SectionLabel } from "@/components/ui";
import { DEMO_DROP_ID } from "@/lib/constants";

const pillars = [
  {
    n: "01",
    title: "A fair lottery, not a race",
    body: "Registration opens a window; winners are drawn at random. Clicking 10,000 times a second buys a bot exactly nothing.",
  },
  {
    n: "02",
    title: "One entry per verified human",
    body: "A bot spinning up a thousand fake accounts collapses to one entry — deduped atomically at the database layer, across every region at once.",
  },
  {
    n: "03",
    title: "Exactly-once allocation",
    body: "100 units means exactly 100 winners and zero oversells — even with buyers in two regions hitting the same drop in the same millisecond.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Pill tone="vermilion">Bots win 80% of every drop. Not here.</Pill>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Drops, decided <span className="text-verdant">fairly</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            NoScalp is a fair-drop platform where scalper bots can&apos;t win — by speed or by faking
            accounts. We make scalping mathematically pointless, and prove it on screen.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button href={`/drops/${DEMO_DROP_ID}`}>Enter the PS5 drop →</Button>
            <Button href="/control" variant="ghost">
              Open Mission Control
            </Button>
          </div>

          <p className="mono mt-12 max-w-2xl border-l-2 border-verdant/40 pl-4 text-sm leading-relaxed text-muted">
            &ldquo;In 2020 I tried to buy a PS5 six times. A bot took every one. So I built the
            drop platform where that can&apos;t happen.&rdquo;
          </p>
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-16">
        <SectionLabel>How NoScalp is different</SectionLabel>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <Panel key={p.n} className="p-6">
              <div className="mono text-sm text-verdant">{p.n}</div>
              <h3 className="mt-3 font-display text-xl font-medium">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </Panel>
          ))}
        </div>

        <Panel className="mt-10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SectionLabel>The engine underneath</SectionLabel>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                Every guarantee is enforced by <span className="text-paper">Amazon Aurora DSQL</span> —
                a distributed SQL database with strong consistency across regions. Uniqueness and
                exactly-once allocation aren&apos;t app-level wishes; they&apos;re database
                invariants that hold even when two regions write at the same instant.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Pill tone="verdant">strong consistency</Pill>
              <Pill tone="paper">multi-region active-active</Pill>
              <Pill tone="muted">exactly-once</Pill>
            </div>
          </div>
        </Panel>
      </section>

      <Footer />
    </>
  );
}
