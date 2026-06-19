"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

import { AppleSignInCard } from "@/components/AppleSignInCard";
import { AppIconSvg } from "@/components/AppIconSvg";
import { BrandLogo } from "@/components/BrandLogo";
import { OnboardingForm } from "@/components/OnboardingForm";
import { SubscriptionLegalLinks } from "@/components/SubscriptionLegalLinks";
import { PlanView, programDayToDateLabel } from "@/components/PlanView";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getMealPlan,
  getProgramDayCount,
  getTodayJourInProgram,
  shiftProgramStartEarlierByOneDay,
} from "@/utils/mealPlan";
import { canAccessPlan, normalizeParcours, normalizeStoredProfile } from "@/utils/profileMigrate";
import { iapProductIdsConfigured } from "@/config/iap";
import { writeEntitlement, readEntitlement } from "@/utils/entitlement";
import { programDayFromTrackingKey } from "@/utils/planTracking";
import { toCapacitorStaticFileHref } from "@/utils/capacitorStaticHref";
import {
  hasActiveSubscriptionFromStore,
  openSubscriptionManagement,
  restoreSubscriptionPurchases,
} from "@/utils/subscriptionPurchase";
import { buildSevenDayShoppingList, formatGrammesShopping } from "@/utils/shoppingList";
import { computePlanDayWeightSnapshot, formatWeightKg } from "@/utils/weightSummary";
import { STORAGE_KEYS, todayIso, todayIsoLocal } from "@/utils/storage";
import {
  DailyTrackingData,
  MealChecklistState,
  OnboardingData,
  StepProgressState,
  AuthSession,
  WaterProgressState,
} from "@/utils/types";

const safeTopPadding = "max(3.25rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))";

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
  parcoursPerte: "j90",
};

interface AppShellProps {
  forcePlan?: boolean;
}

export function AppShell({ forcePlan = false }: AppShellProps) {
  void forcePlan;
  const router = useRouter();
  const [editingProfile, setEditingProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [goToDay, setGoToDay] = useState<{ jour: number; ts: number } | null>(null);
  const closeSettings = useCallback(() => {
    setPurchaseNotice(null);
    setSettingsOpen(false);
  }, []);
  const authStore = useLocalStorage<AuthSession | null>(STORAGE_KEYS.authSession, null);
  const userScope = authStore.value?.userId ?? "guest";
  const hasEntitlement = Boolean(authStore.value?.userId && readEntitlement(authStore.value.userId));
  const profileStore = useLocalStorage<OnboardingData | null>(scopedStorageKey(STORAGE_KEYS.onboarding, userScope), null);
  const trackingStore = useLocalStorage<DailyTrackingData>(scopedStorageKey(STORAGE_KEYS.tracking, userScope), initialTracking);
  const hydrationStore = useLocalStorage<number>(scopedStorageKey(STORAGE_KEYS.hydrationMl, userScope), 0);
  const hydrationDateStore = useLocalStorage<string>(scopedStorageKey(STORAGE_KEYS.hydrationDate, userScope), todayIso());
  const mealChecklistStore = useLocalStorage<MealChecklistState>(scopedStorageKey(STORAGE_KEYS.mealChecklist, userScope), {});
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

  const headerTitle = useMemo(() => {
    return "Régime SOPK";
  }, []);

  const activeProfile = profileStore.value;
  const savedProfileNorm = normalizeStoredProfile(activeProfile);

  useEffect(() => {
    const uid = authStore.value?.userId;
    if (!uid) return;
    if (readEntitlement(uid)) return;
    const p = normalizeStoredProfile(profileStore.value);
    if (!p) return;
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
    if (!canAccessPlan(normalizeStoredProfile(raw), { hasEntitlement })) return;
    const norm = normalizeStoredProfile(raw);
    const start = norm?.programStartDateIso?.trim();
    if (!start) return;
    profileStore.update({ ...raw, programStartDateIso: start });
  }, [authStore.value, hasEntitlement, activeProfile]);

  const skipPricingForEditor =
    hasEntitlement ||
    savedProfileNorm?.billingPreference === "monthly" ||
    savedProfileNorm?.billingPreference === "yearly";

  const displayedProfile = normalizeStoredProfile(activeProfile ?? fallbackProfile) ?? fallbackProfile;
  const plan = getMealPlan({ parcoursPerte: displayedProfile.parcoursPerte });
  const projectionHorizonJours = getProgramDayCount(displayedProfile.parcoursPerte);
  const todayJourPlan = useMemo(
    () => getTodayJourInProgram(projectionHorizonJours, displayedProfile.programStartDateIso),
    [projectionHorizonJours, displayedProfile.programStartDateIso],
  );
  const headerWeight = useMemo(
    () =>
      computePlanDayWeightSnapshot(
        displayedProfile,
        plan.jours,
        todayJourPlan,
        mealChecklistStore.value,
        waterProgressStore.value,
        stepProgressStore.value,
      ),
    [
      displayedProfile,
      plan.jours,
      todayJourPlan,
      mealChecklistStore.value,
      waterProgressStore.value,
      stepProgressStore.value,
    ],
  );

  const shoppingList7 = useMemo(
    () => buildSevenDayShoppingList(displayedProfile, plan.jours, todayJourPlan),
    [displayedProfile, plan.jours, todayJourPlan],
  );

  const archiveDays = useMemo(
    () => plan.jours.filter((d) => d.jour < todayJourPlan).sort((a, b) => a.jour - b.jour),
    [plan.jours, todayJourPlan],
  );
  const futureDays = useMemo(
    () => plan.jours.filter((d) => d.jour > todayJourPlan),
    [plan.jours, todayJourPlan],
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
        style={{ paddingTop: safeTopPadding, scrollPaddingTop: safeTopPadding }}
      >
        <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
          <OnboardingForm
            userScope={userScope}
            skipPricingStep={skipPricingForEditor}
            resumeProfile={savedProfileNorm}
            onCancelResume={() => setEditingProfile(false)}
            onComplete={(profile) => {
              try {
                window.localStorage.removeItem(`${STORAGE_KEYS.onboardingDraft}_${userScope}`);
              } catch {
                /* ignore */
              }
              if (authStore.value?.userId) {
                writeEntitlement(authStore.value.userId);
              }
              profileStore.update({
                ...profile,
                parcoursPerte: normalizeParcours(profile.parcoursPerte),
                onboardingCompleted: true,
                programStartDateIso:
                  profile.programStartDateIso?.trim() ||
                  savedProfileNorm?.programStartDateIso ||
                  todayIsoLocal(),
              });
              setEditingProfile(false);
            }}
          />
        </div>
      </main>
    );
  }

  if (!canAccessPlan(savedProfileNorm, { hasEntitlement })) {
    return (
      <main
        className="mx-auto flex h-[100dvh] min-h-0 max-h-[100dvh] w-full max-w-2xl flex-col items-stretch overflow-hidden bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4 pb-2"
        style={{ paddingTop: safeTopPadding, scrollPaddingTop: safeTopPadding }}
      >
        <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
          <OnboardingForm
            userScope={userScope}
            onComplete={(profile) => {
              try {
                window.localStorage.removeItem(`${STORAGE_KEYS.onboardingDraft}_${userScope}`);
              } catch {
                /* ignore */
              }
              profileStore.update({
                ...profile,
                parcoursPerte: normalizeParcours(profile.parcoursPerte),
                onboardingCompleted: true,
                programStartDateIso: todayIsoLocal(),
              });
              if (authStore.value?.userId) {
                writeEntitlement(authStore.value.userId);
              }
            }}
            onLeaveToAuth={() => {
              authStore.update(null);
            }}
          />
        </div>
      </main>
    );
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
    profileStore.update({
      ...displayedProfile,
      programStartDateIso: todayIsoLocal(),
      trackingResetEpoch: (displayedProfile.trackingResetEpoch ?? 0) + 1,
    });
  }

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-6xl p-4 pb-24 md:p-6 lg:p-8"
      style={{
        paddingTop: safeTopPadding,
        scrollPaddingTop: safeTopPadding,
        backgroundColor: "#f7f7ff",
      }}
    >
      <header className="relative mb-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 p-4 pb-5 text-white shadow-lg shadow-violet-300/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <BrandLogo variant="inverse" className="shrink-0 pt-0.5" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight">{headerTitle}</h1>
              <p className="mt-1 text-sm leading-snug text-violet-100">
                Jour programme <span className="font-semibold text-white">{todayJourPlan}</span> suivi des repas,
                eau et pas.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Ouvrir les réglages"
            aria-expanded={settingsOpen}
            onClick={() => {
              setPurchaseNotice(null);
              setSettingsOpen(true);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.97]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
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
          </button>
        </div>

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
            className="max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 id="settings-title" className="text-lg font-bold text-slate-900">
                Réglages
              </h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeSettings}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 space-y-4">
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
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
                          const uid = authStore.value?.userId;
                          if (ok && uid) {
                            writeEntitlement(uid);
                            setPurchaseNotice("Abonnement retrouvé — accès débloqué.");
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
                    className="mt-2 w-full rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
                  >
                    Restaurer mes achats
                  </button>
                </div>
              ) : null}

              <details className="rounded-xl border border-slate-200 bg-slate-50/90 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                  <span>Liste de courses (7 jours)</span>
                  <svg className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 [[open]>&]:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                  <p className="text-[10px] leading-snug text-slate-500">
                    Jours <strong>{shoppingList7.startJour}</strong> à <strong>{shoppingList7.endJour}</strong> ({shoppingList7.spanDays} jours)
                  </p>
                  {shoppingList7.lines.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Aucun ingrédient pour cette période.</p>
                  ) : (
                    <ul className="mt-2 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {shoppingList7.lines.map((line) => (
                        <li key={line.aliment} className="flex items-baseline justify-between gap-2 px-2.5 py-2 text-xs">
                          <span className="min-w-0 flex-1 font-medium text-slate-900">{line.aliment}</span>
                          <span className="shrink-0 tabular-nums font-semibold text-slate-600">{formatGrammesShopping(line.grammes)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              {archiveDays.length > 0 ? (
                <details className="rounded-xl border border-slate-200 bg-slate-50/90 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                    <span>Archives</span>
                    <span className="text-xs font-semibold text-slate-500">{archiveDays.length} jour{archiveDays.length > 1 ? "s" : ""}</span>
                  </summary>
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-3 pb-3 pt-2">
                    {archiveDays.map((d) => (
                      <button
                        key={d.jour}
                        type="button"
                        onClick={() => {
                          setGoToDay({ jour: d.jour, ts: Date.now() });
                          closeSettings();
                        }}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/90 transition hover:bg-slate-50"
                      >
                        {programDayToDateLabel(d.jour, displayedProfile.programStartDateIso)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}

              {futureDays.length > 0 ? (
                <details className="rounded-xl border border-violet-100 bg-violet-50/90 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-100/80">
                    <span>Jours suivants</span>
                    <span className="text-xs font-semibold text-violet-600">{futureDays.length} jour{futureDays.length > 1 ? "s" : ""}</span>
                  </summary>
                  <div className="flex flex-wrap gap-1.5 border-t border-violet-200 px-3 pb-3 pt-2">
                    {futureDays.map((d) => (
                      <button
                        key={d.jour}
                        type="button"
                        onClick={() => {
                          setGoToDay({ jour: d.jour, ts: Date.now() });
                          closeSettings();
                        }}
                        className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-violet-800 ring-1 ring-violet-200/80 transition hover:bg-violet-100/60"
                      >
                        {programDayToDateLabel(d.jour, displayedProfile.programStartDateIso)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  closeSettings();
                  window.requestAnimationFrame(() => {
                    setEditingProfile(true);
                  });
                }}
                className="w-full rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
              >
                Modifier le profil
              </button>

              <button
                type="button"
                onClick={() => {
                  closeSettings();
                  resetProgramData();
                }}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Reset du suivi
              </button>

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
            </div>
          </div>
        </div>
      ) : null}

      <PlanView
        profile={displayedProfile}
        mealChecklist={mealChecklistStore.value}
        waterProgress={waterProgressStore.value}
        stepProgress={stepProgressStore.value}
        onUpdateWaterProgress={(key, value) => {
          if (programDayFromTrackingKey(key) !== todayJourPlan) return;
          waterProgressStore.update({
            ...waterProgressStore.value,
            [key]: value,
          });
        }}
        onUpdateStepProgress={(key, value) => {
          if (programDayFromTrackingKey(key) !== todayJourPlan) return;
          stepProgressStore.update({
            ...stepProgressStore.value,
            [key]: value,
          });
        }}
        onToggleMeal={(key) => {
          const jour = programDayFromTrackingKey(key);
          // Repas, validation manuelle : uniquement le jour « Aujourd’hui » (pas les jours suivants ni passé).
          if (jour == null || jour !== todayJourPlan) return;
          mealChecklistStore.update({
            ...mealChecklistStore.value,
            [key]: !mealChecklistStore.value[key],
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
