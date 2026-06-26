import Link from "next/link";
import { Nav, Footer } from "@/components/chrome";
import { FairnessGate } from "@/components/FairnessGate";
import { Button, Eyebrow, Panel, Pill } from "@/components/ui";
import { DEMO_DROP_ID } from "@/lib/constants";
import { money } from "@/lib/format";

const guarantees = [
  {
    tag: "lottery",
    title: "A draw, not a race",
    body: "Registration opens a window; winners are picked at random. A bot clicking 10,000 times a second has the exact same odds as you — speed buys nothing.",
  },
  {
    tag: "identity",
    title: "One entry per verified human",
    body: "A thousand fake accounts collapse to a single entry, deduplicated atomically in the database. To get more entries, a scalper needs more real, verified people.",
  },
  {
    tag: "allocation",
    title: "Exactly-once allocation",
    body: "100 units means exactly 100 winners and zero oversells — even when buyers in two regions hit the same drop in the same millisecond.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="brand-glow pointer-events-none absolute inset-0" />
        <div className="dotgrid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1140px] items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Pill tone="blocked">Bots win ~80% of every drop. Not here.</Pill>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5.25rem)] font-bold leading-[1.04] tracking-[-0.03em]">
              The drop bots
              <br />
              can&apos;t win.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              NoScalp runs limited drops as a fair lottery — speed-neutral, one entry per verified
              human, and never oversold. Scalpers lose their edge; real fans get a real shot.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button href={`/drops/${DEMO_DROP_ID}`} size="lg">
                Enter the PS5 drop →
              </Button>
              <Button href="/control" variant="secondary" size="lg">
                See it work
              </Button>
            </div>
          </div>

          <FairnessGate className="aspect-[4/3] w-full" dense />
        </div>
      </section>

      {/* problem */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1140px] px-5 py-20 sm:py-24">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Every hyped drop is the same story: gone in seconds, half of it to bots, the rest
            resold at triple the price.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted">
            Scalpers win two ways — they&apos;re <span className="text-paper">faster</span> than any
            human, and they hide behind <span className="text-paper">thousands of fake accounts</span>.
            First-come-first-served rewards exactly that. NoScalp removes both advantages instead of
            trying to out-run them.
          </p>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto max-w-[1140px] px-5 py-20 sm:py-24">
          <Eyebrow>How NoScalp is different</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Fairness, enforced by the database.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {guarantees.map((g) => (
              <Panel key={g.tag} spotlight className="p-7">
                <div className="mono text-xs uppercase tracking-widest text-brand-soft">{g.tag}</div>
                <h3 className="mt-4 font-display text-xl font-medium">{g.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{g.body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* proof */}
      <section id="proof" className="border-b border-line">
        <div className="mx-auto grid max-w-[1140px] items-center gap-10 px-5 py-20 sm:py-24 lg:grid-cols-2">
          <div>
            <Eyebrow>Why it&apos;s fair</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Provably fair — not just promised.
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-muted">
              Every draw is seeded with a value we publish, and winners are picked by a formula
              anyone can recompute. Win or lose, you can verify you got a fair, random shot — no
              black box, no &ldquo;trust us.&rdquo; Most platforms just <em>assert</em> their draw is
              random. We let you check.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Pill tone="verified">commit · reveal</Pill>
              <Pill tone="paper">public draw log</Pill>
              <Pill tone="brand">multi-region consistent</Pill>
            </div>
          </div>
          <Panel className="p-6">
            <div className="space-y-3">
              {[
                "Entries locked at close",
                "Random seed committed",
                "Draw executed from seed",
                "Result matches the seed",
              ].map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-4 py-3">
                  <span className="grid size-5 place-items-center rounded-full bg-verified/15 text-verified">✓</span>
                  <span className="text-sm text-paper">{c}</span>
                </div>
              ))}
              <div className="mono pt-1 text-xs text-muted">seed 4a91f0c8… · 8,412 entries · 200 winners</div>
            </div>
          </Panel>
        </div>
      </section>

      {/* live drops rail */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1140px] px-5 py-20 sm:py-24">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Live now</Eyebrow>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Open drops
              </h2>
            </div>
          </div>
          <Link href={`/drops/${DEMO_DROP_ID}`} className="group mt-8 block">
            <Panel spotlight className="flex flex-col gap-6 p-6 transition-colors duration-200 ease-out-cubic hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative grid size-20 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-white/90 to-white/50">
                  <span className="font-display text-xs font-bold tracking-widest text-ink/70">PS5</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Pill tone="verified">registration open</Pill>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-medium">PlayStation 5 — Restock Drop</h3>
                  <p className="text-sm text-muted">100 units · fair lottery · one per verified human</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="mono text-2xl">{money(49999)}</div>
                <span className="text-brand-soft transition-transform duration-200 ease-out-cubic group-hover:translate-x-1">
                  Enter →
                </span>
              </div>
            </Panel>
          </Link>
        </div>
      </section>

      {/* final cta */}
      <section className="relative overflow-hidden">
        <div className="brand-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1140px] px-5 py-24 text-center sm:py-32">
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">
            Anything scarce can be fair.
          </h2>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-muted">
            Tickets, consoles, sneakers, GPUs — if bots ruin it today, NoScalp can run it fairly.
          </p>
          <div className="mt-9 flex justify-center gap-3">
            <Button href={`/drops/${DEMO_DROP_ID}`} size="lg">
              Enter the drop →
            </Button>
            <Button href="/control" variant="secondary" size="lg">
              See the proof
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
