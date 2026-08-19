import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WATER_GLASS_ML, waterGlassFillFractions, waterTargetVerres } from "@/utils/waterDisplay";

describe("verres d’eau sous le curseur", () => {
  it("le nombre de verres suit la cible à 250 ml", () => {
    assert.equal(waterTargetVerres(250), 1);
    assert.equal(waterTargetVerres(2200), 9);
  });

  it("remplit de gauche à droite, dernier verre partiel", () => {
    const fractions = waterGlassFillFractions(350, 1000);
    assert.equal(fractions.length, 4);
    assert.equal(fractions[0], 1);
    assert.ok(Math.abs((fractions[1] ?? 0) - 100 / WATER_GLASS_ML) < 0.001);
    assert.equal(fractions[2], 0);
    assert.equal(fractions[3], 0);
  });

  it("cible atteinte : tous les verres pleins", () => {
    const fractions = waterGlassFillFractions(2000, 2000);
    assert.ok(fractions.every((value) => value === 1));
  });
});
