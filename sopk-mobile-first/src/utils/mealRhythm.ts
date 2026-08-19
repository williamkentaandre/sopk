import type { MealType } from "@/utils/types";

/**
 * Source unique de vérité du rythme de repas choisi en onboarding.
 *
 * Module feuille (aucun import de logique) : `mealPlan` comme `planTracking` en dépendent,
 * un import croisé créerait un cycle.
 */

/** Ordre de référence d'une journée complète. */
export const MEAL_TYPE_ORDER: MealType[] = ["petit_dejeuner", "dejeuner", "collation", "diner"];

/** Types de repas affichés / suivis selon le rythme choisi en onboarding. */
export function visibleMealTypes(rythmeRepas: string | undefined): MealType[] {
  const r = (rythmeRepas ?? "3 repas + collations").trim().toLowerCase();
  if (r.includes("collation") || r.includes("3 repas +")) {
    return ["petit_dejeuner", "dejeuner", "collation", "diner"];
  }
  if (r.startsWith("3 repas")) {
    return ["petit_dejeuner", "dejeuner", "diner"];
  }
  if (r.startsWith("2 repas")) {
    return ["dejeuner", "diner"];
  }
  return ["petit_dejeuner", "dejeuner", "collation", "diner"];
}

/**
 * Indices des repas affichés pour une journée donnée.
 *
 * La sélection se fait par TYPE, pas par position : une journée dont les repas ne sont
 * pas rangés dans l'ordre de référence faisait auparavant disparaître le petit-déjeuner
 * et afficher deux collations.
 */
export function visibleMealIndicesForDay(
  repas: readonly { type: MealType }[],
  rythmeRepas: string | undefined,
): number[] {
  const wanted = visibleMealTypes(rythmeRepas);
  const used = new Set<number>();
  const indices: number[] = [];

  for (const type of wanted) {
    const index = repas.findIndex((meal, i) => !used.has(i) && meal.type === type);
    if (index === -1) continue;
    used.add(index);
    indices.push(index);
  }

  return indices.sort((a, b) => a - b);
}

/** Plancher par repas : en dessous, la portion n'a plus de sens nutritionnel. */
export const MEAL_FLOOR_KCAL = 120;

/** Part maximale d'un seul repas dans la journée, pour éviter un découpage absurde. */
export const MEAL_MAX_SHARE_OF_DAY = 0.65;
