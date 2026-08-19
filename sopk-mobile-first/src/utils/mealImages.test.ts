import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMealCatalog } from "@/utils/mealPersonalization";
import {
  APPLE_PHOTO_ID,
  FOOD_BY_MEAL_TYPE,
  getMealImageUrl,
  isMealTypeSvgFallback,
  MEAL_IMAGE_BY_NAME,
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

describe("I17 · le sujet de la photo = l’aliment du libellé", () => {
  it("Poire + noix n’affiche plus une pomme", () => {
    const url = getMealImageUrl({ nom: "Poire + noix", type: "collation", image: "", calories: 180 });
    assert.equal(url.includes(APPLE_PHOTO_ID), false, url);
    assert.ok(url.includes("photo-1633932701157-d1e26452a327"), url);
  });

  it("Pomme + 10 amandes garde la pomme", () => {
    const url = getMealImageUrl({ nom: "Pomme + 10 amandes", type: "collation", image: "", calories: 180 });
    assert.ok(url.includes(APPLE_PHOTO_ID), url);
  });

  it("Carottes + houmous n’est plus la salade quinoa", () => {
    const url = getMealImageUrl({ nom: "Carottes + houmous", type: "collation", image: "", calories: 160 });
    assert.equal(url.includes("photo-1540189549336-e6e99c3679fe"), false, url);
    assert.ok(url.includes("photo-1637949907734-d5583aa35b41"), url);
  });

  it("Kiwi et myrtilles ne réutilisent pas la pomme", () => {
    const kiwi = getMealImageUrl({ nom: "Kiwi + noix de cajou", type: "collation", image: "", calories: 160 });
    const berries = getMealImageUrl({ nom: "Yaourt nature + myrtilles", type: "collation", image: "", calories: 160 });
    assert.equal(kiwi.includes(APPLE_PHOTO_ID), false, kiwi);
    assert.equal(berries.includes(APPLE_PHOTO_ID), false, berries);
    assert.ok(kiwi.includes("photo-1585059895524-72359e06133a"), kiwi);
    assert.ok(berries.includes("photo-1626433281588-ae724357378d"), berries);
  });

  it("chaque plat du catalogue a une photo dédiée (pas le seau pomme générique)", () => {
    const missing = getMealCatalog()
      .map((meal) => meal.nom)
      .filter((nom) => !(nom in MEAL_IMAGE_BY_NAME));
    assert.deepEqual(missing, [], `sans photo dédiée : ${missing.join(" | ")}`);
  });
});
