"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container, Wordmark, cn } from "./storefront/ui";
import { useWishlist } from "./storefront/useWishlist";

const categories = [
  { label: "Sneakers", href: "/shop?category=Sneakers" },
  { label: "Consoles", href: "/shop?category=Consoles" },
  { label: "Tickets", href: "/shop?category=Tickets" },
  { label: "Tech", href: "/shop?category=Tech" },
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
  const { count: saved } = useWishlist();
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
            <Link href="/shop" aria-label="Search drops" className="transition-colors hover:text-fg">
              <Icon path="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </Link>
            <Link href="/wishlist" aria-label="Saved drops" className="relative transition-colors hover:text-fg">
              <Icon path="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z" />
              {saved > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {saved}
                </span>
              )}
            </Link>
            <Link href="/account" aria-label="My entries" className="transition-colors hover:text-fg">
              <Icon path="M4 7a1 1 0 011-1h14a1 1 0 011 1v3a2 2 0 000 4v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3a2 2 0 000-4V7zM14 6v12" />
            </Link>
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

const footerCols: { title: string; links: [string, string][] }[] = [
  {
    title: "Shop",
    links: [
      ["All drops", "/shop"],
      ["Sneakers", "/shop?category=Sneakers"],
      ["Consoles", "/shop?category=Consoles"],
      ["Tickets", "/shop?category=Tickets"],
      ["Tech", "/shop?category=Tech"],
    ],
  },
  {
    title: "Account",
    links: [
      ["My entries", "/account"],
      ["Saved drops", "/wishlist"],
    ],
  },
  {
    title: "Help",
    links: [
      ["How drops work", "/#how"],
      ["The engine", "/engine"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms", "/"],
      ["Privacy", "/"],
      ["Fairness", "/engine"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-edge bg-soft/60">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
              Limited drops, minus the bots. Pick what you want, enter the draw, check the result
              yourself.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{col.title}</div>
              <ul className="mt-4 space-y-2.5 text-sm text-fg/75">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-fg">
                      {label}
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
