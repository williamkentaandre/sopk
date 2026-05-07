"use client";

import { useState } from "react";

import { getEstimatedDailyLossGrams } from "@/utils/mealPlan";
import { OnboardingData } from "@/utils/types";

interface OnboardingFormProps {
  onComplete: (value: OnboardingData) => void;
}

const defaultProfile: OnboardingData = {
  prenom: "Johana",
  age: 30,
  poidsKg: 78,
  tailleCm: 165,
  parcoursPerte: "modere",
};

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [profile, setProfile] = useState<OnboardingData>(defaultProfile);
  const projectedDailyLossGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const projected30DayLossKg = (projectedDailyLossGrams * 30) / 1000;
  const projectedTargetWeightKg = Math.max(0, profile.poidsKg - projected30DayLossKg);
  const paceLabel =
    profile.parcoursPerte === "radical"
      ? "Court-terme"
      : profile.parcoursPerte === "modere"
        ? "Moyen-terme"
        : "Long-terme";

  function handleStart() {
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    const age = Number.isFinite(Number(profile.age)) ? Number(profile.age) : 30;
    const poidsKg = Number.isFinite(Number(profile.poidsKg)) ? Number(profile.poidsKg) : 78;
    const tailleCm = Number.isFinite(Number(profile.tailleCm)) ? Number(profile.tailleCm) : 165;

    onComplete({
      ...profile,
      prenom: "Johana",
      age: Math.min(55, Math.max(18, age)),
      poidsKg: Math.min(180, Math.max(40, poidsKg)),
      tailleCm: Math.min(210, Math.max(130, tailleCm)),
    });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams({
        age: String(Math.min(55, Math.max(18, age))),
        poidsKg: String(Math.min(180, Math.max(40, poidsKg))),
        tailleCm: String(Math.min(210, Math.max(130, tailleCm))),
        parcoursPerte: profile.parcoursPerte,
      });
      window.location.assign(`/plan?${params.toString()}`);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Onboarding SOPK</h2>
      <p className="mt-1 text-sm text-slate-600">
        Configure ton profil en 1 minute pour personnaliser ton plan.
      </p>
      <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3">
        <p className="text-xs font-semibold text-violet-700">Apercu rapide de ton programme</p>
        <p className="mt-1 text-sm text-violet-900">
          Rythme: <span className="font-semibold">{paceLabel}</span>
        </p>
        <p className="mt-2 text-sm text-violet-900">
          Poids atteignable estime (30 jours):{" "}
          <span className="font-semibold">
            ~{formatWeightKg(projectedTargetWeightKg)} kg
          </span>{" "}
          <span className="text-violet-700">
            (-{projected30DayLossKg.toFixed(1)} kg potentiels)
          </span>
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm font-medium text-slate-700">
            Age
            <input
              type="number"
              inputMode="numeric"
              min={18}
              max={55}
              step={1}
              value={profile.age}
              onChange={(e) => setProfile((prev) => ({ ...prev, age: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
            <span className="mt-1 block text-[11px] text-slate-500">18-55 ans</span>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Poids
            <input
              type="number"
              inputMode="numeric"
              min={40}
              max={180}
              step={1}
              value={profile.poidsKg}
              onChange={(e) => setProfile((prev) => ({ ...prev, poidsKg: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
            <span className="mt-1 block text-[11px] text-slate-500">kg</span>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Taille
            <input
              type="number"
              inputMode="numeric"
              min={130}
              max={210}
              step={1}
              value={profile.tailleCm}
              onChange={(e) => setProfile((prev) => ({ ...prev, tailleCm: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
            <span className="mt-1 block text-[11px] text-slate-500">cm</span>
          </label>
        </div>

        <label className="text-sm font-medium text-slate-700">
          Parcours de perte
          <select
            value={profile.parcoursPerte}
            onChange={(e) =>
              setProfile((prev) => ({
                ...prev,
                parcoursPerte: e.target.value as OnboardingData["parcoursPerte"],
              }))
            }
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 outline-none focus:border-violet-500"
          >
            <option value="radical">Court-terme</option>
            <option value="modere">Moyen-terme</option>
            <option value="durable">Long-terme</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleStart}
          className="mt-1 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700"
        >
          Démarrer mon programme
        </button>
      </div>
    </section>
  );
}

function formatWeightKg(value: number) {
  return value.toFixed(1);
}
