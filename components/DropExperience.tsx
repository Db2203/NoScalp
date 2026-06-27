"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Countdown } from "./Countdown";
import { Button, Chip, Container, cn } from "./storefront/ui";
import { jget, jpost } from "@/lib/client";
import { money, num, shortHash } from "@/lib/format";
import { toView, statusChip } from "@/lib/catalog";
import type { DropRow } from "@/lib/queries";

type Stats = {
  entriesTotal: number;
  humans: number;
  won: number;
  units: { total: number; available: number; allocated: number; claimed: number };
};

type Status = {
  entryId: string;
  entryStatus: string;
  allocationId: string | null;
  unitNo: number | null;
  allocationState: string | null;
  claimCloseAt: string | null;
  orderId: string | null;
} | null;

type Identity = { identityId: string; identityHash: string; contact: string; displayName?: string };

const STORE_KEY = "noscalp:identity";

export function DropExperience({ dropId }: { dropId: string }) {
  const [dropRow, setDropRow] = useState<DropRow | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stampShown = useRef(false);
  const [stamp, setStamp] = useState(false);

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
    jget<DropRow>(`/api/drop?id=${dropId}`).then(setDropRow).catch(() => {});
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
    const t = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [dropId]);

  useEffect(() => {
    if (!identity) return;
    const kick = setTimeout(() => refreshStatus(identity), 0);
    const t = setInterval(() => refreshStatus(identity), 2000);
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
        flashToast(r.created ? "Entered." : "You're already in — one entry per person.");
      } else if (!stampShown.current) {
        stampShown.current = true;
        setStamp(true);
        setTimeout(() => setStamp(false), 2000);
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

  const view = dropRow ? toView(dropRow) : null;
  const chip = statusChip(view?.status ?? "");
  const isOpen = view?.status === "registration_open";
  const heroImg = view?.images[imgIdx] ?? view?.image ?? null;

  return (
    <Container className="py-8 sm:py-10">
      <Link href="/" className="text-sm text-mute transition-colors hover:text-fg">
        ← All drops
      </Link>

      <div className="mt-5 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* gallery */}
        <div>
          <div className="img-vignette relative aspect-square overflow-hidden rounded-3xl bg-soft">
            {heroImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImg} alt={view?.title ?? ""} className="size-full object-cover" />
            ) : (
              <div className="display grid size-full place-items-center text-3xl text-mute">{view?.brand}</div>
            )}
            <div className="absolute left-4 top-4">
              <Chip tone={chip.tone}>{chip.label}</Chip>
            </div>
          </div>
          {view && view.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {view.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImgIdx(i)}
                  className={cn(
                    "relative size-20 overflow-hidden rounded-xl bg-soft ring-2 transition",
                    i === imgIdx ? "ring-fg" : "ring-transparent hover:ring-edge",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* enter box */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{view?.brand ?? " "}</div>
          <h1 className="display mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {view?.title ?? "Loading…"}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="display text-2xl font-bold">{money(view?.price ?? 0)}</span>
            {view?.resale ? (
              <span className="text-sm text-mute">
                resells for ~<span className="line-through">{money(view.resale)}</span>
              </span>
            ) : null}
          </div>

          {isOpen && view && (
            <div className="mt-3 text-sm text-mute">
              entry closes in <Countdown to={view.closeAt} /> · {num(stats?.humans ?? 0)} entered
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-edge bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {!identity && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Verify you&apos;re human to enter</div>
                <p className="text-sm leading-relaxed text-mute">
                  We&apos;d normally text or email a code — for this demo it auto-verifies. One verified person, one
                  entry.
                </p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="h-11 w-full rounded-xl border border-edge bg-canvas px-3.5 text-sm outline-none transition-colors focus:border-accent"
                />
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@email.com"
                  className="h-11 w-full rounded-xl border border-edge bg-canvas px-3.5 text-sm outline-none transition-colors focus:border-accent"
                />
                <Button onClick={verify} disabled={!contact || busy === "verify"} className="w-full" size="lg">
                  {busy === "verify" ? "Verifying…" : "Verify & continue"}
                </Button>
              </div>
            )}

            {identity && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-ok">
                    <span className="grid size-4 place-items-center rounded-full bg-ok/15 text-[10px]">✓</span>
                    Verified
                  </span>
                  <button onClick={forget} className="text-xs text-mute transition-colors hover:text-fg">
                    not you?
                  </button>
                </div>

                {isOpen && !status && (
                  <div className="space-y-3">
                    <Button onClick={() => enter(false)} disabled={busy === "enter"} className="w-full" size="lg">
                      {busy === "enter" ? "Entering…" : "Enter the draw"}
                    </Button>
                    <p className="text-center text-xs leading-relaxed text-mute">
                      Random draw · one entry per person · speed doesn&apos;t change your odds · only charged if you
                      win.
                    </p>
                  </div>
                )}

                {status?.entryStatus === "registered" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-ok/25 bg-ok/[0.06] p-4">
                      <div className="font-medium text-ok">You&apos;re in the draw 🎟️</div>
                      <p className="mt-1 text-sm text-mute">
                        Entry #{shortHash(status.entryId, 6)} · {oddsLine(stats)}. Winners are drawn at random when
                        entry closes — being early changed nothing.
                      </p>
                    </div>
                    <Button onClick={() => enter(true)} variant="secondary" className="w-full">
                      Try entering again
                    </Button>
                  </div>
                )}

                {status?.entryStatus === "won" && status.allocationState !== "claimed" && (
                  <div className="space-y-3 rounded-xl border border-ok/30 bg-ok/[0.08] p-4">
                    <div className="display text-xl font-bold text-ok">You won 🎉</div>
                    <p className="text-sm">
                      Unit #{status.unitNo} is held for you{" "}
                      {status.claimCloseAt && (
                        <>
                          · claim within <Countdown to={status.claimCloseAt} />
                        </>
                      )}
                    </p>
                    <Button onClick={claim} disabled={busy === "claim"} className="w-full" size="lg">
                      {busy === "claim" ? "Checking out…" : `Check out — ${money(view?.price ?? 0)}`}
                    </Button>
                  </div>
                )}

                {status?.allocationState === "claimed" && (
                  <div className="rounded-xl border border-edge bg-soft/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ok">Order confirmed</span>
                      <span className="text-xs text-ok">✓ paid</span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-mute">
                      <RowLine k="Unit" v={`#${status.unitNo}`} />
                      <RowLine k="Order" v={shortHash(status.orderId, 8)} />
                    </div>
                  </div>
                )}

                {status?.entryStatus === "lost" && (
                  <div className="rounded-xl border border-edge bg-soft/60 p-4">
                    <div className="font-medium">Not this time</div>
                    <p className="mt-1 text-sm leading-relaxed text-mute">
                      You were 1 of {num(stats?.entriesTotal ?? 0)} entries; {num(stats?.won ?? 0)} winners were drawn
                      at random.{" "}
                      <Link href="/engine" className="text-accent hover:underline">
                        See how this draw was decided →
                      </Link>
                    </p>
                  </div>
                )}

                {!isOpen && !status && <p className="text-sm text-mute">Registration is closed for this drop.</p>}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-warn">{error}</p>}
          </div>

          <p className="mt-4 text-center text-xs text-mute">Authentic · Free returns · Charged only if you win</p>
        </div>
      </div>

      {/* description + specs */}
      {view && (
        <div className="mt-16 grid gap-10 border-t border-edge pt-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="display text-2xl font-bold tracking-tight">About this drop</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-mute">
              {view.tagline ||
                "A limited release, allocated fairly. Enter the draw for a real shot at retail price — no bots, no scalpers, no carts gone in seconds."}
            </p>
          </div>
          {view.specs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-mute">Details</h3>
              <dl className="mt-4 divide-y divide-edge">
                {view.specs.map((s) => (
                  <div key={s.k} className="flex justify-between py-2.5 text-sm">
                    <dt className="text-mute">{s.k}</dt>
                    <dd className="font-medium">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      {/* entry stamp */}
      <AnimatePresence>
        {stamp && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl border-[3px] border-ok bg-canvas/80 px-10 py-6 text-4xl font-extrabold uppercase tracking-widest text-ok display backdrop-blur">
              Entered
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-5 py-2.5 text-sm text-canvas shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
}

function oddsLine(stats: Stats | null): string {
  if (!stats || stats.entriesTotal === 0) return "your shot is in";
  const winners = stats.units.total;
  const pct = ((winners / Math.max(stats.entriesTotal, winners)) * 100).toFixed(1);
  return `~${pct}% odds`;
}

function RowLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="font-medium text-fg">{v}</span>
    </div>
  );
}
