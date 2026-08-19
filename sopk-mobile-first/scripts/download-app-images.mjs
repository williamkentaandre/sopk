#!/usr/bin/env node
/**
 * Télécharge les photos écarts + suivi (eau/pas) avec IDs Unsplash vérifiés.
 * Usage: node scripts/download-app-images.mjs
 *
 * Chaque entrée est contrôlée (HTTP 200, taille minimale) avant écriture.
 * Vérifier visuellement les JPG après téléchargement (sujet = libellé).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {{ dest: string; unsplashId: string; crop: string; label: string }[]} */
const ASSETS = [
  {
    label: "Verre de vin rouge",
    dest: "public/images/deviations/verre-de-vin.jpg",
    unsplashId: "photo-1600673177531-46749442aa63",
    crop: "w=400&h=400",
  },
  {
    label: "Apéritif / cocktail",
    dest: "public/images/deviations/apero-cocktail.jpg",
    unsplashId: "photo-1536935338788-846bb9981813",
    crop: "w=400&h=400",
  },
  {
    label: "Grignotage (chips)",
    dest: "public/images/deviations/grignotage.jpg",
    unsplashId: "photo-1555041469-6b4032059d29",
    crop: "w=400&h=400",
  },
  {
    label: "Bière",
    dest: "public/images/deviations/biere.jpg",
    unsplashId: "photo-1608270586620-248524c67de9",
    crop: "w=400&h=400",
  },
  {
    label: "Dessert",
    dest: "public/images/deviations/dessert.jpg",
    unsplashId: "photo-1551024506-0bccd828d307",
    crop: "w=400&h=400",
  },
  {
    label: "Repas hors plan",
    dest: "public/images/deviations/repas-hors-plan.jpg",
    unsplashId: "photo-1504674900247-0877df9cc836",
    crop: "w=400&h=400",
  },
  {
    label: "Hydratation (verre d'eau)",
    dest: "public/images/tracking/eau.jpg",
    unsplashId: "photo-1624948465027-6f9b51067557",
    crop: "w=900&h=560",
  },
  {
    label: "Pas (pied en marche)",
    dest: "public/images/tracking/pas-marche.jpg",
    unsplashId: "photo-1476480862126-209bfaa8edc8",
    crop: "w=900&h=560",
  },
];

let ok = 0;
let fail = 0;

for (const { dest, unsplashId, crop, label } of ASSETS) {
  const out = path.join(root, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const url = `https://images.unsplash.com/${unsplashId}?auto=format&fit=crop&${crop}&q=85`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error(`fichier trop petit (${buf.length} o)`);
    fs.writeFileSync(out, buf);
    ok++;
    console.log(`OK  ${label} → ${dest}`);
  } catch (e) {
    fail++;
    console.error(`FAIL ${label}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log(`\n${ok} téléchargée(s), ${fail} échec(s)`);
if (fail > 0) process.exit(1);
