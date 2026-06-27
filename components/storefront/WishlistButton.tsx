"use client";

import { useWishlist } from "./useWishlist";
import { cn } from "./ui";

export function WishlistButton({ id, className }: { id: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save for later"}
      aria-pressed={saved}
      onClick={() => toggle(id)}
      className={cn(
        "grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur-sm transition-colors",
        saved ? "text-accent" : "text-white/80 hover:text-white",
        className,
      )}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z" />
      </svg>
    </button>
  );
}
