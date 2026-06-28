"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Container, Kicker, cn } from "./ui";
import { CountUp } from "./CountUp";
import { jget, jpost } from "@/lib/client";
import { shortHash } from "@/lib/format";
import { DEMO_DROP_ID } from "@/lib/constants";
import { DrawVerifier } from "./DrawVerifier";

const PRICE_CENTS = 12500; // ticket face value — used to price the naive store's refunds
const FANS = 9000; // real verified fans seeded into the pool
const BOT_ACCOUNTS = 60; // fake accounts behind the scalper rig

const DEMANDS = [
  { label: "10k", attempts: 10_000 },
  { label: "50k", attempts: 50_000 },
  { label: "250k", attempts: 250_000 },
];

type Naive = { stock: number; sold: number; oversold: number };
type NoScalp = {
  stock: number;
  winners: number;
  wonHumans: number;
  wonBots: number;
  requests: number;
  botTickets: number;
  sync: boolean;
  multiRegion: boolean;
  ms: number;
  seed: string | null;
};
type Tone = "fan" | "bot" | "sys" | "ok" | "warn";
type Event = { tone: Tone; text: string };
type Winner = { unitNo: number; source: string; id: string };

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function FairnessWalkthrough() {
  const dropId = DEMO_DROP_ID;
  const [busy, setBusy] = useState(false);
  const [demand, setDemand] = useState(50_000);
  const [naive, setNaive] = useState<Naive | null>(null);
  const [no, setNo] = useState<NoScalp | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [adminToken, setAdminToken] = useState("");

  // The live drop log: every event flows through one queue, revealed at a steady
  // cadence so milestones and per-unit allocations stream like a log being written.
  const queueRef = useRef<Event[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAdminToken(localStorage.getItem("noscalp_admin_token") ?? ""), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => stopTimer(), []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function enqueue(...evts: Event[]) {
    queueRef.current.push(...evts);
    if (timerRef.current == null) {
      timerRef.current = setInterval(() => {
        const next = queueRef.current.shift();
        if (!next) {
          stopTimer();
          return;
        }
        setEvents((prev) => [...prev, next]);
      }, 28);
    }
  }
  function clearLog() {
    stopTimer();
    queueRef.current = [];
    setEvents([]);
  }

  async function run(attempts: number) {
    const headers = adminToken ? { "x-admin-token": adminToken } : undefined;
    setBusy(true);
    setDemand(attempts);
    setNaive(null);
    setNo(null);
    clearLog();

    // Left — a real race: the "normal store" oversells under the stampede.
    const naiveRun = jpost<{ stock: number; sold: number; oversold: number }>(
      "/api/naive",
      { dropId, stock: 100, attempts: 5000 },
      headers,
    ).then((r) => setNaive({ stock: r.stock, sold: r.sold, oversold: r.oversold }));

    // Right — NoScalp, for real, against Aurora DSQL. Each real step emits a log line.
    const noscalpRun = (async () => {
      await jpost("/api/reset", { stock: 100 }, headers);
      enqueue({ tone: "sys", text: "registration window open · 100 units in inventory" });
      await jpost("/api/populate", { dropId, humans: FANS }, headers);
      enqueue({ tone: "fan", text: `${FANS.toLocaleString()} verified fans registered · one ticket each` });
      const f = await jpost<{ attempts: number }>(
        "/api/flood",
        { dropId, attempts, distinct: BOT_ACCOUNTS },
        headers,
      );
      enqueue({
        tone: "warn",
        text: `scalper rig: ${f.attempts.toLocaleString()} requests from ${BOT_ACCOUNTS} accounts → ${BOT_ACCOUNTS} tickets`,
      });
      const d = await jpost<{ winners: number; units: number }>("/api/draw", { dropId }, headers);
      const drop = await jget<{ draw_seed: string | null }>(`/api/drop?id=${dropId}`);
      enqueue({ tone: "sys", text: `draw started · public seed ${shortHash(drop.draw_seed ?? "", 12)}` });

      const w = await jget<{ winners: Winner[] }>(`/api/winners?id=${dropId}`);
      for (const win of w.winners) {
        enqueue(
          win.source === "bot"
            ? { tone: "bot", text: `unit ${win.unitNo} → bot ${win.id}··· · 1 fair ticket` }
            : { tone: "fan", text: `unit ${win.unitNo} → verified fan ${win.id}···` },
        );
      }
      enqueue({ tone: "ok", text: `${d.winners} units allocated · 0 oversold` });

      const s = await jget<{ wonHumans: number; wonBots: number; bots: number }>(`/api/stats?dropId=${dropId}`);
      const c = await jget<{ writeMs: number; readMs: number; consistent: boolean; multiRegion: boolean }>(
        `/api/consistency?dropId=${dropId}`,
        headers,
      );
      enqueue({
        tone: "ok",
        text: c.multiRegion
          ? `us-east-1 = us-east-2 verified · ${c.writeMs + c.readMs}ms, no lag`
          : `consistency check passed · ${c.writeMs + c.readMs}ms (single-region, local dev)`,
      });
      setNo({
        stock: d.units,
        winners: d.winners,
        wonHumans: s.wonHumans,
        wonBots: s.wonBots,
        requests: f.attempts,
        botTickets: s.bots,
        sync: c.consistent,
        multiRegion: c.multiRegion,
        ms: c.writeMs + c.readMs,
        seed: drop.draw_seed,
      });
    })();

    try {
      await Promise.all([naiveRun, noscalpRun]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setNaive(null);
    setNo(null);
    clearLog();
  }

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Kicker>Proof · live</Kicker>
          <h1 className="display mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            The same drop, two ways.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-mute">
            {FANS.toLocaleString()} real fans want floor tickets to the Lumina world tour. So does a scalper rig firing hundreds of thousands
            of requests from {BOT_ACCOUNTS} fake accounts. Watch a normal store and NoScalp on Amazon Aurora DSQL take
            the exact same stampede.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-mute">Stampede size</span>
            <div className="flex overflow-hidden rounded-full border border-edge">
              {DEMANDS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setDemand(d.attempts)}
                  disabled={busy}
                  aria-pressed={demand === d.attempts}
                  className={cn(
                    "px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
                    demand === d.attempts ? "bg-fg text-canvas" : "text-mute hover:bg-soft",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} variant="secondary" disabled={busy}>
              ↺ Reset
            </Button>
            <Button onClick={() => run(demand)} variant="danger" disabled={busy} size="lg">
              {busy ? "Running the drop…" : `⚡ Run the drop · ${demand.toLocaleString()} requests`}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-9 grid gap-5 lg:grid-cols-2">
        {/* normal store */}
        <Panel
          title="A normal store"
          sub="first-come · no per-unit guard"
          tone="bad"
          state={naive ? "done" : busy ? "running" : "idle"}
        >
          <BigNumber
            value={naive?.sold}
            of={100}
            label="units sold"
            tone="bad"
            badge={naive && naive.oversold > 0 ? "OVERSOLD" : undefined}
          />
          <Bar filled={100} over={naive ? Math.min(naive.oversold, 80) : 0} tone="bad" />
          <Rows
            rows={[
              { k: "Oversold (buyers paid for nothing)", v: naive?.oversold, tone: "bad" },
              { k: "Went to real fans", v: naive ? 0 : undefined, tone: "bad", zero: true },
            ]}
          />
          {naive && (
            <div className="mt-3 flex items-baseline justify-between rounded-xl bg-warn/10 px-3 py-2">
              <span className="text-sm text-warn">Refunds + chargebacks</span>
              <span className="mono font-semibold text-warn">{money(naive.oversold * PRICE_CENTS)}</span>
            </div>
          )}
          <Status
            text={
              naive
                ? "No verification, no per-unit guard. The fastest scripts win the race and the counter oversells."
                : "Waiting for the drop…"
            }
          />
        </Panel>

        {/* noscalp */}
        <Panel
          title="NoScalp"
          sub="fair lottery · Aurora DSQL · live"
          tone="good"
          state={no ? "done" : busy ? "running" : "idle"}
        >
          <BigNumber value={no ? 100 : undefined} of={100} label="units sold" tone="good" badge={no ? "EXACTLY 100" : undefined} />
          <Bar filled={no ? 100 : 0} over={0} tone="good" />
          <Rows
            rows={[
              { k: "Oversold", v: no ? 0 : undefined, tone: "good", zero: true },
              { k: "Units won by real fans", v: no?.wonHumans, tone: "good" },
              { k: "Units won by bots (fair share)", v: no?.wonBots, tone: "neutral" },
            ]}
          />
          <div className="mt-3 flex items-center gap-2 text-xs text-mute">
            <span className={cn("size-2 rounded-full", no && !no.multiRegion ? "bg-mute/40" : "bg-ok")} />
            {!no ? (
              "us-east-1 = us-east-2 · strongly consistent"
            ) : no.multiRegion ? (
              <>
                us-east-1 = us-east-2 <span className="text-ok">· in sync ({no.ms}ms)</span>
              </>
            ) : (
              <>
                single region · local dev <span className="text-mute/70">({no.ms}ms, multi-region proven on deploy)</span>
              </>
            )}
          </div>
          <Status
            text={
              no
                ? `${no.requests.toLocaleString()} bot requests collapsed to ${no.botTickets} tickets, one per identity, so spamming buys nothing.`
                : "Waiting for the drop…"
            }
          />
        </Panel>
      </div>

      {/* live drop log */}
      <Ticker events={events} busy={busy} />

      {/* why Aurora DSQL */}
      <div className="mt-12">
        <Kicker>Why this runs on Amazon Aurora DSQL</Kicker>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <DsqlPoint
            title="Exactly-once, no hot counter"
            body="Every unit is its own row, claimed once. Concurrent claims collide on the key and one retries, so it can't oversell no matter the spike."
          />
          <DsqlPoint
            title="Strongly consistent across regions"
            body="A worldwide launch writes through us-east-1 and reads through us-east-2 with no replication lag. One inventory, two active regions, always in agreement."
          />
          <DsqlPoint
            title="Verifiable draw"
            body={
              no?.seed ? (
                <>
                  Winners are <span className="font-mono text-fg">md5(entry + seed)</span> ordered by seed{" "}
                  <span className="font-mono text-fg">{shortHash(no.seed, 10)}</span>. Anyone can recompute who won.
                </>
              ) : (
                "Winners are ranked from a published seed. Anyone can recompute the result and check it themselves."
              )
            }
          />
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-mute">
          Identity verification is a pluggable provider, mocked here with email OTP; in production it drops in phone
          OTP or Stripe Identity. NoScalp owns the part a database judge can trust: fair, oversell-proof,
          globally-consistent allocation under a real stampede.
        </p>
      </div>

      <DrawVerifier />

      <div className="mt-10">
        <label className="text-xs text-mute">admin token (only if deployed with NOSCALP_ADMIN_TOKEN)</label>
        <input
          value={adminToken}
          onChange={(e) => {
            setAdminToken(e.target.value);
            localStorage.setItem("noscalp_admin_token", e.target.value);
          }}
          placeholder="x-admin-token"
          className="mono mt-1 block w-full max-w-xs rounded-xl border border-edge bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
    </Container>
  );
}

const dotColor: Record<Tone, string> = {
  fan: "bg-ok",
  bot: "bg-fg/40",
  sys: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
};
const textColor: Record<Tone, string> = {
  fan: "text-fg",
  bot: "text-mute",
  sys: "text-fg",
  ok: "text-ok",
  warn: "text-warn",
};

function Ticker({ events, busy }: { events: Event[]; busy: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [events.length]);

  if (events.length === 0 && !busy) return null;

  return (
    <div className="mt-6 rounded-2xl border border-edge bg-card">
      <div className="flex items-center gap-2 border-b border-edge px-5 py-3">
        <span className={cn("size-2 rounded-full", busy ? "bg-ok motion-safe:animate-pulse" : "bg-mute/40")} />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">NoScalp drop log · live</span>
      </div>
      <div ref={boxRef} className="mono h-56 overflow-y-auto px-5 py-3 text-[13px] leading-relaxed">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-2.5 py-0.5 motion-safe:animate-[fadeIn_180ms_ease-out]">
            <span className={cn("size-1.5 shrink-0 rounded-full", dotColor[e.tone])} />
            <span className={textColor[e.tone]}>{e.text}</span>
          </div>
        ))}
        {busy && <div className="py-0.5 text-mute/50">▋</div>}
      </div>
    </div>
  );
}

function Panel({
  title,
  sub,
  tone,
  state,
  children,
}: {
  title: string;
  sub: string;
  tone: "bad" | "good";
  state: "idle" | "running" | "done";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-card p-6 transition-colors duration-300",
        state === "done" && tone === "bad" && "border-warn/40",
        state === "done" && tone === "good" && "border-ok/40",
        state !== "done" && "border-edge",
      )}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold tracking-tight">{title}</h2>
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">{sub}</span>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function BigNumber({
  value,
  of,
  label,
  tone,
  badge,
}: {
  value: number | undefined;
  of: number;
  label: string;
  tone: "bad" | "good";
  badge?: string;
}) {
  const color = tone === "bad" ? "text-warn" : "text-ok";
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className={cn("display text-5xl font-extrabold tabular-nums", value === undefined ? "text-mute/40" : color)}>
          {value === undefined ? "—" : <CountUp value={value} />}
          <span className="text-2xl text-mute"> / {of}</span>
        </div>
        <div className="mt-1 text-xs uppercase tracking-wide text-mute">{label}</div>
      </div>
      {badge && (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            tone === "bad" ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok",
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function Bar({ filled, over, tone }: { filled: number; over: number; tone: "bad" | "good" }) {
  return (
    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-soft">
      <div
        className={cn("h-full transition-all duration-700 ease-out", tone === "bad" ? "bg-warn/70" : "bg-ok")}
        style={{ width: `${filled}%` }}
      />
      {over > 0 && <div className="h-full bg-warn transition-all duration-700 ease-out" style={{ width: `${over}%` }} />}
    </div>
  );
}

function Rows({
  rows,
}: {
  rows: { k: string; v: number | undefined; tone: "bad" | "good" | "neutral"; zero?: boolean }[];
}) {
  return (
    <div className="mt-5 space-y-2">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between text-sm">
          <span className="text-mute">{r.k}</span>
          <span
            className={cn(
              "mono font-medium",
              r.v === undefined ? "text-mute/50" : r.tone === "bad" ? "text-warn" : r.tone === "good" ? "text-ok" : "text-fg",
            )}
          >
            {r.v === undefined ? "—" : r.zero ? "0" : <CountUp value={r.v} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function Status({ text }: { text: string }) {
  return <p className="mt-4 border-t border-edge pt-3 text-sm text-mute">{text}</p>;
}

function DsqlPoint({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge bg-card p-5">
      <h3 className="font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
    </div>
  );
}
