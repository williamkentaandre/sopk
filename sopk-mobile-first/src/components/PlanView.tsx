import { useState } from "react";
import Image from "next/image";

import { getMealPlan, getPersonalizedCalories } from "@/utils/mealPlan";
import { getMealPortionDetails } from "@/utils/meal-portions";
import {
  MealChecklistState,
  OnboardingData,
  WaterProgressState,
} from "@/utils/types";

import { SectionCard } from "./SectionCard";

interface PlanViewProps {
  profile: OnboardingData;
  mealChecklist: MealChecklistState;
  waterProgress: WaterProgressState;
  onUpdateWaterProgress: (key: string, value: number) => void;
  onToggleMeal: (key: string) => void;
}

const labelByType = {
  petit_dejeuner: "Petit déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
} as const;

export function PlanView({
  profile,
  mealChecklist,
  waterProgress,
  onUpdateWaterProgress,
  onToggleMeal,
}: PlanViewProps) {
  const data = getMealPlan();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const selectedDay = data.jours[selectedDayIndex];
  const dailyTarget = getPersonalizedCalories(profile);
  const waterChecked = Boolean(mealChecklist[waterKey(selectedDay.jour)]);
  const waterTargetMl = Math.round(selectedDay.hydratationLitres * 1000);
  const waterProgressKey = waterProgressStorageKey(selectedDay.jour);
  const waterCurrentMl = Math.min(waterTargetMl, Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0)));
  const waterPercent = Math.round((waterCurrentMl / waterTargetMl) * 100);
  const checkedMeals = selectedDay.repas.filter((_, i) => mealChecklist[mealKey(selectedDay.jour, i)]).length;
  const checkedToday = checkedMeals + (waterChecked ? 1 : 0);
  const totalTasks = selectedDay.repas.length + 1;
  const percent = Math.round((checkedToday / totalTasks) * 100);

  const xpTotal = Object.values(mealChecklist).filter(Boolean).length * 10;
  const completedDays = data.jours.filter((day) =>
    day.repas.every((_, i) => mealChecklist[mealKey(day.jour, i)]) && mealChecklist[waterKey(day.jour)]
  ).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Bienvenue ${profile.prenom}`}
        subtitle={`Objectif calorique personnalisé: ${dailyTarget} kcal / jour`}
      >
        <p className="text-sm text-slate-700">{data.objectif}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Plan alimentaire sur 7 jours prêt à suivre.</li>
          <li>Recettes équilibrées compatibles SOPK.</li>
          <li>Substitutions incluses pour plus de flexibilité.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Mode gamification">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-violet-50 p-3 text-center">
            <p className="text-xs text-violet-700">XP total</p>
            <p className="text-xl font-bold text-violet-800">{xpTotal}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-xs text-emerald-700">Jours validés</p>
            <p className="text-xl font-bold text-emerald-800">{completedDays}/7</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-xs text-amber-700">Progression jour</p>
            <p className="text-xl font-bold text-amber-800">{percent}%</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Choisis ton jour">
        <div className="grid grid-cols-4 gap-2">
          {data.jours.map((day, idx) => {
            const completed = day.repas.every((_, i) => mealChecklist[mealKey(day.jour, i)]);
            return (
              <button
                key={day.jour}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold ${
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

      <SectionCard title={`Jour ${selectedDay.jour} - 5 actions à valider`}>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-sm font-semibold text-cyan-800">
            Hydratation cible du jour: {selectedDay.hydratationLitres.toFixed(1)} L
          </p>
          <p className="mt-1 text-xs text-cyan-700">
            Cette quantité est définie automatiquement pour favoriser la perte de poids et limiter les fringales.
          </p>
          <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-cyan-800">
            💧 {selectedDay.rappelHydratation}
          </p>
        </div>

        <article
          className={`overflow-hidden rounded-xl border transition ${
            waterChecked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <Image
            src="https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=1200&q=80"
            alt="Verre d'eau"
            width={800}
            height={400}
            className="h-28 w-full object-cover"
          />
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Hydratation du jour</p>
              <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
                {selectedDay.hydratationLitres.toFixed(1)} L
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
              <input
                type="range"
                min={0}
                max={waterTargetMl}
                step={50}
                value={waterCurrentMl}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onUpdateWaterProgress(waterProgressKey, next);
                  if (next >= waterTargetMl && !waterChecked) {
                    onToggleMeal(waterKey(selectedDay.jour));
                  }
                  if (next < waterTargetMl && waterChecked) {
                    onToggleMeal(waterKey(selectedDay.jour));
                  }
                }}
                className="w-full accent-cyan-600"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateWaterProgress(waterProgressKey, waterTargetMl);
                if (!waterChecked) {
                  onToggleMeal(waterKey(selectedDay.jour));
                }
              }}
              className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                waterChecked
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {waterChecked ? "✅ Eau validée" : "☑️ Cocher l'objectif eau"}
            </button>
          </div>
        </article>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectedDay.repas.map((meal, index) => {
            const key = mealKey(selectedDay.jour, index);
            const checked = Boolean(mealChecklist[key]);
            const portionDetails = getMealPortionDetails(meal.nom);

            return (
              <article
                key={key}
                className={`overflow-hidden rounded-xl border transition ${
                  checked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <Image
                  src={meal.image}
                  alt={meal.nom}
                  width={800}
                  height={400}
                  className="h-28 w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{labelByType[meal.type]}</p>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                      {meal.calories} kcal
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{meal.nom}</p>
                  <p className="mt-1 text-xs text-slate-500">Option: {meal.substitution}</p>
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
                  </div>
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

      <SectionCard title="Conseils du jour">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {selectedDay.conseils.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function mealKey(day: number, mealIndex: number) {
  return `day-${day}-meal-${mealIndex}`;
}

function waterKey(day: number) {
  return `day-${day}-water`;
}

function waterProgressStorageKey(day: number) {
  return `day-${day}-water-progress`;
}
