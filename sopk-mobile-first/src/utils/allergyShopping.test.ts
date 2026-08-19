import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALLERGY_ITEMS, EXCLUSION_ITEMS, REGIME_OPTIONS } from "@/data/foodPreferenceCatalog";
import { getDeclaredAllergens, SAFE_FALLBACK_MEALS } from "@/data/mealAllergenCatalog";
import mealPlanData from "@/data/mealPlan.json";
import {
  buildAutoMealOverrides,
  getEffectiveMeal,
  getMealAlternatives,
  getMealCatalog,
  getProfileAdjustedEffectiveMeal,
  isIngredientExcludedForProfile,
  isMealCompatibleWithProfile,
} from "@/utils/mealPersonalization";
import { getMealPlan } from "@/utils/mealPlan";
import { buildShoppingList } from "@/utils/shoppingList";
import { mealKey } from "@/utils/planTracking";
import type { DayPlan, MealEntry, MealPlanData, OnboardingData } from "@/utils/types";

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

const ALL_ALLERGIES = ALLERGY_ITEMS.map((a) => a.key);
const ALL_EXCLUSIONS = EXCLUSION_ITEMS.map((e) => e.key);

function profileWith(partial: Partial<OnboardingData>): OnboardingData {
  return { ...baseProfile, ...partial };
}

/**
 * Vérifie l'invariant central : sur 14 jours, aucun repas affiché, aucune alternative
 * proposée et aucun ingrédient de la liste de courses ne viole le profil.
 * Un créneau sans repas sûr doit rendre `null` (état explicite), jamais un plat interdit.
 */
function assertPlanAndShoppingCoherent(profile: OnboardingData, label: string) {
  const plan = getMealPlan({ parcoursPerte: "j90" });
  const overrides = buildAutoMealOverrides(profile, plan, {});

  const days: DayPlan[] = plan.jours.filter((d) => d.jour >= 1 && d.jour <= 14);
  assert.equal(days.length, 14, `${label}: 14 jours attendus, ${days.length} trouvés`);

  for (const day of days) {
    const jour = day.jour;
    const repas: MealEntry[] = day.repas;

    for (let mi = 0; mi < repas.length; mi++) {
      const planned = repas[mi]!;
      const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(jour, mi)], profile, jour + mi);

      if (shown !== null) {
        assert.equal(
          isMealCompatibleWithProfile(shown, profile),
          true,
          `${label}: repas affiché interdit J${jour} (${planned.type}) → « ${shown.nom} »`,
        );
      }

      for (const alt of getMealAlternatives(profile, planned, shown?.nom)) {
        assert.equal(
          isMealCompatibleWithProfile(alt, profile),
          true,
          `${label}: alternative interdite J${jour} (${planned.type}) → « ${alt.nom} »`,
        );
      }
    }
  }

  const list = buildShoppingList(profile, plan.jours, 1, 14, overrides);
  for (const line of list.lines) {
    assert.equal(
      isIngredientExcludedForProfile(line.aliment, profile),
      false,
      `${label}: ingrédient interdit dans les courses « ${line.aliment} »`,
    );
  }
}

describe("couverture des données d'allergènes", () => {
  it("chaque repas du catalogue déclare ses allergènes", () => {
    const missing = getMealCatalog()
      .filter((meal) => getDeclaredAllergens(meal.nom) === undefined)
      .map((meal) => meal.nom);
    assert.deepEqual(missing, [], `Repas sans déclaration d'allergènes : ${missing.join(" | ")}`);
  });

  it("chaque repas de secours est réellement sans allergène ni exclusion", () => {
    const profile = profileWith({ allergies: ALL_ALLERGIES, alimentsDetestes: ALL_EXCLUSIONS });
    for (const meal of SAFE_FALLBACK_MEALS) {
      assert.equal(
        isMealCompatibleWithProfile(meal, profile),
        true,
        `Repas de secours non sûr : « ${meal.nom} »`,
      );
      assert.deepEqual(getDeclaredAllergens(meal.nom), [], `« ${meal.nom} » devrait déclarer 0 allergène`);
    }
  });

  it("couvre les 4 types de repas en secours", () => {
    for (const type of ["petit_dejeuner", "dejeuner", "collation", "diner"] as const) {
      assert.ok(
        SAFE_FALLBACK_MEALS.some((m) => m.type === type),
        `Aucun repas de secours pour le type ${type}`,
      );
    }
  });
});

describe("allergènes (chacun seul)", () => {
  for (const { key } of ALLERGY_ITEMS) {
    it(`plan + courses cohérents avec allergie ${key}`, () => {
      assertPlanAndShoppingCoherent(profileWith({ allergies: [key] }), `Allergie ${key}`);
    });
  }
});

describe("allergènes (toutes les paires)", () => {
  for (let i = 0; i < ALL_ALLERGIES.length; i++) {
    for (let j = i + 1; j < ALL_ALLERGIES.length; j++) {
      const pair = [ALL_ALLERGIES[i]!, ALL_ALLERGIES[j]!];
      it(`plan + courses cohérents avec ${pair.join(" + ")}`, () => {
        assertPlanAndShoppingCoherent(profileWith({ allergies: pair }), `Allergies ${pair.join(" + ")}`);
      });
    }
  }
});

describe("cas extrêmes", () => {
  it("tous les allergènes cochés", () => {
    assertPlanAndShoppingCoherent(profileWith({ allergies: ALL_ALLERGIES }), "Tous allergènes");
  });

  it("tous les allergènes + toutes les exclusions", () => {
    assertPlanAndShoppingCoherent(
      profileWith({ allergies: ALL_ALLERGIES, alimentsDetestes: ALL_EXCLUSIONS }),
      "Tous allergènes + exclusions",
    );
  });

  for (const regime of REGIME_OPTIONS) {
    it(`tous les allergènes + régime ${regime}`, () => {
      assertPlanAndShoppingCoherent(
        profileWith({ allergies: ALL_ALLERGIES, regimeAlimentaire: regime }),
        `Tous allergènes + ${regime}`,
      );
    });
  }

  it("aucun œuf affiché quand tous les allergènes sont cochés (anti-régression)", () => {
    const profile = profileWith({ allergies: ALL_ALLERGIES });
    const plan = getMealPlan({ parcoursPerte: "j90" });
    const overrides = buildAutoMealOverrides(profile, plan, {});

    for (let jour = 1; jour <= 14; jour++) {
      const day = plan.jours.find((d) => d.jour === jour)!;
      for (let mi = 0; mi < day.repas.length; mi++) {
        const shown = getProfileAdjustedEffectiveMeal(day.repas[mi]!, overrides[mealKey(jour, mi)], profile, jour + mi);
        if (!shown) continue;
        assert.doesNotMatch(
          shown.nom,
          /oeuf|œuf|omelette/i,
          `J${jour} propose encore « ${shown.nom} » malgré l'allergie aux œufs`,
        );
      }
    }
  });

  it("un petit-déjeuner sûr existe toujours, même avec tous les filtres", () => {
    const profile = profileWith({ allergies: ALL_ALLERGIES, alimentsDetestes: ALL_EXCLUSIONS });
    const plan = getMealPlan({ parcoursPerte: "j90" });
    const overrides = buildAutoMealOverrides(profile, plan, {});
    const shown = getProfileAdjustedEffectiveMeal(plan.jours[0]!.repas[0]!, overrides[mealKey(1, 0)], profile, 1);
    assert.ok(shown, "Aucun petit-déjeuner proposé alors qu'un repas de secours existe");
    assert.equal(isMealCompatibleWithProfile(shown!, profile), true);
  });
});

describe("exclusions et régimes", () => {
  for (const { key } of EXCLUSION_ITEMS) {
    it(`plan + courses cohérents avec exclusion ${key}`, () => {
      assertPlanAndShoppingCoherent(profileWith({ alimentsDetestes: [key] }), `Exclusion ${key}`);
    });
  }

  for (const regime of REGIME_OPTIONS) {
    if (regime === "Omnivore") continue;
    it(`plan + courses cohérents avec régime ${regime}`, () => {
      assertPlanAndShoppingCoherent(profileWith({ regimeAlimentaire: regime }), `Régime ${regime}`);
    });
  }

  it("filtre viande/poisson/œufs de la liste en végétalien", () => {
    const profile = profileWith({ regimeAlimentaire: "Végétalienne" });
    assert.equal(isIngredientExcludedForProfile("Thon", profile), true);
    assert.equal(isIngredientExcludedForProfile("Oeufs", profile), true);
    assert.equal(isIngredientExcludedForProfile("Poulet grillé", profile), true);
  });

  it("exclusion Œufs prime sur préférence Œufs", () => {
    assertPlanAndShoppingCoherent(
      profileWith({ alimentsPreferes: ["Œufs"], alimentsDetestes: ["Œufs"] }),
      "Exclusion > préférence Œufs",
    );
  });
});

describe("allergènes cachés dans les libellés", () => {
  const hidden: { aliment: string; allergie: string }[] = [
    { aliment: "Houmous", allergie: "Sésame" },
    { aliment: "Carottes + houmous", allergie: "Sésame" },
    { aliment: "Bol de muesli sans sucre", allergie: "Fruits à coque" },
    { aliment: "Poudre protéinée", allergie: "Lait" },
    { aliment: "Chocolat noir 85%", allergie: "Soja" },
    { aliment: "Gratin de légumes", allergie: "Lait" },
    { aliment: "Soupe de légumes", allergie: "Céleri" },
    { aliment: "Galettes de sarrasin", allergie: "Œufs" },
    { aliment: "omelette aux herbes", allergie: "Œufs" },
  ];

  for (const { aliment, allergie } of hidden) {
    it(`« ${aliment} » est écarté avec l'allergie ${allergie}`, () => {
      assert.equal(
        isIngredientExcludedForProfile(aliment, profileWith({ allergies: [allergie] })),
        true,
      );
    });
  }
});

describe("détection sur repas isolés", () => {
  const omelette = {
    nom: "Omelette épinards + pain complet",
    calories: 380,
    type: "petit_dejeuner" as const,
    substitution: "",
  };

  it("bloque l'omelette avec allergie Œufs", () => {
    assert.equal(isMealCompatibleWithProfile(omelette, profileWith({ allergies: ["Œufs"] })), false);
  });

  it("bloque l'omelette en exclusion Œufs", () => {
    assert.equal(isMealCompatibleWithProfile(omelette, profileWith({ alimentsDetestes: ["Œufs"] })), false);
  });

  it("détecte le gluten dans un wrap", () => {
    const profile = profileWith({ allergies: ["Gluten"] });
    assert.equal(
      isMealCompatibleWithProfile(
        { nom: "Wrap complet au thon, crudités, houmous", calories: 450, type: "dejeuner", substitution: "" },
        profile,
      ),
      false,
    );
    assert.equal(isIngredientExcludedForProfile("Wrap complet", profile), true);
  });

  it("conserve le lait végétal sans allergie lait", () => {
    const profile = profileWith({ allergies: ["Lait"] });
    assert.equal(isIngredientExcludedForProfile("Lait végétal sans sucre", profile), false);
    assert.equal(
      isMealCompatibleWithProfile(
        {
          nom: "Porridge flocons d’avoine, lait végétal, cannelle",
          calories: 360,
          type: "petit_dejeuner",
          substitution: "",
        },
        profile,
      ),
      true,
    );
  });

  it("remplace un override manuel devenu incompatible", () => {
    const profile = profileWith({ allergies: ["Œufs"] });
    const plan = getMealPlan({ parcoursPerte: "j90" });
    const key = mealKey(1, 0);
    const overrides = buildAutoMealOverrides(profile, plan, {
      [key]: { nom: "Omelette épinards + pain complet", calories: 380, custom: false, source: "manual" },
    });
    const meal = getEffectiveMeal(plan.jours[0]!.repas[0]!, overrides[key]);
    assert.equal(isMealCompatibleWithProfile(meal, profile), true);
    assert.doesNotMatch(meal.nom, /oeuf|œuf|omelette/i);
  });
});

describe("plan 14 jours", () => {
  it("a 14 menus uniques dans les templates JSON", () => {
    const parsed = mealPlanData as MealPlanData;
    const sigs = parsed.jours.slice(0, 14).map((d) => d.repas.map((r) => r.nom).join("|"));
    assert.equal(new Set(sigs).size, 14);
    for (let i = 0; i < 7; i++) {
      assert.notEqual(sigs[i], sigs[i + 7], `jour ${i + 1} vs ${i + 8}`);
    }
  });
});
