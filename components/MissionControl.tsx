"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Button, Panel, Pill, SectionLabel, Stat, cn } from "./ui";
import { jget, jpost } from "@/lib/client";
import { num } from "@/lib/format";

type Stats = {
  region: "A" | "B";
  regionLabel: string;
  entriesTotal: number;
  humans: number;
  bots: number;
  won: number;
  units: { total: number; available: number; allocated: number; claimed: number };
};

type AuditRow = { id: string; action: string; region: string | null; at: string };

type Consistency = {
  wroteVia: string;
  readVia: string;
  foundInB: boolean;
  writeMs: number;
  readMs: number;
  regionA: { label: string; entriesTotal: number };
  regionB: { label: string; entriesTotal: number };
  consistent: boolean;
};

export function MissionControl({ dropId }: { dropId: string }) {
  const [a, setA] = useState<Stats | null>(null);
  const [b, setB] = useState<Stats | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [consistency, setConsistency] = useState<Consistency | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [storm, setStorm] = useState(false);
  const [drawn, setDrawn] = useState<{ winners: number; units: number } | null>(null);
  const [dedup, setDedup] = useState<{ created: number; rejected: number } | null>(null);

  const poll = useCallback(async () => {
    try {
      const [sa, sb, log] = await Promise.all([
        jget<Stats>(`/api/stats?dropId=${dropId}&region=A`),
        jget<Stats>(`/api/stats?dropId=${dropId}&region=B`),
        jget<AuditRow[]>(`/api/audit?dropId=${dropId}&limit=18`),
      ]);
      setA(sa);
      setB(sb);
      setAudit(log);
    } catch {}
  }, [dropId]);

  useEffect(() => {
    const kick = setTimeout(poll, 0);
    const t = setInterval(poll, 1500);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [poll]);

  async function flood() {
    setBusy("flood");
    setStorm(true);
    try {
      await jpost("/api/flood", { dropId, attempts: 5000, region: "A" });
      await poll();
    } finally {
      setTimeout(() => setStorm(false), 1400);
      setBusy(null);
    }
  }

  async function draw() {
    setBusy("draw");
    try {
      const r = await jpost<{ winners: number; units: number }>("/api/draw", { dropId, region: "A" });
      setDrawn({ winners: r.winners, units: r.units });
      await poll();
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setDrawn(null);
    setConsistency(null);
    setDedup(null);
    try {
      await jpost("/api/reset", { stock: 100 });
      await poll();
    } finally {
      setBusy(null);
    }
  }

  async function checkConsistency() {
    setBusy("consistency");
    try {
      const r = await jget<Consistency>(`/api/consistency?dropId=${dropId}`);
      setConsistency(r);
    } finally {
      setBusy(null);
    }
  }

  // fire the same verified human at BOTH regions at once -> one entry survives
  async function proveDedup() {
    setBusy("dedup");
    try {
      const contact = `race-${Math.floor(performance.now())}@even.demo`;
      const v = await jpost<{ identityHash: string }>("/api/verify", { contact });
      const both = await Promise.all([
        jpost<{ created: boolean }>("/api/entries", { dropId, identityHash: v.identityHash, region: "A" }),
        jpost<{ created: boolean }>("/api/entries", { dropId, identityHash: v.identityHash, region: "B" }),
      ]);
      const created = both.filter((x) => x.created).length;
      setDedup({ created, rejected: both.length - created });
      await poll();
    } finally {
      setBusy(null);
    }
  }

  const consistent = !!a && !!b && a.entriesTotal === b.entriesTotal;
  const oversold = a ? Math.max(0, a.units.allocated + a.units.claimed - a.units.total) : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Mission Control</SectionLabel>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Two regions. One source of truth.
          </h1>
          <p className="mt-1 text-sm text-muted">
            Both panels read the same Aurora DSQL cluster from different regions. They always agree.
          </p>
        </div>
        <Button onClick={reset} variant="ghost" disabled={busy === "reset"}>
          {busy === "reset" ? "Resetting…" : "↺ Reset drop"}
        </Button>
      </div>

      {/* the money shot: two region panels with an equals sign between */}
      <div className="relative mt-8 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <RegionPanel stats={a} storm={storm} />
        <div className="flex items-center justify-center">
          <motion.div
            animate={{ color: consistent ? "#34e6a8" : "#7c8794", scale: consistent ? 1 : 0.96 }}
            className="font-display text-5xl font-bold"
          >
            =
          </motion.div>
        </div>
        <RegionPanel stats={b} storm={storm} mirror />
      </div>

      {/* result banner */}
      <AnimatePresence>
        {drawn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-xl border border-verdant/40 bg-verdant/10 px-6 py-4 text-center"
          >
            <span className="mono text-lg">
              <span className="text-paper">{num(drawn.units)}</span>{" "}
              <span className="text-muted">units</span>
            </span>
            <span className="mono text-lg">
              <span className="text-verdant">{num(drawn.winners)}</span>{" "}
              <span className="text-muted">real winners</span>
            </span>
            <span className="mono text-lg">
              <span className="text-verdant">{oversold}</span>{" "}
              <span className="text-muted">oversold</span>
            </span>
            <span className="mono text-sm text-verdant">✓ consistent across both regions</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      <Panel className="mt-6 p-6">
        <SectionLabel>Demo controls</SectionLabel>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={flood} variant="danger" disabled={!!busy}>
            {busy === "flood" ? "Unleashing…" : "⚡ Unleash 5,000 bots"}
          </Button>
          <Button onClick={draw} disabled={!!busy}>
            {busy === "draw" ? "Drawing…" : "🎲 Run the draw"}
          </Button>
          <Button onClick={checkConsistency} variant="ghost" disabled={!!busy}>
            {busy === "consistency" ? "Checking…" : "↔ Check cross-region consistency"}
          </Button>
          <Button onClick={proveDedup} variant="ghost" disabled={!!busy}>
            {busy === "dedup" ? "Racing…" : "👤 Same human, both regions"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {consistency && (
            <div
              className={cn(
                "mono flex-1 rounded-lg border p-4 text-sm",
                consistency.consistent ? "border-verdant/40 bg-verdant/5" : "border-vermilion/40 bg-vermilion/5",
              )}
            >
              wrote via <span className="text-paper">{consistency.wroteVia}</span> ({consistency.writeMs}ms) →
              read via <span className="text-paper">{consistency.readVia}</span> ({consistency.readMs}ms){" "}
              {consistency.foundInB ? (
                <span className="text-verdant">✓ found instantly</span>
              ) : (
                <span className="text-vermilion">✗ missing</span>
              )}
              <div className="mt-1 text-muted">
                {consistency.regionA.label}: {num(consistency.regionA.entriesTotal)} entries ·{" "}
                {consistency.regionB.label}: {num(consistency.regionB.entriesTotal)} entries{" "}
                {consistency.consistent ? "→ equal ✓" : "→ mismatch"}
              </div>
            </div>
          )}
          {dedup && (
            <div className="mono flex-1 rounded-lg border border-verdant/40 bg-verdant/5 p-4 text-sm">
              2 concurrent requests, same human, regions A + B →{" "}
              <span className="text-verdant">{dedup.created} entry created</span>,{" "}
              <span className="text-vermilion">{dedup.rejected} rejected</span> by the primary key.
            </div>
          )}
        </div>
      </Panel>

      {/* audit ledger */}
      <Panel className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <SectionLabel>Fairness ledger — append-only, readable from either region</SectionLabel>
          <Pill tone="muted">{num(audit.length)} events</Pill>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {audit.length === 0 && <div className="px-6 py-6 text-sm text-muted">No events yet.</div>}
          {audit.map((row) => (
            <div
              key={row.id}
              className="mono flex items-center justify-between border-b border-white/5 px-6 py-2.5 text-xs"
            >
              <span className="text-paper">{row.action.replace(/_/g, " ")}</span>
              <span className="flex items-center gap-3 text-muted">
                <span>{row.region ? `region ${row.region}` : "—"}</span>
                <span>{new Date(row.at).toLocaleTimeString()}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RegionPanel({ stats, storm, mirror }: { stats: Stats | null; storm: boolean; mirror?: boolean }) {
  return (
    <Panel className="relative overflow-hidden p-6">
      {/* bot storm overlay */}
      <AnimatePresence>
        {storm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10"
          >
            {Array.from({ length: 36 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute size-1.5 rounded-full bg-vermilion"
                initial={{
                  top: `${(i * 37) % 100}%`,
                  left: mirror ? "105%" : "-5%",
                  opacity: 1,
                }}
                animate={{ left: "50%", top: "50%", opacity: 0 }}
                transition={{ duration: 0.9, delay: (i % 12) * 0.04, ease: "easeIn" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <span className="mono inline-flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-verdant live-dot" />
          {stats?.regionLabel ?? "…"}
        </span>
        <Pill tone="paper">region {stats?.region ?? "?"}</Pill>
      </div>

      <div className="relative z-20 mt-6 grid grid-cols-2 gap-5">
        <Stat label="Humans" value={num(stats?.humans ?? 0)} tone="verdant" />
        <Stat label="Bots blocked" value={num(stats?.bots ?? 0)} tone="vermilion" />
        <Stat label="Winners" value={num(stats?.won ?? 0)} />
        <Stat
          label="Units claimed"
          value={num(stats?.units.claimed ?? 0)}
          sub={`avail ${num(stats?.units.available ?? 0)} / ${num(stats?.units.total ?? 0)}`}
        />
      </div>
    </Panel>
  );
}
