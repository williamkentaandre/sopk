/**
 * Audit lecture seule : quels repas du catalogue ont une image non alimentaire
 * (SVG de type de repas).
 */
import { getMealCatalog } from "../src/utils/mealPersonalization";
import { getMealImageUrl, isMealTypeSvgFallback } from "../src/utils/mealImages";

let svg = 0;
let unsplash = 0;
let other = 0;
const svgMeals: string[] = [];

for (const meal of getMealCatalog()) {
  const url = getMealImageUrl(meal);
  if (isMealTypeSvgFallback(url)) {
    svg++;
    svgMeals.push(`${meal.type.padEnd(16)} ${meal.nom} → ${url}`);
  } else if (url.includes("unsplash")) {
    unsplash++;
  } else {
    other++;
    console.log(`autre : ${meal.nom} → ${url}`);
  }
}

console.log(`catalogue : ${getMealCatalog().length} repas`);
console.log(`unsplash  : ${unsplash}`);
console.log(`autre     : ${other}`);
console.log(`SVG type  : ${svg}`);
for (const line of svgMeals) console.log(`  ${line}`);
console.log(`\n>>> VIOLATIONS I12 : ${svg}`);
