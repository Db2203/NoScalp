import Link from "next/link";
import { Container, Wordmark } from "./storefront/ui";

const categories = [
  { label: "Sneakers", href: "/#drops" },
  { label: "Consoles", href: "/#drops" },
  { label: "Tickets", href: "/#drops" },
  { label: "Tech", href: "/#drops" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-edge bg-soft text-fg/70">
        <Container className="flex h-9 items-center justify-center text-center text-[12px] tracking-wide">
          Every drop is a fair lottery — one entry per person, winners drawn at random.
        </Container>
      </div>
      <div className="border-b border-edge bg-canvas/85 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="NoScalp home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-fg/70 md:flex">
            {categories.map((c) => (
              <Link key={c.label} href={c.href} className="transition-colors hover:text-fg">
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
            </button>
          </div>
        </Container>
      </div>
    </header>
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
          <span>© {new Date().getFullYear()} NoScalp. Drops, decided fairly.</span>
          <Link href="/engine" className="transition-colors hover:text-fg">
            Built on Amazon Aurora DSQL — see the engine →
          </Link>
        </div>
      </Container>
    </footer>
  );
}
