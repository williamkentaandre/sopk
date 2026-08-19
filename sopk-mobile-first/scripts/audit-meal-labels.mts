/**
 * Audit lecture seule I7–I10 : noms de plats, portions, composition des jours,
 * alternatives rapides. Aucune écriture.
 */
import mealPlanData from "../src/data/mealPlan.json";
import { getPrepMinutes, prepBudgetMinutes } from "../src/data/mealPrepTimeCatalog";
import { getMealPortionDetails, hasExplicitPortions } from "../src/utils/meal-portions";
import {
  getMealAlternatives,
  getMealCatalog,
  getProfileAdjustedEffectiveMeal,
  isMealCompatibleWithProfile,
  isRelativeMealLabel,
} from "../src/utils/mealPersonalization";
import { MEAL_TYPE_ORDER, visibleMealIndicesForDay } from "../src/utils/mealRhythm";
import type { MealPlanData, MealType, OnboardingData } from "../src/utils/types";

const plan = mealPlanData as MealPlanData;
const catalog = getMealCatalog();

const base: OnboardingData = {
  prenom: "Audit",
  age: 32,
  poidsKg: 70,
  tailleCm: 165,
  parcoursPerte: "j90",
  objectifPoidsKg: 65,
  alimentsPreferes: [],
  alimentsDetestes: [],
  allergies: [],
  regimeAlimentaire: "Omnivore",
};

let total = 0;
const report = (n: number, label: string) => {
  total += n;
  console.log(`${n === 0 ? "OK  " : "FAIL"} ${label.padEnd(62)} ${n} violation(s)`);
};

console.log("\n=== I7 · un repas de chaque type, sélection par type ===");
let i7 = 0;
for (const day of plan.jours) {
  const counts = Object.fromEntries(MEAL_TYPE_ORDER.map((t) => [t, 0])) as Record<MealType, number>;
  for (const meal of day.repas) counts[meal.type] += 1;
  for (const type of MEAL_TYPE_ORDER) {
    if (counts[type] !== 1) {
      i7++;
      console.log(`   J${day.jour} : ${type} × ${counts[type]}`);
    }
  }
  const typesShown = visibleMealIndicesForDay(day.repas, "3 repas + collations").map((i) => day.repas[i]!.type);
  if (typesShown.join(",") !== MEAL_TYPE_ORDER.join(",")) {
    i7++;
    console.log(`   J${day.jour} rythme 4 repas affiche : ${typesShown.join(",")}`);
  }
  const three = visibleMealIndicesForDay(day.repas, "3 repas").map((i) => day.repas[i]!.type);
  if (three.includes("collation") || !three.includes("petit_dejeuner")) {
    i7++;
    console.log(`   J${day.jour} rythme 3 repas affiche : ${three.join(",")}`);
  }
}
report(i7, "I7 jours mal composés / sélection par position");

console.log("\n=== I8 · aucun nom relatif dans le catalogue affichable ===");
let i8 = 0;
const relative: string[] = [];
for (const meal of catalog) {
  if (isRelativeMealLabel(meal.nom)) {
    i8++;
    relative.push(meal.nom);
  }
}
for (const day of plan.jours) {
  for (const meal of day.repas) {
    if (isRelativeMealLabel(meal.nom) || isRelativeMealLabel(meal.substitution ?? "")) {
      i8++;
      relative.push(`${meal.nom} / ${meal.substitution}`);
    }
  }
}
for (const line of [...new Set(relative)].slice(0, 12)) console.log(`   - ${line}`);
report(i8, "I8 libellés relatifs");

console.log("\n=== I9 · portions aliment par aliment ===");
let i9 = 0;
for (const meal of catalog) {
  if (!hasExplicitPortions(meal.nom)) {
    i9++;
    console.log(`   portions manquantes : ${meal.nom}`);
  }
  const details = getMealPortionDetails(meal.nom, meal.calories);
  if (details.ingredients.length < 2) {
    i9++;
    console.log(`   une seule ligne : ${meal.nom} → ${details.ingredients[0]?.aliment}`);
  }
  for (const line of details.ingredients) {
    if (isRelativeMealLabel(line.aliment) || line.aliment.trim() === meal.nom.trim()) {
      i9++;
      console.log(`   ligne = nom du plat : ${meal.nom} / ${line.aliment}`);
    }
  }
}
report(i9, "I9 portions absurdes ou manquantes");

console.log("\n=== I10 · alternatives réelles par créneau et budget temps ===");
const MIN_OPTIONS = 3;
const profiles: { label: string; p: Partial<OnboardingData> }[] = [
  { label: "omnivore", p: {} },
  { label: "allergie œufs", p: { allergies: ["Œufs"] } },
  { label: "gluten+lait", p: { allergies: ["Gluten", "Lait"] } },
  { label: "végétalien", p: { regimeAlimentaire: "Végétalienne" } },
  { label: "œufs + 15 min", p: { allergies: ["Œufs"], tempsCuisine: "Moins de 15 min" } },
  { label: "végétalien + 15 min", p: { regimeAlimentaire: "Végétalienne", tempsCuisine: "Moins de 15 min" } },
];
const budgets = ["Moins de 15 min", "15 - 30 min", "30 - 45 min", "Peu importe"] as const;
let i10 = 0;
const table: string[] = [];

for (const { label, p } of profiles) {
  for (const type of MEAL_TYPE_ORDER) {
    const temps = (p.tempsCuisine as string | undefined) ?? "Peu importe";
    const profile: OnboardingData = { ...base, ...p, tempsCuisine: temps };
    const budget = prepBudgetMinutes(temps);
    const options = catalog.filter(
      (meal) =>
        meal.type === type &&
        isMealCompatibleWithProfile(meal, profile) &&
        (budget == null || (getPrepMinutes(meal.nom) ?? 999) <= budget),
    );
    const sample = catalog.find((meal) => meal.type === type)!;
    const alts = getMealAlternatives(profile, sample);
    const shown = getProfileAdjustedEffectiveMeal(sample, undefined, profile, 1);
    const row = `${label.padEnd(22)} ${type.padEnd(16)} compat≤budget=${options.length}  alts=${alts.length}  affiché=${shown?.nom ?? "∅"}`;
    table.push(row);
    if (options.length < MIN_OPTIONS) {
      i10++;
      console.log(`   MANQUE ${row}`);
    }
  }
}
console.log("   --- échantillon œufs + 15 min ---");
for (const line of table.filter((l) => l.startsWith("œufs + 15 min"))) console.log(`   ${line}`);
report(i10, `I10 créneaux avec < ${MIN_OPTIONS} plats réels`);

console.log(`\n>>> TOTAL VIOLATIONS I7–I10 : ${total}`);
