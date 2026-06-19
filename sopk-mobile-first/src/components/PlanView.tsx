import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";

import { useCapacitorPublicAsset } from "@/hooks/useCapacitorPublicAsset";

import {
  getDailyWalkingRecommendation,
  getMealCaloriesForTarget,
  getMealPlan,
  getPersonalizedCalories,
  getPersonalizedHydrationLiters,
  getProgramDayCount,
  getTodayJourInProgram,
  parcoursHorizonLabel,
} from "@/utils/mealPlan";
import { fetchTodayStepCount, type HealthStepsResult } from "@/utils/healthSteps";
import { STORAGE_KEYS, todayIso, todayIsoLocal } from "@/utils/storage";
import { getMealPortionDetailsAdjusted } from "@/utils/meal-portions";
import {
  manualValidationKey,
  mealKey,
  stepsProgressStorageKey,
  visibleMealIndices,
  waterProgressStorageKey,
} from "@/utils/planTracking";
import { buildSevenDayShoppingList, formatGrammesShopping } from "@/utils/shoppingList";
import { computePlanDayWeightSnapshot, computeProgramWeightCurveSeries, formatWeightKg } from "@/utils/weightSummary";
import {
  WATER_GLASS_ML,
  WATER_STEP_ML,
  formatLitersFr,
  formatLitersFrFromMl,
  snapWaterStepMl,
  waterProgressPercent,
  waterTargetVerres,
} from "@/utils/waterDisplay";
import {
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";

import { DayCelebrationFireworks } from "./DayCelebrationFireworks";
import { ProgramProgressCurve } from "./ProgramProgressCurve";
import { SectionCard } from "./SectionCard";

const MOIS_FR = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."] as const;

function programDayToDateLabel(programDay: number, programStartDateIso?: string | null): string {
  const start = programStartDateIso?.trim();
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return `Jour ${programDay}`;
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (programDay - 1));
  return `${date.getDate()} ${MOIS_FR[date.getMonth()]}`;
}

export { programDayToDateLabel };

interface PlanViewProps {
  profile: OnboardingData;
  mealChecklist: MealChecklistState;
  waterProgress: WaterProgressState;
  stepProgress: StepProgressState;
  onUpdateWaterProgress: (key: string, value: number) => void;
  onUpdateStepProgress: (key: string, value: number) => void;
  onToggleMeal: (key: string) => void;
  /** Quand le jour actif du programme vient d’être entièrement validé : avancer le « jour Aujourd’hui ». */
  onActiveProgramDayFullyValidated?: () => void;
  goToDay?: { jour: number; ts: number } | null;
}

function nativeHealthStepsLabel(): string | null {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "Apple Santé";
  if (p === "android") return "Health Connect";
  return null;
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

type MealImageType = keyof typeof mealImageByType;

function MealTypeImage({ type }: { type: MealImageType }) {
  const src = useCapacitorPublicAsset(mealImageByType[type]);
  return (
    <Image
      src={src}
      alt=""
      width={96}
      height={96}
      className="h-12 w-12 shrink-0 rounded-xl object-cover"
    />
  );
}

export function PlanView({
  profile,
  mealChecklist,
  waterProgress,
  stepProgress,
  onUpdateWaterProgress,
  onUpdateStepProgress,
  onToggleMeal,
  onActiveProgramDayFullyValidated,
  goToDay,
}: PlanViewProps) {
  const formatLossEstimate = useCallback((grams: number) => {
    if (grams >= 1000) return `-${(grams / 1000).toFixed(2)} kg`;
    return `-${Math.round(grams)} g`;
  }, []);

  const data = useMemo(() => getMealPlan({ parcoursPerte: profile.parcoursPerte }), [profile.parcoursPerte]);
  const dayCount = getProgramDayCount(profile.parcoursPerte);
  const mealVisibleIdx = useMemo(() => visibleMealIndices(profile.rythmeRepas), [profile.rythmeRepas]);
  /** Jour du plan (1…N) depuis la date de début ; aligné sur la journée civile pour les pas Santé. */
  const todayJour = useMemo(
    () => getTodayJourInProgram(dayCount, profile.programStartDateIso),
    [dayCount, profile.programStartDateIso],
  );

  const todayPickerIndex = useMemo(() => {
    const idx = data.jours.findIndex((d) => d.jour === todayJour);
    return idx >= 0 ? idx : 0;
  }, [data.jours, todayJour]);

  const bilanSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    Math.max(
      0,
      getTodayJourInProgram(getProgramDayCount(profile.parcoursPerte), profile.programStartDateIso) - 1,
    ),
  );
  const programEpochRef = useRef({
    start: profile.programStartDateIso,
    epoch: profile.trackingResetEpoch ?? 0,
  });
  useEffect(() => {
    const start = profile.programStartDateIso;
    const epoch = profile.trackingResetEpoch ?? 0;
    const prev = programEpochRef.current;
    if (prev.start === start && prev.epoch === epoch) return;
    programEpochRef.current = { start, epoch };
    const tj = getTodayJourInProgram(dayCount, profile.programStartDateIso);
    setSelectedDayIndex(Math.max(0, Math.min(data.jours.length - 1, tj - 1)));
  }, [data.jours.length, dayCount, profile.programStartDateIso, profile.trackingResetEpoch]);
  const parcoursHorizonRef = useRef(profile.parcoursPerte);
  useEffect(() => {
    if (parcoursHorizonRef.current !== profile.parcoursPerte) {
      parcoursHorizonRef.current = profile.parcoursPerte;
      const tj = getTodayJourInProgram(getProgramDayCount(profile.parcoursPerte), profile.programStartDateIso);
      setSelectedDayIndex(Math.max(0, Math.min(data.jours.length - 1, tj - 1)));
    }
  }, [profile.parcoursPerte, profile.programStartDateIso, data.jours.length]);

  useEffect(() => {
    if (goToDay == null) return;
    const idx = data.jours.findIndex((d) => d.jour === goToDay.jour);
    if (idx >= 0) setSelectedDayIndex(idx);
  }, [goToDay, data.jours]);

  const lastCalendarIsoRef = useRef(todayIso());
  useEffect(() => {
    const bumpIfNewDay = () => {
      const now = todayIso();
      if (now === lastCalendarIsoRef.current) return;
      lastCalendarIsoRef.current = now;
      const tj = getTodayJourInProgram(dayCount, profile.programStartDateIso);
      setSelectedDayIndex((prev) => {
        const next = Math.max(0, Math.min(data.jours.length - 1, tj - 1));
        return next === prev ? prev : next;
      });
    };
    const id = window.setInterval(bumpIfNewDay, 45_000);
    document.addEventListener("visibilitychange", bumpIfNewDay);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", bumpIfNewDay);
    };
  }, [dayCount, data.jours.length, profile.programStartDateIso]);

  const selectedDay = data.jours[selectedDayIndex] ?? data.jours[0];
  /** Journée civile → un seul jour du programme reçoit les pas Apple / Health Connect. */
  const healthStepsTargetProgramDay = todayJour;
  const isStepsHealthSyncDay = selectedDay.jour === healthStepsTargetProgramDay;
  const [editablePastDayJour, setEditablePastDayJour] = useState<number | null>(null);
  const isPastProgramDay = selectedDay.jour < todayJour;
  /** Jour modifiable : aujourd'hui, ou un jour passé explicitement déverrouillé. */
  const canValidateSelectedDay =
    selectedDay.jour === todayJour || (isPastProgramDay && editablePastDayJour === selectedDay.jour);
  const isFutureProgramDay = selectedDay.jour > todayJour;

  useEffect(() => {
    if (selectedDay.jour >= todayJour && editablePastDayJour != null) {
      setEditablePastDayJour(null);
    }
  }, [selectedDay.jour, todayJour, editablePastDayJour]);

  const onUpdateStepProgressRef = useRef(onUpdateStepProgress);

  useEffect(() => {
    onUpdateStepProgressRef.current = onUpdateStepProgress;
  }, [onUpdateStepProgress]);

  const [healthStepsMessage, setHealthStepsMessage] = useState<string | null>(null);
  const [healthStepsBusy, setHealthStepsBusy] = useState(false);

  useEffect(() => {
    setHealthStepsMessage(null);
  }, [selectedDay.jour]);

  const syncStepsFromDevice = useCallback(
    async (
      requestPermission: boolean,
      options?: { silent?: boolean }
    ): Promise<HealthStepsResult | null> => {
      if (Capacitor.getPlatform() === "web") return null;
      const silent = options?.silent ?? false;
      if (requestPermission && !silent) {
        setHealthStepsBusy(true);
        setHealthStepsMessage(null);
      }
      try {
        const result = await fetchTodayStepCount({ requestIfNeeded: requestPermission });
        if (!result.ok) {
          if (requestPermission && !silent) {
            if (result.reason === "denied") {
              setHealthStepsMessage(
                "Accès refusé : activez les pas pour Régime SOPK dans Réglages → Confidentialité et sécurité → Santé.",
              );
            } else if (result.reason === "no_data") {
              setHealthStepsMessage("Aucun pas enregistré pour aujourd’hui dans Santé, ou accès incomplet.");
            } else if (result.reason === "unavailable") {
              setHealthStepsMessage("Santé indisponible sur cet appareil.");
            } else if (result.reason === "error") {
              setHealthStepsMessage(result.message ?? "Synchronisation impossible pour le moment.");
            }
          }
          return result;
        }
        const key = stepsProgressStorageKey(healthStepsTargetProgramDay);
        onUpdateStepProgressRef.current(key, result.steps);
        if (requestPermission && !silent && isStepsHealthSyncDay) {
          setHealthStepsMessage(
            `${result.steps.toLocaleString("fr-FR")} pas importés pour le jour ${healthStepsTargetProgramDay}${
              nativeHealthStepsLabel() ? ` (${nativeHealthStepsLabel()})` : ""
            }.`,
          );
        }
        return result;
      } finally {
        if (requestPermission && !silent) {
          setHealthStepsBusy(false);
        }
      }
    },
    [healthStepsTargetProgramDay, isStepsHealthSyncDay],
  );

  useEffect(() => {
    if (Capacitor.getPlatform() === "web") return undefined;

    const pollMs = Capacitor.getPlatform() === "ios" ? 45_000 : 90_000;

    const runSilent = () => {
      void syncStepsFromDevice(false, { silent: true });
    };

    let cancelled = false;
    void (async () => {
      let promptShown = false;
      try {
        promptShown = window.localStorage.getItem(STORAGE_KEYS.healthStepsPromptShown) === "1";
      } catch {
        promptShown = false;
      }
      const firstRequest = !promptShown;
      const res = await syncStepsFromDevice(firstRequest, { silent: true });
      if (cancelled) return;
      if (firstRequest) {
        try {
          window.localStorage.setItem(STORAGE_KEYS.healthStepsPromptShown, "1");
        } catch {
          /* ignore */
        }
      }
      if (res?.ok && firstRequest && isStepsHealthSyncDay) {
        setHealthStepsMessage(
          `Pas mis à jour depuis ${nativeHealthStepsLabel() ?? "Santé"} pour le jour ${healthStepsTargetProgramDay} (synchro automatique).`,
        );
      } else if (firstRequest && res && !res.ok && res.reason === "denied") {
        setHealthStepsMessage(
          "Pour afficher vos pas automatiquement, autorisez l’accès à Santé dans Réglages → Confidentialité → Santé → Régime SOPK.",
        );
      }
    })();

    const interval = window.setInterval(runSilent, pollMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(runSilent, 0);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncStepsFromDevice, todayJour, isStepsHealthSyncDay, healthStepsTargetProgramDay]);

  const [openMealDetails, setOpenMealDetails] = useState<Record<string, boolean>>({});
  const [showDayCelebration, setShowDayCelebration] = useState(false);
  const [celebrationBurstKey, setCelebrationBurstKey] = useState(0);
  const previousIsDayValidatedRef = useRef<boolean>(false);
  const wasDayValidatedForBumpRef = useRef<boolean | null>(null);
  const validatedBumpKeyRef = useRef<string | null>(null);
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
  const waterTargetMl = Math.round(personalizedHydrationLiters * 1000);
  const waterProgressKey = waterProgressStorageKey(selectedDay.jour);
  const waterRawMl = Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0));
  const waterSliderMl = Math.min(waterTargetMl, snapWaterStepMl(waterRawMl));
  const waterPercent = waterProgressPercent(waterRawMl, waterTargetMl);
  const waterChecked = waterRawMl >= waterTargetMl;
  const verresCible = waterTargetVerres(waterTargetMl);
  const verresBus = Math.max(0, Math.round(waterRawMl / WATER_GLASS_ML));

  /** Anciennes saisies : aligner sur le pas du curseur (10 cl). */
  const normalizedWaterKeysRef = useRef<Set<string>>(new Set());
  useLayoutEffect(() => {
    if (!canValidateSelectedDay) return;
    if (normalizedWaterKeysRef.current.has(waterProgressKey)) return;
    const raw = Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0));
    const snapped = snapWaterStepMl(raw);
    if (raw !== snapped) {
      onUpdateWaterProgress(waterProgressKey, snapped);
      return;
    }
    normalizedWaterKeysRef.current.add(waterProgressKey);
  }, [canValidateSelectedDay, waterProgressKey, waterProgress, onUpdateWaterProgress]);
  const walkingChecked = stepsCurrent >= stepsTarget;
  const checkedMealIndexes = mealVisibleIdx.filter(
    (i) => i < selectedDay.repas.length && mealChecklist[mealKey(selectedDay.jour, i)]
  );
  const checkedMeals = checkedMealIndexes.length;
  const mealSlots = mealVisibleIdx.filter((i) => i < selectedDay.repas.length).length;
  const checkedToday = checkedMeals + (waterChecked ? 1 : 0) + (walkingChecked ? 1 : 0);
  const totalTasks = mealSlots + 2;
  const dayManuallyValidated = Boolean(mealChecklist[manualValidationKey(selectedDay.jour)]);
  const isDayValidated = checkedToday === totalTasks || dayManuallyValidated;
  const isDayValidatedRef = useRef(isDayValidated);
  isDayValidatedRef.current = isDayValidated;

  /** Reprise du contexte jour / programme : ne pas dépendre des cibles eau/pas ou du nombre de tâches, sinon le même rendu qu’une validation complète écrase la transition (plus de feux d’artifice ni scroll vers le bilan). */
  useEffect(() => {
    wasDayValidatedForBumpRef.current = isDayValidated;
    validatedBumpKeyRef.current = null;
    setShowDayCelebration(false);
    previousIsDayValidatedRef.current = isDayValidated;
  }, [
    selectedDay.jour,
    data.jours.length,
    profile.parcoursPerte,
    profile.programStartDateIso,
    profile.trackingResetEpoch,
    profile.rythmeRepas,
  ]);

  useEffect(() => {
    if (wasDayValidatedForBumpRef.current === null) {
      wasDayValidatedForBumpRef.current = isDayValidated;
      return;
    }
    wasDayValidatedForBumpRef.current = isDayValidated;
  }, [isDayValidated]);

  const prevTodayJourForSelectionRef = useRef(todayJour);
  useEffect(() => {
    if (todayJour > prevTodayJourForSelectionRef.current) {
      const idx = data.jours.findIndex((d) => d.jour === todayJour);
      if (idx >= 0) {
        setSelectedDayIndex(idx);
      }
    }
    prevTodayJourForSelectionRef.current = todayJour;
  }, [todayJour, data.jours]);

  const weightSnap = useMemo(
    () =>
      computePlanDayWeightSnapshot(
        profile,
        data.jours,
        selectedDay.jour,
        mealChecklist,
        waterProgress,
        stepProgress,
      ),
    [profile, data.jours, selectedDay.jour, mealChecklist, waterProgress, stepProgress],
  );
  const weightCurveSeries = useMemo(
    () => computeProgramWeightCurveSeries(profile, data.jours, mealChecklist, waterProgress, stepProgress),
    [profile, data.jours, mealChecklist, waterProgress, stepProgress],
  );
  const shoppingList7 = useMemo(
    () => buildSevenDayShoppingList(profile, data.jours, todayJour),
    [profile, data.jours, todayJour],
  );
  const { currentWeightKg, dailyLossPercent } = weightSnap;
  const estimatedLossLabel = formatLossEstimate(weightSnap.estimatedLossGrams);
  const projectedLossLabel = formatLossEstimate(weightSnap.projectedLossGrams);
  const missedLossGrams = Math.max(0, weightSnap.projectedLossGrams - weightSnap.estimatedLossGrams);
  const missedLossLabel = formatLossEstimate(missedLossGrams);
  const dailyLossTone =
    dailyLossPercent >= 90
      ? "emerald"
      : dailyLossPercent >= 60
        ? "amber"
        : "rose";
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

  const scrollToBilan = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        bilanSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

  /**
   * Journée entière validée (repas + eau + pas) :
   *   1. Feux d'artifice « Bravo ! » (3 s)
   *   2. Scroll vers le bilan
   *   3. Attente 5 s pour lire le bilan
   *   4. Avancement auto au jour suivant (via onActiveProgramDayFullyValidated)
   */
  useEffect(() => {
    if (!canValidateSelectedDay || selectedDay.jour !== todayJour || mealSlots === 0) {
      return;
    }

    const wasValidated = previousIsDayValidatedRef.current;
    const justBecameValidated = isDayValidated && !wasValidated;
    previousIsDayValidatedRef.current = isDayValidated;

    if (!justBecameValidated) {
      return;
    }

    if (dayManuallyValidated) {
      scrollToBilan();
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    setCelebrationBurstKey((k) => k + 1);
    setShowDayCelebration(true);

    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      setShowDayCelebration(false);
      scrollToBilan();
    }, 3000) as unknown as number);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      setShowDayCelebration(false);
    };
  }, [
    dayManuallyValidated,
    isDayValidated,
    canValidateSelectedDay,
    mealSlots,
    scrollToBilan,
    selectedDay.jour,
    todayJour,
  ]);

  const dateLabel = programDayToDateLabel(selectedDay.jour, profile.programStartDateIso);

  return (
    <div className="space-y-3">
      {/* ── Courbe de progression ── */}
      <SectionCard title="Progression">
        {weightCurveSeries.length === 0 ? (
          <p className="text-sm text-slate-400">Pas encore de données.</p>
        ) : (
          <ProgramProgressCurve points={weightCurveSeries} todayJour={todayJour} startWeightKg={profile.poidsKg} goalWeightKg={weightSnap.programPotentialWeightKg} showHeading={false} />
        )}
      </SectionCard>

      {/* ── Bandeau "tu consultes un autre jour" ── */}
      {selectedDay.jour !== todayJour ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-2.5">
          <p className="text-[13px] text-amber-900">
            <strong>{dateLabel}</strong> <span className="text-amber-700/80">(jour {selectedDay.jour})</span>
          </p>
          <button
            type="button"
            onClick={() => setSelectedDayIndex(todayPickerIndex)}
            className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-[12px] font-semibold text-white transition active:scale-95"
          >
            Aujourd&apos;hui
          </button>
        </div>
      ) : null}

      {/* ── En-tête du jour ── */}
      <div
        ref={bilanSectionRef}
        className="scroll-mt-[max(5.5rem,calc(env(safe-area-inset-top,0px)+4.25rem))]"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm">
          {/* Status bar */}
          <div className={`px-4 py-3 ${isDayValidated ? "bg-emerald-50/80" : "bg-slate-50/60"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold tracking-tight text-slate-900">
                  {dateLabel} <span className="font-normal text-slate-400">·</span> <span className="text-slate-500">Jour {selectedDay.jour}</span>
                </p>
                <p className={`mt-0.5 text-[13px] ${isDayValidated ? "text-emerald-700" : "text-slate-500"}`}>
                  {isDayValidated ? "Journée validée" : `${checkedToday}/${totalTasks} actions`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-bold tabular-nums tracking-tight text-slate-900">
                  {formatWeightKg(currentWeightKg)}<span className="text-[13px] font-medium text-slate-400"> kg</span>
                </p>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDayValidated
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-violet-500 to-violet-400"
                }`}
                style={{ width: `${dailyLossPercent}%` }}
              />
            </div>

            {isDayValidated ? (
              <div className="mt-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2">
                <p className="text-[12px] font-semibold text-emerald-900">
                  Estimation perte du jour: <span className="tabular-nums">{estimatedLossLabel}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  Objectif complet: <span className="tabular-nums">{projectedLossLabel}</span>
                  {missedLossGrams > 0 ? (
                    <>
                      {" "}· écart estimé: <span className="tabular-nums">{missedLossLabel}</span>
                    </>
                  ) : null}
                </p>
                {dayManuallyValidated ? (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Validation manuelle: calcul basé sur actions faites ({checkedToday}/{totalTasks}) et niveaux eau/pas.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isPastProgramDay ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!canValidateSelectedDay ? (
                  <button
                    type="button"
                    onClick={() => setEditablePastDayJour(selectedDay.jour)}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Modifier cette journée
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditablePastDayJour(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Verrouiller la journée
                  </button>
                )}
                <p className="text-[12px] text-slate-500">
                  {canValidateSelectedDay ? "Mode édition activé pour ce jour passé." : "Jour passé verrouillé."}
                </p>
              </div>
            ) : null}

            {!canValidateSelectedDay ? (
              <p className="mt-2 text-[12px] text-amber-700">
                {selectedDay.jour < todayJour
                  ? "Jour passé — active \"Modifier cette journée\" pour consigner après coup."
                  : "Jour à venir — non modifiable."}
              </p>
            ) : null}

            {!isDayValidated && canValidateSelectedDay ? (
              <button
                type="button"
                onClick={() => onToggleMeal(manualValidationKey(selectedDay.jour))}
                className="mt-2.5 w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98]"
              >
                Valider la journée
              </button>
            ) : isDayValidated && dayManuallyValidated && canValidateSelectedDay ? (
              <button
                type="button"
                onClick={() => onToggleMeal(manualValidationKey(selectedDay.jour))}
                className="mt-2 text-[12px] font-medium text-slate-500 transition hover:text-slate-700"
              >
                Annuler la validation
              </button>
            ) : null}
          </div>

          {/* Badges résumé */}
          <div className="flex gap-2 border-t border-slate-100/80 px-4 py-2.5">
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[12px] font-medium text-violet-700">
              {dailyTarget} kcal
            </span>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[12px] font-medium text-cyan-700">
              {formatLitersFr(personalizedHydrationLiters)}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
              {walking.steps} pas
            </span>
          </div>
        </div>
      </div>

      {/* ── Eau & Pas côte à côte ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Eau */}
        <div className={`rounded-2xl border p-3.5 transition ${
          waterChecked ? "border-emerald-300/60 bg-emerald-50/60" : "border-slate-200/60 bg-white/80"
        }`}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Eau</p>
            {waterChecked ? (
              <span className="text-[11px] font-semibold text-emerald-600">Atteint</span>
            ) : null}
          </div>
          <p className="mt-1 text-[22px] font-bold tabular-nums tracking-tight text-cyan-600">
            {formatLitersFrFromMl(waterRawMl)}
          </p>
          <p className="text-[11px] text-slate-400">sur {formatLitersFrFromMl(waterTargetMl)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-400 transition-all duration-300" style={{ width: `${waterPercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={waterTargetMl}
            step={WATER_STEP_ML}
            value={waterSliderMl}
            disabled={!canValidateSelectedDay}
            onChange={(e) => {
              const next = Math.min(waterTargetMl, Math.max(0, Number(e.target.value)));
              onUpdateWaterProgress(waterProgressKey, next);
            }}
            className="mt-2 w-full accent-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        {/* Pas */}
        <div className={`rounded-2xl border p-3.5 transition ${
          walkingChecked ? "border-emerald-300/60 bg-emerald-50/60" : "border-slate-200/60 bg-white/80"
        }`}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Pas</p>
            {walkingChecked ? (
              <span className="text-[11px] font-semibold text-emerald-600">Atteint</span>
            ) : null}
          </div>
          <p className="mt-1 text-[22px] font-bold tabular-nums tracking-tight text-emerald-600">
            {stepsCurrent.toLocaleString("fr-FR")}
          </p>
          <p className="text-[11px] text-slate-400">sur {stepsTarget.toLocaleString("fr-FR")}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${stepsPercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={stepsTarget}
            step={100}
            value={stepsCurrent}
            disabled={!canValidateSelectedDay}
            onChange={(e) => {
              const next = Number(e.target.value);
              onUpdateStepProgress(stepsProgressKey, next);
            }}
            className="mt-2 w-full accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
          {Capacitor.getPlatform() !== "web" && nativeHealthStepsLabel() && isStepsHealthSyncDay ? (
            <button
              type="button"
              disabled={healthStepsBusy}
              onClick={() => void syncStepsFromDevice(true)}
              className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-[11px] font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              {healthStepsBusy ? "..." : `Sync ${nativeHealthStepsLabel()}`}
            </button>
          ) : null}
          {healthStepsMessage ? (
            <p className="mt-1 text-[10px] font-medium text-emerald-700">{healthStepsMessage}</p>
          ) : null}
        </div>
      </div>

      {/* ── Repas ── */}
      <SectionCard title="Repas" noPadding>
        <div className="divide-y divide-slate-100/80">
          {isFutureProgramDay ? (
            <p className="px-4 py-2.5 text-[12px] text-amber-700 bg-amber-50/60">
              Aperçu — les repas ne sont pas encore modifiables.
            </p>
          ) : null}
          {mealVisibleIdx
            .filter((index) => index < selectedDay.repas.length)
            .map((index) => {
            const meal = selectedDay.repas[index];
            const key = mealKey(selectedDay.jour, index);
            const checked = Boolean(mealChecklist[key]);
            const adjustedMealKcal = getMealCaloriesForTarget(meal.calories, selectedDay, dailyTarget);
            const kcalRatio = adjustedMealKcal / meal.calories;
            const portionDetails = getMealPortionDetailsAdjusted(
              meal.nom,
              kcalRatio,
              { ...profile, objectifKcalJour: dailyTarget },
              meal.type,
              meal.calories,
            );

            return (
              <article
                key={key}
                className={`flex gap-3 px-4 py-3 transition ${checked ? "bg-emerald-50/50" : ""}`}
              >
                <MealTypeImage type={meal.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900">{meal.nom}</p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {labelByType[meal.type]} · {mealTimeByType[meal.type]} · {adjustedMealKcal} kcal
                      </p>
                    </div>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={!canValidateSelectedDay}
                      onClick={() => { if (canValidateSelectedDay) onToggleMeal(key); }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-violet-400"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMealDetails((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="mt-1.5 text-[12px] font-medium text-violet-600 transition hover:text-violet-800"
                  >
                    {openMealDetails[key] ? "Masquer" : "Portions"}
                  </button>
                  {openMealDetails[key] ? (
                    <div className="mt-1.5 rounded-xl bg-slate-50/80 p-2.5 text-[12px] text-slate-600">
                      {portionDetails.ingredients.length > 0 ? (
                        <ul className="space-y-0.5">
                          {portionDetails.ingredients.map((item) => (
                            <li key={`${item.aliment}-${item.grammes}`} className="flex justify-between">
                              <span>{item.aliment}</span>
                              <span className="tabular-nums font-medium text-slate-800">{item.displayLine ? item.displayLine.split(":").pop()?.trim() : `${item.grammes} g`}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Détail non disponible.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      {showDayCelebration ? <DayCelebrationFireworks burstKey={celebrationBurstKey} title="Bravo !" /> : null}
    </div>
  );
}
