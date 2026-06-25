import Link from "next/link";
import { Logo } from "./ui";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="mono flex items-center gap-6 text-xs uppercase tracking-wider text-muted">
          <Link href="/#how" className="transition-colors hover:text-paper">
            How it works
          </Link>
          <Link href="/control" className="transition-colors hover:text-paper">
            Mission Control
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-base" />
        <p className="mono">
          Next.js on Vercel · Amazon Aurora DSQL · multi-region, strongly consistent
        </p>
      </div>
    </footer>
  );
}
