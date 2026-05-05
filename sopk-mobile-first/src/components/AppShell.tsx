"use client";

import { useEffect, useMemo } from "react";

import { OnboardingForm } from "@/components/OnboardingForm";
import { PlanView } from "@/components/PlanView";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEYS, todayIso } from "@/utils/storage";
import {
  DailyTrackingData,
  MealChecklistState,
  OnboardingData,
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

export function AppShell() {
  const profileStore = useLocalStorage<OnboardingData | null>(STORAGE_KEYS.onboarding, null);
  const trackingStore = useLocalStorage<DailyTrackingData>(STORAGE_KEYS.tracking, initialTracking);
  const hydrationStore = useLocalStorage<number>(STORAGE_KEYS.hydrationMl, 0);
  const hydrationDateStore = useLocalStorage<string>(STORAGE_KEYS.hydrationDate, todayIso());
  const mealChecklistStore = useLocalStorage<MealChecklistState>(STORAGE_KEYS.mealChecklist, {});
  const waterProgressStore = useLocalStorage<WaterProgressState>(STORAGE_KEYS.waterProgress, {});

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        return undefined;
      });
    }
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
    if (!profileStore.value) return "NutriSOPK";
    const name = profileStore.value.prenom;
    return `NutriSOPK · ${name}`;
  }, [profileStore.value]);

  if (!profileStore.value) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-[#f7f7ff] p-4 pb-20">
        <OnboardingForm onComplete={profileStore.update} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#f7f7ff] p-4 pb-24">
      <header className="mb-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 p-4 text-white shadow">
        <p className="text-xs uppercase tracking-wider text-violet-100">Application SOPK</p>
        <h1 className="text-xl font-bold">{headerTitle}</h1>
        <p className="mt-1 text-sm text-violet-100">
          Programme alimentaire guidé: tu suis les repas, tu coches, c&apos;est tout.
        </p>
      </header>

      <PlanView
        profile={profileStore.value}
        mealChecklist={mealChecklistStore.value}
        waterProgress={waterProgressStore.value}
        onUpdateWaterProgress={(key, value) =>
          waterProgressStore.update({
            ...waterProgressStore.value,
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
