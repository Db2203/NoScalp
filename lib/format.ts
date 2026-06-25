export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(n ?? 0);
}

export function shortHash(s: string | null | undefined, n = 8): string {
  if (!s) return "—";
  const clean = s.replace(/-/g, "");
  return clean.slice(0, n);
}

export function timeUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now();
}
