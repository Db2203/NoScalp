"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Countdown } from "./Countdown";
import { Button, Eyebrow, Panel, Pill, Stat, cn } from "./ui";
import { jget, jpost } from "@/lib/client";
import { money, num, shortHash } from "@/lib/format";

type Drop = {
  id: string;
  brand_name: string | null;
  title: string;
  subtitle: string | null;
  price_cents: number;
  total_stock: number;
  per_user_limit: number;
  status: string;
  register_close_at: string;
  draw_seed: string | null;
};

type Stats = {
  regionLabel: string;
  entriesTotal: number;
  humans: number;
  bots: number;
  won: number;
  lost: number;
  registered: number;
  units: { total: number; available: number; allocated: number; claimed: number };
};

type Status = {
  entryId: string;
  entryStatus: string;
  lotteryRank: string | null;
  allocationId: string | null;
  unitNo: number | null;
  allocationState: string | null;
  claimCloseAt: string | null;
  orderId: string | null;
} | null;

type Identity = { identityId: string; identityHash: string; contact: string; displayName?: string };

const STORE_KEY = "noscalp:identity";

export function DropExperience({ dropId }: { dropId: string }) {
  const [drop, setDrop] = useState<Drop | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stampShown = useRef(false);
  const [stamp, setStamp] = useState(false);

  // restore identity (deferred a tick so we don't setState synchronously on mount)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) setIdentity(JSON.parse(raw));
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const refreshStatus = useCallback(
    async (id: Identity | null) => {
      if (!id) return;
      try {
        const s = await jget<Status>(`/api/status?dropId=${dropId}&identityId=${id.identityId}`);
        setStatus(s);
      } catch {}
    },
    [dropId],
  );

  useEffect(() => {
    jget<Drop>(`/api/drop?id=${dropId}`).then(setDrop).catch(() => {});
  }, [dropId]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await jget<Stats>(`/api/stats?dropId=${dropId}`);
        if (alive) setStats(s);
      } catch {}
    };
    const kick = setTimeout(poll, 0);
    const t = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [dropId]);

  useEffect(() => {
    if (!identity) return;
    const kick = setTimeout(() => refreshStatus(identity), 0);
    const t = setInterval(() => refreshStatus(identity), 1500);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [identity, refreshStatus]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  async function verify() {
    setError(null);
    setBusy("verify");
    try {
      const r = await jpost<{ identityId: string; identityHash: string }>("/api/verify", {
        contact,
        displayName: name || undefined,
      });
      const id: Identity = { ...r, contact, displayName: name || undefined };
      setIdentity(id);
      localStorage.setItem(STORE_KEY, JSON.stringify(id));
      refreshStatus(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function enter(again = false) {
    if (!identity) return;
    setError(null);
    setBusy("enter");
    try {
      const r = await jpost<{ created: boolean; alreadyEntered: boolean }>("/api/entries", {
        dropId,
        identityHash: identity.identityHash,
        displayName: identity.displayName,
      });
      await refreshStatus(identity);
      if (again) {
        flashToast(r.created ? "Entered." : "Already in — duplicate rejected by the database.");
      } else if (!stampShown.current) {
        stampShown.current = true;
        setStamp(true);
        setTimeout(() => setStamp(false), 2200);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function claim() {
    if (!identity || !status?.allocationId) return;
    setError(null);
    setBusy("claim");
    try {
      await jpost("/api/claim", { allocationId: status.allocationId, identityId: identity.identityId });
      await refreshStatus(identity);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function forget() {
    localStorage.removeItem(STORE_KEY);
    setIdentity(null);
    setStatus(null);
    stampShown.current = false;
    setContact("");
    setName("");
  }

  const statusTone =
    drop?.status === "registration_open" ? "verified" : drop?.status === "drawn" ? "paper" : "muted";

  return (
    <div className="mx-auto max-w-[1140px] px-5 py-12">
      <Link href="/" className="mono text-xs text-muted transition-colors hover:text-paper">
        ← all drops
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* product presentation */}
        <Panel spotlight className="relative overflow-hidden p-8">
          <div className="dotgrid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative flex h-full flex-col items-center justify-center gap-7 py-10">
            <div className="relative h-64 w-44">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white to-white/55 shadow-[0_30px_60px_-20px_rgba(124,108,255,0.45)]" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/15" />
              <div className="absolute inset-x-0 bottom-5 text-center font-display text-sm font-bold tracking-[0.3em] text-ink/70">
                PS5
              </div>
            </div>
            <div className="text-center">
              <div className="mono text-4xl font-medium tabular-nums">{money(drop?.price_cents ?? 0)}</div>
              <div className="mt-2 text-sm text-muted">
                {num(drop?.total_stock ?? 0)} units · limit {drop?.per_user_limit ?? 1} per person
              </div>
            </div>
          </div>
        </Panel>

        {/* drop box */}
        <div className="flex flex-col gap-5">
          <div>
            <Eyebrow>{drop?.brand_name ?? " "}</Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {drop?.title ?? "Loading drop…"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Pill tone={statusTone as "verified" | "paper" | "muted"}>
                {drop ? drop.status.replace(/_/g, " ") : "…"}
              </Pill>
              {drop?.status === "registration_open" && (
                <span className="text-sm text-muted">
                  entry closes in <Countdown to={drop.register_close_at} />
                </span>
              )}
            </div>
          </div>

          <Panel className="p-6">
            {!identity && (
              <div className="space-y-3">
                <Eyebrow>Verify you&apos;re human</Eyebrow>
                <p className="text-sm leading-relaxed text-muted">
                  We&apos;d text or email a one-time code — for this demo it auto-verifies. One verified
                  person gets one entry. That&apos;s how bots get shut out.
                </p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full rounded-xl border border-line bg-ink px-3.5 py-3 text-sm outline-none transition-colors focus:border-brand/60"
                />
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@email.com"
                  className="mono w-full rounded-xl border border-line bg-ink px-3.5 py-3 text-sm outline-none transition-colors focus:border-brand/60"
                />
                <Button onClick={verify} disabled={!contact || busy === "verify"} className="w-full" size="lg">
                  {busy === "verify" ? "Verifying…" : "Verify & continue"}
                </Button>
              </div>
            )}

            {identity && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-line bg-ink px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="grid size-5 place-items-center rounded-full bg-verified/15 text-verified text-xs">
                      ✓
                    </span>
                    <span className="text-muted">verified ·</span>
                    <span className="mono">{identity.contact}</span>
                  </span>
                  <button onClick={forget} className="mono text-xs text-muted transition-colors hover:text-blocked">
                    not you?
                  </button>
                </div>

                {/* enter */}
                {drop?.status === "registration_open" && !status && (
                  <div className="space-y-3">
                    <Button onClick={() => enter(false)} disabled={busy === "enter"} className="w-full" size="lg">
                      {busy === "enter" ? "Entering…" : "Enter the draw"}
                    </Button>
                    <p className="text-center text-xs leading-relaxed text-muted">
                      Random draw · one entry per verified human · speed doesn&apos;t change your odds.
                      You&apos;re only charged if you win.
                    </p>
                  </div>
                )}

                {/* registered */}
                {status?.entryStatus === "registered" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-verified/30 bg-verified/[0.06] p-5">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-verified live-dot" />
                        <span className="font-display text-lg">You&apos;re in the draw.</span>
                      </div>
                      <div className="mono mt-3 space-y-1 text-sm">
                        <Row k="entry" v={`#${shortHash(status.entryId, 8)}`} />
                        <Row k="your odds" v={oddsLabel(stats)} />
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted">
                        Winners are drawn at random when entry closes. Being early changed nothing.
                      </p>
                    </div>
                    <Button onClick={() => enter(true)} variant="secondary" className="w-full">
                      Try entering again
                    </Button>
                  </div>
                )}

                {/* won */}
                {status?.entryStatus === "won" && status.allocationState !== "claimed" && (
                  <div className="space-y-3 rounded-xl border border-verified/40 bg-verified/[0.1] p-5">
                    <div className="font-display text-2xl text-verified">You won. 🎉</div>
                    <p className="text-sm text-paper">
                      Unit <span className="mono">#{status.unitNo}</span> is held for you.
                    </p>
                    {status.claimCloseAt && (
                      <p className="text-xs text-muted">
                        claim closes in <Countdown to={status.claimCloseAt} />
                      </p>
                    )}
                    <Button onClick={claim} disabled={busy === "claim"} className="w-full" size="lg">
                      {busy === "claim" ? "Securing…" : `Claim for ${money(drop?.price_cents ?? 0)}`}
                    </Button>
                  </div>
                )}

                {/* claimed receipt */}
                {status?.allocationState === "claimed" && (
                  <div className="rounded-xl border border-line bg-ink p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-semibold text-verified">Order confirmed</span>
                      <span className="mono text-xs text-verified">✓ paid</span>
                    </div>
                    <div className="mono mt-4 space-y-1.5 text-sm">
                      <Row k="unit" v={`#${status.unitNo}`} />
                      <Row k="order" v={shortHash(status.orderId, 10)} />
                      <Row k="entry" v={shortHash(status.entryId, 10)} />
                      <Row k="draw seed" v={shortHash(drop?.draw_seed, 10)} />
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Reproducible draw — anyone can recompute the result from the seed.
                    </p>
                  </div>
                )}

                {/* lost — dignified + transparent */}
                {status?.entryStatus === "lost" && (
                  <div className="rounded-xl border border-line bg-ink p-5">
                    <div className="font-display text-lg">Not this time.</div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      You were <span className="text-paper">1 of {num(stats?.entriesTotal ?? 0)}</span> entries.{" "}
                      <span className="text-paper">{num(stats?.won ?? 0)}</span> winners were drawn at random — no
                      bot jumped the line.
                    </p>
                    <div className="mono mt-3 text-xs text-muted">
                      draw seed {shortHash(drop?.draw_seed, 10)} ·{" "}
                      <Link href="/control" className="text-brand-soft hover:underline">
                        verify this draw →
                      </Link>
                    </div>
                  </div>
                )}

                {drop?.status !== "registration_open" && !status && (
                  <p className="text-sm text-muted">Registration has closed for this drop.</p>
                )}
              </div>
            )}

            {error && <p className="mono mt-3 text-sm text-blocked">{error}</p>}
          </Panel>
        </div>
      </div>

      {/* fairness strip */}
      <Panel className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <Eyebrow>Live · read from {stats?.regionLabel ?? "…"}</Eyebrow>
          <span className="mono text-xs text-muted">refreshes every 1.5s</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Verified humans" value={num(stats?.humans ?? 0)} tone="verified" />
          <Stat label="Bot attempts blocked" value={num(stats?.bots ?? 0)} tone="blocked" />
          <Stat label="Units available" value={num(stats?.units.available ?? 0)} sub={`of ${num(stats?.units.total ?? 0)}`} />
          <Stat label="Winners drawn" value={num(stats?.won ?? 0)} tone="brand" />
        </div>
      </Panel>

      {/* entry stamp */}
      <AnimatePresence>
        {stamp && (
          <motion.div
            initial={{ opacity: 0, scale: 1.6, rotate: -16 }}
            animate={{ opacity: 1, scale: 1, rotate: -7 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl border-[3px] border-verified px-10 py-6 font-display text-4xl font-bold uppercase tracking-widest text-verified">
              Entered
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-elevated px-4 py-2.5 text-sm shadow-2xl",
            )}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function oddsLabel(stats: Stats | null): string {
  if (!stats || stats.entriesTotal === 0) return "—";
  const winners = stats.units.total;
  const pct = ((winners / Math.max(stats.entriesTotal, winners)) * 100).toFixed(1);
  return `${pct}% · ${num(winners)}/${num(stats.entriesTotal)}`;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className="text-paper">{v}</span>
    </div>
  );
}
