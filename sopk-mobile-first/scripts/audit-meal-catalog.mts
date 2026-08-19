/**
 * Audit lecture seule du catalogue de repas et de la composition des journées.
 * Mesure les invariants I7 à I10 (composition du jour, noms de plats, portions,
 * profondeur du choix). Aucune écriture.
 */
import mealPlanData from "../src/data/mealPlan.json";
import { SAFE_FALLBACK_MEALS } from "../src/data/mealAllergenCatalog";
import { fitsPrepBudget } from "../src/data/mealPrepTimeCatalog";
import { getMealPortionDetails } from "../src/utils/meal-portions";
import { getMealCatalog, isMealCompatibleWithProfile } from "../src/utils/mealPersonalization";
import { visibleMealIndicesForDay } from "../src/utils/mealRhythm";
import type { MealPlanData, MealType, OnboardingData } from "../src/utils/types";

const parsed = mealPlanData as MealPlanData;
const EXPECTED_TYPES: MealType[] = ["petit_dejeuner", "dejeuner", "collation", "diner"];

let violations = 0;
const report = (n: number, label: string) => {
  violations += n;
  console.log(`${n === 0 ? "OK  " : "FAIL"} ${label.padEnd(58)} ${n} violation(s)`);
};

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

// ---------------------------------------------------------------- I7
console.log("\n=== I7 · composition des journées ===");
let i7Total = 0;
for (const day of parsed.jours) {
  const types = day.repas.map((r) => r.type);
  for (const expected of EXPECTED_TYPES) {
    const count = types.filter((t) => t === expected).length;
    if (count !== 1) {
      i7Total++;
      console.log(`   - J${day.jour} : ${count} « ${expected} » (attendu 1) — ordre ${JSON.stringify(types)}`);
    }
  }
}
report(i7Total, "I7 journées mal composées");

console.log("\n=== I7b · le rythme sélectionne-t-il le bon type ? ===");
const RYTHME_TYPES: Record<string, MealType[]> = {
  "2 repas": ["dejeuner", "diner"],
  "3 repas": ["petit_dejeuner", "dejeuner", "diner"],
  "3 repas + collations": ["petit_dejeuner", "dejeuner", "collation", "diner"],
};
let i7bTotal = 0;
for (const [rythme, attendus] of Object.entries(RYTHME_TYPES)) {
  for (const day of parsed.jours) {
    const obtenus = visibleMealIndicesForDay(day.repas, rythme).map((i) => day.repas[i]?.type);
    const manquants = attendus.filter((t) => !obtenus.includes(t));
    if (manquants.length > 0) {
      i7bTotal++;
      console.log(`   - "${rythme}" J${day.jour} : montre ${JSON.stringify(obtenus)}, manque ${JSON.stringify(manquants)}`);
    }
  }
}
report(i7bTotal, "I7b repas masqués par une sélection positionnelle");

// ---------------------------------------------------------------- I8
console.log("\n=== I8 · noms de plats autonomes ===");
function normalizeLoose(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
/*
 * Formulations qui décrivent un remplacement au lieu de nommer un plat.
 * Testées sur le libellé sans accents : `\b` de JavaScript ne reconnaît pas « à » comme
 * caractère de mot, donc /\bà la place\b/ ne matche jamais.
 */
const RELATIVE_PATTERNS = [
  /a la place/,
  /au lieu de/,
  /^version /,
  /(^| )ou (tofu|poulet|dinde|saumon|thon|poisson)( |$)/,
  /remplacer?( |$)/,
  /^idem/,
];
const isRelativeLabel = (label: string) => RELATIVE_PATTERNS.some((p) => p.test(normalizeLoose(label)));

let i8Total = 0;
for (const meal of [...getMealCatalog(), ...SAFE_FALLBACK_MEALS]) {
  if (isRelativeLabel(meal.nom)) {
    i8Total++;
    console.log(`   - ${meal.type.padEnd(15)} « ${meal.nom} »`);
  }
}
report(i8Total, "I8 repas proposables au nom non autonome");

// ---------------------------------------------------------------- I9
console.log("\n=== I9 · portions réelles aliment par aliment ===");
let i9Total = 0;
const i9Examples: string[] = [];
for (const meal of [...getMealCatalog(), ...SAFE_FALLBACK_MEALS]) {
  const details = getMealPortionDetails(meal.nom, meal.calories);
  if (details.ingredients.length === 0) {
    i9Total++;
    i9Examples.push(`${meal.nom} → aucune portion`);
    continue;
  }
  for (const ing of details.ingredients) {
    const sameAsMeal = normalizeLoose(ing.aliment) === normalizeLoose(meal.nom);
    if (sameAsMeal || isRelativeLabel(ing.aliment)) {
      i9Total++;
      i9Examples.push(`${meal.nom} → « ${ing.aliment} : ${ing.grammes} g »`);
    }
  }
}
for (const line of [...new Set(i9Examples)].slice(0, 12)) console.log(`   - ${line}`);
report(i9Total, "I9 lignes de portion qui ne sont pas un aliment");

// ---------------------------------------------------------------- I10
console.log("\n=== I10 · profondeur du choix par créneau et budget temps ===");
const BUDGETS = ["Moins de 15 min", "15 - 30 min", "30 - 45 min", "Peu importe"] as const;
const PROFILS: { label: string; patch: Partial<OnboardingData> }[] = [
  { label: "aucun filtre", patch: {} },
  { label: "allergie œufs", patch: { allergies: ["Œufs"] } },
  { label: "gluten + lait", patch: { allergies: ["Gluten", "Lait"] } },
  { label: "végétalienne", patch: { regimeAlimentaire: "Végétalienne" } },
];
/** Minimum défendable : le plat du jour plus au moins deux vraies alternatives. */
const MIN_ALTERNATIVES = 3;

/*
 * On compte les plats du catalogue à la fois compatibles avec le profil ET tenant dans
 * le budget temps. `getMealAlternatives` ne convient pas comme mesure : il classe sans
 * filtrer sur le temps et plafonne à 8, ce qui masquerait exactement le manque de choix
 * signalé par l'utilisatrice.
 */
let i10Total = 0;
console.log(
  `   ${"profil".padEnd(16)}${"budget".padEnd(18)}` +
    EXPECTED_TYPES.map((t) => t.slice(0, 9).padStart(11)).join(""),
);
for (const profil of PROFILS) {
  for (const budget of BUDGETS) {
    const profile: OnboardingData = { ...base, ...profil.patch, tempsCuisine: budget };
    const counts = EXPECTED_TYPES.map(
      (type) =>
        getMealCatalog().filter(
          (m) =>
            m.type === type &&
            isMealCompatibleWithProfile(m, profile) &&
            fitsPrepBudget(m.nom, budget) &&
            !isRelativeLabel(m.nom),
        ).length,
    );
    console.log(
      `   ${profil.label.padEnd(16)}${budget.padEnd(18)}` +
        counts.map((c) => `${c < MIN_ALTERNATIVES ? "!" : " "}${c}`.padStart(11)).join(""),
    );
    counts.forEach((c) => {
      if (c < MIN_ALTERNATIVES) i10Total++;
    });
  }
}
report(i10Total, `I10 créneaux sous ${MIN_ALTERNATIVES} plats réels compatibles`);

console.log(`\n>>> TOTAL VIOLATIONS : ${violations}`);
