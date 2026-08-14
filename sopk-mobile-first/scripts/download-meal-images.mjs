#!/usr/bin/env node
/**
 * Télécharge les photos repas (Unsplash) en local pour éviter les 404 / hors-ligne.
 * Usage: node scripts/download-meal-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mealImagesPath = path.join(root, "src/utils/mealImages.ts");
const outDir = path.join(root, "public/images/meals");

function mealSlug(nom) {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const ts = fs.readFileSync(mealImagesPath, "utf8");
const block = ts.match(/export const MEAL_IMAGE_BY_NAME[^=]*=\s*\{([\s\S]*?)\n\};/);
if (!block) {
  console.error("MEAL_IMAGE_BY_NAME introuvable");
  process.exit(1);
}

const entries = [];
for (const m of block[1].matchAll(/"([^"]+)":\s*UNSPLASH\("([^"]+)"\)/g)) {
  entries.push({ nom: m[1], photoId: m[2] });
}

fs.mkdirSync(outDir, { recursive: true });

let ok = 0;
let fail = 0;
for (const { nom, photoId } of entries) {
  const slug = mealSlug(nom);
  const dest = path.join(outDir, `${slug}.jpg`);
  const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=400&h=400&q=85`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error("fichier trop petit");
    fs.writeFileSync(dest, buf);
    ok++;
    console.log("OK", slug);
  } catch (e) {
    fail++;
    console.error("FAIL", slug, e.message);
  }
}

console.log(`\n${ok} téléchargée(s), ${fail} échec(s) → ${outDir}`);
