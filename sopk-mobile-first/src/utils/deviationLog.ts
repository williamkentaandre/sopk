import type { DeviationLogState } from "@/utils/types";

export function deviationStorageKey(programDay: number): string {
  return `dev:${programDay}`;
}

export function getDeviationKcalForDay(log: DeviationLogState, programDay: number): number {
  const entries = log[deviationStorageKey(programDay)] ?? [];
  return entries.reduce((sum, entry) => sum + Math.max(0, entry.kcal), 0);
}

export function indulgencePenaltyGrams(kcal: number): number {
  return Math.round(Math.max(0, kcal) / 7.7);
}
