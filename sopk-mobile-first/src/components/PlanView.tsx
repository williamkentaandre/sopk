import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  getDailyWalkingRecommendation,
  getEstimatedDailyLossGrams,
  getMealCaloriesForTarget,
  getMealPlan,
  getPersonalizedCalories,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import { getMealPortionDetailsAdjusted } from "@/utils/meal-portions";
import {
  DayPlan,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";

import { SectionCard } from "./SectionCard";

interface PlanViewProps {
  profile: OnboardingData;
  mealChecklist: MealChecklistState;
  waterProgress: WaterProgressState;
  stepProgress: StepProgressState;
  onUpdateWaterProgress: (key: string, value: number) => void;
  onUpdateStepProgress: (key: string, value: number) => void;
  onToggleMeal: (key: string) => void;
}

const labelByType = {
  petit_dejeuner: "Petit déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
} as const;

const mealTimeByType = {
  petit_dejeuner: "08:00",
  dejeuner: "13:00",
  collation: "16:30",
  diner: "20:00",
} as const;

const mealImageByType = {
  petit_dejeuner: "/images/meal-petit-dejeuner.svg",
  dejeuner: "/images/meal-dejeuner.svg",
  collation: "/images/meal-collation.svg",
  diner: "/images/meal-diner.svg",
} as const;

export function PlanView({
  profile,
  mealChecklist,
  waterProgress,
  stepProgress,
  onUpdateWaterProgress,
  onUpdateStepProgress,
  onToggleMeal,
}: PlanViewProps) {
  const data = getMealPlan();
  const daySectionRef = useRef<HTMLElement | null>(null);
  const dayScrollerRef = useRef<HTMLDivElement | null>(null);
  const dayButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getDefaultDayIndex(data.jours, profile, mealChecklist, waterProgress, stepProgress)
  );
  const selectedDay = data.jours[selectedDayIndex];
  const [openMealDetails, setOpenMealDetails] = useState<Record<string, boolean>>({});
  const [openBilanDetailsByDay, setOpenBilanDetailsByDay] = useState<Record<number, boolean>>({});
  const previousIsDayValidatedRef = useRef<boolean>(false);
  const dailyTarget = getPersonalizedCalories(profile);
  const personalizedHydrationLiters = getPersonalizedHydrationLiters(
    selectedDay.hydratationLitres,
    profile
  );
  const walking = getDailyWalkingRecommendation(profile);
  const stepsTarget = walking.steps;
  const stepsProgressKey = stepsProgressStorageKey(selectedDay.jour);
  const stepsCurrent = Math.min(stepsTarget, Math.max(0, Math.round(stepProgress[stepsProgressKey] ?? 0)));
  const stepsPercent = Math.round((stepsCurrent / stepsTarget) * 100);
  const stepsProgressRatio = stepsTarget > 0 ? stepsCurrent / stepsTarget : 0;
  const waterTargetMl = Math.round(personalizedHydrationLiters * 1000);
  const waterProgressKey = waterProgressStorageKey(selectedDay.jour);
  const waterCurrentMl = Math.min(waterTargetMl, Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0)));
  const waterPercent = Math.round((waterCurrentMl / waterTargetMl) * 100);
  const waterProgressRatio = waterTargetMl > 0 ? waterCurrentMl / waterTargetMl : 0;
  const waterChecked = waterCurrentMl >= waterTargetMl;
  const walkingChecked = stepsCurrent >= stepsTarget;
  const checkedMealIndexes = selectedDay.repas
    .map((_, i) => i)
    .filter((i) => mealChecklist[mealKey(selectedDay.jour, i)]);
  const checkedMeals = checkedMealIndexes.length;
  const checkedToday = checkedMeals + (waterChecked ? 1 : 0) + (walkingChecked ? 1 : 0);
  const totalTasks = selectedDay.repas.length + 2;
  const dayManuallyValidated = Boolean(mealChecklist[manualValidationKey(selectedDay.jour)]);
  const isDayValidated = checkedToday === totalTasks || dayManuallyValidated;
  const completionRatio = totalTasks > 0 ? checkedToday / totalTasks : 0;
  const estimatedLossGrams = getEstimatedDailyLossGrams(
    profile,
    completionRatio,
    waterProgressRatio,
    stepsProgressRatio
  );
  const projectedLossGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const dailyLossPercent =
    projectedLossGrams > 0 ? Math.min(100, Math.round((estimatedLossGrams / projectedLossGrams) * 100)) : 0;
  const remainingLossGrams = Math.max(0, projectedLossGrams - estimatedLossGrams);
  const dailyLossTone =
    dailyLossPercent >= 90
      ? "emerald"
      : dailyLossPercent >= 60
        ? "amber"
        : "rose";
  const achievedLosses = data.jours
    .slice(0, selectedDay.jour)
    .map((day) => {
      const dayMealIndexes = day.repas.map((_, i) => i).filter((i) => mealChecklist[mealKey(day.jour, i)]);
      const dayWaterValue = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
      const dayStepValue = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);
      const dayWaterTarget = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
      const dayStepsTarget = getDailyWalkingRecommendation(profile).steps;
      const dayWaterChecked = dayWaterValue >= dayWaterTarget;
      const dayWalkingChecked = dayStepValue >= dayStepsTarget;
      const dayWaterRatio = dayWaterTarget > 0 ? Math.min(1, Math.max(0, dayWaterValue / dayWaterTarget)) : 0;
      const dayStepsRatio = dayStepsTarget > 0 ? Math.min(1, Math.max(0, dayStepValue / dayStepsTarget)) : 0;
      const dayChecked = dayMealIndexes.length + (dayWaterChecked ? 1 : 0) + (dayWalkingChecked ? 1 : 0);
      const dayTotal = day.repas.length + 2;
      const dayManuallyValidated = Boolean(mealChecklist[manualValidationKey(day.jour)]);
      const dayRatio = dayTotal > 0 ? dayChecked / dayTotal : 0;
      const isActiveDay =
        dayMealIndexes.length > 0 ||
        dayWaterChecked ||
        dayWalkingChecked ||
        dayWaterValue > 0 ||
        dayStepValue > 0 ||
        dayManuallyValidated;

      if (!isActiveDay) return null;
      return getEstimatedDailyLossGrams(profile, dayRatio, dayWaterRatio, dayStepsRatio);
    })
    .filter((value): value is number => value !== null);
  const bilansEffectues = achievedLosses.length;
  const joursRestantsProgramme = Math.max(0, data.jours.length - bilansEffectues);
  const achievedCumulativeGrams = achievedLosses.reduce((sum, value) => sum + value, 0);
  const currentWeightKg = Math.max(0, profile.poidsKg - achievedCumulativeGrams / 1000);
  const potentialWeightKg = Math.max(0, profile.poidsKg - (achievedCumulativeGrams + remainingLossGrams) / 1000);
  const projectedRemainingProgramLossGrams = projectedLossGrams * joursRestantsProgramme;
  const programPotentialWeightKg = Math.max(0, currentWeightKg - projectedRemainingProgramLossGrams / 1000);
  const progressMessage =
    isDayValidated
      ? dayManuallyValidated
        ? "Journée validée manuellement: bilan confirmé sans modifier tes actions."
        : "Journée complète validée: excellent rythme !"
      : checkedToday === 0
      ? "Démarrage du jour: valide ta première action pour lancer ton bilan."
      : checkedToday < totalTasks
        ? `Bonne progression: ${checkedToday}/${totalTasks} actions validées.`
        : "Journée en cours.";
  const isBilanDetailsOpen = Boolean(openBilanDetailsByDay[selectedDay.jour]) || isDayValidated;

  useEffect(() => {
    const targetButton = dayButtonRefs.current[selectedDay.jour];
    if (!targetButton) return;

    const frame = window.requestAnimationFrame(() => {
      targetButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedDay.jour, selectedDayIndex]);

  useEffect(() => {
    const wasValidated = previousIsDayValidatedRef.current;
    if (!wasValidated && isDayValidated) {
      daySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    previousIsDayValidatedRef.current = isDayValidated;
  }, [isDayValidated]);

  return (
    <div className="space-y-4">
      <section ref={daySectionRef}>
        <SectionCard title="Choisis ton jour">
        <div
          ref={dayScrollerRef}
          className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-10 md:gap-2 md:overflow-visible md:px-0"
        >
          {data.jours.map((day, idx) => {
            const completed =
              Boolean(mealChecklist[manualValidationKey(day.jour)]) ||
              (day.repas.every((_, i) => mealChecklist[mealKey(day.jour, i)]) &&
                Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0) >=
                  Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000) &&
                Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0) >=
                  getDailyWalkingRecommendation(profile).steps);
            return (
              <button
                key={day.jour}
                type="button"
                ref={(element) => {
                  dayButtonRefs.current[day.jour] = element;
                }}
                onClick={() => setSelectedDayIndex(idx)}
                className={`min-w-16 snap-start rounded-xl px-3 py-2 text-xs font-semibold transition md:min-w-0 ${
                  idx === selectedDayIndex
                    ? "bg-violet-600 text-white"
                    : completed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-violet-50 text-violet-700"
                }`}
              >
                Jour {day.jour}
              </button>
            );
          })}
        </div>
        </SectionCard>
      </section>

      <SectionCard title={`Jour ${selectedDay.jour} - 6 actions à valider`}>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
            {dailyTarget} kcal
          </span>
          <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
            {personalizedHydrationLiters.toFixed(1)} L eau
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            {walking.steps} pas
          </span>
        </div>
        <div
          className={`sticky top-[calc(env(safe-area-inset-top)+36px)] z-20 mt-2 rounded-xl border p-3 shadow-sm backdrop-blur-sm md:top-2 ${
            isDayValidated
              ? "border-emerald-300 bg-emerald-50"
              : "border-violet-200 bg-violet-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              isDayValidated ? "text-emerald-800" : "text-violet-800"
            }`}
          >
            {isDayValidated ? "✅ Bilan validé du jour" : "🔄 Bilan en cours de validation"}
          </p>
          <p className={`mt-1 text-xs ${isDayValidated ? "text-emerald-700" : "text-violet-700"}`}>{progressMessage}</p>
          {!isDayValidated ? (
            <button
              type="button"
              onClick={() => onToggleMeal(manualValidationKey(selectedDay.jour))}
              className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              Valider le bilan sans cocher les actions
            </button>
          ) : dayManuallyValidated ? (
            <button
              type="button"
              onClick={() => onToggleMeal(manualValidationKey(selectedDay.jour))}
              className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Annuler la validation manuelle
            </button>
          ) : null}
          <div
            className={`mt-2 rounded-lg p-2 text-xs ${
              isDayValidated ? "bg-white/80 text-emerald-800" : "bg-white/80 text-violet-800"
            }`}
          >
            <div className="rounded-xl border border-violet-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Perte du jour</p>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                    dailyLossTone === "emerald"
                      ? "bg-emerald-100 text-emerald-800"
                      : dailyLossTone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {dailyLossPercent}%
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    dailyLossTone === "emerald"
                      ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-600"
                      : dailyLossTone === "amber"
                        ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"
                        : "bg-gradient-to-r from-rose-400 via-pink-500 to-rose-600"
                  }`}
                  style={{ width: `${dailyLossPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700">
                Poids atteint (jour {selectedDay.jour}): ~{formatWeightKg(currentWeightKg)} kg
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Poids prévu (jour {selectedDay.jour}): ~{formatWeightKg(potentialWeightKg)} kg
              </p>
            </div>
            <details
              open={isBilanDetailsOpen}
              className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-2 shadow-sm"
            >
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenBilanDetailsByDay((prev) => ({
                    ...prev,
                    [selectedDay.jour]: !Boolean(prev[selectedDay.jour]),
                  }));
                }}
                className="cursor-pointer text-xs font-semibold text-violet-800"
              >
                Voir plus de détails
              </summary>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Bilan poids du jour
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold text-cyan-700">
                      Poids atteint (jour {selectedDay.jour})
                    </p>
                    <p className="text-lg font-bold text-cyan-900">~{formatWeightKg(currentWeightKg)} kg</p>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold text-violet-700">
                      Poids prévu (jour {selectedDay.jour})
                    </p>
                    <p className="text-lg font-bold text-violet-900">~{formatWeightKg(potentialWeightKg)} kg</p>
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  Écart estimé: ~{formatWeightKg(Math.max(0, currentWeightKg - potentialWeightKg))} kg
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="text-[10px] font-semibold text-slate-600">Poids de départ (jour 1)</p>
                  <p className="text-base font-bold text-slate-800">~{formatWeightKg(profile.poidsKg)} kg</p>
                </div>
                <div className="rounded-lg bg-violet-50 px-2 py-2">
                  <p className="text-[10px] font-semibold text-violet-700">Potentiel fin de programme (jour 30)</p>
                  <p className="text-base font-bold text-violet-800">~{formatWeightKg(programPotentialWeightKg)} kg</p>
                </div>
              </div>
            </details>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <article
            className={`overflow-hidden rounded-xl border transition ${
              waterChecked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
            }`}
          >
            <Image
              src="/images/hydratation-verre.svg"
              alt="Verre d'eau"
              width={800}
              height={400}
              className="h-28 w-full object-cover"
            />
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Hydratation du jour</p>
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
                  {personalizedHydrationLiters.toFixed(1)} L
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                Avance le curseur au fur et à mesure de ta consommation d&apos;eau.
              </p>
              <div className="mt-3 rounded-lg bg-cyan-50 p-2">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-cyan-800">
                  <span>{waterCurrentMl} ml</span>
                  <span>{waterTargetMl} ml ({waterPercent}%)</span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-cyan-100">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${waterPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={waterTargetMl}
                  step={50}
                  value={waterCurrentMl}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onUpdateWaterProgress(waterProgressKey, next);
                  }}
                  className="w-full accent-cyan-600"
                />
              </div>
              {waterChecked ? (
                <p className="mt-3 text-xs font-semibold text-cyan-800">✅ Objectif eau atteint via le curseur</p>
              ) : null}
            </div>
          </article>

          <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
            <Image
              src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80"
              alt="Marche quotidienne"
              width={800}
              height={400}
              className="h-28 w-full object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-semibold text-emerald-800">Marche quotidienne personnalisée</p>
              <p className="mt-1 text-xs text-emerald-700">
                {walking.steps} pas (~{walking.distanceKm} km) - environ {walking.minutes} min.
              </p>
              <div className="mt-3 rounded-lg bg-emerald-100/80 p-2">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>{stepsCurrent} pas</span>
                  <span>
                    {stepsTarget} pas ({stepsPercent}%)
                  </span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${stepsPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={stepsTarget}
                  step={100}
                  value={stepsCurrent}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onUpdateStepProgress(stepsProgressKey, next);
                  }}
                  className="w-full accent-emerald-600"
                />
              </div>
              {walkingChecked ? (
                <p className="mt-3 text-xs font-semibold text-emerald-800">✅ Objectif pas atteint via le curseur</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selectedDay.repas.map((meal, index) => {
            const key = mealKey(selectedDay.jour, index);
            const checked = Boolean(mealChecklist[key]);
            const adjustedMealKcal = getMealCaloriesForTarget(meal.calories, selectedDay, dailyTarget);
            const kcalRatio = adjustedMealKcal / meal.calories;
            const portionDetails = getMealPortionDetailsAdjusted(meal.nom, kcalRatio, {
              ...profile,
              objectifKcalJour: dailyTarget,
            }, meal.type);
            const alternativePortionDetails = getMealPortionDetailsAdjusted(meal.substitution, kcalRatio, {
              ...profile,
              objectifKcalJour: dailyTarget,
            }, meal.type);

            return (
              <article
                key={key}
                className={`overflow-hidden rounded-xl border transition ${
                  checked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <Image
                  src={mealImageByType[meal.type]}
                  alt={meal.nom}
                  width={800}
                  height={400}
                  className="h-28 w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{labelByType[meal.type]}</p>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                      {adjustedMealKcal} kcal
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Heure conseillée: {mealTimeByType[meal.type]}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{meal.nom}</p>
                  <p className="mt-1 text-xs text-slate-500">Autre option: {meal.substitution}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMealDetails((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    {openMealDetails[key] ? "Masquer détails nutrition" : "Voir détails nutrition"}
                  </button>
                  {openMealDetails[key] && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2">
                      <p className="text-xs font-semibold text-slate-700">Grammage recommandé:</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
                        {portionDetails.ingredients.map((item) => (
                          <li key={`${item.aliment}-${item.grammes}`}>
                            {item.aliment}: {item.grammes} g
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-slate-500">Pourquoi: {portionDetails.why}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-700">Grammage autre option:</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
                        {alternativePortionDetails.ingredients.map((item) => (
                          <li key={`alt-${item.aliment}-${item.grammes}`}>
                            {item.aliment}: {item.grammes} g
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-slate-500">Pourquoi: {alternativePortionDetails.why}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleMeal(key)}
                    className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                      checked
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {checked ? "✅ Repas validé" : "☑️ Cocher comme mangé"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}

function mealKey(day: number, mealIndex: number) {
  return `day-${day}-meal-${mealIndex}`;
}

function manualValidationKey(day: number) {
  return `day-${day}-manual-validated`;
}

function waterProgressStorageKey(day: number) {
  return `day-${day}-water-progress`;
}

function stepsProgressStorageKey(day: number) {
  return `day-${day}-steps-progress`;
}

function formatWeightKg(value: number) {
  return value.toFixed(1);
}

function getDefaultDayIndex(
  days: DayPlan[],
  profile: OnboardingData,
  mealChecklist: MealChecklistState,
  waterProgress: WaterProgressState,
  stepProgress: StepProgressState
) {
  const firstUnvalidatedIndex = days.findIndex((day) => {
    const manuallyValidated = Boolean(mealChecklist[manualValidationKey(day.jour)]);
    if (manuallyValidated) return false;

    const mealsValidated = day.repas.every((_, i) => mealChecklist[mealKey(day.jour, i)]);
    const waterTarget = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, profile) * 1000);
    const waterValue = Math.round(waterProgress[waterProgressStorageKey(day.jour)] ?? 0);
    const stepsTarget = getDailyWalkingRecommendation(profile).steps;
    const stepsValue = Math.round(stepProgress[stepsProgressStorageKey(day.jour)] ?? 0);

    return !(mealsValidated && waterValue >= waterTarget && stepsValue >= stepsTarget);
  });

  if (firstUnvalidatedIndex >= 0) return firstUnvalidatedIndex;
  return Math.max(0, days.length - 1);
}

