"use client";

import { useMemo, useState } from "react";

import { OnboardingData } from "@/utils/types";

interface OnboardingFormProps {
  onComplete: (value: OnboardingData) => void;
}

const defaultProfile: OnboardingData = {
  prenom: "",
  age: 30,
  poidsKg: 78,
  tailleCm: 165,
  objectifPrincipal: "perte_poids",
  niveauActivite: "modere",
  hydratationCibleMl: 2200,
};

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [profile, setProfile] = useState<OnboardingData>(defaultProfile);

  const valid = useMemo(() => {
    return (
      profile.prenom.trim().length >= 2 &&
      profile.age >= 18 &&
      profile.age <= 55 &&
      profile.poidsKg > 40 &&
      profile.poidsKg < 180 &&
      profile.tailleCm > 130 &&
      profile.tailleCm < 210
    );
  }, [profile]);

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Onboarding SOPK</h2>
      <p className="mt-1 text-sm text-slate-600">
        Configure ton profil en 1 minute pour personnaliser ton plan.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium text-slate-700">
          Prénom
          <input
            value={profile.prenom}
            onChange={(e) => setProfile((prev) => ({ ...prev, prenom: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            placeholder="Ex: Léa"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm font-medium text-slate-700">
            Âge
            <input
              type="number"
              value={profile.age}
              onChange={(e) => setProfile((prev) => ({ ...prev, age: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Poids
            <input
              type="number"
              value={profile.poidsKg}
              onChange={(e) => setProfile((prev) => ({ ...prev, poidsKg: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Taille
            <input
              type="number"
              value={profile.tailleCm}
              onChange={(e) => setProfile((prev) => ({ ...prev, tailleCm: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-700">
          Objectif principal
          <select
            value={profile.objectifPrincipal}
            onChange={(e) =>
              setProfile((prev) => ({
                ...prev,
                objectifPrincipal: e.target.value as OnboardingData["objectifPrincipal"],
              }))
            }
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 outline-none focus:border-violet-500"
          >
            <option value="perte_poids">Perte de poids progressive</option>
            <option value="reduction_fringales">Réduction des fringales</option>
            <option value="meilleure_energie">Plus d’énergie quotidienne</option>
            <option value="cycle_plus_regulier">Cycle plus régulier</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Niveau d’activité
          <select
            value={profile.niveauActivite}
            onChange={(e) =>
              setProfile((prev) => ({
                ...prev,
                niveauActivite: e.target.value as OnboardingData["niveauActivite"],
              }))
            }
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 outline-none focus:border-violet-500"
          >
            <option value="faible">Faible</option>
            <option value="modere">Modéré</option>
            <option value="eleve">Élevé</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Objectif hydratation (ml / jour)
          <input
            type="number"
            value={profile.hydratationCibleMl}
            onChange={(e) =>
              setProfile((prev) => ({
                ...prev,
                hydratationCibleMl: Number(e.target.value),
              }))
            }
            className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={() => onComplete(profile)}
        className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Démarrer mon programme
      </button>
    </section>
  );
}
