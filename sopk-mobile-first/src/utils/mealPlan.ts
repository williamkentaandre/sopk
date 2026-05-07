import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, MealPlanData, OnboardingData } from "@/utils/types";

const parsed = mealPlanData as MealPlanData;
const PROGRAM_DAYS = 30;

function buildProgramDays(): DayPlan[] {
  const sourceDays = parsed.jours;
  if (sourceDays.length === 0) return [];

  return Array.from({ length: PROGRAM_DAYS }, (_, index) => {
    const template = sourceDays[index % sourceDays.length];
    return {
      ...template,
      jour: index + 1,
      repas: template.repas.map((meal) => ({ ...meal })),
      conseils: [...template.conseils],
    };
  });
}

function inferredActivityMultiplier(profile: OnboardingData): number {
  const bmi = profile.poidsKg / ((profile.tailleCm / 100) * (profile.tailleCm / 100));
  let multiplier = 1.4;

  if (profile.parcoursPerte === "radical") multiplier += 0.06;
  if (profile.parcoursPerte === "modere") multiplier += 0.03;
  if (profile.age >= 45) multiplier -= 0.03;
  if (bmi >= 30) multiplier -= 0.02;
  if (bmi < 22) multiplier += 0.02;

  return Math.max(1.3, Math.min(1.6, multiplier));
}

function objectiveAdjustmentByParcours(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return -1200;
  if (parcours === "modere") return -780;
  return -250;
}

function parcoursAdjustment(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return -220;
  if (parcours === "modere") return -120;
  return -20;
}

function parcoursHydrationBonus(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return 0.2;
  if (parcours === "modere") return 0.1;
  return 0.05;
}

function parcoursStepsBonus(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return 1800;
  if (parcours === "modere") return 900;
  return 250;
}

function parcoursAdherenceWeight(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return 1.55;
  if (parcours === "modere") return 1.28;
  return 0.85;
}

function maxDailyLossByParcours(parcours: OnboardingData["parcoursPerte"]): number {
  if (parcours === "radical") return 420;
  if (parcours === "modere") return 280;
  return 120;
}

export function getMealPlan(): MealPlanData {
  return {
    ...parsed,
    jours: buildProgramDays(),
  };
}

export function getPersonalizedCalories(profile: OnboardingData): number {
  const bmr = 10 * profile.poidsKg + 6.25 * profile.tailleCm - 5 * profile.age - 161;
  const maintenance = bmr * inferredActivityMultiplier(profile);
  const adjusted = maintenance + objectiveAdjustmentByParcours(profile.parcoursPerte) + parcoursAdjustment(profile.parcoursPerte);
  return Math.round(Math.max(1300, Math.min(2300, adjusted)));
}

export function getTodayPlanDay(): DayPlan {
  const days = buildProgramDays();
  const index = (new Date().getDate() - 1) % days.length;
  return days[index];
}

export function getMealCaloriesForTarget(plannedMealCalories: number, day: DayPlan, targetDailyCalories: number): number {
  const dayBaseTotal = day.repas.reduce((sum, meal) => sum + meal.calories, 0);
  if (dayBaseTotal <= 0) return plannedMealCalories;
  const ratio = targetDailyCalories / dayBaseTotal;
  return Math.max(120, Math.round(plannedMealCalories * ratio));
}

export function getPersonalizedHydrationLiters(baseLiters: number, profile: OnboardingData): number {
  let liters = 1.8 + profile.poidsKg * 0.015;
  const activityMultiplier = inferredActivityMultiplier(profile);

  if (activityMultiplier >= 1.52) liters += 0.45;
  else if (activityMultiplier >= 1.42) liters += 0.25;
  else liters += 0.1;

  liters += parcoursHydrationBonus(profile.parcoursPerte);

  if (profile.age >= 40) liters -= 0.05;

  const blended = (liters + baseLiters) / 2;
  return Math.round(Math.max(1.8, Math.min(3.6, blended)) * 10) / 10;
}

export function getDailyWalkingRecommendation(profile: OnboardingData): {
  steps: number;
  minutes: number;
  distanceKm: number;
  note: string;
} {
  let targetSteps = 6500;

  targetSteps += parcoursStepsBonus(profile.parcoursPerte);

  if (profile.age >= 40) targetSteps -= 500;
  if (profile.age >= 50) targetSteps -= 500;

  if (profile.poidsKg >= 90) targetSteps -= 600;
  if (profile.poidsKg <= 55) targetSteps += 300;

  const stepLengthMeters = Math.max(0.55, Math.min(0.85, profile.tailleCm * 0.00415));
  const clampedSteps = Math.max(5500, Math.min(12500, Math.round(targetSteps / 100) * 100));
  const distanceKm = (clampedSteps * stepLengthMeters) / 1000;
  const minutes = Math.round((clampedSteps / 100) * 1.1);

  const note =
    profile.parcoursPerte === "radical"
      ? "Marche à allure soutenue en 2 blocs pour renforcer la dépense énergétique."
      : profile.parcoursPerte === "modere"
        ? "Garde une marche active régulière pour progresser sans surcharge."
        : "Rythme confortable et constant pour installer une perte durable.";

  return {
    steps: clampedSteps,
    minutes,
    distanceKm: Math.round(distanceKm * 10) / 10,
    note,
  };
}

export function getEstimatedDailyLossGrams(
  profile: OnboardingData,
  completionRatio: number,
  waterProgressRatio: number,
  walkingProgressRatio: number
): number {
  const baseDeficitKcal = Math.abs(objectiveAdjustmentByParcours(profile.parcoursPerte));
  const safeRatio = Math.max(0, Math.min(1, completionRatio));
  const safeWaterRatio = Math.max(0, Math.min(1, waterProgressRatio));
  const safeWalkingRatio = Math.max(0, Math.min(1, walkingProgressRatio));

  if (safeRatio <= 0 && safeWaterRatio <= 0 && safeWalkingRatio <= 0) {
    return 0;
  }

  let adherenceFactor = safeRatio * 0.75 + safeWaterRatio * 0.1 + safeWalkingRatio * 0.15;

  const bmi = profile.poidsKg / ((profile.tailleCm / 100) * (profile.tailleCm / 100));
  if (bmi >= 30) adherenceFactor += 0.04;
  if (profile.age >= 45) adherenceFactor -= 0.03;

  const effectiveDeficit =
    baseDeficitKcal *
    parcoursAdherenceWeight(profile.parcoursPerte) *
    Math.max(0, Math.min(1.2, adherenceFactor));
  const gramsPerDay = effectiveDeficit / 7.7; // ~7700 kcal for 1kg body fat
  const cap = maxDailyLossByParcours(profile.parcoursPerte);

  return Math.round(Math.max(0, Math.min(cap, gramsPerDay)));
}
