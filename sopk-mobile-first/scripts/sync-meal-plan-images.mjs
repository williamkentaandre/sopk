#!/usr/bin/env node
/**
 * Aligne les URLs `image` de mealPlan.json sur MEAL_IMAGE_BY_NAME.
 * Usage: node scripts/sync-meal-plan-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mealPlanPath = path.join(root, "src/data/mealPlan.json");
const mealImagesPath = path.join(root, "src/utils/mealImages.ts");

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
  console.error("MEAL_IMAGE_BY_NAME introuvable dans mealImages.ts");
  process.exit(1);
}
const map = {};
for (const m of block[1].matchAll(/"([^"]+)":\s*UNSPLASH\("([^"]+)"\)/g)) {
  map[m[1]] = `/images/meals/${mealSlug(m[1])}.jpg`;
}

const data = JSON.parse(fs.readFileSync(mealPlanPath, "utf8"));
let updated = 0;
for (const jour of data.jours) {
  for (const repas of jour.repas) {
    const url = map[repas.nom];
    if (url && repas.image !== url) {
      repas.image = url;
      updated++;
    }
  }
}
fs.writeFileSync(mealPlanPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`mealPlan.json: ${updated} image(s) mise(s) à jour.`);
