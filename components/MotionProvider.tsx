"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// Globally honor prefers-reduced-motion: disables transform/layout motion for
// users who ask for it, while keeping essential opacity feedback.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
