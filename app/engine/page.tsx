import Link from "next/link";
import { MissionControl } from "@/components/MissionControl";
import { DEMO_DROP_ID } from "@/lib/constants";

export const metadata = {
  title: "NoScalp — The Engine",
};

// The behind-the-scenes technical view (Aurora DSQL proof). Deliberately dark and
// technical — it's for builders/judges, not shoppers.
export default function EnginePage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-5">
          <span className="font-display text-sm font-semibold tracking-tight">
            NoScalp <span className="text-muted">· the engine</span>
          </span>
          <Link href="/" className="mono text-xs text-muted transition-colors hover:text-paper">
            ← back to store
          </Link>
        </div>
      </header>
      <MissionControl dropId={DEMO_DROP_ID} />
    </div>
  );
}
