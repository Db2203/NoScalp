"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FairnessGate } from "./FairnessGate";
import { Button, Eyebrow, Panel, Pill, cn } from "./ui";
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
type DropInfo = { status: string; draw_seed: string | null };

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
  const [drop, setDrop] = useState<DropInfo | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [consistency, setConsistency] = useState<Consistency | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [storm, setStorm] = useState(false);
  const [drawn, setDrawn] = useState<{ winners: number; units: number } | null>(null);
  const [dedup, setDedup] = useState<{ created: number; rejected: number } | null>(null);
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setAdminToken(localStorage.getItem("noscalp_admin_token") ?? ""), 0);
    return () => clearTimeout(t);
  }, []);
  const authHeaders = adminToken ? { "x-admin-token": adminToken } : undefined;

  const poll = useCallback(async () => {
    try {
      const [sa, sb, log, d] = await Promise.all([
        jget<Stats>(`/api/stats?dropId=${dropId}&region=A`),
        jget<Stats>(`/api/stats?dropId=${dropId}&region=B`),
        jget<AuditRow[]>(`/api/audit?dropId=${dropId}&limit=18`),
        jget<DropInfo>(`/api/drop?id=${dropId}`),
      ]);
      setA(sa);
      setB(sb);
      setAudit(log);
      setDrop(d);
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
      await jpost("/api/flood", { dropId, attempts: 5000, region: "A" }, authHeaders);
      await poll();
    } finally {
      setTimeout(() => setStorm(false), 1600);
      setBusy(null);
    }
  }

  async function draw() {
    setBusy("draw");
    try {
      const r = await jpost<{ winners: number; units: number }>("/api/draw", { dropId, region: "A" }, authHeaders);
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
      await jpost("/api/reset", { stock: 100 }, authHeaders);
      await poll();
    } finally {
      setBusy(null);
    }
  }

  async function checkConsistency() {
    setBusy("consistency");
    try {
      const r = await jget<Consistency>(`/api/consistency?dropId=${dropId}`, authHeaders);
      setConsistency(r);
    } finally {
      setBusy(null);
    }
  }

  async function proveDedup() {
    setBusy("dedup");
    try {
      const contact = `race-${Math.floor(performance.now())}@noscalp.demo`;
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
  const syncMs = consistency ? consistency.writeMs + consistency.readMs : null;

  const checkpoints = [
    { label: "Entries locked at close", done: !!drop && drop.status !== "registration_open" },
    { label: "Random seed committed", done: !!drop?.draw_seed },
    { label: "Draw executed from seed", done: !!a && (a.won > 0 || drop?.status === "drawn") },
    { label: "Result matches the seed", done: drop?.status === "drawn" },
  ];

  return (
    <div className="mx-auto max-w-[1140px] px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Mission Control</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Two regions. One source of truth.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Both panels read the same Aurora DSQL cluster from different regions — and always agree.
          </p>
        </div>
        <Button onClick={reset} variant="secondary" disabled={!!busy}>
          {busy === "reset" ? "Resetting…" : "↺ Reset drop"}
        </Button>
      </div>

      {/* signature: the fairness gate */}
      <FairnessGate className="mt-8 h-44 w-full" dense intensity={storm ? 1.6 : 1} />

      {/* twin regions */}
      <div className="relative mt-4 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <RegionPanel stats={a} />
        <div className="flex flex-col items-center justify-center gap-2 px-2">
          <motion.div
            animate={{ color: consistent ? "#46e0a0" : "#8b93a7", scale: consistent ? 1 : 0.96 }}
            className="font-display text-4xl font-bold"
          >
            =
          </motion.div>
          <span className="mono whitespace-nowrap text-center text-[10px] uppercase tracking-widest text-muted">
            {consistent ? "in sync" : "—"}
            {syncMs !== null && consistent ? (
              <>
                <br />
                {syncMs}ms
              </>
            ) : null}
          </span>
        </div>
        <RegionPanel stats={b} />
      </div>

      {/* draw result banner */}
      <AnimatePresence>
        {drawn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 rounded-2xl border border-verified/40 bg-verified/[0.08] px-6 py-4 text-center"
          >
            <Metric value={num(drawn.units)} label="units" />
            <Metric value={num(drawn.winners)} label="real winners" tone="verified" />
            <Metric value={String(oversold)} label="oversold" tone="verified" />
            <span className="mono text-sm text-verified">✓ identical across both regions</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      <Panel className="mt-6 p-6">
        <Eyebrow>Demo controls</Eyebrow>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={flood} variant="danger" disabled={!!busy}>
            {busy === "flood" ? "Unleashing…" : "⚡ Unleash 5,000 bots"}
          </Button>
          <Button onClick={draw} disabled={!!busy}>
            {busy === "draw" ? "Drawing…" : "🎲 Run the draw"}
          </Button>
          <Button onClick={checkConsistency} variant="secondary" disabled={!!busy}>
            {busy === "consistency" ? "Checking…" : "↔ Check consistency"}
          </Button>
          <Button onClick={proveDedup} variant="secondary" disabled={!!busy}>
            {busy === "dedup" ? "Racing…" : "👤 Same human, both regions"}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {consistency && (
            <div
              className={cn(
                "mono rounded-xl border p-4 text-sm",
                consistency.consistent ? "border-verified/40 bg-verified/[0.05]" : "border-blocked/40 bg-blocked/[0.05]",
              )}
            >
              wrote via <span className="text-paper">{consistency.wroteVia}</span> ({consistency.writeMs}ms) → read via{" "}
              <span className="text-paper">{consistency.readVia}</span> ({consistency.readMs}ms){" "}
              {consistency.foundInB ? (
                <span className="text-verified">✓ found instantly</span>
              ) : (
                <span className="text-blocked">✗ missing</span>
              )}
              <div className="mt-1 text-muted">
                {consistency.regionA.label} {num(consistency.regionA.entriesTotal)} ·{" "}
                {consistency.regionB.label} {num(consistency.regionB.entriesTotal)}{" "}
                {consistency.consistent ? "→ equal ✓" : "→ mismatch"}
              </div>
            </div>
          )}
          {dedup && (
            <div className="mono rounded-xl border border-verified/40 bg-verified/[0.05] p-4 text-sm">
              2 concurrent requests · same human · regions A + B →{" "}
              <span className="text-verified">{dedup.created} entry created</span>,{" "}
              <span className="text-blocked">{dedup.rejected} rejected</span> by the primary key.
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="mono text-xs text-muted">
            admin token — only needed on a deployed instance with NOSCALP_ADMIN_TOKEN set
          </label>
          <input
            value={adminToken}
            onChange={(e) => {
              setAdminToken(e.target.value);
              localStorage.setItem("noscalp_admin_token", e.target.value);
            }}
            placeholder="x-admin-token"
            className="mono mt-1 block w-full max-w-xs rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none transition-colors focus:border-brand/60"
          />
        </div>
      </Panel>

      {/* verify this draw */}
      <Panel className="mt-6 p-6">
        <Eyebrow>Verify this draw</Eyebrow>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checkpoints.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-4 py-3"
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-xs",
                  c.done ? "bg-verified/15 text-verified" : "bg-white/5 text-muted",
                )}
              >
                {c.done ? "✓" : "•"}
              </span>
              <span className={cn("text-sm", c.done ? "text-paper" : "text-muted")}>{c.label}</span>
            </div>
          ))}
        </div>
        <details className="mt-4 rounded-xl border border-line bg-ink/40 p-4">
          <summary className="mono cursor-pointer text-xs text-muted">technical details</summary>
          <div className="mono mt-3 space-y-1 text-xs text-muted">
            <div>
              draw_seed: <span className="break-all text-paper">{drop?.draw_seed ?? "— (not drawn yet)"}</span>
            </div>
            <div>winner rank = sort entries by md5(entry_id + seed); top N take the N units.</div>
          </div>
        </details>
      </Panel>

      {/* audit ledger */}
      <Panel className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <Eyebrow>Fairness ledger · append-only · readable from either region</Eyebrow>
          <Pill tone="muted">{num(audit.length)} events</Pill>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {audit.length === 0 && <div className="px-6 py-6 text-sm text-muted">No events yet.</div>}
          {audit.map((row) => (
            <div
              key={row.id}
              className="mono flex items-center justify-between border-b border-line/60 px-6 py-2.5 text-xs"
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

function Metric({ value, label, tone = "default" }: { value: string; label: string; tone?: "default" | "verified" }) {
  return (
    <span className="mono text-lg">
      <span className={tone === "verified" ? "text-verified" : "text-paper"}>{value}</span>{" "}
      <span className="text-muted">{label}</span>
    </span>
  );
}

function FlashNum({ value }: { value: number }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    const on = setTimeout(() => setFlash(true), 0);
    const off = setTimeout(() => setFlash(false), 600);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [value]);
  return <span className={cn("mono tabular-nums", flash && "flash")}>{num(value)}</span>;
}

function RegionPanel({ stats }: { stats: Stats | null }) {
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between">
        <span className="mono inline-flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-verified live-dot" />
          {stats?.regionLabel ?? "…"}
        </span>
        <Pill tone="paper">region {stats?.region ?? "?"}</Pill>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-5">
        <Cell label="Humans" value={stats?.humans ?? 0} tone="verified" />
        <Cell label="Bots blocked" value={stats?.bots ?? 0} tone="blocked" />
        <Cell label="Winners" value={stats?.won ?? 0} tone="brand" />
        <Cell
          label="Units claimed"
          value={stats?.units.claimed ?? 0}
          sub={`avail ${num(stats?.units.available ?? 0)} / ${num(stats?.units.total ?? 0)}`}
        />
      </div>
    </Panel>
  );
}

function Cell({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: number;
  tone?: "default" | "brand" | "verified" | "blocked";
  sub?: string;
}) {
  const toneClass = {
    default: "text-paper",
    brand: "text-brand-soft",
    verified: "text-verified",
    blocked: "text-blocked",
  }[tone];
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <div className={cn("text-3xl font-medium", toneClass)}>
        <FlashNum value={value} />
      </div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}
