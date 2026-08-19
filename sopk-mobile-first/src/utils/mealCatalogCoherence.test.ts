import assert from "node:assert/strict";
import { describe, it } from "node:test";

import mealPlanData from "@/data/mealPlan.json";
import { QUICK_CATALOG_MEALS, SAFE_FALLBACK_MEALS } from "@/data/mealAllergenCatalog";
import { getPrepMinutes, prepTimeMealNames } from "@/data/mealPrepTimeCatalog";
import { getMealPortionDetails, hasExplicitPortions } from "@/utils/meal-portions";
import {
  getMealAlternatives,
  getMealCatalog,
  getProfileAdjustedEffectiveMeal,
  isMealCompatibleWithProfile,
  isRelativeMealLabel,
} from "@/utils/mealPersonalization";
import { MEAL_TYPE_ORDER, visibleMealIndicesForDay } from "@/utils/mealRhythm";
import type { MealEntry, MealPlanData, MealType, OnboardingData } from "@/utils/types";

const plan = mealPlanData as MealPlanData;

const baseProfile: OnboardingData = {
  prenom: "Test",
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

function profileWith(partial: Partial<OnboardingData>): OnboardingData {
  return { ...baseProfile, ...partial };
}

describe("I7 · chaque jour a un repas de chaque type, sélection par type", () => {
  it("chaque jour du JSON contient exactement un petit-déjeuner, déjeuner, collation et dîner", () => {
    for (const day of plan.jours) {
      const counts = Object.fromEntries(MEAL_TYPE_ORDER.map((t) => [t, 0])) as Record<MealType, number>;
      for (const meal of day.repas) counts[meal.type] += 1;
      for (const type of MEAL_TYPE_ORDER) {
        assert.equal(counts[type], 1, `J${day.jour} : ${type} × ${counts[type]}`);
      }
    }
  });

  it("le rythme choisit par TYPE, pas par position, même si le JSON est mal ordonné", () => {
    const malformed: Pick<MealEntry, "type">[] = [
      { type: "collation" },
      { type: "dejeuner" },
      { type: "collation" },
      { type: "diner" },
    ];
    const four = visibleMealIndicesForDay(malformed, "3 repas + collations").map((i) => malformed[i]!.type);
    assert.deepEqual(four, ["collation", "dejeuner", "diner"]);
    const three = visibleMealIndicesForDay(malformed, "3 repas").map((i) => malformed[i]!.type);
    assert.deepEqual(three, ["dejeuner", "diner"]);
  });

  it("« 3 repas » n'affiche jamais deux collations", () => {
    for (const day of plan.jours) {
      const types = visibleMealIndicesForDay(day.repas, "3 repas").map((i) => day.repas[i]!.type);
      assert.equal(types.filter((t) => t === "collation").length, 0, `J${day.jour} : ${types.join(",")}`);
      assert.ok(types.includes("petit_dejeuner"), `J${day.jour} sans petit-déjeuner : ${types.join(",")}`);
    }
  });
});

describe("I8 · aucun repas affichable n'est une consigne de substitution", () => {
  it("détecte les tournures relatives", () => {
    assert.equal(isRelativeMealLabel("Lentilles vertes à la place des pois chiches"), true);
    assert.equal(isRelativeMealLabel("Version végétarienne avec pois chiches"), true);
    assert.equal(isRelativeMealLabel("Wrap poulet ou tofu"), true);
    assert.equal(isRelativeMealLabel("Pois chiches à la place des lentilles"), true);
    assert.equal(isRelativeMealLabel("Salade lentilles vertes, concombre, tomate, feta"), false);
  });

  it("aucun nom ni substitution du plan n'est une consigne", () => {
    for (const day of plan.jours) {
      for (const meal of day.repas) {
        assert.equal(isRelativeMealLabel(meal.nom), false, `plat : ${meal.nom}`);
        assert.equal(isRelativeMealLabel(meal.substitution ?? ""), false, `substitution : ${meal.substitution}`);
      }
    }
  });

  it("aucun repas du catalogue n'est une consigne", () => {
    for (const meal of getMealCatalog()) {
      assert.equal(isRelativeMealLabel(meal.nom), false, meal.nom);
    }
  });
});

describe("I9 · portions par aliment, jamais le nom du plat", () => {
  it("chaque repas du catalogue a des portions rédigées", () => {
    const missing = getMealCatalog()
      .filter((meal) => !hasExplicitPortions(meal.nom))
      .map((meal) => meal.nom);
    assert.deepEqual(missing, [], `portions manquantes : ${missing.join(" | ")}`);
  });

  it("aucune ligne de portion n'est le nom du repas ni une consigne", () => {
    for (const meal of [...getMealCatalog(), ...SAFE_FALLBACK_MEALS, ...QUICK_CATALOG_MEALS]) {
      const details = getMealPortionDetails(meal.nom, meal.calories);
      assert.ok(details.ingredients.length >= 2, `une seule ligne pour « ${meal.nom} »`);
      for (const line of details.ingredients) {
        assert.notEqual(line.aliment.trim(), meal.nom.trim(), `ligne = plat : ${meal.nom}`);
        assert.equal(isRelativeMealLabel(line.aliment), false, `${meal.nom} / ${line.aliment}`);
      }
    }
  });
});

describe("I10 · assez de plats réels par créneau, y compris 15 min + allergie", () => {
  const MIN = 3;
  const cases: { label: string; patch: Partial<OnboardingData> }[] = [
    { label: "omnivore", patch: {} },
    { label: "allergie œufs", patch: { allergies: ["Œufs"] } },
    { label: "gluten+lait", patch: { allergies: ["Gluten", "Lait"] } },
    { label: "végétalien", patch: { regimeAlimentaire: "Végétalienne" } },
    { label: "œufs + 15 min", patch: { allergies: ["Œufs"], tempsCuisine: "Moins de 15 min" } },
    { label: "végétalien + 15 min", patch: { regimeAlimentaire: "Végétalienne", tempsCuisine: "Moins de 15 min" } },
  ];

  for (const { label, patch } of cases) {
    it(`${label} : au moins ${MIN} plats compatibles par type dans le budget`, () => {
      const profile = profileWith({ tempsCuisine: "Peu importe", ...patch });
      for (const type of MEAL_TYPE_ORDER) {
        const options = getMealCatalog().filter(
          (meal) =>
            meal.type === type &&
            isMealCompatibleWithProfile(meal, profile) &&
            (getPrepMinutes(meal.nom) ?? 999) <= (patch.tempsCuisine === "Moins de 15 min" ? 15 : 999),
        );
        assert.ok(
          options.length >= MIN,
          `${label} ${type} : ${options.length} plat(s) — ${options.map((m) => m.nom).join(" | ")}`,
        );
      }
    });
  }

  it("allergie œufs + 15 min : le déjeuner affiché est un vrai plat ≤ 15 min, pas une consigne", () => {
    const profile = profileWith({ allergies: ["Œufs"], tempsCuisine: "Moins de 15 min" });
    const lunch = plan.jours[0]!.repas.find((m) => m.type === "dejeuner")!;
    const shown = getProfileAdjustedEffectiveMeal(lunch, undefined, profile, 1);
    assert.ok(shown, "aucun déjeuner proposé");
    assert.equal(isRelativeMealLabel(shown!.nom), false, shown!.nom);
    assert.ok((getPrepMinutes(shown!.nom) ?? 999) <= 15, `« ${shown!.nom} » trop long`);
    const alts = getMealAlternatives(profile, lunch, shown!.nom);
    assert.ok(alts.length >= 2, `une seule alternative : ${alts.map((a) => a.nom).join(" | ")}`);
    for (const alt of alts) {
      assert.equal(isRelativeMealLabel(alt.nom), false, alt.nom);
    }
  });

  it("chaque plat du catalogue déclare un temps de préparation", () => {
    const declared = new Set(prepTimeMealNames());
    for (const meal of getMealCatalog()) {
      assert.ok(declared.has(meal.nom), `temps manquant : ${meal.nom}`);
    }
  });
});

describe("laitue n'est pas du lait", () => {
  it("un plat à la laitue reste compatible végétalien", () => {
    const vegan = profileWith({ regimeAlimentaire: "Végétalienne" });
    const meal = getMealCatalog().find((m) => m.nom.includes("laitue"));
    assert.ok(meal, "plat à la laitue absent du catalogue");
    assert.equal(isMealCompatibleWithProfile(meal!, vegan), true, meal!.nom);
  });
});
