import mealPlanData from "@/data/mealPlan.json";
import { todayIsoLocal } from "@/utils/storage";
import { DayPlan, MealPlanData, OnboardingData } from "@/utils/types";

const parsed = mealPlanData as MealPlanData;

/** Plus court horizon (déficit le plus élevé côté modèle). */
export const PROGRAM_DAYS_INTENSE = 30;
/** Plus long horizon (déficit le plus modéré côté modèle). */
export const PROGRAM_DAYS_ANCRE = 365;

export function getProgramDayCount(parcoursPerte: OnboardingData["parcoursPerte"]): number {
  switch (parcoursPerte) {
    case "j30":
      return 30;
    case "j90":
      return 90;
    case "j180":
      return 180;
    case "j365":
      return 365;
    default:
      return 90;
  }
}

/** Libellé court pour l’UI (plan, en-tête). */
export function parcoursHorizonLabel(parcours: OnboardingData["parcoursPerte"]): string {
  switch (parcours) {
    case "j30":
      return "Intense - 30 jours";
    case "j90":
      return "Équilibré - 90 jours";
    case "j180":
      return "Progressive - 180 jours";
    case "j365":
      return "Ancrée - 365 jours";
    default:
      return "Équilibré - 90 jours";
  }
}

/**
 * 0 = horizon 30 j (rythme le plus soutenu), 1 = 365 j (rythme le plus progressif).
 * Sert à interpoler déficit, pas, hydratation, etc.
 */
export function parcoursIntensiteT(parcours: OnboardingData["parcoursPerte"]): number {
  const d = getProgramDayCount(parcours);
  return Math.max(0, Math.min(1, (d - PROGRAM_DAYS_INTENSE) / (PROGRAM_DAYS_ANCRE - PROGRAM_DAYS_INTENSE)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function calendarDaysBetweenIso(startIso: string, endIso: string): number {
  const a = parseIsoLocal(startIso);
  const b = parseIsoLocal(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addCalendarDaysIso(iso: string, deltaDays: number): string {
  const d = parseIsoLocal(iso);
  if (Number.isNaN(d.getTime())) return todayIsoLocal();
  d.setDate(d.getDate() + deltaDays);
  return formatIsoLocal(d);
}

/** Ancien calcul (jour de l’année % durée) - conservé pour migration seulement. */
function programDayFromDayOfYearModulo(dayCount: number): number {
  const len = Math.max(1, dayCount);
  const d = new Date();
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const y0 = Date.UTC(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((t - y0) / 86400000);
  return (dayOfYear % len) + 1;
}

/** Recule d’un jour civil le début du plan (= fait avancer le numéro du « jour actif » d’une unité). */
export function shiftProgramStartEarlierByOneDay(programStartDateIso: string): string {
  const s = programStartDateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return todayIsoLocal();
  return addCalendarDaysIso(s, -1);
}

/**
 * Jour du programme (1 … dayCount) pour aujourd’hui (date locale).
 * Avec `programStartDateIso` : nombre de jours civils depuis le 1er jour (jour 1 = date de début).
 * Sans date : ancien repli (jour de l’année modulo la durée) - déconseillé.
 */
export function getTodayJourInProgram(dayCount: number, programStartDateIso?: string | null): number {
  const len = Math.max(1, dayCount);
  const start = programStartDateIso?.trim();
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return programDayFromDayOfYearModulo(len);
  }
  const todayLocal = todayIsoLocal();
  const diff = calendarDaysBetweenIso(start, todayLocal);
  const jour = diff + 1;
  return Math.max(1, Math.min(len, jour));
}

function buildProgramDays(dayCount: number): DayPlan[] {
  const sourceDays = parsed.jours;
  if (sourceDays.length === 0) return [];

  return Array.from({ length: dayCount }, (_, index) => {
    const template = sourceDays[index % sourceDays.length];
    return {
      ...template,
      jour: index + 1,
      repas: template.repas.map((meal) => ({ ...meal })),
      conseils: [...template.conseils],
    };
  });
}

function declaredActivityMultiplier(niveauActivite: string | undefined): number | null {
  const n = (niveauActivite ?? "").toLowerCase();
  if (n.includes("très active") || n.includes("tres active")) return 1.725;
  if (n.includes("modér") || n.includes("moder")) return 1.55;
  if (n.includes("légère") || n.includes("legere")) return 1.375;
  if (n.includes("sédent") || n.includes("sedent")) return 1.2;
  return null;
}

function activityStepsBonusFromProfile(profile: OnboardingData): number {
  const n = (profile.niveauActivite ?? "").toLowerCase();
  if (n.includes("très active") || n.includes("tres active")) return 1200;
  if (n.includes("modér") || n.includes("moder")) return 600;
  if (n.includes("légère") || n.includes("legere")) return 300;
  if (n.includes("sédent") || n.includes("sedent")) return -400;
  return 0;
}

function inferredActivityMultiplier(profile: OnboardingData): number {
  const declared = declaredActivityMultiplier(profile.niveauActivite);
  const bmi = profile.poidsKg / ((profile.tailleCm / 100) * (profile.tailleCm / 100));
  const t = parcoursIntensiteT(profile.parcoursPerte);

  if (declared != null) {
    let multiplier = declared + lerp(0.03, 0, t);
    if (profile.age >= 45) multiplier -= 0.02;
    if (bmi >= 30) multiplier -= 0.02;
    if (bmi < 22) multiplier += 0.02;
    return Math.max(1.2, Math.min(1.75, multiplier));
  }

  let multiplier = 1.4;

  multiplier += lerp(0.06, 0.02, t);
  if (profile.age >= 45) multiplier -= 0.03;
  if (bmi >= 30) multiplier -= 0.02;
  if (bmi < 22) multiplier += 0.02;

  return Math.max(1.3, Math.min(1.6, multiplier));
}

function objectiveAdjustmentByParcours(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(-1200, -250, t);
}

function parcoursAdjustment(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(-220, -20, t);
}

function parcoursHydrationBonus(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(0.2, 0.05, t);
}

function parcoursStepsBonus(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(1800, 250, t);
}

function parcoursAdherenceWeight(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(1.55, 0.85, t);
}

function maxDailyLossByParcours(parcours: OnboardingData["parcoursPerte"]): number {
  const t = parcoursIntensiteT(parcours);
  return lerp(420, 120, t);
}

function walkingNoteForHorizon(parcours: OnboardingData["parcoursPerte"]): string {
  const d = getProgramDayCount(parcours);
  if (d <= 35) {
    return "Marche à allure soutenue en 2 blocs pour renforcer la dépense énergétique.";
  }
  if (d <= 100) {
    return "Rythme confortable et régulier pour tenir sur environ trois mois.";
  }
  if (d <= 200) {
    return "Privilégie la constance sur six mois : quelques pas de plus valent mieux qu’un pic ponctuel.";
  }
  return "Sur l’année, la régularité prime : marche modérée mais quasi quotidienne.";
}

export function getMealPlan(profile: Pick<OnboardingData, "parcoursPerte">): MealPlanData {
  const dayCount = getProgramDayCount(profile.parcoursPerte);
  return {
    ...parsed,
    jours: buildProgramDays(dayCount),
  };
}

export function getPersonalizedCalories(profile: OnboardingData): number {
  const bmr = 10 * profile.poidsKg + 6.25 * profile.tailleCm - 5 * profile.age - 161;
  const maintenance = bmr * inferredActivityMultiplier(profile);
  const adjusted =
    maintenance + objectiveAdjustmentByParcours(profile.parcoursPerte) + parcoursAdjustment(profile.parcoursPerte);
  return Math.round(Math.max(1300, Math.min(2300, adjusted)));
}

export function getTodayPlanDay(profile: Pick<OnboardingData, "parcoursPerte" | "programStartDateIso">): DayPlan {
  const days = buildProgramDays(getProgramDayCount(profile.parcoursPerte));
  const jour = getTodayJourInProgram(days.length, profile.programStartDateIso);
  return days[jour - 1];
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
  targetSteps += activityStepsBonusFromProfile(profile);

  if (profile.age >= 40) targetSteps -= 500;
  if (profile.age >= 50) targetSteps -= 500;

  if (profile.poidsKg >= 90) targetSteps -= 600;
  if (profile.poidsKg <= 55) targetSteps += 300;

  const stepLengthMeters = Math.max(0.55, Math.min(0.85, profile.tailleCm * 0.00415));
  const clampedSteps = Math.max(5500, Math.min(12500, Math.round(targetSteps / 100) * 100));
  const distanceKm = (clampedSteps * stepLengthMeters) / 1000;
  const minutes = Math.round((clampedSteps / 100) * 1.1);

  return {
    steps: clampedSteps,
    minutes,
    distanceKm: Math.round(distanceKm * 10) / 10,
    note: walkingNoteForHorizon(profile.parcoursPerte),
  };
}

export function getEstimatedDailyLossGrams(
  profile: OnboardingData,
  completionRatio: number,
  waterProgressRatio: number,
  walkingProgressRatio: number,
  indulgenceKcal = 0,
): number {
  const baseDeficitKcal = Math.abs(objectiveAdjustmentByParcours(profile.parcoursPerte));
  const safeRatio = Math.max(0, Math.min(1, completionRatio));
  const safeWaterRatio = Math.max(0, Math.min(1, waterProgressRatio));
  const safeWalkingRatio = Math.max(0, Math.min(1, walkingProgressRatio));

  const indulgencePenalty = Math.max(0, indulgenceKcal) / 7.7;

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
  const gramsPerDay = effectiveDeficit / 7.7;
  const cap = maxDailyLossByParcours(profile.parcoursPerte);

  return Math.max(0, Math.round(Math.min(cap, gramsPerDay) - indulgencePenalty));
}
