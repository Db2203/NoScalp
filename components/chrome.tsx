import Link from "next/link";
import { Button, Logo } from "./ui";
import { DEMO_DROP_ID } from "@/lib/constants";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between px-5">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <Link href="/#how" className="transition-colors duration-200 ease-out-cubic hover:text-paper">
            How it works
          </Link>
          <Link href="/#proof" className="transition-colors duration-200 ease-out-cubic hover:text-paper">
            Why it&apos;s fair
          </Link>
          <Link href="/control" className="transition-colors duration-200 ease-out-cubic hover:text-paper">
            Mission Control
          </Link>
        </nav>
        <Button href={`/drops/${DEMO_DROP_ID}`} className="hidden sm:inline-flex">
          Enter the drop
        </Button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-3 px-5 py-10 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-base" />
        <p className="mono">Next.js on Vercel · Amazon Aurora DSQL · multi-region, strongly consistent</p>
      </div>
    </footer>
  );
}
