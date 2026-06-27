"use client";

import { useEffect, useState } from "react";
import { Button, Container, Kicker } from "./ui";
import { ProductCard } from "./ProductCard";
import { useWishlist } from "./useWishlist";
import { jget } from "@/lib/client";
import { toView, type DropView } from "@/lib/catalog";
import type { DropRow } from "@/lib/queries";

export function WishlistView() {
  const { ids } = useWishlist();
  const [all, setAll] = useState<DropView[] | null>(null);

  useEffect(() => {
    jget<DropRow[]>("/api/drops")
      .then((rows) => setAll(rows.map(toView)))
      .catch(() => setAll([]));
  }, []);

  const saved = (all ?? []).filter((d) => ids.includes(d.id));

  return (
    <Container className="py-12">
      <Kicker>Saved</Kicker>
      <h1 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your saved drops</h1>

      {ids.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-edge bg-soft/50 py-20 text-center">
          <p className="text-mute">Nothing saved yet. Tap the heart on a drop to keep an eye on it.</p>
          <div className="mt-5 flex justify-center">
            <Button href="/shop">Browse drops</Button>
          </div>
        </div>
      ) : all === null ? (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ids.map((id) => (
            <div key={id} className="aspect-[3/4] animate-pulse rounded-2xl bg-soft" />
          ))}
        </div>
      ) : (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {saved.map((d) => (
            <ProductCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </Container>
  );
}
