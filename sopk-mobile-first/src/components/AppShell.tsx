"use client";

import { useEffect, useMemo, useState } from "react";

import { AppleSignInCard } from "@/components/AppleSignInCard";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PlanView } from "@/components/PlanView";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getDailyWalkingRecommendation,
  getEstimatedDailyLossGrams,
  getMealPlan,
  getPersonalizedHydrationLiters,
} from "@/utils/mealPlan";
import { STORAGE_KEYS, todayIso } from "@/utils/storage";
import {
  DailyTrackingData,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  AuthSession,
  WaterProgressState,
} from "@/utils/types";

const initialTracking: DailyTrackingData = {
  date: todayIso(),
  humeur: 3,
  energie: 3,
  fringales: 3,
  sommeilHeures: 7,
  pas: 6000,
  repasSuivis: false,
};

const fallbackProfile: OnboardingData = {
  prenom: "Johana",
  age: 30,
  poidsKg: 78,
  tailleCm: 165,
  parcoursPerte: "modere",
};

function parseProfileFromUrl(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const prenom = params.get("prenom") ?? "Johana";
  const age = Number(params.get("age"));
  const poidsKg = Number(params.get("poidsKg"));
  const tailleCm = Number(params.get("tailleCm"));
  const parcoursPerte = (params.get("parcoursPerte") as OnboardingData["parcoursPerte"] | null) ?? "modere";
  if (!Number.isFinite(age) || !Number.isFinite(poidsKg) || !Number.isFinite(tailleCm)) return null;

  return {
    prenom,
    age,
    poidsKg,
    tailleCm,
    parcoursPerte,
  };
}

interface AppShellProps {
  forcePlan?: boolean;
}

export function AppShell({ forcePlan = false }: AppShellProps) {
  const profileFromUrl = parseProfileFromUrl();
  const authStore = useLocalStorage<AuthSession | null>(STORAGE_KEYS.authSession, null);
  const profileStore = useLocalStorage<OnboardingData | null>(STORAGE_KEYS.onboarding, null);
  const [runtimeProfile, setRuntimeProfile] = useState<OnboardingData | null>(profileStore.value ?? profileFromUrl);
  const [screen, setScreen] = useState<"onboarding" | "plan">(() => {
    if (forcePlan) {
      return "plan";
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("plan") === "1" || window.location.hash === "#plan") {
        return "plan";
      }
    }
    if (typeof window !== "undefined" && window.location.hash === "#plan") {
      return "plan";
    }
    return profileStore.value || profileFromUrl ? "plan" : "onboarding";
  });
  const trackingStore = useLocalStorage<DailyTrackingData>(STORAGE_KEYS.tracking, initialTracking);
  const hydrationStore = useLocalStorage<number>(STORAGE_KEYS.hydrationMl, 0);
  const hydrationDateStore = useLocalStorage<string>(STORAGE_KEYS.hydrationDate, todayIso());
  const mealChecklistStore = useLocalStorage<MealChecklistState>(STORAGE_KEYS.mealChecklist, {});
  const waterProgressStore = useLocalStorage<WaterProgressState>(STORAGE_KEYS.waterProgress, {});
  const stepProgressStore = useLocalStorage<StepProgressState>(STORAGE_KEYS.stepProgress, {});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => {
      if (window.location.hash === "#plan") {
        setScreen("plan");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      return undefined;
    });
  }, []);

  useEffect(() => {
    const today = todayIso();

    if (trackingStore.value.date !== today) {
      trackingStore.update({ ...initialTracking, date: today });
    }

    if (hydrationDateStore.value !== today) {
      hydrationDateStore.update(today);
      hydrationStore.update(0);
    }
  }, [hydrationDateStore, hydrationStore, trackingStore]);

  const headerTitle = useMemo(() => {
    return "Régime SOPK";
  }, []);

  if (!authStore.value) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center bg-[#f7f7ff] p-4 md:p-6">
        <AppleSignInCard
          onAuthenticated={(session) => {
            authStore.update(session);
          }}
        />
      </main>
    );
  }

  const activeProfile = runtimeProfile ?? profileStore.value ?? profileFromUrl;

  if (screen === "onboarding") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-[#f7f7ff] p-4 pb-20 pt-8 md:p-6">
        <OnboardingForm
          onComplete={(profile) => {
            setRuntimeProfile(profile);
            profileStore.update(profile);
            setScreen("plan");
          }}
        />
      </main>
    );
  }

  const displayedProfile = activeProfile ?? fallbackProfile;
  const plan = getMealPlan();
  const projectedDailyLossGrams = getEstimatedDailyLossGrams(displayedProfile, 1, 1, 1);
  const walkingTargetSteps = getDailyWalkingRecommendation(displayedProfile).steps;
  const achievedLosses = plan.jours
    .map((day) => {
      const dayMealIndexes = day.repas.map((_, i) => i).filter((i) => mealChecklistStore.value[mealKey(day.jour, i)]);
      const dayWaterValue = Math.round(waterProgressStore.value[waterProgressStorageKey(day.jour)] ?? 0);
      const dayStepValue = Math.round(stepProgressStore.value[stepsProgressStorageKey(day.jour)] ?? 0);
      const dayWaterTarget = Math.round(getPersonalizedHydrationLiters(day.hydratationLitres, displayedProfile) * 1000);
      const dayWaterChecked = dayWaterValue >= dayWaterTarget;
      const dayWalkingChecked = dayStepValue >= walkingTargetSteps;
      const dayWaterRatio = dayWaterTarget > 0 ? Math.min(1, Math.max(0, dayWaterValue / dayWaterTarget)) : 0;
      const dayStepsRatio = walkingTargetSteps > 0 ? Math.min(1, Math.max(0, dayStepValue / walkingTargetSteps)) : 0;
      const dayChecked = dayMealIndexes.length + (dayWaterChecked ? 1 : 0) + (dayWalkingChecked ? 1 : 0);
      const dayTotal = day.repas.length + 2;
      const dayRatio = dayTotal > 0 ? dayChecked / dayTotal : 0;
      const dayManuallyValidated = Boolean(mealChecklistStore.value[manualValidationKey(day.jour)]);
      const isActiveDay =
        dayMealIndexes.length > 0 ||
        dayWaterChecked ||
        dayWalkingChecked ||
        dayWaterValue > 0 ||
        dayStepValue > 0 ||
        dayManuallyValidated;

      if (!isActiveDay) return null;
      return getEstimatedDailyLossGrams(displayedProfile, dayRatio, dayWaterRatio, dayStepsRatio);
    })
    .filter((value): value is number => value !== null);
  const achievedCumulativeGrams = achievedLosses.reduce((sum, value) => sum + value, 0);
  const currentWeightKg = Math.max(0, displayedProfile.poidsKg - achievedCumulativeGrams / 1000);
  const joursRestantsProgramme = Math.max(0, plan.jours.length - achievedLosses.length);
  const projectedProgramLossKg = (projectedDailyLossGrams * joursRestantsProgramme) / 1000;
  const programTargetWeightKg = Math.max(0, currentWeightKg - projectedProgramLossKg);
  const objectiveLabel =
    displayedProfile.parcoursPerte === "radical"
      ? "Court-terme"
      : displayedProfile.parcoursPerte === "modere"
        ? "Moyen-terme"
        : "Long-terme";

  function updateParcoursPerte(nextParcours: OnboardingData["parcoursPerte"]) {
    const nextProfile: OnboardingData = {
      ...displayedProfile,
      parcoursPerte: nextParcours,
    };
    setRuntimeProfile(nextProfile);
    profileStore.update(nextProfile);
  }

  function resetProgramData() {
    if (!window.confirm("Reset du programme: supprimer toutes les données de suivi ?")) {
      return;
    }
    trackingStore.update({ ...initialTracking, date: todayIso() });
    hydrationStore.update(0);
    hydrationDateStore.update(todayIso());
    mealChecklistStore.update({});
    waterProgressStore.update({});
    stepProgressStore.update({});
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl bg-[#f7f7ff] p-4 pb-24 pt-[calc(env(safe-area-inset-top)+28px)] md:p-6 lg:p-8">
      <header className="mb-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 p-4 text-white shadow-lg shadow-violet-300/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-bold">{headerTitle}</h1>
            <p className="mt-1 text-sm text-violet-100">
              Programme alimentaire guidé: tu suis les repas, tu coches, c&apos;est tout.
            </p>
            <p className="mt-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-violet-100">
              Profil actif: {displayedProfile.poidsKg} kg - {displayedProfile.tailleCm} cm
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <p className="inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-violet-100">
                Objectif choisi: {objectiveLabel}
              </p>
              <p className="inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-violet-100">
                Potentiel fin de programme (jour 30): ~{programTargetWeightKg.toFixed(1)} kg
              </p>
            </div>
            <div className="mt-2">
              <label className="text-[11px] font-semibold text-violet-100">
                Modifier le programme
                <select
                  value={displayedProfile.parcoursPerte}
                  onChange={(e) => updateParcoursPerte(e.target.value as OnboardingData["parcoursPerte"])}
                  className="mt-1 w-full rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-xs font-semibold text-white outline-none"
                >
                  <option value="radical" className="text-slate-900">
                    Court-terme (résultats rapides, rythme soutenu)
                  </option>
                  <option value="modere" className="text-slate-900">
                    Moyen-terme (équilibre entre rythme et confort)
                  </option>
                  <option value="durable" className="text-slate-900">
                    Long-terme (progressif et durable)
                  </option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex shrink-0 flex-row gap-2 md:flex-col">
            <button
              type="button"
              onClick={resetProgramData}
              className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25 active:scale-[0.98]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Se déconnecter et réinitialiser toutes les données locales ?")) {
                  return;
                }
                authStore.update(null);
                profileStore.update(null);
                trackingStore.update({ ...initialTracking, date: todayIso() });
                hydrationStore.update(0);
                hydrationDateStore.update(todayIso());
                mealChecklistStore.update({});
                waterProgressStore.update({});
                stepProgressStore.update({});
                setRuntimeProfile(null);
                setScreen("onboarding");
                if (typeof window !== "undefined") {
                  window.history.replaceState({}, "", "/");
                }
              }}
              className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25 active:scale-[0.98]"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <PlanView
        profile={displayedProfile}
        mealChecklist={mealChecklistStore.value}
        waterProgress={waterProgressStore.value}
        stepProgress={stepProgressStore.value}
        onUpdateWaterProgress={(key, value) =>
          waterProgressStore.update({
            ...waterProgressStore.value,
            [key]: value,
          })
        }
        onUpdateStepProgress={(key, value) =>
          stepProgressStore.update({
            ...stepProgressStore.value,
            [key]: value,
          })
        }
        onToggleMeal={(key) =>
          mealChecklistStore.update({
            ...mealChecklistStore.value,
            [key]: !mealChecklistStore.value[key],
          })
        }
      />
    </main>
  );
}

function mealKey(day: number, mealIndex: number) {
  return `day-${day}-meal-${mealIndex}`;
}

function waterProgressStorageKey(day: number) {
  return `day-${day}-water-progress`;
}

function stepsProgressStorageKey(day: number) {
  return `day-${day}-steps-progress`;
}

function manualValidationKey(day: number) {
  return `day-${day}-manual-validated`;
}
