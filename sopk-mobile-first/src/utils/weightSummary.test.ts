import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatGainGramsLabel, formatLossGramsLabel } from "@/utils/weightSummary";

describe("libellés grammes : unité jamais collée au mot suivant", () => {
  it("sépare le nombre et g/kg par une espace insécable", () => {
    assert.equal(formatLossGramsLabel(185), "-185\u00a0g");
    assert.equal(formatLossGramsLabel(0), "0\u00a0g");
    assert.equal(formatLossGramsLabel(1500), "-1.50\u00a0kg");
    assert.equal(formatGainGramsLabel(185), "+185\u00a0g");
    assert.equal(formatLossGramsLabel(185).includes("-185g"), false);
  });

  it("la phrase bilan garde un espace entre l’unité et aujourd’hui", () => {
    const phrase = `(perte nette estimée ${formatLossGramsLabel(185)} aujourd’hui).`;
    assert.equal(phrase.includes("gaujourd"), false);
    assert.match(phrase, /185\u00a0g aujourd’hui/);
  });
});
