import { getMealCaloriesForTarget, getPersonalizedCalories } from "@/utils/mealPlan";
import { getEffectiveMeal } from "@/utils/mealPersonalization";
import { getMealPortionDetailsAdjusted } from "@/utils/meal-portions";
import { mealKey, visibleMealIndices } from "@/utils/planTracking";
import type { DayPlan, MealOverrideState, OnboardingData } from "@/utils/types";

export type ShoppingListSpanDays = 7 | 14;

export interface ShoppingLine {
  aliment: string;
  grammes: number;
}

export interface ShoppingList {
  lines: ShoppingLine[];
  startJour: number;
  endJour: number;
  /** Nombre de jours réellement inclus (≤ span en fin de programme). */
  spanDays: number;
  /** Bloc aligné sur le programme (7 j → période 1, 14 j → période 1, etc.). */
  periodIndex: number;
  /** Durée choisie : 7 ou 14 jours. */
  requestedSpan: ShoppingListSpanDays;
}

function normalizeIngredientKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .toLowerCase()
    .trim();
}

export function formatGrammesShopping(grammes: number): string {
  const g = Math.round(grammes);
  if (g >= 1000) {
    return `${(g / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  }
  return `${g.toLocaleString("fr-FR")} g`;
}

/**
 * Additionne les ingrédients des repas visibles sur les **prochains** 7 ou 14 jours du plan,
 * à partir du jour programme `anchorProgramDay` (souvent « aujourd’hui »), en tenant compte
 * des repas réellement affichés (remplacements utilisateur).
 */
export function buildShoppingList(
  profile: OnboardingData,
  jours: DayPlan[],
  anchorProgramDay: number,
  requestedSpan: ShoppingListSpanDays = 7,
  mealOverrides: MealOverrideState = {},
): ShoppingList {
  const dailyTarget = getPersonalizedCalories(profile);
  const indices = visibleMealIndices(profile.rythmeRepas);
  const last = jours.length;
  if (last === 0) {
    return {
      lines: [],
      startJour: 0,
      endJour: 0,
      spanDays: 0,
      periodIndex: 0,
      requestedSpan,
    };
  }

  const anchored = Math.max(1, Math.min(anchorProgramDay, last));
  const start = anchored;
  const end = Math.min(start + requestedSpan - 1, last);
  const spanDays = end >= start ? end - start + 1 : 0;
  const periodIndex = Math.floor((start - 1) / requestedSpan) + 1;

  const merged = new Map<string, { display: string; grammes: number }>();

  for (let jour = start; jour <= end; jour++) {
    const day = jours.find((d) => d.jour === jour);
    if (!day) continue;

    for (const i of indices) {
      if (i >= day.repas.length) continue;
      const plannedMeal = day.repas[i];
      const meal = getEffectiveMeal(plannedMeal, mealOverrides[mealKey(jour, i)]);
      const adjustedKcal = getMealCaloriesForTarget(meal.calories, day, dailyTarget);
      const kcalRatio = meal.calories > 0 ? adjustedKcal / meal.calories : 1;
      const portion = getMealPortionDetailsAdjusted(
        meal.nom,
        kcalRatio,
        {
          age: profile.age,
          poidsKg: profile.poidsKg,
          tailleCm: profile.tailleCm,
          parcoursPerte: profile.parcoursPerte,
          objectifKcalJour: dailyTarget,
        },
        meal.type,
        meal.calories,
      );

      for (const ing of portion.ingredients) {
        const key = normalizeIngredientKey(ing.aliment);
        const prev = merged.get(key);
        const display = prev?.display ?? ing.aliment;
        merged.set(key, {
          display,
          grammes: (prev?.grammes ?? 0) + ing.grammes,
        });
      }
    }
  }

  const lines = [...merged.values()]
    .map((v) => ({ aliment: v.display, grammes: Math.round(v.grammes) }))
    .filter((l) => l.grammes > 0)
    .sort((a, b) => a.aliment.localeCompare(b.aliment, "fr", { sensitivity: "base" }));

  return { lines, startJour: start, endJour: end, spanDays, periodIndex, requestedSpan };
}

/** @deprecated Utiliser {@link buildShoppingList} avec `requestedSpan: 7`. */
export function buildSevenDayShoppingList(
  profile: OnboardingData,
  jours: DayPlan[],
  anchorProgramDay: number,
  mealOverrides: MealOverrideState = {},
): ShoppingList {
  return buildShoppingList(profile, jours, anchorProgramDay, 7, mealOverrides);
}
