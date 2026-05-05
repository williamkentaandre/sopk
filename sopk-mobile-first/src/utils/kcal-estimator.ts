import { MealType } from "@/utils/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100000;
  }
  return hash;
}

const mealTypeFactor: Record<MealType, number> = {
  petit_dejeuner: 0.95,
  dejeuner: 1.05,
  collation: 0.75,
  diner: 1.1,
};

export function estimateMealKcalFromPhoto(file: File, plannedKcal: number, mealType: MealType): number {
  const sizeFactor = clamp(file.size / 350000, 0.65, 1.45);
  const jitter = (hashString(file.name + String(file.size)) % 25) / 100 - 0.12;
  const estimate = plannedKcal * sizeFactor * mealTypeFactor[mealType] * (1 + jitter);
  return Math.round(clamp(estimate, 120, 1200));
}
