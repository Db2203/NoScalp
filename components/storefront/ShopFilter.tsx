"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "./ui";

const CATS = ["All", "Sneakers", "Consoles", "Tickets", "Tech", "Collectibles"];

export function ShopFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category") ?? "All";
  const [q, setQ] = useState(params.get("q") ?? "");

  function go(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  function setCategory(cat: string) {
    const next = new URLSearchParams(params.toString());
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    go(next);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    go(next);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={c === active}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors duration-200 ease-out-cubic",
              c === active ? "bg-fg text-canvas" : "border border-edge text-fg/70 hover:bg-soft",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <form onSubmit={onSearch} className="relative w-full sm:w-72">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search drops"
          aria-label="Search drops"
          className="h-11 w-full rounded-full border border-edge bg-soft pl-10 pr-4 text-sm outline-none transition-colors focus:border-accent"
        />
      </form>
    </div>
  );
}
