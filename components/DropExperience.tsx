"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Countdown } from "./Countdown";
import { Button, Panel, Pill, SectionLabel, Stat, cn } from "./ui";
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
    drop?.status === "registration_open"
      ? "verdant"
      : drop?.status === "drawn"
        ? "paper"
        : "muted";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono text-xs uppercase tracking-[0.2em] text-muted">
            {drop?.brand_name ?? "—"}
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {drop?.title ?? "Loading drop…"}
          </h1>
          <p className="mt-1 text-sm text-muted">{drop?.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={statusTone as "verdant" | "paper" | "muted"}>
            {drop ? drop.status.replace(/_/g, " ") : "…"}
          </Pill>
          {drop?.status === "registration_open" && (
            <span className="text-sm text-muted">
              closes in <Countdown to={drop.register_close_at} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* product plinth */}
        <Panel className="relative overflow-hidden p-8">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex h-full flex-col items-center justify-center gap-6 py-8">
            <div className="relative h-56 w-36">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/90 to-white/60 shadow-2xl" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/20" />
              <div className="absolute inset-x-0 bottom-4 text-center font-display text-xs font-semibold tracking-widest text-ink/70">
                PS5
              </div>
            </div>
            <div className="text-center">
              <div className="mono text-4xl font-medium tabular-nums">{money(drop?.price_cents ?? 0)}</div>
              <div className="mt-1 text-sm text-muted">
                {num(drop?.total_stock ?? 0)} units · limit {drop?.per_user_limit ?? 1} per person
              </div>
            </div>
          </div>
        </Panel>

        {/* action panel */}
        <Panel className="p-6">
          <SectionLabel>Your spot in the drop</SectionLabel>

          {!identity && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted">
                Verify you&apos;re a real person. We&apos;d normally text or email a one-time code —
                for this demo it auto-verifies. One verified person gets one entry, period.
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2.5 text-sm outline-none focus:border-verdant/50"
              />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@email.com"
                className="mono w-full rounded-lg border border-white/10 bg-ink px-3 py-2.5 text-sm outline-none focus:border-verdant/50"
              />
              <Button onClick={verify} disabled={!contact || busy === "verify"} className="w-full">
                {busy === "verify" ? "Verifying…" : "Verify & continue"}
              </Button>
            </div>
          )}

          {identity && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink px-3 py-2">
                <div className="text-sm">
                  <span className="text-muted">verified · </span>
                  <span className="mono">{identity.contact}</span>
                </div>
                <button onClick={forget} className="mono text-xs text-muted hover:text-vermilion">
                  not you?
                </button>
              </div>

              {/* not entered yet */}
              {drop?.status === "registration_open" && !status && (
                <Button onClick={() => enter(false)} disabled={busy === "enter"} className="w-full">
                  {busy === "enter" ? "Entering…" : "Enter the draw"}
                </Button>
              )}

              {/* entered, waiting for draw */}
              {status?.entryStatus === "registered" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-verdant/30 bg-verdant/5 p-4">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-verdant live-dot" />
                      <span className="font-display text-lg">You&apos;re in.</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Entry{" "}
                      <span className="mono text-paper">#{shortHash(status.entryId, 8)}</span>. The draw
                      is random — being early or fast changes nothing.
                    </p>
                  </div>
                  <Button onClick={() => enter(true)} variant="ghost" className="w-full">
                    Try entering again
                  </Button>
                </div>
              )}

              {/* won */}
              {status?.entryStatus === "won" && status.allocationState !== "claimed" && (
                <div className="space-y-3 rounded-lg border border-verdant/40 bg-verdant/10 p-4">
                  <div className="font-display text-2xl text-verdant">You won. 🎉</div>
                  <p className="text-sm text-paper">
                    Unit <span className="mono">#{status.unitNo}</span> is reserved for you.
                  </p>
                  {status.claimCloseAt && (
                    <p className="text-xs text-muted">
                      claim closes in <Countdown to={status.claimCloseAt} />
                    </p>
                  )}
                  <Button onClick={claim} disabled={busy === "claim"} className="w-full">
                    {busy === "claim" ? "Securing…" : `Claim for ${money(drop?.price_cents ?? 0)}`}
                  </Button>
                </div>
              )}

              {/* claimed receipt */}
              {status?.allocationState === "claimed" && (
                <div className="overflow-hidden rounded-lg border border-white/15 bg-paper text-ink">
                  <div className="perf-top h-3 bg-paper" />
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-semibold">Order confirmed</span>
                      <span className="mono text-xs">✓ paid</span>
                    </div>
                    <Row k="unit" v={`#${status.unitNo}`} />
                    <Row k="order" v={shortHash(status.orderId, 10)} />
                    <Row k="entry" v={shortHash(status.entryId, 10)} />
                    <Row k="draw seed" v={shortHash(drop?.draw_seed, 10)} />
                    <p className="mono pt-1 text-[11px] text-ink/60">
                      Reproducible draw — anyone can recompute the result from the seed.
                    </p>
                  </div>
                </div>
              )}

              {/* lost */}
              {status?.entryStatus === "lost" && (
                <div className="rounded-lg border border-white/10 bg-ink p-4">
                  <div className="font-display text-lg">Not this time.</div>
                  <p className="mt-1 text-sm text-muted">
                    The draw was random and verifiable — seed{" "}
                    <span className="mono text-paper">{shortHash(drop?.draw_seed, 8)}</span>. No bot
                    jumped ahead of you.
                  </p>
                </div>
              )}

              {drop?.status !== "registration_open" && !status && (
                <p className="text-sm text-muted">Registration has closed for this drop.</p>
              )}
            </div>
          )}

          {error && <p className="mono mt-3 text-sm text-vermilion">{error}</p>}
        </Panel>
      </div>

      {/* fairness strip */}
      <Panel className="mt-5 p-6">
        <div className="flex items-center justify-between">
          <SectionLabel>Live fairness — read from {stats?.regionLabel ?? "…"}</SectionLabel>
          <span className="mono text-xs text-muted">updates every 1.5s</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Real humans entered" value={num(stats?.humans ?? 0)} tone="verdant" />
          <Stat label="Bot attempts blocked" value={num(stats?.bots ?? 0)} tone="vermilion" />
          <Stat
            label="Units available"
            value={num(stats?.units.available ?? 0)}
            sub={`of ${num(stats?.units.total ?? 0)}`}
          />
          <Stat label="Winners drawn" value={num(stats?.won ?? 0)} />
        </div>
      </Panel>

      {/* entry stamp animation */}
      <AnimatePresence>
        {stamp && (
          <motion.div
            initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl border-4 border-verdant px-10 py-6 font-display text-4xl font-bold uppercase tracking-widest text-verdant">
              Entered
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/15 bg-elevated px-4 py-2.5 text-sm shadow-xl",
            )}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink/60">{k}</span>
      <span className="mono">{v}</span>
    </div>
  );
}
