import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, MealPlanData, OnboardingData } from "@/utils/types";

const parsed = mealPlanData as MealPlanData;

function activityMultiplier(level: OnboardingData["niveauActivite"]): number {
  if (level === "eleve") return 1.1;
  if (level === "modere") return 1;
  return 0.9;
}

export function getMealPlan(): MealPlanData {
  return parsed;
}

export function getPersonalizedCalories(profile: OnboardingData): number {
  const base = parsed.caloriesMoyennes;
  return Math.max(1300, Math.round(base * activityMultiplier(profile.niveauActivite)));
}

export function getTodayPlanDay(): DayPlan {
  const index = (new Date().getDay() + 6) % 7;
  return parsed.jours[index];
}
