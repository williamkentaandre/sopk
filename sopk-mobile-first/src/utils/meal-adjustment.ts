export interface MealAdjustment {
  surplusKcal: number;
  waterBonusMl: number;
  action: string;
}

export function buildMealAdjustment(plannedKcal: number, estimatedKcal: number): MealAdjustment {
  const surplusKcal = Math.max(0, estimatedKcal - plannedKcal);

  if (surplusKcal <= 100) {
    return {
      surplusKcal,
      waterBonusMl: 0,
      action: "Repas proche du plan. Continue normalement sur le prochain repas.",
    };
  }

  if (surplusKcal <= 250) {
    return {
      surplusKcal,
      waterBonusMl: 300,
      action: "Ajoute +300 ml d'eau et allège légèrement la prochaine collation.",
    };
  }

  return {
    surplusKcal,
    waterBonusMl: 500,
    action: "Ajoute +500 ml d'eau, fais 15 min de marche et réduis les glucides rapides au prochain repas.",
  };
}
