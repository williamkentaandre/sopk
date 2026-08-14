"use client";

import { useLayoutEffect, useRef } from "react";

import { getMealCaloriesForTarget } from "@/utils/mealPlan";
import { getMealPortionDetailsAdjusted, type MealPortionDetails } from "@/utils/meal-portions";
import {
  catalogMealOverride,
  customMealOverride,
  getEffectiveMeal,
  getMealAlternatives,
  resolveMealOverride,
} from "@/utils/mealPersonalization";
import type { DayPlan, MealOverrideEntry, MealOverrideState, OnboardingData } from "@/utils/types";

import { MealImage } from "./PlanViewMealImage";

const labelByType = {
  petit_dejeuner: "Petit déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
} as const;

function MealPortionsSection({ portionDetails }: { portionDetails: MealPortionDetails }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">Portions par aliment</p>
      {portionDetails.ingredients.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {portionDetails.ingredients.map((item) => (
            <li
              key={`${item.aliment}-${item.grammes}-${item.displayLine ?? ""}`}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-white px-2.5 py-2 text-[12px] shadow-sm ring-1 ring-slate-100"
            >
              <span className="min-w-0 font-medium text-slate-800">{item.aliment}</span>
              <span className="shrink-0 tabular-nums font-bold text-slate-900">
                {item.displayLine
                  ? item.displayLine.includes(":")
                    ? item.displayLine.split(":").pop()?.trim()
                    : item.displayLine
                  : `${item.grammes} g`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-slate-400">Détail des portions non disponible pour ce repas.</p>
      )}
      {portionDetails.why ? (
        <p className="mt-2.5 text-[11px] leading-snug text-slate-500">{portionDetails.why}</p>
      ) : null}
    </div>
  );
}

interface MealExpandPanelProps {
  mealKey: string;
  mealIndex: number;
  selectedDay: DayPlan;
  profile: OnboardingData;
  dailyTarget: number;
  mealOverrides: MealOverrideState;
  customMealDraft: { label: string; kcal: string };
  onCustomMealDraftChange: (draft: { label: string; kcal: string }) => void;
  openMealSwap: boolean;
  onToggleSwap: () => void;
  onSetMealOverride: (key: string, override: MealOverrideEntry | null) => void;
  canEdit: boolean;
  onClose: () => void;
}

export function MealExpandPanel({
  mealKey,
  mealIndex,
  selectedDay,
  profile,
  dailyTarget,
  mealOverrides,
  customMealDraft,
  onCustomMealDraftChange,
  openMealSwap,
  onToggleSwap,
  onSetMealOverride,
  canEdit,
  onClose,
}: MealExpandPanelProps) {
  const swapSectionRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!openMealSwap) return;
    const frame = requestAnimationFrame(() => {
      swapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [openMealSwap]);

  const plannedMeal = selectedDay.repas[mealIndex];
  if (!plannedMeal) return null;

  const overrideEntry = resolveMealOverride(mealOverrides[mealKey]);
  const meal = getEffectiveMeal(plannedMeal, mealOverrides[mealKey]);
  const isCustomMeal = Boolean(overrideEntry && overrideEntry.nom !== plannedMeal.nom);
  const isFreeformMeal = overrideEntry?.custom === true;
  const alternatives = getMealAlternatives(profile, plannedMeal, meal.nom);
  const adjustedMealKcal = getMealCaloriesForTarget(meal.calories, selectedDay, dailyTarget);
  const kcalRatio = meal.calories > 0 ? adjustedMealKcal / meal.calories : 1;
  const portionDetails = getMealPortionDetailsAdjusted(
    meal.nom,
    kcalRatio,
    { ...profile, objectifKcalJour: dailyTarget },
    meal.type,
    meal.calories,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <MealImage meal={meal} hideImage={isFreeformMeal} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">{meal.nom}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {labelByType[meal.type]} · {adjustedMealKcal} kcal
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          Fermer
        </button>
      </div>

      {isFreeformMeal ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[12px] text-amber-950">
          Repas personnalisé équivalent - pas de détail par aliment ({adjustedMealKcal} kcal).
        </div>
      ) : (
        <MealPortionsSection portionDetails={portionDetails} />
      )}

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          {isCustomMeal ? (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                onSetMealOverride(mealKey, null);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-40"
            >
              Repas du jour
            </button>
          ) : null}
          {!openMealSwap ? (
            <button
              type="button"
              onClick={onToggleSwap}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-800"
            >
              Changer de repas
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleSwap}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
            >
              Masquer les alternatives
            </button>
          )}
        </div>
      ) : null}

      {openMealSwap && canEdit ? (
        <div
          ref={swapSectionRef}
          className="space-y-2 rounded-2xl border border-brand-200/80 bg-gradient-to-b from-brand-50 to-white p-3 shadow-inner scroll-mt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))]"
        >
          <p className="text-eyebrow text-brand-900">Alternatives SOPK</p>
          {alternatives.length === 0 ? (
            <p className="text-[11px] text-brand-800/80">Aucune alternative pour vos filtres.</p>
          ) : (
            alternatives.map((alt) => (
              <button
                key={alt.nom}
                type="button"
                onClick={() => {
                  onSetMealOverride(mealKey, catalogMealOverride(alt, "manual"));
                  onToggleSwap();
                }}
                className="flex w-full items-center justify-between rounded-lg bg-white px-2.5 py-2 text-left text-[12px] text-slate-800 shadow-sm ring-1 ring-brand-100"
              >
                <span className="min-w-0 pr-2 font-medium">{alt.nom}</span>
                <span className="shrink-0 tabular-nums text-slate-500">{alt.calories} kcal</span>
              </button>
            ))
          )}
          <div className="mt-2 border-t border-brand-100 pt-2">
            <p className="text-caption font-semibold text-brand-900">Autre repas équivalent personnalisé</p>
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={customMealDraft.label}
                onChange={(e) => onCustomMealDraftChange({ ...customMealDraft, label: e.target.value })}
                placeholder="Ex. resto, bowl maison…"
                className="w-full rounded-lg border border-brand-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 outline-none ring-brand-300 focus:ring-2"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={1500}
                  value={customMealDraft.kcal}
                  onChange={(e) => onCustomMealDraftChange({ ...customMealDraft, kcal: e.target.value })}
                  className="w-24 rounded-lg border border-brand-200 bg-white px-2.5 py-2 text-[12px] tabular-nums text-slate-900 outline-none ring-brand-300 focus:ring-2"
                />
                <span className="text-[11px] text-slate-500">kcal · menu {plannedMeal.calories}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const kcal = Number(customMealDraft.kcal);
                  if (!Number.isFinite(kcal) || kcal < 50 || kcal > 1500) return;
                  onSetMealOverride(mealKey, customMealOverride(customMealDraft.label, kcal));
                  onToggleSwap();
                }}
                className="w-full rounded-lg bg-brand-600 py-2 text-[12px] font-semibold text-white"
              >
                Enregistrer cet autre repas
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
