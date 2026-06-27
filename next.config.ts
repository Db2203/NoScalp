import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's another lockfile higher up the tree.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  // Native route + shared-element (card→hero) transitions.
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
