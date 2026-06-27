"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "noscalp:wishlist";
const EVENT = "noscalp:wishlist-change";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** Wishlist persisted in localStorage, synced across components via a custom event. */
export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    const t = setTimeout(sync, 0); // initial load (deferred to avoid sync setState in effect)
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { ids, has: (id: string) => ids.includes(id), toggle, count: ids.length };
}
