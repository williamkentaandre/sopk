import type {
  DayPlan,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";
import {
  getDailyWalkingRecommendation,
  getEstimatedDailyLossGrams,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import {
  manualValidationKey,
  mealKey,
  stepsProgressStorageKey,
  visibleMealIndices,
  waterProgressStorageKey,
} from "@/utils/planTracking";

export interface PlanDayWeightSnapshot {
  currentWeightKg: number;
  potentialWeightKg: number;
  programPotentialWeightKg: number;
  estimatedLossGrams: number;
  projectedLossGrams: number;
  remainingLossGrams: number;
  dailyLossPercent: number;
}

export function formatWeightKg(value: number): string {
  return value.toFixed(1);
}

/** Courbe indicatif type onboarding (même formule que l’étape projection). */
export function buildWeightCurveEased(startKg: number, endKg: number, segments: number, power: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / Math.max(1, segments);
    const eased = 1 - (1 - t) ** power;
    pts.push(startKg + (endKg - startKg) * eased);
  }
  return pts;
}

function referenceCurvePower(parcours: OnboardingData["parcoursPerte"]): number {
  switch (parcours) {
    case "j30":
      return 1.05;
    case "j90":
      return 1.18;
    case "j180":
      return 1.35;
    case "j365":
      return 1.82;
    default:
      return 1.18;
  }
}

export interface ProgramWeightCurvePoint {
  jour: number;
  referenceKg: number;
  actualKg: number;
}

/**
 * Série jour par jour : poids « réel » cumulé (suivi) vs trajectoire indicative si tu tenais le rythme du régime.
 */
export function computeProgramWeightCurveSeries(
  profile: OnboardingData,
  jours: DayPlan[],
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
): ProgramWeightCurvePoint[] {
  const mealVisibleIdx = visibleMealIndices(profile.rythmeRepas);
  const G = jours.length;
  if (G === 0) return [];

  const startKg = profile.poidsKg;
  const projectedPerDay = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const modelEndKg = Math.max(40, startKg - (projectedPerDay * G) / 1000);
  const userEnd =
    profile.objectifPoidsKg != null && profile.objectifPoidsKg < startKg ? profile.objectifPoidsKg : modelEndKg;
  const endRef = Math.min(startKg - 0.3, Math.max(modelEndKg, userEnd));
  const refCurve = buildWeightCurveEased(startKg, endRef, G, referenceCurvePower(profile.parcoursPerte));

  let cumulativeGrams = 0;
  const out: ProgramWeightCurvePoint[] = [];

  for (let idx = 0; idx < jours.length; idx++) {
    const day = jours[idx]!;
    const dayMealIndexes = mealVisibleIdx.filter(
      (i) => i < day.repas.length && mealChecklist[mealKey(day.jour, i)],
    );
    const dayWaterValue = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
    const dayStepValue = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);
    const dayWaterTarget = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
    const dayStepsTarget = getDailyWalkingRecommendation(profile).steps;
    const dayWaterChecked = dayWaterValue >= dayWaterTarget;
    const dayWalkingChecked = dayStepValue >= dayStepsTarget;
    const dayWaterRatio = dayWaterTarget > 0 ? Math.min(1, Math.max(0, dayWaterValue / dayWaterTarget)) : 0;
    const dayStepsRatio = dayStepsTarget > 0 ? Math.min(1, Math.max(0, dayStepValue / dayStepsTarget)) : 0;
    const dayChecked = dayMealIndexes.length + (dayWaterChecked ? 1 : 0) + (dayWalkingChecked ? 1 : 0);
    const dayTotal = mealVisibleIdx.filter((i) => i < day.repas.length).length + 2;
    const dayManuallyValidatedInner = Boolean(mealChecklist[manualValidationKey(day.jour)]);
    const dayRatio = dayTotal > 0 ? dayChecked / dayTotal : 0;
    const isActiveDay =
      dayMealIndexes.length > 0 ||
      dayWaterChecked ||
      dayWalkingChecked ||
      dayWaterValue > 0 ||
      dayStepValue > 0 ||
      dayManuallyValidatedInner;

    if (isActiveDay) {
      cumulativeGrams += getEstimatedDailyLossGrams(profile, dayRatio, dayWaterRatio, dayStepsRatio);
    }

    out.push({
      jour: day.jour,
      referenceKg: refCurve[idx + 1] ?? refCurve[refCurve.length - 1]!,
      actualKg: Math.max(35, startKg - cumulativeGrams / 1000),
    });
  }

  return out;
}

/**
 * Poids « atteint », « fin de journée », « fin programme » pour un jour de programme donné
 * (même logique que l’ancien bloc PlanView / détails poids).
 */
export function computePlanDayWeightSnapshot(
  profile: OnboardingData,
  jours: DayPlan[],
  refDayJour: number,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
): PlanDayWeightSnapshot {
  const mealVisibleIdx = visibleMealIndices(profile.rythmeRepas);
  const refDay = jours.find((d) => d.jour === refDayJour) ?? jours[0];
  if (!refDay) {
    const p = profile.poidsKg;
    return {
      currentWeightKg: p,
      potentialWeightKg: p,
      programPotentialWeightKg: p,
      estimatedLossGrams: 0,
      projectedLossGrams: 0,
      remainingLossGrams: 0,
      dailyLossPercent: 0,
    };
  }

  const walking = getDailyWalkingRecommendation(profile);
  const stepsTarget = walking.steps;
  const stepsProgressKey = stepsProgressStorageKey(refDay.jour);
  const stepsCurrent = Math.min(stepsTarget, Math.max(0, Math.round(stepProgress[stepsProgressKey] ?? 0)));
  const stepsProgressRatio = stepsTarget > 0 ? stepsCurrent / stepsTarget : 0;

  const personalizedHydrationLiters = getPersonalizedHydrationLiters(refDay.hydratationLitres, profile);
  const waterTargetMl = Math.round(personalizedHydrationLiters * 1000);
  const waterProgressKey = waterProgressStorageKey(refDay.jour);
  const waterRawMl = Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0));
  const waterProgressRatio = waterTargetMl > 0 ? Math.min(1, Math.max(0, waterRawMl / waterTargetMl)) : 0;

  const waterChecked = waterRawMl >= waterTargetMl;
  const walkingChecked = stepsCurrent >= stepsTarget;
  const checkedMealIndexes = mealVisibleIdx.filter(
    (i) => i < refDay.repas.length && mealChecklist[mealKey(refDay.jour, i)],
  );
  const checkedMeals = checkedMealIndexes.length;
  const mealSlots = mealVisibleIdx.filter((i) => i < refDay.repas.length).length;
  const checkedToday = checkedMeals + (waterChecked ? 1 : 0) + (walkingChecked ? 1 : 0);
  const totalTasks = mealSlots + 2;
  const completionRatio = totalTasks > 0 ? checkedToday / totalTasks : 0;

  const estimatedLossGrams = getEstimatedDailyLossGrams(
    profile,
    completionRatio,
    waterProgressRatio,
    stepsProgressRatio,
  );
  const projectedLossGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const remainingLossGrams = Math.max(0, projectedLossGrams - estimatedLossGrams);
  const dailyLossPercent =
    projectedLossGrams > 0 ? Math.min(100, Math.round((estimatedLossGrams / projectedLossGrams) * 100)) : 0;

  const achievedLosses = jours
    .slice(0, refDayJour)
    .map((day) => {
      const dayMealIndexes = mealVisibleIdx.filter(
        (i) => i < day.repas.length && mealChecklist[mealKey(day.jour, i)],
      );
      const dayWaterValue = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
      const dayStepValue = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);
      const dayWaterTarget = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
      const dayStepsTarget = getDailyWalkingRecommendation(profile).steps;
      const dayWaterChecked = dayWaterValue >= dayWaterTarget;
      const dayWalkingChecked = dayStepValue >= dayStepsTarget;
      const dayWaterRatio = dayWaterTarget > 0 ? Math.min(1, Math.max(0, dayWaterValue / dayWaterTarget)) : 0;
      const dayStepsRatio = dayStepsTarget > 0 ? Math.min(1, Math.max(0, dayStepValue / dayStepsTarget)) : 0;
      const dayChecked = dayMealIndexes.length + (dayWaterChecked ? 1 : 0) + (dayWalkingChecked ? 1 : 0);
      const dayTotal = mealVisibleIdx.filter((i) => i < day.repas.length).length + 2;
      const dayManuallyValidatedInner = Boolean(mealChecklist[manualValidationKey(day.jour)]);
      const dayRatio = dayTotal > 0 ? dayChecked / dayTotal : 0;
      const isActiveDay =
        dayMealIndexes.length > 0 ||
        dayWaterChecked ||
        dayWalkingChecked ||
        dayWaterValue > 0 ||
        dayStepValue > 0 ||
        dayManuallyValidatedInner;

      if (!isActiveDay) return null;
      return getEstimatedDailyLossGrams(profile, dayRatio, dayWaterRatio, dayStepsRatio);
    })
    .filter((value): value is number => value !== null);

  const bilansEffectues = achievedLosses.length;
  const joursRestantsProgramme = Math.max(0, jours.length - bilansEffectues);
  const achievedCumulativeGrams = achievedLosses.reduce((sum, value) => sum + value, 0);
  const currentWeightKg = Math.max(0, profile.poidsKg - achievedCumulativeGrams / 1000);
  const potentialWeightKg = Math.max(0, profile.poidsKg - (achievedCumulativeGrams + remainingLossGrams) / 1000);
  const projectedRemainingProgramLossGrams = projectedLossGrams * joursRestantsProgramme;
  const programPotentialWeightKg = Math.max(0, currentWeightKg - projectedRemainingProgramLossGrams / 1000);

  return {
    currentWeightKg,
    potentialWeightKg,
    programPotentialWeightKg,
    estimatedLossGrams,
    projectedLossGrams,
    remainingLossGrams,
    dailyLossPercent,
  };
}
