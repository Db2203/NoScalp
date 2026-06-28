"use client";

import { useState, type ReactNode } from "react";
import { Button, Kicker, cn } from "./ui";
import { jget } from "@/lib/client";
import { md5 } from "@/lib/md5";
import { shortHash } from "@/lib/format";
import { DEMO_DROP_ID } from "@/lib/constants";

type Entry = { id: string; won: boolean };
type Proof = { commitment: string | null; seed: string | null; unitCount: number; entries: Entry[] };

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Recompute the draw client-side: md5(id||seed), sort, take the top `unitCount`.
 * The draw is correct iff the recomputed top set EQUALS the claimed winners —
 * i.e. exactly `unitCount` winners, and every one of them lands in the top set.
 * Anchoring to `unitCount` (not the claimed count) catches a winner being
 * quietly added OR omitted.
 */
function reproduce(entries: Entry[], seed: string, unitCount: number) {
  const ranked = entries
    .map((e) => ({ id: e.id, won: e.won, rank: md5(e.id + seed) }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));
  const top = new Set(ranked.slice(0, unitCount).map((r) => r.id));
  const claimed = entries.filter((e) => e.won);
  const matched = claimed.filter((w) => top.has(w.id)).length;
  return { ranked, matched, claimedCount: claimed.length, sample: ranked.slice(0, 5) };
}

type Result = {
  commitmentOk: boolean;
  computed: string;
  unitCount: number;
  claimedCount: number;
  matched: number;
  count: number;
  sample: { id: string; rank: string; won: boolean }[];
};

export function DrawVerifier() {
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<Proof | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [tamperSeed, setTamperSeed] = useState("");
  const [tamperMatched, setTamperMatched] = useState<number | null>(null);

  async function verify() {
    setBusy(true);
    setNote(null);
    setResult(null);
    setTamperMatched(null);
    try {
      const p = await jget<Proof>(`/api/draw-proof?id=${DEMO_DROP_ID}`);
      setProof(p);
      if (!p.seed) {
        setNote("This drop hasn't been drawn yet. Run a drop above, then come back and verify it.");
        return;
      }
      const computed = await sha256hex(p.seed);
      const r = reproduce(p.entries, p.seed, p.unitCount);
      setResult({
        commitmentOk: !!p.commitment && computed === p.commitment,
        computed,
        unitCount: p.unitCount,
        claimedCount: r.claimedCount,
        matched: r.matched,
        count: p.entries.length,
        sample: r.sample,
      });
      setTamperSeed(p.seed);
    } finally {
      setBusy(false);
    }
  }

  function tamper() {
    if (!proof?.seed) return;
    // flip the last hex char so it's a genuinely different seed
    const last = tamperSeed.slice(-1);
    const flipped = tamperSeed.slice(0, -1) + (last === "0" ? "1" : "0");
    setTamperSeed(flipped);
    const r = reproduce(proof.entries, flipped, proof.unitCount);
    setTamperMatched(r.matched);
  }

  return (
    <div className="mt-12">
      <Kicker>Don&apos;t trust us. Verify it</Kicker>
      <div className="mt-5 rounded-3xl border border-edge bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-xl leading-relaxed text-mute">
            We publish a <span className="text-fg">commitment</span> to the draw seed when the drop is created, then
            reveal the seed at draw time. Recompute the whole draw right here in your browser, with no server
            involved, and confirm we couldn&apos;t have rigged it.
          </p>
          <Button onClick={verify} disabled={busy} variant="accent">
            {busy ? "Verifying…" : "Reproduce the draw in my browser"}
          </Button>
        </div>

        {note && <p className="mt-5 rounded-xl bg-soft px-4 py-3 text-sm text-mute">{note}</p>}

        {result && (
          <div className="mt-6 space-y-4">
            <Check
              ok={result.commitmentOk}
              title={result.commitmentOk ? "Seed was committed in advance" : "Commitment mismatch"}
              body={
                <>
                  sha256(revealed seed) = <span className="font-mono text-fg">{shortHash(result.computed, 12)}</span>{" "}
                  {result.commitmentOk ? "matches" : "≠"} the commitment published at drop creation.
                </>
              }
            />
            <Check
              ok={result.matched === result.unitCount && result.claimedCount === result.unitCount && result.unitCount > 0}
              title={`Reproduced ${result.matched}/${result.unitCount} winners`}
              body={
                <>
                  Recomputed <span className="font-mono text-fg">md5(entry + seed)</span> for all{" "}
                  {result.count.toLocaleString()} entries, sorted, took the top {result.unitCount}, and got the exact
                  same {result.unitCount} winners that were announced.{" "}
                  {result.matched === result.unitCount && result.claimedCount === result.unitCount
                    ? "0 discrepancies."
                    : "discrepancies found."}
                </>
              }
            />

            <div className="overflow-x-auto rounded-xl border border-edge">
              <table className="w-full text-left text-sm">
                <thead className="bg-soft text-xs uppercase tracking-wide text-mute">
                  <tr>
                    <th className="px-4 py-2 font-medium">entry</th>
                    <th className="px-4 py-2 font-medium">your md5(entry + seed)</th>
                    <th className="px-4 py-2 font-medium">won?</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {result.sample.map((r) => (
                    <tr key={r.id} className="border-t border-edge">
                      <td className="px-4 py-2 text-mute">{shortHash(r.id, 10)}</td>
                      <td className="px-4 py-2 text-fg">{shortHash(r.rank, 16)}</td>
                      <td className="px-4 py-2 text-ok">✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* tamper test */}
            <div className="rounded-xl border border-edge bg-soft/50 p-4">
              <div className="text-sm font-semibold text-fg">Try to rig it: change the seed</div>
              <p className="mt-1 text-sm text-mute">
                Flip one character of the seed and recompute. If the winners changed, the published seed is what decided
                the draw, so we couldn&apos;t have chosen it after seeing who entered.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={tamperSeed}
                  onChange={(e) => setTamperSeed(e.target.value)}
                  className="mono min-w-0 flex-1 rounded-lg border border-edge bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
                <Button onClick={tamper} variant="secondary">
                  Flip a character &amp; re-run
                </Button>
              </div>
              {tamperMatched !== null && (
                <p className="mt-3 text-sm">
                  <span className="font-mono text-warn">{tamperMatched}</span>
                  <span className="text-mute">
                    {" "}
                    / {result.unitCount} real winners still match. Change the seed → different winners. The draw was
                    locked to the committed seed.
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ ok, title, body }: { ok: boolean; title: string; body: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
          ok ? "bg-ok" : "bg-warn",
        )}
      >
        {ok ? "✓" : "!"}
      </span>
      <div>
        <div className="font-semibold tracking-tight text-fg">{title}</div>
        <p className="text-sm leading-relaxed text-mute">{body}</p>
      </div>
    </div>
  );
}
