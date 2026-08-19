import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MEAL_WHY_CATALOG, lookupMealWhyCatalog, normalizeMealKey } from "@/data/mealWhyCatalog";
import { getMealCatalog } from "@/utils/mealPersonalization";
import { getMealPortionDetails } from "@/utils/meal-portions";
import { buildMealPortionTeaching, buildStepsWhyToday, buildWaterWhyToday, teachFromDisplayedPortions } from "@/utils/taskWhyToday";
import type { DayPlan, MealEntry, OnboardingData } from "@/utils/types";

const profile: OnboardingData = {
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

function dayFor(meal: MealEntry): DayPlan {
  return {
    jour: 1,
    hydratationLitres: 2,
    rappelHydratation: "",
    repas: [meal],
    conseils: [],
  };
}

function normalize(text: string): string {
  return normalizeMealKey(text);
}

const GENERIC_BANNED = [
  "vos portions aujourd",
  "portions estimees a partir du libelle",
  "repas calibre pour limiter",
  "repartition proteines-glucides-lipides",
  "apport eleve en proteines et fibres",
  "sans allergene majeur",
  "utile pour sopk et gestion du poids",
];

const DOSE_IDEA =
  /plafond|plafonn|volume|mesur|moder|poignee|tranche|cube|louche|cuillere|pincee|carre|dos[éeent]|limit|bol\b|unite|genereux|genereuse|compt|petite |petit |un seul|une seule|10 amandes|deux oeufs|coupelle|filet|morceau|quantite|pese|demi|ramequin|condiment|courte|une dose|une tranche|une louche|une pincee|une poignee/i;

describe("I15 · pédagogie dans les portions, pas une vignette générique", () => {
  it("chaque texte catalogue est unique et enseigne un dosage", () => {
    const seen = new Map<string, string>();
    for (const [key, text] of Object.entries(MEAL_WHY_CATALOG)) {
      const normalized = normalize(text);
      assert.equal(seen.has(normalized), false, `doublon catalogue : « ${key} » = « ${seen.get(normalized)} »`);
      seen.set(normalized, key);
      assert.ok(DOSE_IDEA.test(normalized), `pas d’idée de dose : ${key} → ${text}`);
      for (const banned of GENERIC_BANNED) {
        assert.equal(normalized.includes(banned), false, `slogan générique « ${banned} » dans ${key}`);
      }
    }
  });

  it("chaque repas du catalogue a un texte qui cite un aliment et n’en recopie pas la liste", () => {
    const collisions = new Map<string, string>();
    for (const meal of getMealCatalog()) {
      const teaching = buildMealPortionTeaching(profile, meal, dayFor(meal), 1800);
      const blob = normalize(teaching);
      assert.ok(teaching.trim().length > 40, `texte trop court : ${meal.nom}`);
      assert.equal(blob.includes("vos portions aujourd"), false, `liste recopiée : ${meal.nom}`);
      for (const banned of GENERIC_BANNED) {
        assert.equal(blob.includes(banned), false, `« ${banned} » dans ${meal.nom}`);
      }

      const ingredients = getMealPortionDetails(meal.nom, meal.calories).ingredients;
      const citesAliment = ingredients.some((ingredient) => {
        const token = normalize(ingredient.aliment)
          .split(/\s+/)
          .find((part) => part.length >= 4);
        return Boolean(token && blob.includes(token));
      });
      assert.ok(citesAliment, `aucun aliment cité : ${meal.nom} → ${teaching}`);
      assert.ok(
        lookupMealWhyCatalog(meal.nom) || DOSE_IDEA.test(blob),
        `ni catalogue ni dose : ${meal.nom}`,
      );

      const previous = collisions.get(blob);
      assert.equal(Boolean(previous), false, `même texte pour « ${meal.nom} » et « ${previous} »`);
      collisions.set(blob, meal.nom);
    }
  });

  it("un plat hors catalogue enseigne à partir des grammes affichés, sans slogan", () => {
    const text = teachFromDisplayedPortions(
      [
        { aliment: "Cabillaud", grammes: 150 },
        { aliment: "Haricots verts", grammes: 180 },
        { aliment: "Riz complet cuit", grammes: 90 },
      ],
      "diner",
    );
    assert.ok(text);
    const blob = normalize(text);
    assert.ok(blob.includes("cabillaud") || blob.includes("haricots") || blob.includes("riz"));
    assert.ok(DOSE_IDEA.test(blob) || blob.includes("riz complet") || blob.includes("limite"));
    assert.equal(blob.includes("vos portions aujourd"), false);
  });

  it("le hook profil n’apparaît que s’il ajoute une info (favori)", () => {
    const meal = getMealCatalog().find((entry) => normalize(entry.nom).includes("poulet"));
    assert.ok(meal);
    const plain = buildMealPortionTeaching(profile, meal, dayFor(meal), 1800);
    const withFav = buildMealPortionTeaching(
      { ...profile, alimentsPreferes: ["Poulet"] },
      meal,
      dayFor(meal),
      1800,
    );
    assert.ok(withFav.includes("Poulet") || withFav.includes("poulet"));
    assert.ok(withFav.length >= plain.length);
    assert.equal(plain.includes("Vous aviez indiqué aimer"), false);
  });
});

describe("I16 · pédagogie eau et pas sous la dose, pas en vignette", () => {
  const withActivity = (niveauActivite: string, poidsKg = 70): OnboardingData => ({
    ...profile,
    profilNutrition: "sopk",
    niveauActivite,
    poidsKg,
  });

  it("l’eau cite le poids et change si la morphologie change", () => {
    const light = buildWaterWhyToday(withActivity("Sédentaire", 55), 2000);
    const heavy = buildWaterWhyToday(withActivity("Sédentaire", 90), 2800);
    assert.ok(light.includes("55 kg"), light);
    assert.ok(heavy.includes("90 kg"), heavy);
    assert.notEqual(light, heavy);
    assert.equal(normalize(light).includes("objectif "), false);
    assert.equal(normalize(light).includes("profil alimentaire"), false);
    assert.equal(normalize(light).includes("soutient le metabolisme"), false);
  });

  it("l’eau distingue sédentaire et très active", () => {
    const sedentary = buildWaterWhyToday(withActivity("Sédentaire"), 2200);
    const very = buildWaterWhyToday(withActivity("Très active"), 2600);
    assert.notEqual(sedentary, very);
    assert.ok(sedentary.toLowerCase().includes("sédentaire") || sedentary.toLowerCase().includes("sedentaire"));
    assert.ok(very.toLowerCase().includes("très active") || very.toLowerCase().includes("tres active"));
  });

  it("les pas expliquent la cible sans relire le total en tête", () => {
    const sedentary = buildStepsWhyToday(withActivity("Sédentaire"), 6500);
    const very = buildStepsWhyToday(withActivity("Très active"), 10000);
    assert.notEqual(sedentary, very);
    assert.equal(/^\s*\d/.test(sedentary), false);
    assert.equal(normalize(sedentary).includes("sans surcharge"), false);
    assert.ok(normalize(sedentary).includes("insuline") || normalize(sedentary).includes("marche"));
    assert.ok(normalize(sedentary).includes("sedentaire") || sedentary.includes("progressive"));
    assert.ok(very.toLowerCase().includes("plus haute") || very.toLowerCase().includes("très active"));
  });
});
