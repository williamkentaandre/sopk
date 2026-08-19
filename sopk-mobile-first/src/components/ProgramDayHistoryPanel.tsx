"use client";

import { useMemo } from "react";

import { programDayToDateLabel } from "@/components/PlanView";
import { getProgramDayProgress } from "@/utils/dayValidation";
import type {
  DayPlan,
  DeviationLogState,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";
import { computeProgramDayLossGrams, formatLossGramsLabel } from "@/utils/weightSummary";

import { SectionCard } from "./SectionCard";

export interface ProgramDayHistoryEntry {
  jour: number;
  dateLabel: string;
  validated: boolean;
  checked: number;
  total: number;
  lossGrams: number;
  isToday: boolean;
}

export function buildProgramDayHistoryEntries(
  profile: OnboardingData,
  jours: DayPlan[],
  todayJour: number,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState,
  deviationLog: DeviationLogState,
): ProgramDayHistoryEntry[] {
  return jours
    .filter((d) => d.jour <= todayJour)
    .sort((a, b) => b.jour - a.jour)
    .map((day) => {
      const progress = getProgramDayProgress(
        day,
        mealChecklist,
        waterProgress,
        stepProgress,
        profile,
      );
      const lossGrams = computeProgramDayLossGrams(
        profile,
        day,
        mealChecklist,
        waterProgress,
        stepProgress,
        deviationLog,
      );
      return {
        jour: day.jour,
        dateLabel: programDayToDateLabel(day.jour, profile.programStartDateIso),
        validated: progress.validated,
        checked: progress.checked,
        total: progress.total,
        lossGrams,
        isToday: day.jour === todayJour,
      };
    });
}

interface ProgramDayHistoryPanelProps {
  profile: OnboardingData;
  jours: DayPlan[];
  todayJour: number;
  selectedJour?: number;
  mealChecklist: MealChecklistState;
  waterProgress: WaterProgressState;
  stepProgress: StepProgressState;
  deviationLog: DeviationLogState;
  onSelectDay: (jour: number) => void;
  variant?: "card" | "embedded";
}

export function ProgramDayHistoryPanel({
  profile,
  jours,
  todayJour,
  selectedJour,
  mealChecklist,
  waterProgress,
  stepProgress,
  deviationLog,
  onSelectDay,
  variant = "card",
}: ProgramDayHistoryPanelProps) {
  const entries = useMemo(
    () =>
      buildProgramDayHistoryEntries(
        profile,
        jours,
        todayJour,
        mealChecklist,
        waterProgress,
        stepProgress,
        deviationLog,
      ),
    [profile, jours, todayJour, mealChecklist, waterProgress, stepProgress, deviationLog],
  );

  if (variant === "card" && entries.length <= 1) {
    return null;
  }

  const validatedCount = entries.filter((e) => e.validated).length;
  const highlightSelected = variant === "card" && selectedJour != null;

  const body = (
    <>
      <p className={`leading-snug text-slate-600 ${variant === "embedded" ? "text-[11px]" : "text-[12px]"}`}>
        Appuyez sur un jour pour l&apos;afficher et le corriger si besoin.
      </p>
      {entries.length > 0 ? (
        <>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            {validatedCount} jour{validatedCount > 1 ? "s" : ""} complet{validatedCount > 1 ? "s" : ""} sur{" "}
            {entries.length}
          </p>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {entries.map((entry) => {
              const selected = highlightSelected && entry.jour === selectedJour;
            const tone = entry.validated
              ? entry.lossGrams > 0
                ? "emerald"
                : "amber"
              : entry.checked > 0
                ? "violet"
                : "slate";

            const toneClasses =
              tone === "emerald"
                ? selected
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/80"
                  : "border-emerald-200 bg-emerald-50/90 hover:border-emerald-300"
                : tone === "amber"
                  ? selected
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300/80"
                    : "border-amber-200 bg-amber-50/90 hover:border-amber-300"
                  : tone === "violet"
                    ? selected
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300/80"
                      : "border-violet-200 bg-violet-50/90 hover:border-violet-300"
                    : selected
                      ? "border-slate-400 bg-white ring-2 ring-slate-300/80"
                      : "border-slate-200 bg-white hover:border-slate-300";

            return (
              <button
                key={entry.jour}
                type="button"
                onClick={() => onSelectDay(entry.jour)}
                className={`flex min-w-[5.25rem] shrink-0 flex-col rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98] ${toneClasses}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {entry.isToday ? "Aujourd'hui" : `Jour ${entry.jour}`}
                </span>
                <span className="mt-0.5 text-[12px] font-bold text-slate-900">{entry.dateLabel}</span>
                <span className="mt-1 text-[10px] leading-snug text-slate-600">
                  {entry.validated ? "Complet" : `${entry.checked}/${entry.total}`}
                </span>
                {entry.lossGrams > 0 ? (
                  <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-emerald-700">
                    {formatLossGramsLabel(entry.lossGrams)}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">Aucun jour passé à afficher pour le moment.</p>
      )}
    </>
  );

  if (variant === "embedded") {
    return body;
  }

  return (
    <SectionCard title="Historique des jours" noPadding>
      <div className="px-4 pb-3 pt-1">{body}</div>
    </SectionCard>
  );
}
