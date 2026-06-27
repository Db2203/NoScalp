"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container, Wordmark, cn } from "./storefront/ui";

const categories = [
  { label: "Sneakers", href: "/#drops" },
  { label: "Consoles", href: "/#drops" },
  { label: "Tickets", href: "/#drops" },
  { label: "Tech", href: "/#drops" },
];

const marquee = [
  "PS5 Restock — Live",
  "Cobalt Retro High",
  "Aurora World Tour",
  "RTX 5090 Founders",
  "Chrono Diver — Friday",
  "One entry per human",
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* now-dropping marquee */}
      <div className="overflow-hidden border-b border-edge bg-soft">
        <div className="marquee-track flex w-max items-center py-2">
          {[...marquee, ...marquee].map((t, i) => (
            <span key={i} className="flex items-center gap-6 pr-6 text-[11px] uppercase tracking-[0.2em] text-fg/55">
              {t}
              <span className="text-accent/70">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* sticky header — elevates on scroll */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ease-out-cubic",
          scrolled
            ? "border-edge bg-canvas/90 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.6)]"
            : "border-transparent bg-canvas/60",
        )}
      >
        <Container
          className={cn(
            "flex items-center justify-between transition-[height] duration-300 ease-out-cubic",
            scrolled ? "h-14" : "h-16",
          )}
        >
          <Link href="/" aria-label="NoScalp home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-fg/70 md:flex">
            {categories.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="relative transition-colors duration-200 hover:text-fg after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-300 after:ease-out-cubic hover:after:scale-x-100"
              >
                {c.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-fg/70">
            <button aria-label="Search" className="transition-colors hover:text-fg">
              <Icon path="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </button>
            <button aria-label="Account" className="transition-colors hover:text-fg">
              <Icon path="M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </button>
            <button aria-label="Bag" className="relative transition-colors hover:text-fg">
              <Icon path="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0" />
              <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-white">
                0
              </span>
            </button>
          </div>
        </Container>
      </header>
    </>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const footerCols = [
  { title: "Shop", links: ["All drops", "Sneakers", "Consoles", "Tickets", "Tech"] },
  { title: "Company", links: ["About", "Careers", "Press", "Partners"] },
  { title: "Help", links: ["How drops work", "Track an entry", "Returns", "Contact"] },
  { title: "Legal", links: ["Terms", "Privacy", "Fairness policy"] },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-edge bg-soft/60">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
              Limited drops without the bots. Fair by design — and you can verify it.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{col.title}</div>
              <ul className="mt-4 space-y-2.5 text-sm text-fg/75">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="/" className="transition-colors hover:text-fg">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-edge pt-6 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 NoScalp. Drops, decided fairly.</span>
          <Link href="/engine" className="transition-colors hover:text-fg">
            Built on Amazon Aurora DSQL — see the engine →
          </Link>
        </div>
      </Container>
    </footer>
  );
}
