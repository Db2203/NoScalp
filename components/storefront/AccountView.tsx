"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Chip, Container, Kicker } from "./ui";
import { jget, jpost } from "@/lib/client";
import { money } from "@/lib/format";
import type { MyEntry } from "@/lib/queries";

type Identity = { identityId: string; identityHash: string; contact: string };
const STORE_KEY = "noscalp:identity";

function statusOf(e: MyEntry): { tone: "live" | "upcoming" | "closed"; label: string } {
  if (e.allocState === "claimed") return { tone: "live", label: "Secured ✓" };
  if (e.entryStatus === "won") return { tone: "live", label: "Won · claim now" };
  if (e.entryStatus === "lost") return { tone: "closed", label: "Not selected" };
  return { tone: "upcoming", label: "In the draw" };
}

export function AccountView() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<MyEntry[] | null>(null);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) setIdentity(JSON.parse(raw));
      } catch {}
      setLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!identity) return;
    jget<MyEntry[]>(`/api/my-entries?identityId=${identity.identityId}`)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [identity]);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const r = await jpost<{ identityId: string; identityHash: string }>("/api/verify", { contact });
      const id: Identity = { ...r, contact };
      localStorage.setItem(STORE_KEY, JSON.stringify(id));
      setIdentity(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    localStorage.removeItem(STORE_KEY);
    setIdentity(null);
    setEntries(null);
    setContact("");
  }

  return (
    <Container className="py-12">
      <Kicker>Account</Kicker>
      <h1 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">My entries</h1>

      {loaded && !identity && (
        <div className="mt-8 max-w-md rounded-2xl border border-edge bg-card p-6">
          <div className="font-medium">Verify to track your entries</div>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            One verified person, one account. Enter the email you use for drops; for this demo it
            auto-verifies.
          </p>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@email.com"
            className="mt-4 h-11 w-full rounded-xl border border-edge bg-canvas px-3.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <div className="mt-3">
            <Button onClick={verify} disabled={!contact || busy} className="w-full">
              {busy ? "Verifying…" : "Verify & continue"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-warn">{error}</p>}
        </div>
      )}

      {identity && (
        <>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-edge bg-card px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="grid size-5 place-items-center rounded-full bg-ok/15 text-xs text-ok">✓</span>
              <span className="text-mute">Verified ·</span> {identity.contact}
            </span>
            <button onClick={forget} className="text-xs text-mute transition-colors hover:text-fg">
              sign out
            </button>
          </div>

          {entries === null ? (
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-soft" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-edge bg-soft/50 py-20 text-center">
              <p className="text-mute">You haven&apos;t entered any drops yet.</p>
              <div className="mt-5 flex justify-center">
                <Button href="/shop">Browse drops</Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {entries.map((e) => {
                const s = statusOf(e);
                return (
                  <Link
                    key={e.dropId}
                    href={`/drops/${e.dropId}`}
                    className="flex items-center gap-4 rounded-2xl border border-edge bg-card p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-soft">
                      {e.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.image} alt={e.title} className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-medium">{e.title}</div>
                      <div className="text-sm text-mute">{money(e.price)}</div>
                    </div>
                    <Chip tone={s.tone}>{s.label}</Chip>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
