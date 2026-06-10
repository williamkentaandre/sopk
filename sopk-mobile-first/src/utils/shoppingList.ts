import { getMealCaloriesForTarget, getPersonalizedCalories } from "@/utils/mealPlan";
import { getMealPortionDetailsAdjusted } from "@/utils/meal-portions";
import { visibleMealIndices } from "@/utils/planTracking";
import type { DayPlan, OnboardingData } from "@/utils/types";

export interface ShoppingLine {
  aliment: string;
  grammes: number;
}

export interface SevenDayShoppingList {
  lines: ShoppingLine[];
  startJour: number;
  endJour: number;
  /** Nombre de jours réellement inclus (≤ 7 en fin de programme ou fin de bloc). */
  spanDays: number;
  /** 1 = jours 1–7, 2 = jours 8–14, 3 = jours 15–21, … (blocs alignés sur le programme). */
  periodIndex: number;
}

function normalizeIngredientKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
 * Additionne les ingrédients des repas visibles sur un **bloc de 7 jours du programme** :
 * jours 1–7, puis 8–14, puis 15–21, etc. Le bloc affiché est celui qui contient
 * `anchorProgramDay` (en pratique le jour « Aujourd’hui » du programme).
 * Mêmes ajustements portions que l’écran jour (calories cible + profil).
 */
export function buildSevenDayShoppingList(
  profile: OnboardingData,
  jours: DayPlan[],
  anchorProgramDay: number,
): SevenDayShoppingList {
  const dailyTarget = getPersonalizedCalories(profile);
  const indices = visibleMealIndices(profile.rythmeRepas);
  const last = jours.length;
  if (last === 0) {
    return { lines: [], startJour: 0, endJour: 0, spanDays: 0, periodIndex: 0 };
  }

  const anchored = Math.max(1, Math.min(anchorProgramDay, last));
  const blockIndex = Math.floor((anchored - 1) / 7);
  const periodIndex = blockIndex + 1;
  const start = blockIndex * 7 + 1;
  const end = Math.min(start + 6, last);
  const spanDays = end >= start ? end - start + 1 : 0;

  const merged = new Map<string, { display: string; grammes: number }>();

  for (let jour = start; jour <= end; jour++) {
    const day = jours.find((d) => d.jour === jour);
    if (!day) continue;

    for (const i of indices) {
      if (i >= day.repas.length) continue;
      const meal = day.repas[i];
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

  return { lines, startJour: start, endJour: end, spanDays, periodIndex };
}
