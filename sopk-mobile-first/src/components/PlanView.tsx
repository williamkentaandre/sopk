import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

import {
  getDailyWalkingRecommendation,
  getMealPlan,
  getPersonalizedCalories,
  getPersonalizedHydrationLiters,
  getProgramDayCount,
  getTodayJourInProgram,
  parcoursHorizonLabel,
} from "@/utils/mealPlan";
import { fetchTodayStepCount, type HealthStepsResult } from "@/utils/healthSteps";
import { STORAGE_KEYS, todayIso } from "@/utils/storage";
import {
  mealKey,
  stepsProgressStorageKey,
  visibleMealIndices,
  waterProgressStorageKey,
} from "@/utils/planTracking";
import { countValidatedDayStreak } from "@/utils/dayValidation";
import { computePlanDayWeightSnapshot, computeProgramGoalWeightKg, computeProgramWeightCurveSeries, formatGainGramsLabel, formatLossGramsLabel, formatWeightDeltaFromStartLabel, formatWeightKgLive } from "@/utils/weightSummary";
import { formatLitersFrFromMl, WATER_STEP_ML, snapWaterStepMl, waterProgressPercent } from "@/utils/waterDisplay";
import { deviationStorageKey, getDeviationKcalForDay } from "@/utils/deviationLog";
import { getEffectiveMeal, resolveMealOverride } from "@/utils/mealPersonalization";
import { buildProfileDayTips, profileFoodFiltersLabel } from "@/utils/profileAdvice";
import type {
  DeviationLogState,
  MealChecklistState,
  MealOverrideEntry,
  MealOverrideState,
  OnboardingData,
  StepProgressState,
  WaterProgressState,
} from "@/utils/types";

import { ActionFeedbackToast, type ActionFeedbackPayload } from "./ActionFeedbackToast";
import { DayCompletionRecap } from "./DayCompletionRecap";
import { DayDeviationsPanel } from "./DayDeviationsPanel";
import { DayTaskGameBoard } from "./DayTaskGameBoard";
import { MealExpandPanel } from "./MealExpandPanel";
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
  mealOverrides: MealOverrideState;
  deviationLog: DeviationLogState;
  waterProgress: WaterProgressState;
  stepProgress: StepProgressState;
  onUpdateWaterProgress: (key: string, value: number) => void;
  onUpdateStepProgress: (key: string, value: number) => void;
  onToggleMeal: (key: string) => void;
  onSetMealOverride: (key: string, override: MealOverrideEntry | null) => void;
  onAddDeviation: (programDay: number, entry: { label: string; kcal: number; presetId?: string }) => void;
  onRemoveDeviation: (programDay: number, entryId: string) => void;
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


export function PlanView({
  profile,
  mealChecklist,
  mealOverrides,
  deviationLog,
  waterProgress,
  stepProgress,
  onUpdateWaterProgress,
  onUpdateStepProgress,
  onToggleMeal,
  onSetMealOverride,
  onAddDeviation,
  onRemoveDeviation,
  onActiveProgramDayFullyValidated,
  goToDay,
}: PlanViewProps) {
  const formatLossEstimate = useCallback((grams: number) => formatLossGramsLabel(grams), []);

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
  const pendingBilanScrollRef = useRef(false);
  const mealsSectionRef = useRef<HTMLDivElement | null>(null);
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

  const selectProgramDay = useCallback(
    (jour: number) => {
      const idx = data.jours.findIndex((d) => d.jour === jour);
      if (idx >= 0) setSelectedDayIndex(idx);
    },
    [data.jours],
  );

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
  const isPastProgramDay = selectedDay.jour < todayJour;
  const canEditSelectedDay = selectedDay.jour <= todayJour;
  const canValidateSelectedDay = canEditSelectedDay;
  const isFutureProgramDay = selectedDay.jour > todayJour;

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

  const [openMealSwap, setOpenMealSwap] = useState<Record<string, boolean>>({});
  const [expandedMealKey, setExpandedMealKey] = useState<string | null>(null);
  const [customMealDraft, setCustomMealDraft] = useState<Record<string, { label: string; kcal: string }>>({});
  const [showBilanPanel, setShowBilanPanel] = useState(false);

  useEffect(() => {
    setShowBilanPanel(false);
  }, [selectedDay.jour]);

  const openBilanPanel = useCallback(() => {
    pendingBilanScrollRef.current = true;
    setShowBilanPanel(true);
  }, []);

  useLayoutEffect(() => {
    if (!showBilanPanel || !pendingBilanScrollRef.current) return;
    pendingBilanScrollRef.current = false;
    const scrollToBilan = () => {
      bilanSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBilan);
    });
  }, [showBilanPanel]);
  const dayDeviationKcal = getDeviationKcalForDay(deviationLog, selectedDay.jour);
  const dayDeviations = deviationLog[deviationStorageKey(selectedDay.jour)] ?? [];
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackPayload | null>(null);
  const previousIsDayValidatedRef = useRef<boolean>(false);

  const showActionFeedback = useCallback((payload: Omit<ActionFeedbackPayload, "key">) => {
    setActionFeedback({ ...payload, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!actionFeedback) return;
    const t = window.setTimeout(() => setActionFeedback(null), 1400);
    return () => window.clearTimeout(t);
  }, [actionFeedback]);
  const parcoursLabel = parcoursHorizonLabel(profile.parcoursPerte);
  const dailyTarget = getPersonalizedCalories(profile);
  const profileTips = useMemo(() => buildProfileDayTips(profile, 2), [profile]);
  const foodFiltersLabel = useMemo(() => profileFoodFiltersLabel(profile), [profile]);
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

  const walkingChecked = stepsCurrent >= stepsTarget;
  const checkedMealIndexes = mealVisibleIdx.filter(
    (i) => i < selectedDay.repas.length && mealChecklist[mealKey(selectedDay.jour, i)]
  );
  const checkedMeals = checkedMealIndexes.length;
  const mealSlots = mealVisibleIdx.filter((i) => i < selectedDay.repas.length).length;
  const checkedToday = checkedMeals + (waterChecked ? 1 : 0) + (walkingChecked ? 1 : 0);
  const totalTasks = mealSlots + 2;
  const isDayValidated = checkedToday === totalTasks;
  const isDayValidatedRef = useRef(isDayValidated);
  isDayValidatedRef.current = isDayValidated;

  /** Anciennes saisies : aligner sur le pas du curseur (10 cl). */
  const normalizedWaterKeysRef = useRef<Set<string>>(new Set());
  useLayoutEffect(() => {
    if (!canEditSelectedDay) return;
    if (normalizedWaterKeysRef.current.has(waterProgressKey)) return;
    const raw = Math.max(0, Math.round(waterProgress[waterProgressKey] ?? 0));
    const snapped = snapWaterStepMl(raw);
    if (raw !== snapped) {
      onUpdateWaterProgress(waterProgressKey, snapped);
      return;
    }
    normalizedWaterKeysRef.current.add(waterProgressKey);
  }, [canEditSelectedDay, waterProgressKey, waterProgress, onUpdateWaterProgress]);

  useEffect(() => {
    previousIsDayValidatedRef.current = isDayValidated;
    setActionFeedback(null);
  }, [
    selectedDay.jour,
    data.jours.length,
    profile.parcoursPerte,
    profile.programStartDateIso,
    profile.trackingResetEpoch,
    profile.rythmeRepas,
  ]);

  const prevWaterCheckedRef = useRef(waterChecked);
  const prevWalkingCheckedRef = useRef(walkingChecked);

  useEffect(() => {
    if (!canEditSelectedDay) {
      prevWaterCheckedRef.current = waterChecked;
      prevWalkingCheckedRef.current = walkingChecked;
      return;
    }
    if (waterChecked && !prevWaterCheckedRef.current) {
      showActionFeedback({ kind: "water", title: "Bravo !", subtitle: "Objectif eau atteint" });
    }
    if (walkingChecked && !prevWalkingCheckedRef.current) {
      showActionFeedback({ kind: "steps", title: "Bravo !", subtitle: "Objectif pas atteint" });
    }
    prevWaterCheckedRef.current = waterChecked;
    prevWalkingCheckedRef.current = walkingChecked;
  }, [waterChecked, walkingChecked, canEditSelectedDay, showActionFeedback]);

  const handleToggleMealWithFeedback = useCallback(
    (key: string) => {
      if (!canEditSelectedDay) return;
      const checking = !mealChecklist[key];
      onToggleMeal(key);
      if (!checking) return;
      const mealMatch = /^day-\d+-meal-(\d+)$/.exec(key);
      if (!mealMatch) return;
      const mealIndex = Number(mealMatch[1]);
      const meal = selectedDay.repas[mealIndex];
      if (!meal) return;
      showActionFeedback({
        kind: "meal",
        title: "Bravo !",
        subtitle: `${labelByType[meal.type]} enregistré`,
      });
    },
    [canEditSelectedDay, mealChecklist, onToggleMeal, selectedDay.repas, showActionFeedback],
  );

  const handleAddDeviationWithFeedback = useCallback(
    (programDay: number, entry: { label: string; kcal: number }) => {
      if (!canEditSelectedDay) return;
      onAddDeviation(programDay, entry);
      showActionFeedback({
        kind: "deviation",
        title: "Écart noté",
        subtitle: `${entry.label} · ${entry.kcal} kcal`,
        tone: "amber",
      });
    },
    [canEditSelectedDay, onAddDeviation, showActionFeedback],
  );
  const handleDeviationAddForSelectedDay = useCallback(
    (entry: { label: string; kcal: number }) => handleAddDeviationWithFeedback(selectedDay.jour, entry),
    [handleAddDeviationWithFeedback, selectedDay.jour],
  );
  const handleDeviationRemoveForSelectedDay = useCallback(
    (entryId: string) => onRemoveDeviation(selectedDay.jour, entryId),
    [onRemoveDeviation, selectedDay.jour],
  );

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
        deviationLog,
      ),
    [profile, data.jours, selectedDay.jour, mealChecklist, waterProgress, stepProgress, deviationLog],
  );
  const programGoalWeightKg = useMemo(
    () => computeProgramGoalWeightKg(profile, dayCount),
    [profile, dayCount],
  );
  const weightCurveSeries = useMemo(
    () =>
      computeProgramWeightCurveSeries(
        profile,
        data.jours,
        mealChecklist,
        waterProgress,
        stepProgress,
        deviationLog,
      ),
    [profile, data.jours, mealChecklist, waterProgress, stepProgress, deviationLog],
  );
  const {
    currentWeightKg,
    dailyLossPercent,
    cumulativeLossGrams,
    selectedDayLossGrams,
    potentialWeightKg,
    indulgencePenaltyGrams: dayIndulgencePenaltyGrams,
    selectedDaySurplusGrams,
    weightAboveStartGrams,
    selectedDayStartedAboveStart,
  } = weightSnap;
  const weightDeltaFromStartLabel = formatWeightDeltaFromStartLabel(profile.poidsKg, currentWeightKg);
  const isAboveStartWeight = weightAboveStartGrams > 0;
  const estimatedLossLabel = formatLossEstimate(weightSnap.estimatedLossGrams);
  const projectedLossLabel = formatLossEstimate(weightSnap.projectedLossGrams);
  const missedLossGrams = Math.max(0, weightSnap.projectedLossGrams - weightSnap.estimatedLossGrams);
  const missedLossLabel = formatLossEstimate(missedLossGrams);
  const validatedStreak = useMemo(
    () =>
      countValidatedDayStreak(
        data.jours,
        selectedDay.jour,
        mealVisibleIdx,
        mealChecklist,
        waterProgress,
        stepProgress,
        profile,
      ),
    [data.jours, selectedDay.jour, mealVisibleIdx, mealChecklist, waterProgress, stepProgress, profile],
  );
  const tomorrowDay = useMemo(
    () => data.jours.find((d) => d.jour === selectedDay.jour + 1) ?? null,
    [data.jours, selectedDay.jour],
  );
  const tomorrowFirstMeal = useMemo(() => {
    if (!tomorrowDay) return null;
    for (const idx of mealVisibleIdx) {
      const meal = tomorrowDay.repas[idx];
      if (meal) return meal;
    }
    return tomorrowDay.repas[0] ?? null;
  }, [tomorrowDay, mealVisibleIdx]);
  const tomorrowDateLabel = tomorrowDay
    ? programDayToDateLabel(tomorrowDay.jour, profile.programStartDateIso)
    : null;
  const dayHasNetLoss = selectedDayLossGrams > 0;
  const dayShowsPositiveOutcome = dayHasNetLoss && !isAboveStartWeight;
  const validatedDayLabel = isAboveStartWeight
    ? "Journée complète - au-dessus du départ"
    : dayHasNetLoss
      ? "Journée complète"
      : dayDeviationKcal > 0
        ? "Journée complète - écarts notés"
        : "Journée complète";

  const showTodayCompletionRecap =
    isDayValidated && selectedDay.jour === todayJour && canValidateSelectedDay;

  useEffect(() => {
    if (!canValidateSelectedDay || mealSlots === 0) return;

    const wasValidated = previousIsDayValidatedRef.current;
    const justCompleted = isDayValidated && !wasValidated;
    previousIsDayValidatedRef.current = isDayValidated;

    if (!justCompleted) return;

    if (isAboveStartWeight) {
      showActionFeedback({
        kind: "day",
        tone: "amber",
        title: "Journée complète",
        subtitle: weightDeltaFromStartLabel,
      });
    } else if (dayHasNetLoss) {
      showActionFeedback({
        kind: "day",
        title: "Bravo !",
        subtitle: `Journée complète · ${formatLossGramsLabel(selectedDayLossGrams)}`,
      });
    } else if (dayDeviationKcal > 0) {
      showActionFeedback({
        kind: "day",
        tone: "amber",
        title: "Journée complète",
        subtitle: "Écarts pris en compte dans le bilan",
      });
    } else {
      showActionFeedback({
        kind: "day",
        title: "Bravo !",
        subtitle: "Journée complète",
      });
    }
  }, [
    isDayValidated,
    canValidateSelectedDay,
    mealSlots,
    dayHasNetLoss,
    isAboveStartWeight,
    weightDeltaFromStartLabel,
    selectedDayLossGrams,
    dayDeviationKcal,
    showActionFeedback,
  ]);

  useEffect(() => {
    setExpandedMealKey(null);
    setOpenMealSwap({});
  }, [selectedDay.jour]);

  const gameMeals = useMemo(
    () =>
      mealVisibleIdx
        .filter((index) => index < selectedDay.repas.length)
        .map((index) => {
          const plannedMeal = selectedDay.repas[index];
          const key = mealKey(selectedDay.jour, index);
          const override = resolveMealOverride(mealOverrides[key]);
          const meal = getEffectiveMeal(plannedMeal, mealOverrides[key]);
          return {
            key,
            typeLabel: labelByType[meal.type],
            nom: meal.nom,
            checked: Boolean(mealChecklist[key]),
            meal: {
              nom: meal.nom,
              type: meal.type,
              image: meal.image,
              hideImage: override?.custom === true,
            },
          };
        }),
    [mealVisibleIdx, selectedDay.repas, selectedDay.jour, mealOverrides, mealChecklist],
  );

  const dateLabel = programDayToDateLabel(selectedDay.jour, profile.programStartDateIso);
  const todayDateLabel = programDayToDateLabel(todayJour, profile.programStartDateIso);
  const isViewingToday = selectedDay.jour === todayJour;

  const goToToday = useCallback(() => {
    setSelectedDayIndex(todayPickerIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [todayPickerIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedDay.jour]);

  const expandedMealIndex = useMemo(() => {
    if (!expandedMealKey) return null;
    const match = /^day-\d+-meal-(\d+)$/.exec(expandedMealKey);
    if (!match) return null;
    const index = Number(match[1]);
    return index < selectedDay.repas.length ? index : null;
  }, [expandedMealKey, selectedDay.repas.length]);

  return (
    <div className="space-y-4">
      {!isViewingToday ? (
        <div className="sticky top-[max(3.25rem,calc(env(safe-area-inset-top,0px)+2.75rem))] z-30 rounded-2xl border-2 border-brand-500/35 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 p-3 shadow-[0_8px_28px_rgba(45,36,58,0.22)] ring-1 ring-white/15 backdrop-blur-sm">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                {isFutureProgramDay ? "Jour à venir - aperçu" : "Consultation d’un autre jour"}
              </p>
              <p className="mt-0.5 text-[14px] font-bold leading-snug">
                {dateLabel}
                <span className="font-medium text-white/50"> · </span>
                Jour {selectedDay.jour}
              </p>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-brand-700 shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition hover:bg-brand-50 active:scale-[0.98] sm:w-auto sm:min-w-[11rem]"
            >
              ← Aujourd&apos;hui
              <span className="font-semibold text-brand-500">
                · Jour {todayJour}
                {todayDateLabel ? ` (${todayDateLabel})` : ""}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={mealsSectionRef}
        className="scroll-mt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))]"
      >
        <DayTaskGameBoard
          checkedToday={checkedToday}
          totalTasks={totalTasks}
          isDayValidated={isDayValidated}
          canEdit={canEditSelectedDay}
          isFutureDay={isFutureProgramDay}
          meals={gameMeals}
          onMealToggle={handleToggleMealWithFeedback}
          expandedMealKey={expandedMealKey}
          onMealExpand={(key, mode) => {
            setExpandedMealKey(key);
            setOpenMealSwap((prev) => ({ ...prev, [key]: mode === "swap" }));
          }}
          expandedMealPanel={
            expandedMealKey && expandedMealIndex != null ? (
              <MealExpandPanel
                mealKey={expandedMealKey}
                mealIndex={expandedMealIndex}
                selectedDay={selectedDay}
                profile={profile}
                dailyTarget={dailyTarget}
                mealOverrides={mealOverrides}
                customMealDraft={
                  customMealDraft[expandedMealKey] ?? {
                    label: "",
                    kcal: String(selectedDay.repas[expandedMealIndex]?.calories ?? ""),
                  }
                }
                onCustomMealDraftChange={(draft) =>
                  setCustomMealDraft((prev) => ({ ...prev, [expandedMealKey]: draft }))
                }
                openMealSwap={Boolean(openMealSwap[expandedMealKey])}
                onToggleSwap={() =>
                  setOpenMealSwap((prev) => ({ ...prev, [expandedMealKey]: !prev[expandedMealKey] }))
                }
                onSetMealOverride={onSetMealOverride}
                canEdit={canEditSelectedDay}
                onClose={() => setExpandedMealKey(null)}
              />
            ) : null
          }
          waterChecked={waterChecked}
          waterRawMl={waterRawMl}
          waterTargetMl={waterTargetMl}
          waterSliderMl={waterSliderMl}
          waterPercent={waterPercent}
          onWaterChange={(value) => onUpdateWaterProgress(waterProgressKey, value)}
          stepsChecked={walkingChecked}
          stepsCurrent={stepsCurrent}
          stepsTarget={stepsTarget}
          stepsPercent={stepsPercent}
          onStepsChange={(value) => onUpdateStepProgress(stepsProgressKey, value)}
          stepsExtra={
            Capacitor.getPlatform() !== "web" && nativeHealthStepsLabel() && isStepsHealthSyncDay ? (
              <button
                type="button"
                disabled={healthStepsBusy}
                onClick={() => void syncStepsFromDevice(true)}
                className="mt-1 w-full rounded-md bg-white/20 py-0.5 text-[9px] font-bold text-white disabled:opacity-50"
              >
                {healthStepsBusy ? "..." : `Sync ${nativeHealthStepsLabel()}`}
              </button>
            ) : null
          }
          dateLabel={dateLabel}
          jour={selectedDay.jour}
          showTodayButton={false}
          onGoToday={goToToday}
        />
      </div>

      <div className="mt-6 space-y-4">
      {!isFutureProgramDay ? (
        <section className="overflow-hidden rounded-2xl border border-brand-200/50 bg-white/95 shadow-card ring-1 ring-white/80">
          <DayDeviationsPanel
            canEdit={canEditSelectedDay}
            deviations={dayDeviations}
            totalKcal={dayDeviationKcal}
            penaltyGrams={dayIndulgencePenaltyGrams}
            surplusGrams={selectedDaySurplusGrams}
            selectedDayLossGrams={selectedDayLossGrams}
            startedAboveStartWeight={selectedDayStartedAboveStart}
            onAdd={handleDeviationAddForSelectedDay}
            onRemove={handleDeviationRemoveForSelectedDay}
          />
        </section>
      ) : null}

      <div
        ref={bilanSectionRef}
        className="scroll-mt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))]"
      >
      {!showBilanPanel ? (
        <button
          type="button"
          onClick={openBilanPanel}
          className="group relative w-full overflow-hidden rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-800 via-brand-600 to-accent p-[1px] shadow-elevated transition active:scale-[0.99]"
        >
          <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-gradient-to-br from-brand-700 via-brand-600 to-accent p-4">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-teal-300/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">Bilan</p>
              <p className="mt-1 text-[18px] font-black leading-tight text-white">Voir le bilan</p>
              <p className="mt-1 text-[12px] font-medium text-white/90">
                {dateLabel} · Jour {selectedDay.jour}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-white/15 px-2.5 py-1.5 text-right backdrop-blur-sm">
              <p className="text-[20px] font-black tabular-nums leading-none text-white">
                {formatWeightKgLive(currentWeightKg)}
                <span className="text-[11px] font-semibold"> kg</span>
              </p>
              {isAboveStartWeight ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-amber-100">
                  {weightDeltaFromStartLabel}
                </p>
              ) : selectedDayLossGrams > 0 ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-emerald-100">
                  {formatLossGramsLabel(selectedDayLossGrams)}
                </p>
              ) : cumulativeLossGrams > 0 ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-emerald-100">
                  {formatLossGramsLabel(cumulativeLossGrams)} cumulés
                </p>
              ) : null}
              {dayDeviationKcal > 0 ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-amber-100">
                  {selectedDayStartedAboveStart
                    ? `${formatGainGramsLabel(selectedDaySurplusGrams)} (écarts)`
                    : `−${dayIndulgencePenaltyGrams} g (écarts)`}
                </p>
              ) : null}
            </div>
          </div>
          <span className="relative mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-[13px] font-black uppercase tracking-wide text-brand-700 shadow-[0_4px_16px_rgba(109,90,125,0.12)] transition group-hover:bg-brand-50">
            Voir le bilan détaillé
            <span aria-hidden>→</span>
          </span>
          </div>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bilan</p>
            <button
              type="button"
              onClick={() => setShowBilanPanel(false)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Masquer
            </button>
          </div>

      <div className="overflow-hidden rounded-2xl border border-brand-200/50 bg-white/95 shadow-card ring-1 ring-white/80">
          <div
            className={`px-4 py-3 ${
              isDayValidated
                ? dayShowsPositiveOutcome
                  ? "bg-emerald-50/80"
                  : "bg-amber-50/70"
                : "bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bilan</p>
                <p className="mt-0.5 text-[15px] font-semibold tracking-tight text-slate-900">
                  {dateLabel} <span className="font-normal text-slate-400">·</span>{" "}
                  <span className="text-slate-500">Jour {selectedDay.jour}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-bold tabular-nums tracking-tight text-slate-900">
                  {formatWeightKgLive(currentWeightKg)}
                  <span className="text-[13px] font-medium text-slate-400"> kg</span>
                </p>
                {isAboveStartWeight ? (
                  <p className="text-[11px] font-medium tabular-nums text-amber-800">
                    {weightDeltaFromStartLabel}
                  </p>
                ) : cumulativeLossGrams > 0 ? (
                  <p className="text-[11px] font-medium tabular-nums text-emerald-700">
                    {formatLossGramsLabel(cumulativeLossGrams)} perdus cumulés
                  </p>
                ) : selectedDayLossGrams > 0 ? (
                  <p className="text-[11px] font-medium tabular-nums text-emerald-700">
                    Aujourd&apos;hui {formatLossGramsLabel(selectedDayLossGrams)}
                  </p>
                ) : null}
                {dayDeviationKcal > 0 ? (
                  <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-amber-800">
                    {selectedDayStartedAboveStart
                      ? `Écarts : ${formatGainGramsLabel(selectedDaySurplusGrams)} au bilan`
                      : `Écarts : −${dayIndulgencePenaltyGrams} g sur la perte`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDayValidated
                    ? dayShowsPositiveOutcome
                      ? "bg-emerald-500"
                      : "bg-amber-400"
                    : "bg-gradient-to-r from-brand-600 to-brand-500"
                }`}
                style={{ width: `${dailyLossPercent}%` }}
              />
            </div>

            {!isDayValidated && (selectedDayLossGrams > 0 || dayDeviationKcal > 0) ? (
              <p className="mt-2 text-[11px] text-slate-600">
                Si vous terminez la journée : environ{" "}
                <span className="font-semibold tabular-nums text-slate-800">{formatWeightKgLive(potentialWeightKg)} kg</span>
                {selectedDayLossGrams > 0 ? (
                  <>
                    {" "}(perte nette estimée {formatLossGramsLabel(selectedDayLossGrams)} aujourd&apos;hui
                    {dayDeviationKcal > 0 ? ", écarts inclus" : ""}).
                  </>
                ) : dayDeviationKcal > 0 ? (
                  <>
                    {" "}
                    (écarts déjà pris en compte :{" "}
                    {selectedDayStartedAboveStart
                      ? `${formatGainGramsLabel(selectedDaySurplusGrams)} au bilan`
                      : `−${dayIndulgencePenaltyGrams} g de perte possible`}
                    ).
                  </>
                ) : null}
              </p>
            ) : null}

            {showTodayCompletionRecap ? (
              <DayCompletionRecap
                selectedDay={selectedDay}
                tomorrowDay={tomorrowDay}
                tomorrowFirstMeal={tomorrowFirstMeal}
                dateLabel={dateLabel}
                tomorrowDateLabel={tomorrowDateLabel}
                dayCount={dayCount}
                checkedMeals={checkedMeals}
                mealSlots={mealSlots}
                waterChecked={waterChecked}
                waterRawMl={waterRawMl}
                waterTargetMl={waterTargetMl}
                walkingChecked={walkingChecked}
                stepsCurrent={stepsCurrent}
                stepsTarget={stepsTarget}
                deviationKcal={dayDeviationKcal}
                deviationCount={dayDeviations.length}
                selectedDayLossGrams={selectedDayLossGrams}
                cumulativeLossGrams={cumulativeLossGrams}
                currentWeightKg={currentWeightKg}
                streak={validatedStreak}
                hasNetLoss={dayShowsPositiveOutcome}
                isAboveStartWeight={isAboveStartWeight}
                weightDeltaFromStartLabel={weightDeltaFromStartLabel}
              />
            ) : isDayValidated ? (
              <div className={`mt-2.5 rounded-xl border px-3 py-2 ${dayShowsPositiveOutcome ? "border-emerald-200/70 bg-emerald-50/80" : "border-amber-200/70 bg-amber-50/80"}`}>
                <p className={`text-[12px] font-semibold ${dayShowsPositiveOutcome ? "text-emerald-900" : "text-amber-950"}`}>
                  Estimation perte du jour: <span className="tabular-nums">{estimatedLossLabel}</span>
                </p>
                <p className={`mt-0.5 text-[11px] ${dayShowsPositiveOutcome ? "text-emerald-700" : "text-amber-800"}`}>
                  Objectif avec écarts: <span className="tabular-nums">{formatLossEstimate(weightSnap.projectedLossGrams)}</span>
                  {dayDeviationKcal > 0 ? (
                    <>
                      {" "}· pénalité écarts: <span className="tabular-nums">−{dayIndulgencePenaltyGrams} g</span>
                    </>
                  ) : null}
                  {missedLossGrams > 0 && dayDeviationKcal === 0 ? (
                    <>
                      {" "}· écart estimé: <span className="tabular-nums">{missedLossLabel}</span>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        </div>

          <SectionCard title="Progression" variant="premium">
            {weightCurveSeries.length === 0 ? (
              <p className="text-sm text-slate-400">Pas encore de données.</p>
            ) : (
              <ProgramProgressCurve
                points={weightCurveSeries}
                todayJour={todayJour}
                startWeightKg={profile.poidsKg}
                goalWeightKg={programGoalWeightKg}
                showHeading={false}
                aboveStartWeight={isAboveStartWeight}
                emphasizeToday={showTodayCompletionRecap && dayShowsPositiveOutcome}
              />
            )}
          </SectionCard>

          <section className="mt-4 rounded-2xl border border-brand-200/60 bg-white/95 p-3 shadow-sm ring-1 ring-white/80 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">Votre profil SOPK</p>
                <p className="mt-0.5 text-sm font-semibold text-brand-900">{parcoursLabel}</p>
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{foodFiltersLabel}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-brand-50/80 px-2 py-2 text-center ring-1 ring-brand-100">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-700">Calories</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-brand-900">{dailyTarget}</p>
                <p className="text-[9px] text-brand-600">kcal / jour</p>
              </div>
              <div className="rounded-xl bg-teal-50/80 px-2 py-2 text-center ring-1 ring-teal-100">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-teal-800">Eau</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-teal-900">
                  {personalizedHydrationLiters.toFixed(1).replace(".", ",")}
                </p>
                <p className="text-[9px] text-teal-700">litres / jour</p>
              </div>
              <div className="rounded-xl bg-violet-50/80 px-2 py-2 text-center ring-1 ring-violet-100">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-800">Pas</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-violet-900">
                  {stepsTarget.toLocaleString("fr-FR")}
                </p>
                <p className="text-[9px] text-violet-700">objectif / jour</p>
              </div>
            </div>
            {profileTips.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-t border-brand-100/80 pt-3">
                {profileTips.map((tip) => (
                  <li key={tip} className="text-[11px] leading-snug text-slate-600">
                    · {tip}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      )}
      </div>

      </div>

      <ActionFeedbackToast feedback={actionFeedback} />
    </div>
  );
}
