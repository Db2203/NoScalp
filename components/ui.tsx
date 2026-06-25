import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-slate/70 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mono text-[11px] uppercase tracking-[0.22em] text-muted">{children}</div>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "verdant" | "vermilion" | "muted";
  sub?: ReactNode;
}) {
  const toneClass = {
    default: "text-paper",
    verdant: "text-verdant",
    vermilion: "text-vermilion",
    muted: "text-muted",
  }[tone];
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      <div className={cn("mono text-2xl font-medium tabular-nums sm:text-3xl", toneClass)}>{value}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "verdant" | "vermilion" | "muted" | "paper";
}) {
  const map = {
    verdant: "border-verdant/30 bg-verdant/10 text-verdant",
    vermilion: "border-vermilion/30 bg-vermilion/10 text-vermilion",
    muted: "border-white/10 bg-white/5 text-muted",
    paper: "border-white/15 bg-white/5 text-paper",
  }[tone];
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider",
        map,
      )}
    >
      {children}
    </span>
  );
}

export function RegionTag({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <span className="mono inline-flex items-center gap-2 text-xs text-muted">
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-verdant live-dot" : "bg-muted/50",
        )}
      />
      {label}
    </span>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

const buttonBase =
  "mono inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants = {
  primary: "bg-verdant text-ink hover:bg-verdant/90",
  ghost: "border border-white/15 bg-white/5 text-paper hover:bg-white/10",
  danger: "bg-vermilion text-ink hover:bg-vermilion/90",
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  disabled,
  className,
  type = "button",
}: ButtonProps) {
  const cls = cn(buttonBase, buttonVariants[variant], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-semibold tracking-tight", className)}>
      even<span className="text-verdant">.</span>
    </span>
  );
}
