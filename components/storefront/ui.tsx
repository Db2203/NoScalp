import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-6", className)}>{children}</div>;
}

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "accent" | "secondary";
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

const sizes = { md: "h-10 px-5 text-sm", lg: "h-12 px-7 text-[15px]" };
const variants = {
  primary: "bg-fg text-canvas hover:bg-fg/90",
  accent: "bg-accent text-white hover:bg-accent-ink",
  secondary: "border border-fg/15 bg-transparent text-fg hover:bg-soft",
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  className,
  type = "button",
}: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors duration-200 ease-out-cubic disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size],
    variants[variant],
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "live" | "upcoming" | "closed" | "neutral" | "accent";
}) {
  const map = {
    live: "bg-ok/12 text-ok",
    upcoming: "bg-fg/8 text-fg/70",
    closed: "bg-fg/8 text-mute",
    neutral: "bg-fg/8 text-fg/70",
    accent: "bg-accent/12 text-accent",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide", map)}>
      {tone === "live" && <span className="size-1.5 rounded-full bg-ok" />}
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  lift = false,
}: {
  children: ReactNode;
  className?: string;
  lift?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-edge bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        lift && "lift hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-mute", className)}>{children}</div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("display text-xl font-extrabold tracking-tight text-fg", className)}>
      NoScalp<span className="text-accent">.</span>
    </span>
  );
}
