/**
 * Audit lecture seule : compte les repas AFFICHÉS incompatibles avec le profil.
 * Sert de mesure avant / après correction (aucune écriture).
 */
import { ALLERGY_ITEMS, EXCLUSION_ITEMS } from "../src/data/foodPreferenceCatalog";
import {
  buildAutoMealOverrides,
  getMealAlternatives,
  getMealCatalog,
  getProfileAdjustedEffectiveMeal,
  isIngredientExcludedForProfile,
  isMealCompatibleWithProfile,
} from "../src/utils/mealPersonalization";
import { getMealPlan } from "../src/utils/mealPlan";
import { mealKey } from "../src/utils/planTracking";
import { buildShoppingList } from "../src/utils/shoppingList";
import type { OnboardingData } from "../src/utils/types";

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

const allAllergies = ALLERGY_ITEMS.map((a) => a.key);
const allExclusions = EXCLUSION_ITEMS.map((e) => e.key);

function auditProfile(label: string, profile: OnboardingData) {
  const plan = getMealPlan({ parcoursPerte: profile.parcoursPerte });
  const overrides = buildAutoMealOverrides(profile, plan, {});

  const badMeals: string[] = [];
  const badAlternatives: string[] = [];
  const blockedSlots: string[] = [];

  for (const day of plan.jours.slice(0, 14)) {
    for (let mi = 0; mi < day.repas.length; mi++) {
      const planned = day.repas[mi];
      const shown = getProfileAdjustedEffectiveMeal(
        planned,
        overrides[mealKey(day.jour, mi)],
        profile,
        day.jour + mi,
      );
      if (!shown) {
        blockedSlots.push(`J${day.jour} ${planned.type}`);
        continue;
      }
      if (!isMealCompatibleWithProfile(shown, profile)) {
        badMeals.push(`J${day.jour} ${planned.type} → ${shown.nom}`);
      }
      for (const alt of getMealAlternatives(profile, planned, shown.nom)) {
        if (!isMealCompatibleWithProfile(alt, profile)) {
          badAlternatives.push(`J${day.jour} alt → ${alt.nom}`);
        }
      }
    }
  }

  const list = buildShoppingList(profile, plan.jours, 1, 14, overrides);
  const badIngredients = list.lines
    .filter((line) => isIngredientExcludedForProfile(line.aliment, profile))
    .map((line) => line.aliment);

  const catalog = getMealCatalog();
  const compatibleByType = catalog.reduce<Record<string, number>>((acc, meal) => {
    if (isMealCompatibleWithProfile(meal, profile)) acc[meal.type] = (acc[meal.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n=== ${label} ===`);
  console.log(
    `catalogue: ${catalog.length} repas | compatibles par type: ${JSON.stringify(compatibleByType)}`,
  );
  console.log(`repas affichés incompatibles : ${badMeals.length}`);
  for (const line of badMeals.slice(0, 12)) console.log(`   - ${line}`);
  if (badMeals.length > 12) console.log(`   … +${badMeals.length - 12}`);
  console.log(`alternatives incompatibles   : ${badAlternatives.length}`);
  for (const line of [...new Set(badAlternatives)].slice(0, 6)) console.log(`   - ${line}`);
  console.log(`ingrédients courses interdits: ${badIngredients.length}`);
  for (const line of [...new Set(badIngredients)].slice(0, 10)) console.log(`   - ${line}`);
  console.log(`créneaux sans repas sûr (état explicite, pas un bug) : ${blockedSlots.length}`);

  return badMeals.length + badAlternatives.length + badIngredients.length;
}

let total = 0;
total += auditProfile("TOUS LES ALLERGÈNES", { ...base, allergies: allAllergies });
total += auditProfile("TOUS ALLERGÈNES + TOUTES EXCLUSIONS", {
  ...base,
  allergies: allAllergies,
  alimentsDetestes: allExclusions,
});
total += auditProfile("TOUS ALLERGÈNES + VÉGÉTALIEN", {
  ...base,
  allergies: allAllergies,
  regimeAlimentaire: "Végétalienne",
});
total += auditProfile("ALLERGIE ŒUFS SEULE", { ...base, allergies: ["Œufs"] });
total += auditProfile("GLUTEN + LAIT", { ...base, allergies: ["Gluten", "Lait"] });

console.log(`\n>>> TOTAL PROBLÈMES : ${total}`);
