import type {
  DayPlan,
  DeviationLogState,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";
import { getDeviationKcalForDay } from "@/utils/deviationLog";
import {
  getDailyWalkingRecommendation,
  getEstimatedDailyLossGrams,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import { visibleMealIndicesForDay } from "@/utils/mealRhythm";
import {
  mealKey,
  stepsProgressStorageKey,
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
  /** Perte estimée cumulée jusqu’au jour affiché (grammes). */
  cumulativeLossGrams: number;
  /** Perte estimée sur le jour affiché uniquement (grammes). */
  selectedDayLossGrams: number;
  /** Pénalité estimée des écarts du jour affiché (grammes). */
  indulgencePenaltyGrams: number;
  /** Excédent calorique des écarts non absorbé par la perte du jour (grammes). */
  selectedDaySurplusGrams: number;
  /** Excédent cumulé des écarts (grammes). */
  cumulativeSurplusGrams: number;
  /** Au-dessus du poids de départ (grammes, ≥ 0). */
  weightAboveStartGrams: number;
  /** Poids estimé déjà au-dessus du départ au matin du jour affiché. */
  selectedDayStartedAboveStart: boolean;
}

export function formatWeightKg(value: number): string {
  return value.toFixed(1);
}

/** Affichage plus fin quand la variation est petite (< 100 g). */
export function formatWeightKgLive(value: number): string {
  const roundedOne = Number(value.toFixed(1));
  if (Math.abs(value - roundedOne) < 0.05) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

const NBSP = "\u00a0";

function formatSignedGrams(grams: number, sign: "-" | "+"): string {
  const g = Math.round(Math.max(0, grams));
  if (g >= 1000) return `${sign}${(g / 1000).toFixed(2)}${NBSP}kg`;
  if (g > 0) return `${sign}${g}${NBSP}g`;
  return `0${NBSP}g`;
}

export function formatLossGramsLabel(grams: number): string {
  return formatSignedGrams(grams, "-");
}

/** Variation estimée vs poids de départ (négatif = au-dessus du départ). */
export function formatWeightDeltaFromStartLabel(startKg: number, currentKg: number): string {
  const deltaGrams = Math.round((startKg - currentKg) * 1000);
  if (deltaGrams > 0) return formatLossGramsLabel(deltaGrams);
  if (deltaGrams < 0) {
    const gain = Math.abs(deltaGrams);
    if (gain >= 1000) return `+${(gain / 1000).toFixed(2)}${NBSP}kg vs départ`;
    return `+${gain}${NBSP}g vs départ`;
  }
  return "Au poids de départ";
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

interface DayTrackingRatios {
  dayRatio: number;
  dayWaterRatio: number;
  dayStepsRatio: number;
  isActiveDay: boolean;
  indulgenceKcal: number;
}

function computeDayTrackingRatios(
  profile: OnboardingData,
  day: DayPlan,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState,
): DayTrackingRatios {
  const mealVisibleIdx = visibleMealIndicesForDay(day.repas, profile.rythmeRepas);
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
  const indulgenceKcal = getDeviationKcalForDay(deviationLog, day.jour);
  const dayRatio = dayTotal > 0 ? dayChecked / dayTotal : 0;
  const isActiveDay =
    dayMealIndexes.length > 0 ||
    dayWaterChecked ||
    dayWalkingChecked ||
    dayWaterValue > 0 ||
    dayStepValue > 0 ||
    indulgenceKcal > 0;

  return {
    dayRatio,
    dayWaterRatio,
    dayStepsRatio,
    isActiveDay,
    indulgenceKcal,
  };
}

interface DayWeightDelta {
  netLossGrams: number;
  surplusGrams: number;
}

export function formatGainGramsLabel(grams: number): string {
  return formatSignedGrams(grams, "+");
}

function applyDayWeightDelta(
  adherenceLossGrams: number,
  penaltyGrams: number,
  weightAboveStartAtDayStart: boolean,
): DayWeightDelta {
  if (weightAboveStartAtDayStart) {
    return {
      netLossGrams: Math.round(adherenceLossGrams),
      surplusGrams: Math.round(penaltyGrams),
    };
  }
  return {
    netLossGrams: Math.max(0, Math.round(adherenceLossGrams - penaltyGrams)),
    surplusGrams: Math.max(0, Math.round(penaltyGrams - adherenceLossGrams)),
  };
}

function computeDayWeightDelta(
  profile: OnboardingData,
  day: DayPlan,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState,
  weightAboveStartAtDayStart = false,
): DayWeightDelta {
  const ratios = computeDayTrackingRatios(
    profile,
    day,
    mealChecklist,
    waterProgress,
    stepProgress,
    deviationLog,
  );
  if (!ratios.isActiveDay) {
    return { netLossGrams: 0, surplusGrams: 0 };
  }

  const adherenceLossGrams = getEstimatedDailyLossGrams(
    profile,
    ratios.dayRatio,
    ratios.dayWaterRatio,
    ratios.dayStepsRatio,
    0,
  );
  const penaltyGrams = Math.max(0, ratios.indulgenceKcal) / 7.7;
  return applyDayWeightDelta(adherenceLossGrams, penaltyGrams, weightAboveStartAtDayStart);
}

function weightKgFromCumulative(
  startKg: number,
  cumulativeNetLossGrams: number,
  cumulativeSurplusGrams: number,
): number {
  const raw = startKg - cumulativeNetLossGrams / 1000 + cumulativeSurplusGrams / 1000;
  return Math.max(35, raw);
}

function computeDayLossGrams(
  profile: OnboardingData,
  day: DayPlan,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState,
): number {
  return computeDayWeightDelta(
    profile,
    day,
    mealChecklist,
    waterProgress,
    stepProgress,
    deviationLog,
  ).netLossGrams;
}

/** Perte nette estimée pour un jour de programme (≥ 0 g). */
export function computeProgramDayLossGrams(
  profile: OnboardingData,
  day: DayPlan,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState = {},
): number {
  return Math.max(
    0,
    computeDayLossGrams(
      profile,
      day,
      mealChecklist,
      waterProgress,
      stepProgress,
      deviationLog,
    ),
  );
}

/** Poids objectif fin de programme (toujours en dessous du poids de départ). */
export function computeProgramGoalWeightKg(profile: OnboardingData, programDays: number): number {
  const startKg = profile.poidsKg;
  const projectedPerDay = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const modelEndKg = Math.max(40, startKg - (projectedPerDay * programDays) / 1000);
  const userEnd =
    profile.objectifPoidsKg != null && profile.objectifPoidsKg < startKg ? profile.objectifPoidsKg : modelEndKg;
  return Math.min(startKg - 0.3, Math.max(modelEndKg, userEnd));
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
  deviationLog: DeviationLogState = {},
): ProgramWeightCurvePoint[] {
  const G = jours.length;
  if (G === 0) return [];

  const startKg = profile.poidsKg;
  const endRef = computeProgramGoalWeightKg(profile, G);
  const refCurve = buildWeightCurveEased(startKg, endRef, G, referenceCurvePower(profile.parcoursPerte));

  let cumulativeNetLossGrams = 0;
  let cumulativeSurplusGrams = 0;
  const out: ProgramWeightCurvePoint[] = [];

  for (let idx = 0; idx < jours.length; idx++) {
    const day = jours[idx]!;
    const weightBeforeDay = weightKgFromCumulative(startKg, cumulativeNetLossGrams, cumulativeSurplusGrams);
    const { netLossGrams, surplusGrams } = computeDayWeightDelta(
      profile,
      day,
      mealChecklist,
      waterProgress,
      stepProgress,
      deviationLog,
      weightBeforeDay > startKg,
    );
    cumulativeNetLossGrams += netLossGrams;
    cumulativeSurplusGrams += surplusGrams;

    out.push({
      jour: day.jour,
      referenceKg: refCurve[idx + 1] ?? refCurve[refCurve.length - 1]!,
      actualKg: weightKgFromCumulative(startKg, cumulativeNetLossGrams, cumulativeSurplusGrams),
    });
  }

  return out;
}

/**
 * Poids « atteint », « fin de journée », « fin programme » pour un jour de programme donné.
 */
export function computePlanDayWeightSnapshot(
  profile: OnboardingData,
  jours: DayPlan[],
  refDayJour: number,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState = {},
): PlanDayWeightSnapshot {
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
      cumulativeLossGrams: 0,
      selectedDayLossGrams: 0,
      indulgencePenaltyGrams: 0,
      selectedDaySurplusGrams: 0,
      cumulativeSurplusGrams: 0,
      weightAboveStartGrams: 0,
      selectedDayStartedAboveStart: false,
    };
  }

  const startKg = profile.poidsKg;
  let cumulativeBeforeRefDayNetLossGrams = 0;
  let cumulativeBeforeRefDaySurplusGrams = 0;
  for (const day of jours) {
    if (day.jour >= refDayJour) break;
    const weightBeforeDay = weightKgFromCumulative(
      startKg,
      cumulativeBeforeRefDayNetLossGrams,
      cumulativeBeforeRefDaySurplusGrams,
    );
    const delta = computeDayWeightDelta(
      profile,
      day,
      mealChecklist,
      waterProgress,
      stepProgress,
      deviationLog,
      weightBeforeDay > startKg,
    );
    cumulativeBeforeRefDayNetLossGrams += delta.netLossGrams;
    cumulativeBeforeRefDaySurplusGrams += delta.surplusGrams;
  }
  const selectedDayStartedAboveStart =
    weightKgFromCumulative(startKg, cumulativeBeforeRefDayNetLossGrams, cumulativeBeforeRefDaySurplusGrams) > startKg;

  const refRatios = computeDayTrackingRatios(
    profile,
    refDay,
    mealChecklist,
    waterProgress,
    stepProgress,
    deviationLog,
  );

  const estimatedLossGrams = refRatios.isActiveDay
    ? computeDayWeightDelta(
        profile,
        refDay,
        mealChecklist,
        waterProgress,
        stepProgress,
        deviationLog,
        selectedDayStartedAboveStart,
      ).netLossGrams
    : 0;
  /** Perte max du jour si objectifs atteints, après écarts enregistrés. */
  const projectedLossGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1, refRatios.indulgenceKcal);
  const indulgencePenaltyGrams = Math.round(Math.max(0, refRatios.indulgenceKcal) / 7.7);
  const refDayDelta = computeDayWeightDelta(
    profile,
    refDay,
    mealChecklist,
    waterProgress,
    stepProgress,
    deviationLog,
    selectedDayStartedAboveStart,
  );
  const selectedDaySurplusGrams = refDayDelta.surplusGrams;
  const remainingLossGrams = Math.max(0, projectedLossGrams - estimatedLossGrams);
  const dailyLossPercent =
    projectedLossGrams > 0
      ? Math.min(100, Math.max(0, Math.round((Math.max(0, estimatedLossGrams) / projectedLossGrams) * 100)))
      : 0;

  let cumulativeNetLossGrams = cumulativeBeforeRefDayNetLossGrams;
  let cumulativeSurplusGrams = cumulativeBeforeRefDaySurplusGrams;
  const selectedDayLossGrams = refDayDelta.netLossGrams;
  cumulativeNetLossGrams += refDayDelta.netLossGrams;
  cumulativeSurplusGrams += refDayDelta.surplusGrams;

  const cumulativeLossGrams = cumulativeNetLossGrams;
  const currentWeightKg = weightKgFromCumulative(startKg, cumulativeNetLossGrams, cumulativeSurplusGrams);
  const weightAboveStartGrams = Math.max(0, Math.round((currentWeightKg - startKg) * 1000));

  const fullDayAdherenceGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1, 0);
  const potentialNetForRefDay = selectedDayStartedAboveStart
    ? Math.round(fullDayAdherenceGrams)
    : Math.max(0, Math.round(fullDayAdherenceGrams - indulgencePenaltyGrams));
  const potentialSurplusForRefDay = selectedDayStartedAboveStart
    ? indulgencePenaltyGrams
    : Math.max(0, Math.round(indulgencePenaltyGrams - fullDayAdherenceGrams));
  const potentialWeightKg = weightKgFromCumulative(
    startKg,
    cumulativeNetLossGrams - selectedDayLossGrams + potentialNetForRefDay,
    cumulativeSurplusGrams - selectedDaySurplusGrams + potentialSurplusForRefDay,
  );

  const joursRestantsProgramme = Math.max(0, jours.length - refDayJour);
  const projectedRemainingProgramLossGrams = projectedLossGrams * joursRestantsProgramme;
  const programPotentialWeightKg = Math.max(35, currentWeightKg - projectedRemainingProgramLossGrams / 1000);

  return {
    currentWeightKg,
    potentialWeightKg,
    programPotentialWeightKg,
    estimatedLossGrams,
    projectedLossGrams,
    remainingLossGrams,
    dailyLossPercent,
    cumulativeLossGrams,
    selectedDayLossGrams,
    indulgencePenaltyGrams,
    selectedDaySurplusGrams,
    cumulativeSurplusGrams,
    weightAboveStartGrams,
    selectedDayStartedAboveStart,
  };
}
