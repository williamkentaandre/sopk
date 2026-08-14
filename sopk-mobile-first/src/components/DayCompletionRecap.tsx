"use client";

import type { DayPlan, MealEntry } from "@/utils/types";
import { formatLossGramsLabel, formatWeightKgLive } from "@/utils/weightSummary";
import { formatLitersFrFromMl } from "@/utils/waterDisplay";
import { programDayMilestoneLabel } from "@/utils/dayValidation";

const labelByType: Record<MealEntry["type"], string> = {
  petit_dejeuner: "Petit déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};

interface DayCompletionRecapProps {
  selectedDay: DayPlan;
  tomorrowDay: DayPlan | null;
  tomorrowFirstMeal: MealEntry | null;
  dateLabel: string;
  tomorrowDateLabel: string | null;
  dayCount: number;
  checkedMeals: number;
  mealSlots: number;
  waterChecked: boolean;
  waterRawMl: number;
  waterTargetMl: number;
  walkingChecked: boolean;
  stepsCurrent: number;
  stepsTarget: number;
  deviationKcal: number;
  deviationCount: number;
  selectedDayLossGrams: number;
  cumulativeLossGrams: number;
  currentWeightKg: number;
  streak: number;
  hasNetLoss: boolean;
  isAboveStartWeight?: boolean;
  weightDeltaFromStartLabel?: string;
}

export function DayCompletionRecap({
  selectedDay,
  tomorrowDay,
  tomorrowFirstMeal,
  dateLabel,
  tomorrowDateLabel,
  dayCount,
  checkedMeals,
  mealSlots,
  waterChecked,
  waterRawMl,
  waterTargetMl,
  walkingChecked,
  stepsCurrent,
  stepsTarget,
  deviationKcal,
  deviationCount,
  selectedDayLossGrams,
  cumulativeLossGrams,
  currentWeightKg,
  streak,
  hasNetLoss,
  isAboveStartWeight = false,
  weightDeltaFromStartLabel,
}: DayCompletionRecapProps) {
  const milestone = programDayMilestoneLabel(selectedDay.jour, dayCount);

  return (
    <div className="mt-3 space-y-3">
      <div
        className={`overflow-hidden rounded-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
          hasNetLoss
            ? "border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white shadow-emerald-500/10"
            : "border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white"
        }`}
      >
        <div className={`border-b px-4 py-3 ${hasNetLoss ? "border-emerald-100/80" : "border-amber-100/80"}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${hasNetLoss ? "text-emerald-700" : "text-amber-800"}`}>
            Bilan du jour
          </p>
          <p className="mt-0.5 text-[17px] font-bold tracking-tight text-slate-900">
            {dateLabel} <span className="font-normal text-slate-400">·</span> Jour {selectedDay.jour}
          </p>
          {!hasNetLoss ? (
            <p className="mt-1.5 text-[12px] leading-snug text-amber-950">
              {isAboveStartWeight
                ? "Au-dessus du poids de départ - les écarts cumulés dépassent les pertes estimées."
                : deviationKcal > 0
                  ? "Pas de perte nette aujourd'hui - les écarts compensent le déficit du jour."
                  : "Pas de perte estimée aujourd'hui - reprenez demain sur le rythme du plan."}
            </p>
          ) : null}
          {milestone ? (
            <p className="mt-1 inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
              {milestone}
            </p>
          ) : null}
          {streak >= 2 ? (
            <p className="mt-1.5 text-[12px] font-medium text-emerald-800">
              {streak} jour{streak > 1 ? "s" : ""} d&apos;affilée validé{streak > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          <RecapStat label="Repas" value={`${checkedMeals}/${mealSlots}`} ok={checkedMeals === mealSlots} />
          <RecapStat
            label="Eau"
            value={formatLitersFrFromMl(waterRawMl)}
            sub={`/ ${formatLitersFrFromMl(waterTargetMl)}`}
            ok={waterChecked}
          />
          <RecapStat
            label="Pas"
            value={stepsCurrent.toLocaleString("fr-FR")}
            sub={`/ ${stepsTarget.toLocaleString("fr-FR")}`}
            ok={walkingChecked}
          />
          <RecapStat
            label="Écarts"
            value={deviationCount > 0 ? `${deviationKcal} kcal` : "Aucun"}
            ok={deviationCount === 0}
            warn={deviationCount > 0}
          />
        </div>

        <div className={`border-t px-4 py-3 ${hasNetLoss ? "border-emerald-100/80 bg-emerald-50/40" : "border-amber-100/80 bg-amber-50/30"}`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Poids estimé</p>
              <p className="text-[22px] font-bold tabular-nums tracking-tight text-slate-900">
                {formatWeightKgLive(currentWeightKg)}
                <span className="text-[13px] font-medium text-slate-400"> kg</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">Perte du jour</p>
              {selectedDayLossGrams > 0 ? (
                <p className="text-[15px] font-bold tabular-nums text-emerald-700">
                  {formatLossGramsLabel(selectedDayLossGrams)}
                </p>
              ) : (
                <p className="text-[15px] font-semibold tabular-nums text-slate-400">-</p>
              )}
              {isAboveStartWeight && weightDeltaFromStartLabel ? (
                <p className="mt-0.5 text-[11px] font-medium tabular-nums text-amber-800">
                  {weightDeltaFromStartLabel}
                </p>
              ) : cumulativeLossGrams > 0 ? (
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                  {formatLossGramsLabel(cumulativeLossGrams)} perdus cumulés
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {tomorrowDay && tomorrowFirstMeal ? (
        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Demain</p>
          <p className="mt-0.5 text-[14px] font-semibold text-slate-900">
            {tomorrowDateLabel ?? `Jour ${tomorrowDay.jour}`}
            {" · "}
            <span className="font-normal text-slate-600">Jour {tomorrowDay.jour}</span>
          </p>
          <p className="mt-2 text-[12px] text-slate-700">
            <span className="font-semibold text-violet-900">{labelByType[tomorrowFirstMeal.type]}</span>
            {" : "}
            {tomorrowFirstMeal.nom}
            <span className="tabular-nums text-slate-500"> · {tomorrowFirstMeal.calories} kcal</span>
          </p>
          {tomorrowDay.conseils[0] ? (
            <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-2 text-[11px] leading-snug text-violet-950">
              {tomorrowDay.conseils[0]}
            </p>
          ) : null}
        </div>
      ) : selectedDay.jour >= dayCount ? (
        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 px-4 py-3 text-center">
          <p className="text-[13px] font-semibold text-violet-900">Fin du programme - félicitations !</p>
          <p className="mt-1 text-[12px] text-violet-800">Continuez vos bonnes habitudes au quotidien.</p>
        </div>
      ) : null}

      {selectedDay.conseils.length > 0 ? (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-600">À retenir aujourd&apos;hui</p>
          <ul className="mt-1 space-y-0.5">
            {selectedDay.conseils.map((tip) => (
              <li key={tip} className="text-[12px] leading-snug text-slate-700">
                · {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RecapStat({
  label,
  value,
  sub,
  ok,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        warn ? "border-amber-200/80 bg-amber-50/60" : ok ? "border-emerald-200/60 bg-white/90" : "border-slate-200/60 bg-white/90"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-slate-900">
        {value}
        {sub ? <span className="text-[11px] font-medium text-slate-400"> {sub}</span> : null}
      </p>
    </div>
  );
}
