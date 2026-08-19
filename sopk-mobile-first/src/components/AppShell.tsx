"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

import { AppleSignInCard } from "@/components/AppleSignInCard";
import { AppIconSvg } from "@/components/AppIconSvg";
import { BrandLogo } from "@/components/BrandLogo";
import { isSopkNutritionProfile } from "@/utils/profilePath";
import { OnboardingForm } from "@/components/OnboardingForm";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { SubscriptionLegalLinks } from "@/components/SubscriptionLegalLinks";
import { PlanView, programDayToDateLabel } from "@/components/PlanView";
import { ProgramDayHistoryPanel } from "@/components/ProgramDayHistoryPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getMealPlan,
  getProgramDayCount,
  getTodayJourInProgram,
  shiftProgramStartEarlierByOneDay,
} from "@/utils/mealPlan";
import { profileMealPersonalizationFingerprint, syncAutoMealOverridesIfNeeded } from "@/utils/mealPersonalization";
import { canAccessPlan, normalizeParcours, normalizeStoredProfile } from "@/utils/profileMigrate";
import { migrateTrackingForNewHorizon } from "@/utils/planTracking";
import { iapProductIdsConfigured } from "@/config/iap";
import { writeEntitlement, readEntitlement } from "@/utils/entitlement";
import { programDayFromTrackingKey } from "@/utils/planTracking";
import { toCapacitorStaticFileHref } from "@/utils/capacitorStaticHref";
import {
  hasActiveSubscriptionFromStore,
  openSubscriptionManagement,
  restoreSubscriptionPurchases,
  shouldUseNativeIap,
} from "@/utils/subscriptionPurchase";
import { buildShoppingList, formatGrammesShopping, type ShoppingListSpanDays } from "@/utils/shoppingList";
import { STORAGE_KEYS, isoDateLocalLabelFr, todayIso, todayIsoLocal } from "@/utils/storage";
import {
  DailyTrackingData,
  DeviationLogState,
  MealChecklistState,
  MealOverrideState,
  OnboardingData,
  StepProgressState,
  AuthSession,
  WaterProgressState,
} from "@/utils/types";
import { deviationStorageKey } from "@/utils/deviationLog";

const safeTopPadding = "max(3.25rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))";
const planTopPadding = "max(0.5rem, env(safe-area-inset-top, 0px))";
const onboardingTopPadding = planTopPadding;

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
  prenom: "",
  age: 30,
  poidsKg: 78,
  tailleCm: 165,
  parcoursPerte: "j90",
};

interface AppShellProps {
  forcePlan?: boolean;
}

export function AppShell({ forcePlan = false }: AppShellProps) {
  void forcePlan;
  const router = useRouter();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEditConfirmOpen, setProfileEditConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [goToDay, setGoToDay] = useState<{ jour: number; ts: number } | null>(null);
  const [shoppingListSpan, setShoppingListSpan] = useState<ShoppingListSpanDays>(7);
  const closeSettings = useCallback(() => {
    setPurchaseNotice(null);
    setSettingsOpen(false);
    setProfileEditConfirmOpen(false);
  }, []);
  const authStore = useLocalStorage<AuthSession | null>(STORAGE_KEYS.authSession, null);
  const userScope = authStore.value?.userId ?? "guest";
  const userId = authStore.value?.userId;
  const hasEntitlement = Boolean(userId && readEntitlement(userId));
  const skipSubscriptionGate = !shouldUseNativeIap();
  const profileStore = useLocalStorage<OnboardingData | null>(scopedStorageKey(STORAGE_KEYS.onboarding, userScope), null);
  const trackingStore = useLocalStorage<DailyTrackingData>(scopedStorageKey(STORAGE_KEYS.tracking, userScope), initialTracking);
  const hydrationStore = useLocalStorage<number>(scopedStorageKey(STORAGE_KEYS.hydrationMl, userScope), 0);
  const hydrationDateStore = useLocalStorage<string>(scopedStorageKey(STORAGE_KEYS.hydrationDate, userScope), todayIso());
  const mealChecklistStore = useLocalStorage<MealChecklistState>(scopedStorageKey(STORAGE_KEYS.mealChecklist, userScope), {});
  const mealOverridesStore = useLocalStorage<MealOverrideState>(scopedStorageKey(STORAGE_KEYS.mealOverrides, userScope), {});
  const deviationLogStore = useLocalStorage<DeviationLogState>(scopedStorageKey(STORAGE_KEYS.deviationLog, userScope), {});
  const waterProgressStore = useLocalStorage<WaterProgressState>(scopedStorageKey(STORAGE_KEYS.waterProgress, userScope), {});
  const stepProgressStore = useLocalStorage<StepProgressState>(scopedStorageKey(STORAGE_KEYS.stepProgress, userScope), {});

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

  /**
   * iOS : une URL sans fichier explicite (`/plan/`) peut charger le mauvais document ou échouer.
   * Une fois le bundle chargé, on aligne l’URL sur `…/index.html` sans boucle.
   */
  useEffect(() => {
    if (Capacitor.getPlatform() === "web" || typeof window === "undefined") return;
    const { pathname, search, hash } = window.location;
    const current = `${pathname}${search}${hash}`;
    const normalized = toCapacitorStaticFileHref(current);
    if (normalized !== current) {
      window.location.replace(normalized);
    }
  }, []);

  useEffect(() => {
    if (!shouldUseNativeIap()) {
      setHasActiveSubscription(false);
      return;
    }
    let cancelled = false;
    void hasActiveSubscriptionFromStore()
      .then((active) => {
        if (!cancelled) setHasActiveSubscription(active);
      })
      .catch(() => {
        if (!cancelled) setHasActiveSubscription(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, hasEntitlement]);

  const accessOpts = useMemo(
    () => ({
      hasEntitlement,
      hasActiveSubscription: hasActiveSubscription === true,
      skipSubscriptionGate,
      requireAppleSubscription: shouldUseNativeIap(),
    }),
    [hasEntitlement, hasActiveSubscription, skipSubscriptionGate],
  );

  const activeProfile = profileStore.value;
  const savedProfileNorm = normalizeStoredProfile(activeProfile);

  useEffect(() => {
    const uid = authStore.value?.userId;
    if (!uid) return;
    if (readEntitlement(uid)) return;
    const p = normalizeStoredProfile(profileStore.value);
    if (!p) return;

    if (shouldUseNativeIap()) {
      return;
    }

    if (
      p.onboardingCompleted === true ||
      p.billingPreference === "monthly" ||
      p.billingPreference === "yearly"
    ) {
      writeEntitlement(uid);
    }
  }, [authStore.value?.userId, profileStore.value]);

  /** Profils sans date de début : enregistrer le jour 1 (aujourd’hui) une fois pour éviter un recalcul à chaque rendu. */
  useEffect(() => {
    if (!authStore.value) return;
    const raw = profileStore.value;
    if (!raw) return;
    if (raw.programStartDateIso?.trim()) return;
    if (!canAccessPlan(normalizeStoredProfile(raw), accessOpts)) return;
    const norm = normalizeStoredProfile(raw);
    const start = norm?.programStartDateIso?.trim();
    if (!start) return;
    profileStore.update({ ...raw, programStartDateIso: start });
  }, [authStore.value, hasEntitlement, activeProfile, accessOpts]);

  const skipPricingForEditor =
    hasEntitlement ||
    hasActiveSubscription === true ||
    (!shouldUseNativeIap() &&
      (savedProfileNorm?.billingPreference === "monthly" ||
        savedProfileNorm?.billingPreference === "yearly"));

  const displayedProfile = normalizeStoredProfile(activeProfile ?? fallbackProfile) ?? fallbackProfile;
  const plan = getMealPlan({ parcoursPerte: displayedProfile.parcoursPerte });
  const projectionHorizonJours = getProgramDayCount(displayedProfile.parcoursPerte);
  const todayJourPlan = useMemo(
    () => getTodayJourInProgram(projectionHorizonJours, displayedProfile.programStartDateIso),
    [projectionHorizonJours, displayedProfile.programStartDateIso],
  );

  const shoppingList = useMemo(
    () =>
      buildShoppingList(
        displayedProfile,
        plan.jours,
        todayJourPlan,
        shoppingListSpan,
        mealOverridesStore.value,
      ),
    [displayedProfile, plan.jours, todayJourPlan, shoppingListSpan, mealOverridesStore.value],
  );

  const mealPersonalizationFingerprint = useMemo(
    () => profileMealPersonalizationFingerprint(displayedProfile),
    [displayedProfile],
  );

  /** Adapte automatiquement les repas du plan aux préférences / allergies du profil. */
  useEffect(() => {
    if (!canAccessPlan(savedProfileNorm, accessOpts)) return;
    const synced = syncAutoMealOverridesIfNeeded(
      displayedProfile,
      plan,
      mealOverridesStore.value,
    );
    if (synced) {
      mealOverridesStore.update(synced);
    }
  }, [mealPersonalizationFingerprint, plan, displayedProfile, savedProfileNorm, accessOpts, mealOverridesStore]);

  const applyProfileSave = useCallback(
    (profile: OnboardingData) => {
      try {
        window.localStorage.removeItem(`${STORAGE_KEYS.onboardingDraft}_${userScope}`);
      } catch {
        /* ignore */
      }

      const prev = normalizeStoredProfile(activeProfile);
      const nextParcours = normalizeParcours(profile.parcoursPerte);
      const nextProfile: OnboardingData = {
        ...profile,
        parcoursPerte: nextParcours,
        onboardingCompleted: true,
        programStartDateIso: todayIsoLocal(),
      };

      if (prev && prev.parcoursPerte !== nextParcours) {
        const migrated = migrateTrackingForNewHorizon(
          prev.parcoursPerte,
          nextParcours,
          mealChecklistStore.value,
          waterProgressStore.value,
          stepProgressStore.value,
          nextProfile,
        );
        mealChecklistStore.update(migrated.meal);
        waterProgressStore.update(migrated.water);
        stepProgressStore.update(migrated.steps);
      }

      profileStore.update(nextProfile);

      const mealPlan = getMealPlan({ parcoursPerte: nextParcours });
      const syncedOverrides = syncAutoMealOverridesIfNeeded(
        nextProfile,
        mealPlan,
        mealOverridesStore.value,
      );
      if (syncedOverrides) {
        mealOverridesStore.update(syncedOverrides);
      }

      if (authStore.value?.userId) {
        if (!shouldUseNativeIap()) {
          writeEntitlement(authStore.value.userId);
        } else {
          void hasActiveSubscriptionFromStore().then((active) => {
            setHasActiveSubscription(active);
          });
        }
      }
    },
    [
      activeProfile,
      authStore.value?.userId,
      mealChecklistStore,
      mealOverridesStore,
      profileStore,
      stepProgressStore,
      userScope,
      waterProgressStore,
    ],
  );

  const futureDays = useMemo(
    () => plan.jours.filter((d) => d.jour > todayJourPlan),
    [plan.jours, todayJourPlan],
  );

  const canEditProgramDay = useCallback(
    (jour: number | null | undefined) => {
      if (jour == null) return false;
      return jour <= todayJourPlan;
    },
    [todayJourPlan],
  );

  const advanceActiveProgramDayAfterFullValidation = useCallback(() => {
    const start = displayedProfile.programStartDateIso?.trim();
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return;
    const dc = getProgramDayCount(displayedProfile.parcoursPerte);
    const tj = getTodayJourInProgram(dc, start);
    if (tj >= dc) return;
    profileStore.update({
      ...displayedProfile,
      programStartDateIso: shiftProgramStartEarlierByOneDay(start),
    });
  }, [displayedProfile, profileStore]);

  if (!authStore.value) {
    return (
      <main
        className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4 pb-24"
        style={{ paddingTop: safeTopPadding, scrollPaddingTop: safeTopPadding }}
      >
        <div className="flex w-full max-w-md flex-1 flex-col justify-center">
          <button
            type="button"
            onClick={() => {
              if (Capacitor.getPlatform() === "web") {
                router.push("/");
              } else {
                window.location.assign(toCapacitorStaticFileHref("/"));
              }
            }}
            className="mb-4 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Retour
          </button>
          <section className="rounded-2xl border border-[#e8e2eb] bg-white/95 p-5 shadow-md shadow-slate-200/50">
            <div className="mb-4 flex justify-center">
              <AppIconSvg size="lg" />
            </div>
            <h2 className="text-center text-xl font-bold text-slate-900">Connexion sécurisée</h2>
            <p className="mt-1 text-sm text-slate-600">
              Étape 1/2 : connexion avec Apple. Les choix «&nbsp;masquer l’e-mail&nbsp;» et le nom affiché te sont
              proposés par iOS (surtout à la première connexion).
            </p>
            <div className="mt-4">
              <AppleSignInCard
                compact
                onAuthenticated={(session) => {
                  authStore.update(session);
                }}
              />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (editingProfile && savedProfileNorm) {
    return (
      <main
        className="mx-auto flex h-[100dvh] min-h-0 max-h-[100dvh] w-full max-w-2xl flex-col items-stretch overflow-hidden bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4 pb-2"
        style={{ paddingTop: onboardingTopPadding, scrollPaddingTop: onboardingTopPadding }}
      >
        <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
          <OnboardingForm
            userScope={userScope}
            skipPricingStep={skipPricingForEditor}
            resumeProfile={savedProfileNorm}
            onCancelResume={() => setEditingProfile(false)}
            profileEditResetDateLabel={todayIsoLocal()}
            onComplete={(profile) => {
              applyProfileSave(profile);
              setEditingProfile(false);
            }}
          />
        </div>
      </main>
    );
  }

  if (!canAccessPlan(savedProfileNorm, accessOpts)) {
    const needsSubscriptionPaywall =
      Boolean(savedProfileNorm?.onboardingCompleted) &&
      shouldUseNativeIap() &&
      Boolean(userId) &&
      !hasEntitlement;

    if (needsSubscriptionPaywall && hasActiveSubscription === null) {
      return (
        <main className="mx-auto flex h-[100dvh] items-center justify-center bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4">
          <p className="text-sm font-medium text-[#6b6560]">Vérification de l&apos;abonnement…</p>
        </main>
      );
    }

    if (needsSubscriptionPaywall && hasActiveSubscription === false) {
      return (
        <SubscriptionPaywall
          billingPreference={savedProfileNorm?.billingPreference ?? "yearly"}
          onBillingChange={(plan) => {
            if (!savedProfileNorm) return;
            profileStore.update({
              ...savedProfileNorm,
              billingPreference: plan,
            });
          }}
          onSubscribed={() => {
            void hasActiveSubscriptionFromStore().then((active) => {
              setHasActiveSubscription(active);
            });
          }}
        />
      );
    }

    return (
      <main
        className="mx-auto flex h-[100dvh] min-h-0 max-h-[100dvh] w-full max-w-2xl flex-col items-stretch overflow-hidden bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4 pb-2"
        style={{ paddingTop: onboardingTopPadding, scrollPaddingTop: onboardingTopPadding }}
      >
        <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
          <OnboardingForm
            userScope={userScope}
            onComplete={(profile) => {
              applyProfileSave(profile);
            }}
            onLeaveToAuth={() => {
              authStore.update(null);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main
      className="plan-page-bg mx-auto min-h-screen w-full max-w-6xl px-3 pb-24 pt-0 md:px-6 lg:px-8"
      style={{
        paddingTop: planTopPadding,
        scrollPaddingTop: planTopPadding,
      }}
    >
      <header className="sticky top-0 z-40 -mx-3 mb-3 flex items-center justify-between gap-2 border-b border-brand-200/80 bg-white/80 px-3 py-2.5 shadow-[0_4px_24px_rgba(109,90,125,0.08)] backdrop-blur-xl md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <BrandLogo variant="compact" sopkFocus={isSopkNutritionProfile(savedProfileNorm ?? {})} />
        <button
          type="button"
          aria-label="Ouvrir les paramètres"
          aria-expanded={settingsOpen}
          onClick={() => {
            setPurchaseNotice(null);
            setSettingsOpen(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-200 bg-gradient-to-br from-white to-brand-50 px-2.5 py-2 text-brand-700 shadow-sm transition hover:shadow-md active:scale-[0.97]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-brand-800">Paramètres</span>
        </button>
      </header>

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={closeSettings}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="flex max-h-[min(90vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur-md">
              <h2 id="settings-title" className="text-lg font-bold text-slate-900">
                Réglages
              </h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeSettings}
                className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-4 [-webkit-overflow-scrolling:touch]">
            <div className="space-y-4">
              <details className="overflow-hidden rounded-xl border-2 border-brand-500 bg-gradient-to-r from-brand-700 to-brand-600 shadow-lg shadow-brand-600/30 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-bold text-white transition hover:brightness-110">
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20" aria-hidden>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </span>
                    Historique des jours
                  </span>
                  <svg className="h-4 w-4 shrink-0 text-white/90 transition-transform duration-200 [[open]>&]:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="border-t border-white/20 bg-white px-3 pb-3 pt-2">
                  <ProgramDayHistoryPanel
                    variant="embedded"
                    profile={displayedProfile}
                    jours={plan.jours}
                    todayJour={todayJourPlan}
                    mealChecklist={mealChecklistStore.value}
                    waterProgress={waterProgressStore.value}
                    stepProgress={stepProgressStore.value}
                    deviationLog={deviationLogStore.value}
                    onSelectDay={(jour) => {
                      setGoToDay({ jour, ts: Date.now() });
                      closeSettings();
                    }}
                  />
                </div>
              </details>

              <details className="rounded-xl border border-slate-200 bg-slate-50/90 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                  <span>Liste de courses</span>
                  <svg className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 [[open]>&]:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setShoppingListSpan(7)}
                      className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                        shoppingListSpan === 7
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      1 semaine
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoppingListSpan(14)}
                      className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                        shoppingListSpan === 14
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      2 semaines
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-slate-500">
                    Ingrédients des repas prévus du jour <strong>{shoppingList.startJour}</strong> au jour{" "}
                    <strong>{shoppingList.endJour}</strong> ({shoppingList.spanDays} jour
                    {shoppingList.spanDays > 1 ? "s" : ""}) · allergies, régime et exclusions appliqués à votre
                    profil
                    {shoppingList.requestedSpan === 14 ? " · semaines 1 et 2 avec menus différents" : ""}
                  </p>
                  {(displayedProfile.allergies?.length ?? 0) > 0 ||
                  (displayedProfile.alimentsDetestes?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-[10px] font-medium text-emerald-700">
                      Filtre profil actif
                      {shoppingList.excludedIngredientCount > 0
                        ? ` · ${shoppingList.excludedIngredientCount} ligne${shoppingList.excludedIngredientCount > 1 ? "s" : ""} d’ingrédient retirée${shoppingList.excludedIngredientCount > 1 ? "s" : ""}`
                        : ""}
                    </p>
                  ) : null}
                  {shoppingList.lines.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Aucun ingrédient pour cette période.</p>
                  ) : (
                    <ul className="mt-2 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {shoppingList.lines.map((line) => (
                        <li key={line.aliment} className="flex items-baseline justify-between gap-2 px-2.5 py-2 text-xs">
                          <span className="min-w-0 flex-1 font-medium text-slate-900">{line.aliment}</span>
                          <span className="shrink-0 tabular-nums font-semibold text-slate-600">
                            {formatGrammesShopping(line.grammes)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              {futureDays.length > 0 ? (
                <details className="rounded-xl border border-brand-200 bg-brand-50/90 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-100/80">
                    <span>Jours suivants</span>
                    <span className="text-xs font-semibold text-brand-600">{futureDays.length} jour{futureDays.length > 1 ? "s" : ""}</span>
                  </summary>
                  <div className="flex flex-wrap gap-1.5 border-t border-brand-200 px-3 pb-3 pt-2">
                    {futureDays.map((d) => (
                      <button
                        key={d.jour}
                        type="button"
                        onClick={() => {
                          setGoToDay({ jour: d.jour, ts: Date.now() });
                          closeSettings();
                        }}
                        className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-200/80 transition hover:bg-brand-100/60"
                      >
                        {programDayToDateLabel(d.jour, displayedProfile.programStartDateIso)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}

              {profileEditConfirmOpen ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5">
                  <p className="text-[13px] font-bold text-amber-950">Modifier le profil ?</p>
                  <p className="mt-1.5 text-[12px] leading-snug text-amber-900">
                    En enregistrant vos modifications, la{" "}
                    <strong>date de début du programme</strong> sera remise au{" "}
                    <strong>{isoDateLocalLabelFr(todayIsoLocal())}</strong>
                    {displayedProfile.programStartDateIso ? (
                      <>
                        , au lieu du{" "}
                        <strong>
                          {programDayToDateLabel(1, displayedProfile.programStartDateIso).replace(/^./, (c) =>
                            c.toUpperCase(),
                          )}
                        </strong>{" "}
                        actuellement enregistré
                      </>
                    ) : null}
                    . Le jour 1 repartira de cette nouvelle date.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeSettings();
                        window.requestAnimationFrame(() => {
                          setEditingProfile(true);
                        });
                      }}
                      className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      Continuer la modification
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileEditConfirmOpen(false)}
                      className="w-full rounded-xl border border-brand-200 bg-white py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileEditConfirmOpen(true)}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-100"
                >
                  Modifier le profil
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  closeSettings();
                  authStore.update(null);
                  if (typeof window !== "undefined") {
                    if (Capacitor.getPlatform() === "web") {
                      router.push("/");
                    } else {
                      window.location.replace(toCapacitorStaticFileHref("/"));
                    }
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Se déconnecter
              </button>

              <div>
                <label htmlFor="program-start-date" className="text-xs font-semibold text-slate-600">
                  Date de début du programme
                </label>
                <input
                  id="program-start-date"
                  type="date"
                  value={displayedProfile.programStartDateIso ?? todayIsoLocal()}
                  max={todayIsoLocal()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    profileStore.update({
                      ...displayedProfile,
                      programStartDateIso: v,
                    });
                  }}
                  className="mt-1.5 w-full rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  Le <strong className="text-slate-600">jour 1</strong> correspond à ce premier jour ; « Aujourd’hui »
                  avance d’un jour civil à la fois. Ajuste si le plan ne reflète pas ton vrai démarrage.
                </p>
              </div>

              {Capacitor.getPlatform() !== "web" && iapProductIdsConfigured() ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                  <p className="text-xs font-semibold text-slate-700">Abonnement</p>
                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    Gestion et résiliation passent par Apple.
                  </p>
                  {purchaseNotice ? (
                    <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-800">
                      {purchaseNotice}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void openSubscriptionManagement()}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                  >
                    Gérer mon abonnement
                  </button>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <SubscriptionLegalLinks />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        setPurchaseNotice(null);
                        try {
                          await restoreSubscriptionPurchases();
                          const ok = await hasActiveSubscriptionFromStore();
                          if (ok) {
                            setHasActiveSubscription(true);
                            setPurchaseNotice("Abonnement retrouvé - accès débloqué.");
                          } else {
                            setPurchaseNotice(
                              "Aucun abonnement actif trouvé pour ce compte magasin. Si tu viens d’acheter, attends quelques minutes puis réessaie.",
                            );
                          }
                        } catch {
                          setPurchaseNotice("Restauration impossible pour le moment. Réessaie plus tard.");
                        }
                      })();
                    }}
                    className="mt-2 w-full rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-100"
                  >
                    Restaurer mes achats
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <PlanView
        profile={displayedProfile}
        mealChecklist={mealChecklistStore.value}
        mealOverrides={mealOverridesStore.value}
        deviationLog={deviationLogStore.value}
        waterProgress={waterProgressStore.value}
        stepProgress={stepProgressStore.value}
        onUpdateWaterProgress={(key, value) => {
          if (!canEditProgramDay(programDayFromTrackingKey(key))) return;
          waterProgressStore.update({
            ...waterProgressStore.value,
            [key]: value,
          });
        }}
        onUpdateStepProgress={(key, value) => {
          if (!canEditProgramDay(programDayFromTrackingKey(key))) return;
          stepProgressStore.update({
            ...stepProgressStore.value,
            [key]: value,
          });
        }}
        onToggleMeal={(key) => {
          const jour = programDayFromTrackingKey(key);
          if (!canEditProgramDay(jour)) return;
          mealChecklistStore.update({
            ...mealChecklistStore.value,
            [key]: !mealChecklistStore.value[key],
          });
        }}
        onSetMealOverride={(key, override) => {
          const jour = programDayFromTrackingKey(key);
          if (!canEditProgramDay(jour)) return;
          const next = { ...mealOverridesStore.value };
          if (!override) {
            delete next[key];
          } else {
            next[key] = { ...override, source: override.source ?? "manual" };
          }
          mealOverridesStore.update(next);
        }}
        onAddDeviation={(programDay, entry) => {
          if (!canEditProgramDay(programDay)) return;
          const storageKey = deviationStorageKey(programDay);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          deviationLogStore.update({
            ...deviationLogStore.value,
            [storageKey]: [
              ...(deviationLogStore.value[storageKey] ?? []),
              { ...entry, id, loggedAtIso: new Date().toISOString() },
            ],
          });
        }}
        onRemoveDeviation={(programDay, entryId) => {
          if (!canEditProgramDay(programDay)) return;
          const storageKey = deviationStorageKey(programDay);
          const current = deviationLogStore.value[storageKey] ?? [];
          deviationLogStore.update({
            ...deviationLogStore.value,
            [storageKey]: current.filter((e) => e.id !== entryId),
          });
        }}
        onActiveProgramDayFullyValidated={undefined}
        goToDay={goToDay}
      />
    </main>
  );
}

function scopedStorageKey(baseKey: string, userScope: string) {
  return `${baseKey}_${userScope}`;
}
