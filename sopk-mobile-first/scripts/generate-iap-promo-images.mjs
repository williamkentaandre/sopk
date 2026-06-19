#!/usr/bin/env node
/**
 * Images promotionnelles IAP (1024×1024) — distinctes de l’icône app (Guideline 2.3.2).
 * Usage : node scripts/generate-iap-promo-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "ios", "AppStoreConnect", "iap-promo");

const promos = [
  {
    file: "IAP-Promo-Monthly-1024.png",
    badge: "MENSUEL",
    title: "Abonnement mensuel",
    subtitle: "7 jours d'essai gratuit",
    price: "Renouvelé chaque mois",
    accent: "#6d5a7d",
    gradientTop: "#5d4c6d",
    gradientBottom: "#8b7a9a",
  },
  {
    file: "IAP-Promo-Yearly-1024.png",
    badge: "ANNUEL",
    title: "Abonnement annuel",
    subtitle: "7 jours d'essai gratuit",
    price: "Meilleur tarif / an",
    accent: "#4a6d5a",
    gradientTop: "#3d5c4a",
    gradientBottom: "#6d8b7a",
  },
];

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function promoSvg({ badge, title, subtitle, price, accent, gradientTop, gradientBottom }) {
  return Buffer.from(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradientTop}"/>
      <stop offset="100%" stop-color="${gradientBottom}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="72" y="72" width="880" height="880" rx="64" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
  <text x="512" y="180" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="42" font-weight="700" fill="rgba(255,255,255,0.85)" letter-spacing="8">${escapeXml(badge)}</text>
  <text x="512" y="360" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="800" fill="#ffffff">${escapeXml(title)}</text>
  <text x="512" y="460" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="600" fill="rgba(255,255,255,0.92)">${escapeXml(subtitle)}</text>
  <rect x="212" y="540" width="600" height="120" rx="28" fill="${accent}"/>
  <text x="512" y="615" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${escapeXml(price)}</text>
  <text x="512" y="780" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="600" fill="rgba(255,255,255,0.88)">Régime SOPK</text>
  <text x="512" y="860" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.7)">Programme nutrition SOPK</text>
</svg>`);
}

fs.mkdirSync(outDir, { recursive: true });

for (const promo of promos) {
  const out = path.join(outDir, promo.file);
  await sharp(promoSvg(promo)).png().toFile(out);
  console.log("Wrote", out);
}

console.log("\nUploader dans App Store Connect → chaque abonnement → Image promotionnelle (1024×1024).");
