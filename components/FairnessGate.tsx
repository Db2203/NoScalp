"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "./ui";

/**
 * The signature visual. A stream of entrants rushes a "verification gate":
 * bots (coral) pile up and dissolve at the gate, a minority of verified humans
 * (mint) pass through to the winners side. It's the product's thesis in motion —
 * chaos in, fairness out. Reused on the landing hero and Mission Control.
 */

// deterministic pseudo-random so server and client render identically
function rand(n: number): number {
  const x = Math.sin(n * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

export function FairnessGate({
  className,
  dense = false,
  intensity = 1,
}: {
  className?: string;
  dense?: boolean;
  intensity?: number; // 0..1+, scales how many bots are flying
}) {
  const reduce = useReducedMotion();
  const count = Math.round((dense ? 54 : 38) * Math.max(0.4, intensity));

  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const human = rand(i) < 0.16; // ~16% are verified humans
        return {
          i,
          human,
          y: 6 + rand(i + 101) * 88, // % from top
          delay: rand(i + 211) * 3.2,
          dur: 2 + rand(i + 307) * 1.7,
        };
      }),
    [count],
  );

  // winners grid (right side) — a few lit cells imply fair outcomes
  const cells = Array.from({ length: 24 }, (_, i) => rand(i + 900) < 0.34);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-[#0e1118]",
        className,
      )}
      aria-hidden
    >
      <div className="brand-glow pointer-events-none absolute inset-0" />

      {/* the gate */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-brand/60 to-transparent" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-brand-soft mono whitespace-nowrap">
          verify
        </div>
      </div>

      {/* winners grid on the right */}
      <div className="absolute right-4 top-1/2 grid -translate-y-1/2 grid-cols-6 gap-1.5 opacity-90">
        {cells.map((on, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-[3px]",
              on ? "bg-verified/80" : "bg-white/8",
            )}
          />
        ))}
      </div>

      {/* dots */}
      {dots.map((d) =>
        reduce ? (
          <span
            key={d.i}
            className={cn(
              "absolute size-1.5 rounded-full",
              d.human ? "bg-verified" : "bg-blocked/70",
            )}
            style={{ top: `${d.y}%`, left: d.human ? "70%" : "44%" }}
          />
        ) : d.human ? (
          <motion.span
            key={d.i}
            className="absolute size-1.5 rounded-full bg-verified shadow-[0_0_8px_rgba(70,224,160,0.7)]"
            style={{ top: `${d.y}%` }}
            initial={{ left: "-3%", opacity: 0 }}
            animate={{ left: ["-3%", "50%", "92%"], opacity: [0, 1, 1, 0.9] }}
            transition={{ duration: d.dur * 1.3, delay: d.delay, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
          />
        ) : (
          <motion.span
            key={d.i}
            className="absolute size-1.5 rounded-full bg-blocked/70"
            style={{ top: `${d.y}%` }}
            initial={{ left: "-3%", opacity: 0 }}
            animate={{ left: ["-3%", "45%", "47%"], opacity: [0, 0.85, 0], scale: [1, 1, 0.4] }}
            transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, repeatDelay: 0.6, ease: "easeIn" }}
          />
        ),
      )}

      {/* labels */}
      <div className="absolute left-3 top-3 mono text-[10px] uppercase tracking-widest text-blocked/80">
        incoming
      </div>
      <div className="absolute bottom-3 right-3 mono text-[10px] uppercase tracking-widest text-verified/80">
        fair winners
      </div>
    </div>
  );
}
