import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REGIME_OPTIONS } from "@/data/foodPreferenceCatalog";
import { SAFE_FALLBACK_MEALS } from "@/data/mealAllergenCatalog";
import { getPrepMinutes, prepBudgetMinutes, prepTimeMealNames } from "@/data/mealPrepTimeCatalog";
import { clinicalAffinityScore } from "@/utils/clinicalAffinity";
import {
  activeFoodPreferences,
  buildAutoMealOverrides,
  getMealAlternatives,
  getMealCatalog,
  getProfileAdjustedEffectiveMeal,
  profileMealPersonalizationFingerprint,
} from "@/utils/mealPersonalization";
import {
  getDailyWalkingRecommendation,
  getMealCaloriesForTarget,
  getMealPlan,
  getPersonalizedCalories,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import { MEAL_TYPE_ORDER, visibleMealIndicesForDay, visibleMealTypes } from "@/utils/mealRhythm";
import { mealKey } from "@/utils/planTracking";
import { buildProfileDayTips } from "@/utils/profileAdvice";
import { buildDiagnosticsForProfile, comorbiditiesOnly, comorbiditySelection } from "@/utils/profilePath";
import { buildShoppingList } from "@/utils/shoppingList";
import type { OnboardingData } from "@/utils/types";

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

const RYTHMES = ["2 repas", "3 repas", "3 repas + collations"] as const;
const PARCOURS = ["j30", "j90", "j180", "j365"] as const;
const NIVEAUX = ["Sédentaire", "Légèrement active", "Modérément active", "Très active"] as const;

/** Morphologies aux bornes déclarées par l'onboarding (18-60 ans, 140-210 cm). */
const MORPHOS: { label: string; patch: Partial<OnboardingData> }[] = [
  { label: "18a/140cm/45kg", patch: { age: 18, tailleCm: 140, poidsKg: 45 } },
  { label: "18a/210cm/120kg", patch: { age: 18, tailleCm: 210, poidsKg: 120 } },
  { label: "32a/165cm/70kg", patch: { age: 32, tailleCm: 165, poidsKg: 70 } },
  { label: "60a/150cm/95kg", patch: { age: 60, tailleCm: 150, poidsKg: 95 } },
  { label: "60a/210cm/55kg", patch: { age: 60, tailleCm: 210, poidsKg: 55 } },
];

function profileWith(partial: Partial<OnboardingData>): OnboardingData {
  return { ...baseProfile, ...partial };
}

/** Somme des calories réellement servies sur les repas visibles du rythme choisi. */
function servedCalories(profile: OnboardingData, dayIndex: number): { served: number; target: number } {
  const target = getPersonalizedCalories(profile);
  const day = getMealPlan(profile).jours[dayIndex]!;
  const served = visibleMealIndicesForDay(day.repas, profile.rythmeRepas).reduce(
    (sum, i) => sum + getMealCaloriesForTarget(day.repas[i]!.calories, day, target, profile.rythmeRepas),
    0,
  );
  return { served, target };
}

describe("I1 · le rythme de repas n'ampute jamais la cible calorique", () => {
  it("sert la cible du jour à +/- 2 % pour les 3 rythmes, tous parcours et morphologies", () => {
    for (const rythmeRepas of RYTHMES) {
      for (const parcoursPerte of PARCOURS) {
        for (const niveauActivite of NIVEAUX) {
          for (const morpho of MORPHOS) {
            const profile = profileWith({ ...morpho.patch, rythmeRepas, parcoursPerte, niveauActivite });
            for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
              const { served, target } = servedCalories(profile, dayIndex);
              const ecartPct = Math.abs(served / target - 1) * 100;
              assert.ok(
                ecartPct <= 2,
                `${rythmeRepas} ${parcoursPerte} ${niveauActivite} ${morpho.label} J${dayIndex + 1} : ${served}/${target} kcal (${ecartPct.toFixed(1)} % d'écart)`,
              );
            }
          }
        }
      }
    }
  });

  it("sert autant de calories avec 2 repas qu'avec 3 repas + collations", () => {
    const deux = servedCalories(profileWith({ rythmeRepas: "2 repas" }), 0);
    const quatre = servedCalories(profileWith({ rythmeRepas: "3 repas + collations" }), 0);
    assert.equal(deux.target, quatre.target);
    assert.ok(
      Math.abs(deux.served - quatre.served) <= Math.round(deux.target * 0.02),
      `2 repas sert ${deux.served} kcal contre ${quatre.served} kcal pour 4 repas`,
    );
  });

  it("ne produit ni repas résiduel ni repas qui avale la journée", () => {
    for (const rythmeRepas of RYTHMES) {
      for (const morpho of MORPHOS) {
        const profile = profileWith({ ...morpho.patch, rythmeRepas });
        const target = getPersonalizedCalories(profile);
        for (const day of getMealPlan(profile).jours.slice(0, 14)) {
          for (const i of visibleMealIndicesForDay(day.repas, rythmeRepas)) {
            const kcal = getMealCaloriesForTarget(day.repas[i]!.calories, day, target, rythmeRepas);
            assert.ok(kcal >= 120, `${rythmeRepas} ${morpho.label} : repas à ${kcal} kcal`);
            assert.ok(kcal <= target * 0.65, `${rythmeRepas} ${morpho.label} : repas à ${kcal}/${target} kcal`);
          }
        }
      }
    }
  });

  it("répercute le rythme sur la liste de courses", () => {
    const plan = getMealPlan(baseProfile);
    const deux = buildShoppingList(profileWith({ rythmeRepas: "2 repas" }), plan.jours, 1, 7, {});
    const quatre = buildShoppingList(profileWith({ rythmeRepas: "3 repas + collations" }), plan.jours, 1, 7, {});
    assert.ok(deux.lines.length > 0 && quatre.lines.length > 0);
    assert.notEqual(
      deux.lines.map((l) => `${l.aliment}:${l.grammes}`).join("|"),
      quatre.lines.map((l) => `${l.aliment}:${l.grammes}`).join("|"),
    );
  });
});

describe("Profils associés · séparation parcours / comorbidités", () => {
  it("comorbiditiesOnly retire SOPK, « Aucun diagnostic » et « Je ne sais pas »", () => {
    const input = ["SOPK", "Aucun diagnostic", "Je ne sais pas", "Endométriose"];
    assert.deepEqual(comorbiditiesOnly(input), ["Endométriose"]);
  });

  it("comorbiditySelection garde « Je ne sais pas » qui est une réponse cochable", () => {
    const input = ["SOPK", "Aucun diagnostic", "Je ne sais pas", "Endométriose"];
    assert.deepEqual(comorbiditySelection(input), ["Je ne sais pas", "Endométriose"]);
  });

  it("« Aucun diagnostic » n'est jamais affiché comme profil associé sélectionné", () => {
    assert.ok(!comorbiditySelection(["Aucun diagnostic"]).includes("Aucun diagnostic"));
  });

  it("le parcours SOPK est reconstruit sans dupliquer ni perdre les comorbidités", () => {
    assert.deepEqual(buildDiagnosticsForProfile("sopk", ["SOPK", "Endométriose"]), ["SOPK", "Endométriose"]);
    assert.deepEqual(buildDiagnosticsForProfile("general", ["SOPK", "Endométriose"]), ["Endométriose"]);
  });
});

describe("Favoris · les filtres priment sur les goûts", () => {
  it("un favori interdit par le régime est retiré des goûts retenus", () => {
    const vegan = profileWith({
      regimeAlimentaire: "Végétalienne",
      alimentsPreferes: ["Poulet", "Saumon", "Quinoa", "Avocat"],
    });
    assert.deepEqual(activeFoodPreferences(vegan), ["Quinoa", "Avocat"]);
  });

  it("un favori également coché en allergène ou en exclusion est retiré", () => {
    assert.deepEqual(
      activeFoodPreferences(profileWith({ alimentsPreferes: ["Œufs", "Quinoa"], allergies: ["Œufs"] })),
      ["Quinoa"],
    );
    assert.deepEqual(
      activeFoodPreferences(profileWith({ alimentsPreferes: ["Fromage", "Quinoa"], alimentsDetestes: ["Fromage"] })),
      ["Quinoa"],
    );
  });

  it("un favori compatible est conservé", () => {
    assert.deepEqual(activeFoodPreferences(profileWith({ alimentsPreferes: ["Poulet", "Avocat"] })), [
      "Poulet",
      "Avocat",
    ]);
  });

  it("aucun repas proposé ne contient un favori pourtant exclu par le régime", () => {
    const vegan = profileWith({ regimeAlimentaire: "Végétalienne", alimentsPreferes: ["Poulet", "Saumon"] });
    const plan = getMealPlan(vegan);
    const overrides = buildAutoMealOverrides(vegan, plan, {});
    for (const day of plan.jours.slice(0, 14)) {
      day.repas.forEach((planned, mi) => {
        const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], vegan, day.jour + mi);
        if (!shown) return;
        assert.ok(!/poulet|saumon/i.test(shown.nom), `repas non végétalien proposé : ${shown.nom}`);
      });
    }
  });
});

describe("Temps pour préparer · donnée réelle et respectée", () => {
  it("chaque repas du catalogue et de secours déclare un temps de préparation", () => {
    const declared = new Set(prepTimeMealNames());
    for (const meal of [...getMealCatalog(), ...SAFE_FALLBACK_MEALS]) {
      assert.ok(declared.has(meal.nom), `temps de préparation manquant : « ${meal.nom} »`);
      assert.equal(typeof getPrepMinutes(meal.nom), "number", `temps illisible : « ${meal.nom} »`);
    }
  });

  it("les budgets de l'onboarding sont tous reconnus", () => {
    assert.equal(prepBudgetMinutes("Moins de 15 min"), 15);
    assert.equal(prepBudgetMinutes("15 - 30 min"), 30);
    assert.equal(prepBudgetMinutes("30 - 45 min"), 45);
    assert.equal(prepBudgetMinutes("Peu importe"), null);
  });

  it("« Moins de 15 min » ne propose jamais un repas long quand un rapide existe", () => {
    // Comparaison directe aux minutes déclarées : passer par `fitsPrepBudget` ferait
    // du test une tautologie de la fonction qu'il doit contrôler.
    const budget = 15;
    const rapide = profileWith({ tempsCuisine: "Moins de 15 min" });
    const plan = getMealPlan(rapide);
    const overrides = buildAutoMealOverrides(rapide, plan, {});

    for (const day of plan.jours.slice(0, 14)) {
      day.repas.forEach((planned, mi) => {
        const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], rapide, day.jour + mi);
        if (!shown) return;
        const minutes = getPrepMinutes(shown.nom);
        if (minutes == null || minutes <= budget) return;
        const fasterExists = getMealCatalog().some(
          (candidate) => candidate.type === planned.type && (getPrepMinutes(candidate.nom) ?? 999) <= budget,
        );
        assert.ok(
          !fasterExists,
          `« ${shown.nom} » (${minutes} min) proposé alors qu'un repas ≤ ${budget} min existe pour ce créneau`,
        );
      });
    }
  });

  it("un budget plus serré ne dégrade jamais la sécurité alimentaire", () => {
    const profile = profileWith({ tempsCuisine: "Moins de 15 min", allergies: ["Gluten", "Lait"] });
    const plan = getMealPlan(profile);
    const overrides = buildAutoMealOverrides(profile, plan, {});
    for (const day of plan.jours.slice(0, 14)) {
      day.repas.forEach((planned, mi) => {
        const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], profile, day.jour + mi);
        if (!shown) return;
        assert.ok(!/pain|pates|muesli|pancake|toast|wrap|galette/i.test(shown.nom), `gluten proposé : ${shown.nom}`);
      });
    }
  });
});

describe("Garde-fou calorique du classement", () => {
  it("un favori très éloigné de la cible ne passe pas devant un repas bien calibré", () => {
    const planned = getMealCatalog().find((m) => m.type === "diner")!;
    const gourmand = profileWith({ alimentsPreferes: ["Fromage", "Avocat", "Noix"] });
    for (const alternative of getMealAlternatives(gourmand, planned).slice(0, 3)) {
      assert.ok(
        Math.abs(alternative.calories - planned.calories) <= 300,
        `« ${alternative.nom} » (${alternative.calories} kcal) proposé face à ${planned.calories} kcal`,
      );
    }
  });
});

describe("I3 · chaque réponse d'onboarding a un effet observable", () => {
  const variations: { field: keyof OnboardingData; a: unknown; b: unknown }[] = [
    { field: "regimeAlimentaire", a: "Omnivore", b: "Végétalienne" },
    { field: "allergies", a: [], b: ["Gluten"] },
    { field: "alimentsDetestes", a: [], b: ["Tomate"] },
    { field: "alimentsPreferes", a: [], b: ["Poulet"] },
    { field: "tempsCuisine", a: "Peu importe", b: "Moins de 15 min" },
    { field: "parcoursPerte", a: "j90", b: "j30" },
    { field: "rythmeRepas", a: "3 repas", b: "2 repas" },
    { field: "symptomes", a: [], b: ["Fringales difficiles à calmer"] },
    { field: "diagnostics", a: [], b: ["Résistance à l’insuline"] },
    { field: "niveauActivite", a: "Sédentaire", b: "Très active" },
    { field: "profilNutrition", a: "sopk", b: "general" },
  ];

  function signature(profile: OnboardingData): string {
    const plan = getMealPlan(profile);
    const overrides = buildAutoMealOverrides(profile, plan, {});
    const days = plan.jours.slice(0, 7);
    const target = getPersonalizedCalories(profile);

    const menu = days
      .flatMap((day) =>
        day.repas.map((planned, mi) => {
          const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], profile, day.jour + mi);
          return shown?.nom ?? "∅";
        }),
      )
      .join("|");
    const alternatives = days
      .flatMap((day) => day.repas.map((planned) => getMealAlternatives(profile, planned).map((m) => m.nom).join(">")))
      .join("|");
    const portions = days
      .flatMap((day) =>
        visibleMealIndicesForDay(day.repas, profile.rythmeRepas).map((i) =>
          String(getMealCaloriesForTarget(day.repas[i]!.calories, day, target, profile.rythmeRepas)),
        ),
      )
      .join("|");
    const reperes = [
      target,
      getPersonalizedHydrationLiters(2, profile),
      getDailyWalkingRecommendation(profile).steps,
    ].join("/");
    const conseils = buildProfileDayTips(profile).join("|");

    return [menu, alternatives, portions, reperes, conseils].join("#");
  }

  for (const { field, a, b } of variations) {
    it(`« ${String(field)} » change quelque chose de visible`, () => {
      const sa = signature({ ...baseProfile, [field]: a } as OnboardingData);
      const sb = signature({ ...baseProfile, [field]: b } as OnboardingData);
      assert.notEqual(sa, sb, `« ${String(field)} » est demandé en onboarding mais ne change rien`);
    });
  }
});

describe("I4 · un menu qui change impose une empreinte qui change", () => {
  /*
   * Le classement des repas n'entre en jeu que lorsqu'une substitution est nécessaire.
   * Ces variations partent donc d'un profil avec allergies, sinon les symptômes et
   * profils associés n'auraient aucune occasion d'agir et le test ne prouverait rien.
   */
  const substituting = profileWith({ allergies: ["Gluten", "Lait"] });
  const variations: { field: keyof OnboardingData; a: unknown; b: unknown }[] = [
    { field: "regimeAlimentaire", a: "Omnivore", b: "Végétalienne" },
    { field: "allergies", a: ["Gluten", "Lait"], b: ["Gluten", "Lait", "Œufs"] },
    { field: "alimentsDetestes", a: [], b: ["Tomate"] },
    { field: "tempsCuisine", a: "Peu importe", b: "Moins de 15 min" },
    { field: "alimentsPreferes", a: [], b: ["Poulet"] },
    { field: "symptomes", a: [], b: ["Ventre gonflé ou inconfort digestif"] },
    { field: "symptomes", a: [], b: ["Nuits agitées ou trop courtes"] },
    { field: "diagnostics", a: [], b: ["Ménopause / périménopause"] },
    { field: "diagnostics", a: [], b: ["Résistance à l’insuline"] },
  ];

  function menuSignature(profile: OnboardingData): string {
    const plan = getMealPlan(profile);
    const overrides = buildAutoMealOverrides(profile, plan, {});
    return plan.jours
      .slice(0, 14)
      .flatMap((day) =>
        day.repas.map((planned, mi) => {
          const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], profile, day.jour + mi);
          return shown?.nom ?? "∅";
        }),
      )
      .join("|");
  }

  for (const { field, a, b } of variations) {
    it(`« ${String(field)} » = ${JSON.stringify(b)} ne laisse jamais un menu périmé`, () => {
      const pa = { ...substituting, [field]: a } as OnboardingData;
      const pb = { ...substituting, [field]: b } as OnboardingData;
      if (menuSignature(pa) === menuSignature(pb)) return;
      assert.notEqual(
        profileMealPersonalizationFingerprint(pa),
        profileMealPersonalizationFingerprint(pb),
        `« ${String(field)} » change le menu sans déclencher de recalcul`,
      );
    });
  }
});

describe("Affinité clinique · alignée sur ce que l'app affirme déjà", () => {
  it("ne note rien quand aucun symptôme ni profil associé n'est déclaré", () => {
    assert.equal(clinicalAffinityScore("Salade quinoa, poulet, avocat, légumes croquants", "dejeuner", baseProfile), 0);
  });

  it("valorise les glucides complets en cas de résistance à l'insuline", () => {
    const profile = profileWith({ diagnostics: ["Résistance à l’insuline"] });
    assert.ok(clinicalAffinityScore("Poisson blanc, quinoa, légumes rôtis", "dejeuner", profile) > 0);
    assert.equal(clinicalAffinityScore("Orange + 1 carré chocolat noir 85%", "collation", profile), 0);
  });

  it("valorise les repas protéinés quand des fringales sont signalées", () => {
    const profile = profileWith({ symptomes: ["Fringales difficiles à calmer"] });
    assert.ok(clinicalAffinityScore("Skyr + noix + framboises", "petit_dejeuner", profile) > 0);
  });

  it("reste un critère de préférence : ne retire jamais un repas sûr", () => {
    const profile = profileWith({ symptomes: ["Fringales difficiles à calmer"], diagnostics: ["Endométriose"] });
    const plan = getMealPlan(profile);
    const overrides = buildAutoMealOverrides(profile, plan, {});
    for (const day of plan.jours.slice(0, 14)) {
      day.repas.forEach((planned, mi) => {
        const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], profile, day.jour + mi);
        assert.ok(shown, `créneau vidé par l'affinité clinique : J${day.jour} ${planned.type}`);
      });
    }
  });
});

describe("I6 · repères médicaux dans des bornes défendables", () => {
  it("calories, eau et pas restent crédibles pour tous les profils extrêmes", () => {
    for (const morpho of MORPHOS) {
      for (const parcoursPerte of PARCOURS) {
        for (const niveauActivite of NIVEAUX) {
          const profile = profileWith({ ...morpho.patch, parcoursPerte, niveauActivite });
          const kcal = getPersonalizedCalories(profile);
          const eau = getPersonalizedHydrationLiters(2, profile);
          const pas = getDailyWalkingRecommendation(profile).steps;
          assert.ok(kcal >= 1200 && kcal <= 2600, `${morpho.label} : ${kcal} kcal`);
          assert.ok(eau >= 1.5 && eau <= 4, `${morpho.label} : ${eau} L`);
          assert.ok(pas >= 3000 && pas <= 15000, `${morpho.label} : ${pas} pas`);
        }
      }
    }
  });
});

describe("I5 · aucun état vide silencieux", () => {
  it("tout rythme, même inconnu, laisse au moins un repas visible", () => {
    for (const rythme of [...RYTHMES, undefined, "", "4 repas", "n'importe quoi"]) {
      const jour = getMealPlan(profileWith({ rythmeRepas: rythme })).jours[0]!;
      assert.ok(
        visibleMealIndicesForDay(jour.repas, rythme).length > 0,
        `rythme « ${rythme} » ne montre aucun repas`,
      );
    }
  });

  it("tout régime produit un plan et une liste de courses non vides", () => {
    for (const regimeAlimentaire of REGIME_OPTIONS) {
      const profile = profileWith({ regimeAlimentaire });
      const plan = getMealPlan(profile);
      assert.ok(plan.jours.length > 0, `plan vide pour ${regimeAlimentaire}`);
      const overrides = buildAutoMealOverrides(profile, plan, {});
      assert.ok(
        buildShoppingList(profile, plan.jours, 1, 7, overrides).lines.length > 0,
        `courses vides pour ${regimeAlimentaire}`,
      );
    }
  });
});
