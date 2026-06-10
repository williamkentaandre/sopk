import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Répertoire de ce fichier = racine du projet app (évite l’inférence Turbopack sur le lockfile parent `cursor/`). */
const appDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ne pas mettre `assetPrefix: "."` ici : `next build --webpack` + `next/font` l’interdisent,
 * et sur iOS certains chemins `./_next/…` posent problème. On laisse Next émettre `/_next/…`
 * puis `scripts/fix-capacitor-html-paths.mjs` réécrit en chemins relatifs après export.
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
  },
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
