import {
  getDailyWalkingRecommendation,
  getMealPlan,
  getPersonalizedHydrationLiters,
  getProgramDayCount,
} from "@/utils/mealPlan";
import type { MealChecklistState, OnboardingData, ParcoursPerte, StepProgressState, WaterProgressState } from "@/utils/types";

export function mealKey(day: number, mealIndex: number): string {
  return `day-${day}-meal-${mealIndex}`;
}

export function manualValidationKey(day: number): string {
  return `day-${day}-manual-validated`;
}

export function waterProgressStorageKey(day: number): string {
  return `day-${day}-water-progress`;
}

export function stepsProgressStorageKey(day: number): string {
  return `day-${day}-steps-progress`;
}

/** Numéro de jour du programme (1…N) pour les clés `day-*-meal-*`, eau, pas ou validation manuelle. */
export function programDayFromTrackingKey(key: string): number | null {
  const m = /^day-(\d+)-(?:meal-\d+|manual-validated|water-progress|steps-progress)$/.exec(key);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Jour du programme source (ancien horizon) aligné sur la position dans le nouveau programme. */
function sourceOldProgramDay(newDay: number, oldN: number, newN: number): number {
  if (newN <= 0 || oldN <= 0) return 1;
  if (newN === 1) return Math.min(oldN, 1);
  if (oldN === 1) return 1;
  return Math.min(oldN, Math.max(1, Math.round(((newDay - 1) * (oldN - 1)) / (newN - 1) + 1)));
}

/**
 * Réaffecte coches repas, eau et pas quand l’horizon (vitesse) change : même « progression » relative
 * dans le programme, objectifs eau/pas recalculés pour le nouveau parcours.
 */
export function migrateTrackingForNewHorizon(
  prevParcours: ParcoursPerte,
  nextParcours: ParcoursPerte,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  profile: OnboardingData
): { meal: MealChecklistState; water: WaterProgressState; steps: StepProgressState } {
  const oldN = getProgramDayCount(prevParcours);
  const newN = getProgramDayCount(nextParcours);
  const nextProfile: OnboardingData = { ...profile, parcoursPerte: nextParcours };
  const prevProfile: OnboardingData = { ...profile, parcoursPerte: prevParcours };

  if (oldN === newN) {
    return {
      meal: { ...mealChecklist },
      water: { ...waterProgress },
      steps: { ...stepProgress },
    };
  }

  const newPlan = getMealPlan({ parcoursPerte: nextParcours });
  const oldPlan = getMealPlan({ parcoursPerte: prevParcours });

  const newMeal: MealChecklistState = {};
  const newWater: WaterProgressState = {};
  const newSteps: StepProgressState = {};

  for (let nd = 1; nd <= newN; nd++) {
    const od = sourceOldProgramDay(nd, oldN, newN);
    const oldDay = oldPlan.jours[od - 1];
    const newDay = newPlan.jours[nd - 1];
    if (!oldDay || !newDay) continue;

    if (mealChecklist[manualValidationKey(od)]) {
      newMeal[manualValidationKey(nd)] = true;
    }

    const maxMi = Math.min(oldDay.repas.length, newDay.repas.length);
    for (let mi = 0; mi < maxMi; mi++) {
      if (mealChecklist[mealKey(od, mi)]) {
        newMeal[mealKey(nd, mi)] = true;
      }
    }

    const rawWater = Math.round(waterProgress[waterProgressStorageKey(od)] ?? 0);
    const oldWTarget = Math.round(getPersonalizedHydrationLiters(oldDay.hydratationLitres, prevProfile) * 1000);
    const newWTarget = Math.round(getPersonalizedHydrationLiters(newDay.hydratationLitres, nextProfile) * 1000);
    let nextWater = rawWater;
    if (oldWTarget > 0 && newWTarget > 0) {
      nextWater = Math.round((rawWater * newWTarget) / oldWTarget);
    }
    newWater[waterProgressStorageKey(nd)] = Math.min(newWTarget, Math.max(0, nextWater));

    const rawSteps = Math.round(stepProgress[stepsProgressStorageKey(od)] ?? 0);
    const oldSTarget = getDailyWalkingRecommendation(prevProfile).steps;
    const newSTarget = getDailyWalkingRecommendation(nextProfile).steps;
    let nextSteps = rawSteps;
    if (oldSTarget > 0 && newSTarget > 0) {
      nextSteps = Math.round((rawSteps * newSTarget) / oldSTarget);
    }
    newSteps[stepsProgressStorageKey(nd)] = Math.min(newSTarget, Math.max(0, nextSteps));
  }

  return { meal: newMeal, water: newWater, steps: newSteps };
}
