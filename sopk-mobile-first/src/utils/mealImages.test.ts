import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMealCatalog } from "@/utils/mealPersonalization";
import {
  FOOD_BY_MEAL_TYPE,
  getMealImageUrl,
  isMealTypeSvgFallback,
  MEAL_TYPE_FALLBACK,
} from "@/utils/mealImages";

describe("I12 · aucun plat du catalogue n'a une image SVG de type", () => {
  it("getMealImageUrl ne renvoie jamais un SVG de type pour un repas du catalogue", () => {
    const offenders = getMealCatalog()
      .map((meal) => ({ nom: meal.nom, url: getMealImageUrl(meal) }))
      .filter((row) => isMealTypeSvgFallback(row.url));
    assert.deepEqual(
      offenders,
      [],
      offenders.map((row) => `${row.nom} → ${row.url}`).join(" | "),
    );
  });

  it("les SVG de type existent toujours mais ne sont pas le repli du catalogue", () => {
    for (const url of Object.values(MEAL_TYPE_FALLBACK)) {
      assert.equal(isMealTypeSvgFallback(url), true);
    }
    for (const url of Object.values(FOOD_BY_MEAL_TYPE)) {
      assert.equal(isMealTypeSvgFallback(url), false);
    }
  });

  it("un plat sans aliment reconnu prend une photo alimentaire du type, pas un SVG", () => {
    const url = getMealImageUrl({ nom: "Plat xyz", type: "diner", image: "", calories: 400 });
    assert.equal(isMealTypeSvgFallback(url), false, url);
    assert.equal(url, FOOD_BY_MEAL_TYPE.diner);
  });
});

describe("I13 · chaque repas du catalogue a une URL alimentaire", () => {
  it("l'URL est http(s) Unsplash ou un jpg, jamais vide ni svg", () => {
    for (const meal of getMealCatalog()) {
      const url = getMealImageUrl(meal);
      assert.ok(url.trim(), `URL vide : ${meal.nom}`);
      assert.equal(isMealTypeSvgFallback(url), false, `${meal.nom} → ${url}`);
      assert.ok(
        url.includes("unsplash.com"),
        `${meal.nom} → ${url} n'est pas une photo d'aliment`,
      );
    }
  });
});

describe("I14 · Bol avocat affiche un aliment, pas le SVG dîner", () => {
  it("la photo contient de l'avocat (photo dédiée), pas meal-diner.svg", () => {
    const meal = getMealCatalog().find((item) => item.nom === "Bol avocat, pois chiches et tomate");
    assert.ok(meal, "plat absent du catalogue");
    const url = getMealImageUrl(meal!);
    assert.equal(url.includes("meal-diner.svg"), false, url);
    assert.equal(isMealTypeSvgFallback(url), false, url);
    assert.ok(
      url.includes("photo-1523049673857-eb18f1d7b578"),
      `attendu photo d'avocat, obtenu ${url}`,
    );
  });
});
