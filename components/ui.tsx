import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Panel({
  children,
  className,
  spotlight = false,
}: {
  children: ReactNode;
  className?: string;
  spotlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface",
        spotlight && "spotlight",
        className,
      )}
    >
      {children}
    </div>
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
  tone?: "default" | "brand" | "verified" | "blocked" | "muted";
  sub?: ReactNode;
}) {
  const toneClass = {
    default: "text-paper",
    brand: "text-brand-soft",
    verified: "text-verified",
    blocked: "text-blocked",
    muted: "text-muted",
  }[tone];
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <div className={cn("mono text-3xl font-medium tabular-nums sm:text-4xl", toneClass)}>{value}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "brand" | "verified" | "blocked" | "muted" | "paper";
}) {
  const map = {
    brand: "border-brand/30 bg-brand/10 text-brand-soft",
    verified: "border-verified/30 bg-verified/10 text-verified",
    blocked: "border-blocked/30 bg-blocked/10 text-blocked",
    muted: "border-line bg-white/5 text-muted",
    paper: "border-line bg-white/5 text-paper",
  }[tone];
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider",
        map,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ label, tone = "verified" }: { label?: ReactNode; tone?: "verified" | "muted" }) {
  return (
    <span className="mono inline-flex items-center gap-2 text-xs text-muted">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "verified" ? "bg-verified live-dot" : "bg-muted/50",
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
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

const sizes = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

const variants = {
  primary: "bg-brand text-white hover:bg-brand-soft",
  secondary: "border border-line bg-white/[0.04] text-paper hover:bg-white/[0.08]",
  danger: "bg-blocked text-white hover:bg-blocked/85",
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  disabled,
  className,
  type = "button",
}: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200 ease-out-cubic disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size],
    variants[variant],
    className,
  );
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
      noscalp<span className="text-brand">.</span>
    </span>
  );
}
