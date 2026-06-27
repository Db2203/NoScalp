"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { num } from "@/lib/format";

/** Tween a number up to `value` (and to each new value). Reduced-motion shows it instantly. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.33, 1, 0.68, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <span className={className}>{num(reduce ? value : display)}</span>;
}
