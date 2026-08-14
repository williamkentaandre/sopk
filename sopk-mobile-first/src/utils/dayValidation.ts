import {
  getDailyWalkingRecommendation,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import {
  mealKey,
  stepsProgressStorageKey,
  visibleMealIndices,
  waterProgressStorageKey,
} from "@/utils/planTracking";
import type {
  DayPlan,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";

export function isProgramDayValidated(
  day: DayPlan,
  mealVisibleIdx: number[],
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  profile: OnboardingData,
): boolean {
  const mealSlots = mealVisibleIdx.filter((i) => i < day.repas.length).length;
  const checkedMeals = mealVisibleIdx.filter(
    (i) => i < day.repas.length && mealChecklist[mealKey(day.jour, i)],
  ).length;

  const waterTargetMl = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
  const waterMl = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
  const stepsTarget = getDailyWalkingRecommendation(profile).steps;
  const steps = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);

  const checked =
    checkedMeals + (waterMl >= waterTargetMl ? 1 : 0) + (steps >= stepsTarget ? 1 : 0);
  return checked === mealSlots + 2;
}

export function countValidatedDayStreak(
  jours: DayPlan[],
  upToJour: number,
  mealVisibleIdx: number[],
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  profile: OnboardingData,
): number {
  let streak = 0;
  for (let j = upToJour; j >= 1; j--) {
    const day = jours.find((d) => d.jour === j);
    if (!day) break;
    if (!isProgramDayValidated(day, mealVisibleIdx, mealChecklist, waterProgress, stepProgress, profile)) {
      break;
    }
    streak++;
  }
  return streak;
}

export function programDayMilestoneLabel(jour: number, dayCount: number): string | null {
  if (jour >= dayCount) return "Programme terminé";
  if (jour === 1) return "Premier jour validé";
  if (jour % 7 === 0) return `Semaine ${jour / 7} bouclée`;
  return null;
}

export function getProgramDayProgress(
  day: DayPlan,
  mealVisibleIdx: number[],
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  profile: OnboardingData,
): { checked: number; total: number; validated: boolean } {
  const mealSlots = mealVisibleIdx.filter((i) => i < day.repas.length).length;
  const checkedMeals = mealVisibleIdx.filter(
    (i) => i < day.repas.length && mealChecklist[mealKey(day.jour, i)],
  ).length;
  const waterTargetMl = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
  const waterMl = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
  const stepsTarget = getDailyWalkingRecommendation(profile).steps;
  const steps = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);
  const checked =
    checkedMeals + (waterMl >= waterTargetMl ? 1 : 0) + (steps >= stepsTarget ? 1 : 0);
  const total = mealSlots + 2;
  return {
    checked,
    total,
    validated: isProgramDayValidated(day, mealVisibleIdx, mealChecklist, waterProgress, stepProgress, profile),
  };
}
