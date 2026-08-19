"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import type { Product } from "@capgo/native-purchases";

import { BrandLogo } from "@/components/BrandLogo";
import { AppIconSvg } from "@/components/AppIconSvg";
import { APP_NAME } from "@/config/appBrand";
import { SubscriptionLegalLinks } from "@/components/SubscriptionLegalLinks";
import { capacitorPublicAsset } from "@/utils/capacitorStaticHref";
import { isCapacitorNative } from "@/utils/capacitorRuntime";
import { getEstimatedDailyLossGrams } from "@/utils/mealPlan";
import { normalizeParcours } from "@/utils/profileMigrate";
import {
  buildDiagnosticsForProfile,
  COMORBIDITY_UNKNOWN,
  comorbiditiesOnly,
  comorbiditySelection,
  DIAGNOSTIC_NONE,
  isSopkNutritionProfile,
  PROFIL_NUTRITION_OPTIONS,
  profileNutritionShortLabel,
  resolveProfilNutrition,
} from "@/utils/profilePath";
import { STORAGE_KEYS, isoDateLocalLabelFr } from "@/utils/storage";
import type { OnboardingData, ParcoursPerte, ProfilNutrition } from "@/utils/types";
import {
  fetchSubscriptionProducts,
  purchaseSubscription,
  shouldUseNativeIap,
} from "@/utils/subscriptionPurchase";
import {
  formatPriceAfterIntro,
  getIntroOfferMissingMessage,
  getNativeTrialFooterText,
  getProductIntroLabel,
  getSubscribeCtaLabel,
  hasConfirmedStoreFreeTrial,
} from "@/utils/subscriptionIntro";
import { buildWeightCurveEased } from "@/utils/weightSummary";
import {
  ALLERGY_ITEMS,
  EXCLUSION_ITEMS,
  FOOD_PREFERENCES,
  REGIME_OPTIONS,
} from "@/data/foodPreferenceCatalog";
import { brand } from "@/styles/brand";

interface OnboardingFormProps {
  /** Identifiant utilisateur (Apple userId) pour isoler le brouillon d’onboarding. */
  userScope: string;
  onComplete: (value: OnboardingData) => void;
  /** Retour à l’écran « Connexion avec Apple » depuis la première étape. */
  onLeaveToAuth?: () => void;
  /** Ne pas redemander l’offre (utilisateur déjà abonné / droits conservés). */
  skipPricingStep?: boolean;
  /** Préremplir depuis le profil enregistré (modification sans perdre l’abonnement). */
  resumeProfile?: OnboardingData | null;
  /** Fermer l’éditeur sans enregistrer (modification profil). */
  onCancelResume?: () => void;
  /** Date ISO affichée dans l’avertissement (réinitialisation jour 1). */
  profileEditResetDateLabel?: string;
}

const COMORBIDITY_ITEMS = [
  "Endométriose",
  "Hypothyroïdie / Hashimoto",
  "Ménopause / périménopause",
  "Résistance à l’insuline",
] as const;

const ONBOARDING_STEP_META: { phase: string; hint: string; footer?: string }[] = [
  {
    phase: "Bienvenue",
    hint: "Régime adapté à votre profil, avec ou sans SOPK",
    footer: "Environ 2 minutes · programme sur mesure · sans engagement avant l’essai.",
  },
  {
    phase: "Votre profil",
    hint: "Choisissez le parcours qui vous correspond",
    footer: "Vous pourrez le modifier dans les paramètres.",
  },
  { phase: "Votre corps", hint: "Pour calibrer calories, eau et portions", footer: "Vos données restent sur votre appareil." },
  { phase: "Votre corps", hint: "Hydratation et portions ajustées à votre morphologie" },
  { phase: "Vos objectifs", hint: "Des cibles réalistes, encadrées par l’équipe diététique" },
  { phase: "Votre quotidien", hint: "Ce qui revient le plus souvent au quotidien" },
  {
    phase: "Profils associés",
    hint: "Facultatif · pour affiner les repères si vous avez d’autres diagnostics",
    footer: "Vous pouvez laisser « Je ne sais pas » et continuer.",
  },
  { phase: "Mouvement", hint: "Objectif pas ajusté sans vous mettre la pression" },
  { phase: "Vos habitudes", hint: "Un plan tenable, pas un sprint impossible" },
  { phase: "Vos goûts", hint: "Régime et aliments que vous aimez" },
  { phase: "Vos goûts", hint: "Allergies et exclusions de goût" },
  {
    phase: "Votre rythme",
    hint: "Même cible · quatre vitesses",
    footer: "Estimation indicative · votre médecin reste le repère essentiel.",
  },
  { phase: "Dernière étape", hint: "Essai gratuit · annulable dans l’App Store" },
];

const ONBOARDING_DRAFT_VERSION = 3;

const WELCOME_TRUST_PILLARS = [
  { title: "Menus adaptés", desc: "30 jours à 1 an selon votre horizon" },
  { title: "Repères clairs", desc: "Calories, eau, pas calibrés pour vous" },
  { title: "Sans promesse miracle", desc: "Méthode tenable, repas concrets" },
] as const;

const defaultProfile: OnboardingData = {
  prenom: "",
  age: 36,
  poidsKg: 87,
  tailleCm: 165,
  parcoursPerte: "j90",
  objectifPoidsKg: 77,
  profilNutrition: undefined,
  diagnostics: [],
  // Aucune réponse n'est cochée à la place de l'utilisatrice : une allergie ou un
  // symptôme pré-coché serait une donnée de santé inventée.
  symptomes: [],
  niveauActivite: "Sédentaire",
  rythmeRepas: "3 repas",
  tempsCuisine: "15 - 30 min",
  regimeAlimentaire: "Omnivore",
  alimentsPreferes: [],
  allergies: [],
  alimentsDetestes: [],
  billingPreference: "yearly",
};

function draftStorageKey(userScope: string) {
  return `${STORAGE_KEYS.onboardingDraft}_${userScope}`;
}

/** Migre l’étape sauvegardée selon la version du brouillon (12 étapes max). */
function migrateOnboardingDraftStep(rawStep: number, draftVersion = 0): number {
  let s = Math.floor(rawStep);
  if (draftVersion < 1) {
    if (s <= 2) s = 0;
    else if (s >= 3 && s <= 5) s = s - 2;
    else if (s === 6) s = 4;
    else if (s >= 7 && s <= 10) s = Math.min(10, s - 2);
    else if (s === 11) s = 9;
    else if (s === 12) s = 10;
    else if (s >= 5 && s <= 10) s = Math.min(10, s + 1);
  }
  if (draftVersion < 2 && s >= 9) s = Math.min(11, s + 1);
  if (draftVersion < 3 && s >= 1) s = Math.min(12, s + 1);
  return Math.max(0, Math.min(12, s));
}

function readOnboardingDraft(userScope: string): { step: number; profile: OnboardingData } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(userScope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: unknown; profile?: OnboardingData; draftVersion?: number };
    if (typeof parsed.step !== "number" || !parsed.profile || !Number.isFinite(parsed.step)) return null;
    const migratedStep = migrateOnboardingDraftStep(Math.floor(parsed.step), parsed.draftVersion ?? 0);
    const draftProfile = { ...parsed.profile };
    delete draftProfile.onboardingCompleted;
    const diagnostics = (draftProfile.diagnostics ?? []).filter((d) => d !== DIAGNOSTIC_NONE);
    return {
      step: Math.max(0, Math.min(12, migratedStep)),
      profile: {
        ...defaultProfile,
        ...draftProfile,
        diagnostics,
        parcoursPerte: normalizeParcours(draftProfile.parcoursPerte as string),
      },
    };
  } catch {
    return null;
  }
}

export function OnboardingForm({
  userScope,
  onComplete,
  onLeaveToAuth,
  skipPricingStep = false,
  resumeProfile = null,
  onCancelResume,
  profileEditResetDateLabel,
}: OnboardingFormProps) {
  /** Produits abonnement (App Store / Play) - undefined = pas encore chargé, null = échec. */
  const [iapProducts, setIapProducts] = useState<{ monthly: Product; yearly: Product } | null | undefined>(undefined);
  const [iapError, setIapError] = useState<string | null>(null);
  const [iapBusy, setIapBusy] = useState(false);

  const [profile, setProfile] = useState<OnboardingData>(() => {
    if (resumeProfile) {
      const merged = { ...defaultProfile, ...resumeProfile };
      delete merged.onboardingCompleted;
      return {
        ...merged,
        parcoursPerte: normalizeParcours(resumeProfile.parcoursPerte as string),
      };
    }
    const d = readOnboardingDraft(userScope);
    return d?.profile ?? defaultProfile;
  });
  const [step, setStep] = useState(() => (resumeProfile ? 0 : readOnboardingDraft(userScope)?.step ?? 0));
  const stepScrollRef = useRef<HTMLDivElement | null>(null);
  /** 0 accueil, 1 parcours nutrition, 2-10 profil, 11 projection, 12 offre (sauf si skipPricingStep). */
  const stepCount = skipPricingStep ? 12 : 13;
  const lastNavigableStep = skipPricingStep ? 11 : 12;

  useEffect(() => {
    if (typeof window === "undefined" || resumeProfile) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftStorageKey(userScope),
          JSON.stringify({ step, profile, draftVersion: ONBOARDING_DRAFT_VERSION }),
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [step, profile, userScope, resumeProfile]);

  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    stepScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (skipPricingStep || step !== 12) {
      setIapProducts(undefined);
      setIapError(null);
      return;
    }
    if (!shouldUseNativeIap()) {
      setIapProducts(null);
      setIapError(null);
      return;
    }
    let cancelled = false;
    setIapProducts(undefined);
    setIapError(null);
    void fetchSubscriptionProducts()
      .then((r) => {
        if (cancelled) return;
        setIapProducts(r);
        if (!r) {
          setIapError("Impossible de charger les offres depuis l'App Store. Réessaie dans un instant.");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setIapProducts(null);
        setIapError(e instanceof Error ? e.message : "Erreur lors du chargement des offres.");
      });
    return () => {
      cancelled = true;
    };
  }, [skipPricingStep, step]);

  const projectedDailyLossGrams = getEstimatedDailyLossGrams(profile, 1, 1, 1);
  const projected30DayLossKg = (projectedDailyLossGrams * 30) / 1000;
  const projectedTargetWeightKg = Math.max(0, profile.poidsKg - projected30DayLossKg);
  const targetKg =
    profile.objectifPoidsKg != null && profile.objectifPoidsKg < profile.poidsKg
      ? profile.objectifPoidsKg
      : Math.min(profile.poidsKg - 2, projectedTargetWeightKg);
  const deltaKg = Math.max(0.1, profile.poidsKg - targetKg);

  const iapGateBlocksContinue = useMemo(() => {
    if (skipPricingStep || step !== 12) return false;
    if (!shouldUseNativeIap()) return false;
    return iapProducts === undefined || iapProducts === null;
  }, [iapProducts, skipPricingStep, step]);

  const canProceed = useMemo(() => {
    if (step === 1 && !profile.profilNutrition) return false;
    if (!skipPricingStep && step === 12) {
      if (!profile.billingPreference) return false;
      if (iapGateBlocksContinue) return false;
    }
    return true;
  }, [iapGateBlocksContinue, profile.billingPreference, profile.profilNutrition, skipPricingStep, step]);

  function handleStart() {
    const age = Number.isFinite(Number(profile.age)) ? Number(profile.age) : 30;
    const poidsKg = Number.isFinite(Number(profile.poidsKg)) ? Number(profile.poidsKg) : 78;
    const tailleCm = Number.isFinite(Number(profile.tailleCm)) ? Number(profile.tailleCm) : 165;
    const objectifPoidsKg = Number.isFinite(Number(profile.objectifPoidsKg))
      ? Number(profile.objectifPoidsKg)
      : Math.max(40, poidsKg - 7);

    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    const profilNutrition = resolveProfilNutrition(profile);
    const comorbidities = comorbiditiesOnly(profile.diagnostics);

    onComplete({
      ...profile,
      prenom: "",
      age: Math.min(60, Math.max(18, age)),
      poidsKg: Math.min(180, Math.max(40, poidsKg)),
      tailleCm: Math.min(210, Math.max(130, tailleCm)),
      objectifPoidsKg: Math.min(150, Math.max(35, objectifPoidsKg)),
      profilNutrition,
      diagnostics: buildDiagnosticsForProfile(profilNutrition, comorbidities),
      parcoursPerte: normalizeParcours(profile.parcoursPerte),
      billingPreference: profile.billingPreference ?? "yearly",
      onboardingCompleted: true,
    });
  }

  const selectedStoreProduct = useMemo(() => {
    if (!iapProducts) return undefined;
    const plan = profile.billingPreference ?? "yearly";
    return plan === "monthly" ? iapProducts.monthly : iapProducts.yearly;
  }, [iapProducts, profile.billingPreference]);

  async function nextStep() {
    if (!canProceed || iapBusy) return;
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    if (step === lastNavigableStep) {
      if (!skipPricingStep && shouldUseNativeIap()) {
        const pack = iapProducts;
        if (!pack?.monthly || !pack?.yearly) return;
        const plan = profile.billingPreference ?? "yearly";
        const product = plan === "monthly" ? pack.monthly : pack.yearly;
        setIapBusy(true);
        setIapError(null);
        try {
          await purchaseSubscription(plan, product);
          handleStart();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e ?? "");
          if (/cancel|annul|annulée|user cancelled/i.test(msg)) {
            setIapError("Abonnement annulé. Vous pouvez réessayer quand vous voulez.");
          } else {
            setIapError(msg || "L’abonnement n’a pas abouti. Réessayez ou vérifiez votre compte App Store.");
          }
        } finally {
          setIapBusy(false);
        }
        return;
      }
      handleStart();
      return;
    }
    const next = Math.min(lastNavigableStep, step + 1);
    setStep(next);
  }

  function previousStep() {
    setStep((current) => Math.max(0, current - 1));
  }

  function toggleArrayValue(
    field: "symptomes" | "alimentsPreferes" | "allergies" | "alimentsDetestes",
    value: string,
  ) {
    setProfile((prev) => {
      const source = prev[field] ?? [];
      const adding = !source.includes(value);
      const nextField = adding ? [...source, value] : source.filter((item) => item !== value);
      if (!adding) {
        return { ...prev, [field]: nextField };
      }
      const next: typeof prev = { ...prev, [field]: nextField };
      if (field === "allergies") {
        next.alimentsDetestes = (prev.alimentsDetestes ?? []).filter((item) => item !== value);
      }
      if (field === "alimentsDetestes") {
        next.allergies = (prev.allergies ?? []).filter((item) => item !== value);
      }
      return next;
    });
  }

  function toggleComorbidity(value: string) {
    setProfile((prev) => {
      const sopk = isSopkNutritionProfile(prev);
      if (value === COMORBIDITY_UNKNOWN) {
        const hasUnknown = (prev.diagnostics ?? []).includes(COMORBIDITY_UNKNOWN);
        const base = sopk ? ["SOPK"] : [];
        return {
          ...prev,
          diagnostics: hasUnknown ? base : [...base, COMORBIDITY_UNKNOWN],
        };
      }
      const current = comorbiditiesOnly(prev.diagnostics);
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, diagnostics: buildDiagnosticsForProfile(resolveProfilNutrition(prev), next) };
    });
  }

  const sopkOnboarding = isSopkNutritionProfile(profile);

  const diagnosticTag = useMemo(() => {
    const tags = comorbiditiesOnly(profile.diagnostics);
    if (tags.length > 0) return tags.join(" · ");
    return profileNutritionShortLabel(profile);
  }, [profile]);
  const profileEditResetLabel = profileEditResetDateLabel
    ? isoDateLocalLabelFr(profileEditResetDateLabel)
    : "aujourd'hui";

  const stepMeta = ONBOARDING_STEP_META[step] ?? ONBOARDING_STEP_META[0];
  const progressPercent = Math.round(((step + 1) / stepCount) * 100);

  function handleBack() {
    if (step === 0 && onCancelResume) {
      onCancelResume();
      return;
    }
    if (step === 0 && onLeaveToAuth) {
      onLeaveToAuth();
      return;
    }
    previousStep();
  }

  const showBackButton = step > 0 || (step === 0 && (onLeaveToAuth || onCancelResume));

  return (
    <section
      className={`relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-[22px] border border-brand-200/70 bg-gradient-to-b ${brand.shell} shadow-elevated sm:rounded-[28px]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(109,90,125,0.14),transparent)]" />
      <div className="pointer-events-none absolute -right-20 top-32 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 bottom-40 h-40 w-40 rounded-full bg-brand-600/8 blur-3xl" aria-hidden />

      <header className="relative shrink-0 px-3 pb-1.5 pt-0.5 sm:px-4">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200/80 bg-white/90 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50 active:scale-[0.97]"
            >
              ←
            </button>
          ) : (
            <div className="h-8 w-8 shrink-0" aria-hidden />
          )}
          {step === 0 ? (
            <div className="min-w-0 flex-1" aria-hidden />
          ) : (
            <BrandLogo variant="minimal" className="min-w-0 flex-1" sopkFocus={sopkOnboarding} />
          )}
          <div className="shrink-0 rounded-full border border-brand-200/90 bg-white/90 px-2 py-0.5 shadow-sm">
            <p className="text-[10px] font-bold tabular-nums text-brand-700">
              {step + 1}
              <span className="font-medium text-brand-400"> / {stepCount}</span>
            </p>
          </div>
        </div>

        <div className="mt-1.5">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-brand-600">{stepMeta.phase}</p>
            <p className="shrink-0 text-[10px] font-semibold tabular-nums text-brand-500">{progressPercent} %</p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-brand-200/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-accent transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {onCancelResume ? (
        <div className="relative z-10 mx-3 mt-0.5 shrink-0 rounded-lg border border-amber-200/90 bg-amber-50/95 px-2.5 py-1.5 shadow-sm sm:mx-4">
          <p className="text-[10px] leading-snug text-amber-950">
            Enregistrer remet le jour 1 au <strong className="font-semibold">{profileEditResetLabel}</strong>.
          </p>
        </div>
      ) : null}

      <div
        ref={stepScrollRef}
        className="relative flex min-h-0 flex-1 flex-col justify-start overflow-y-auto overscroll-y-contain px-3 py-2 [-webkit-overflow-scrolling:touch] sm:px-4"
      >

        {step === 0 ? (
          <WelcomeHero />
        ) : null}

        {step === 1 ? (
          <OnboardingStepCard>
            <ProfilNutritionStep
              selected={profile.profilNutrition}
              onSelect={(profilNutrition: ProfilNutrition) =>
                setProfile((prev) => ({
                  ...prev,
                  profilNutrition,
                  diagnostics: buildDiagnosticsForProfile(profilNutrition, comorbiditiesOnly(prev.diagnostics)),
                }))
              }
            />
          </OnboardingStepCard>
        ) : null}

        {step === 2 ? (
          <OnboardingStepCard>
            <SliderScreen
              title="Votre âge"
              subtitle="Pour calibrer calories, eau et portions."
              value={profile.age}
              unit="ans"
              min={18}
              max={60}
              onChange={(value) => setProfile((prev) => ({ ...prev, age: value }))}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 3 ? (
          <OnboardingStepCard>
            <SliderScreen
              title="Votre taille"
              subtitle="Hydratation et portions ajustées à votre morphologie."
              value={profile.tailleCm}
              unit="cm"
              min={140}
              max={210}
              onChange={(value) => setProfile((prev) => ({ ...prev, tailleCm: value }))}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 4 ? (
          <OnboardingStepCard>
            <div>
              <h3 className={`text-[22px] font-bold leading-snug sm:text-[24px] ${brand.text}`}>
                Poids de départ et cible
              </h3>
              <p className={`mt-2 text-base leading-snug sm:text-[17px] ${brand.muted}`}>
                Objectifs compatibles avec un suivi encadré (en général 0,5 à 1 kg/semaine).
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumericCard label="Poids" value={profile.poidsKg} onChange={(v) => setProfile((p) => ({ ...p, poidsKg: v }))} />
                <NumericCard
                  label="Cible"
                  value={profile.objectifPoidsKg ?? 77}
                  onChange={(v) => setProfile((p) => ({ ...p, objectifPoidsKg: v }))}
                />
              </div>
            </div>
          </OnboardingStepCard>
        ) : null}

        {step === 5 ? (
          <OnboardingStepCard>
            <ChoiceScreen
              title="Ce qui vous parle le plus"
              subtitle={
                sopkOnboarding
                  ? "Cochez ce qui revient souvent avec le SOPK."
                  : "Cochez ce qui vous parle le plus au quotidien."
              }
              items={[
                "Coupes de fatigue à répétition",
                "Fringales difficiles à calmer",
                "Ventre gonflé ou inconfort digestif",
                "Graisse qui se concentre au niveau du ventre",
                "Nuits agitées ou trop courtes",
                "Humeur qui varie vite",
                "Jambes lourdes / sensation de rétention",
                "Peu ou pas de tout cela",
              ]}
              selected={profile.symptomes ?? []}
              onPick={(v) => toggleArrayValue("symptomes", v)}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 6 ? (
          <OnboardingStepCard>
            <ChoiceScreen
              title="Profils associés"
              subtitle="Facultatif · ou « Je ne sais pas »."
              items={[...COMORBIDITY_ITEMS, COMORBIDITY_UNKNOWN]}
              selected={comorbiditySelection(profile.diagnostics)}
              onPick={(v) => toggleComorbidity(v)}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 7 ? (
          <OnboardingStepCard>
            <ChoiceScreen
              singleSelect
              title="Mouvement au quotidien"
              subtitle="Une seule réponse · pas ajustés sans pression."
              items={["Sédentaire", "Légèrement active", "Modérément active", "Très active"]}
              selected={[profile.niveauActivite ?? "Sédentaire"]}
              onPick={(v) => setProfile((prev) => ({ ...prev, niveauActivite: v }))}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 8 ? (
          <OnboardingStepCard>
            <div>
              <h3 className={`text-[22px] font-bold leading-snug sm:text-[24px] ${brand.text}`}>Repas et cuisine</h3>
              <p className={`mt-2 text-base leading-snug sm:text-[17px] ${brand.muted}`}>
                Un plan tenable pour votre semaine.
              </p>
              <OnboardingSectionLabel>Prises alimentaires</OnboardingSectionLabel>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {["2 repas", "3 repas", "3 repas + collations"].map((item) => (
                  <ChoicePill
                    key={item}
                    label={item}
                    active={profile.rythmeRepas === item}
                    onClick={() => setProfile((p) => ({ ...p, rythmeRepas: item }))}
                  />
                ))}
              </div>
              <OnboardingSectionLabel>Temps pour préparer</OnboardingSectionLabel>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {["Moins de 15 min", "15 - 30 min", "30 - 45 min", "Peu importe"].map((item) => (
                  <ChoicePill
                    key={item}
                    label={item}
                    active={profile.tempsCuisine === item}
                    onClick={() => setProfile((p) => ({ ...p, tempsCuisine: item }))}
                  />
                ))}
              </div>
            </div>
          </OnboardingStepCard>
        ) : null}

        {step === 9 ? (
          <OnboardingStepCard>
            <FoodPreferencesRegimeStep
              profile={profile}
              sopkProfile={sopkOnboarding}
              onToggle={(field, key) => toggleArrayValue(field, key)}
              onRegimeChange={(regimeAlimentaire) => setProfile((p) => ({ ...p, regimeAlimentaire }))}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 10 ? (
          <OnboardingStepCard>
            <FoodPreferencesExclusionsStep
              profile={profile}
              onToggle={(field, key) => toggleArrayValue(field, key)}
            />
          </OnboardingStepCard>
        ) : null}

        {step === 11 ? (
          <OnboardingStepCard>
            <ProjectionStep
              compact
              profile={profile}
              sopkProfile={sopkOnboarding}
              onParcoursChange={(parcoursPerte) =>
                setProfile((p) => ({ ...p, parcoursPerte: normalizeParcours(parcoursPerte) }))
              }
              currentKg={profile.poidsKg}
              targetKg={targetKg}
              deltaKg={deltaKg}
              diagnosticTag={diagnosticTag}
            />
          </OnboardingStepCard>
        ) : null}

        {!skipPricingStep && step === 12 ? (
          <OnboardingStepCard>
            <PricingStep
              compact
              billing={profile.billingPreference ?? "yearly"}
              onSelect={(plan) => setProfile((p) => ({ ...p, billingPreference: plan }))}
              storeProducts={iapProducts}
              storeLoading={shouldUseNativeIap() && iapProducts === undefined}
              nativeIap={shouldUseNativeIap()}
              showStoreConfigHint={false}
              onRetryStore={
                shouldUseNativeIap()
                  ? () => {
                      setIapProducts(undefined);
                      setIapError(null);
                      void fetchSubscriptionProducts()
                        .then((r) => {
                          setIapProducts(r);
                          if (!r) {
                            setIapError(
                              "Impossible de charger les offres depuis l'App Store. Réessaie dans un instant.",
                            );
                          }
                        })
                        .catch((e) => {
                          setIapProducts(null);
                          setIapError(e instanceof Error ? e.message : "Erreur lors du chargement des offres.");
                        });
                    }
                  : undefined
              }
            />
          </OnboardingStepCard>
        ) : null}
        {!skipPricingStep && step === 12 && iapError ? (
          <p className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-[10px] font-semibold leading-snug text-rose-800">
            {iapError}
          </p>
        ) : null}
      </div>

      <footer className="relative z-20 shrink-0 border-t border-brand-200/40 bg-white/90 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(61,42,74,0.15)] backdrop-blur-md sm:px-4">
        <div className="rounded-xl border border-brand-100/80 bg-gradient-to-b from-white to-brand-50/40 p-2 shadow-sm">
          {onCancelResume ? (
            <button
              type="button"
              onClick={onCancelResume}
              className="mb-1.5 h-9 w-full rounded-lg border-2 border-brand-200 bg-white text-[12px] font-bold text-brand-700 transition hover:bg-brand-50"
            >
              Annuler
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void nextStep()}
            disabled={!canProceed || iapBusy}
            aria-disabled={!canProceed || iapBusy}
            className={`relative z-10 h-11 w-full touch-manipulation rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-accent px-3 text-sm font-bold text-white shadow-[0_8px_22px_-6px_rgba(109,90,125,0.4)] transition hover:brightness-105 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99] ${
              !iapBusy && canProceed ? "[animation:onboarding-progress-glow_2.5s_ease-in-out_infinite]" : ""
            }`}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" aria-hidden />
            <span className="relative block w-full text-center">
            {iapBusy
              ? "Abonnement en cours…"
              : skipPricingStep && step === 11
                ? "Enregistrer le profil"
                : step === 11
                  ? "Voir mon offre"
                  : step === 12
                    ? shouldUseNativeIap()
                      ? getSubscribeCtaLabel(selectedStoreProduct, "Commencer l’essai gratuit de 7 jours", true)
                      : "Commencer le programme"
                    : step === 0
                      ? "Commencer mon profil"
                      : "Continuer"}
            </span>
          </button>
          <p className={`mt-1 line-clamp-2 text-center text-xs leading-snug ${brand.muted}`}>
            {stepMeta.footer ??
              stepMeta.hint ??
              (step === 11 && skipPricingStep
                ? "Vos critères sont mis à jour ; votre accès reste inchangé."
                : step === 12 && !skipPricingStep
                  ? shouldUseNativeIap()
                    ? getNativeTrialFooterText(selectedStoreProduct)
                    : "Abonnement et essai via l’App Store."
                  : step < 11
                    ? "Modifiable dans les réglages."
                    : null)}
          </p>
        </div>
      </footer>
    </section>
  );
}

function FoodIconTile({
  emoji,
  label,
  selected,
  onClick,
  compact = false,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
        className={`flex flex-col items-center justify-center rounded-xl border-2 text-center transition active:scale-[0.97] ${
        compact
          ? "min-h-[2.35rem] px-0.5 py-1"
          : "min-h-[4.75rem] px-1 py-2 sm:min-h-[5.25rem] sm:px-1.5 sm:py-2.5"
      } ${
        selected
          ? "border-[#6d5a7d] bg-[#6d5a7d]/10 shadow-sm ring-1 ring-[#6d5a7d]/25"
          : "border-[#e8e2eb] bg-white/90 hover:border-[#cfc8d4]"
      }`}
    >
      <span className={`leading-none ${compact ? "text-base" : "text-2xl sm:text-[1.75rem]"}`} aria-hidden>
        {emoji}
      </span>
      <span
        className={`mt-1 w-full px-0.5 text-center font-semibold leading-snug break-words hyphens-auto ${
          compact ? "text-[8px] line-clamp-2" : "text-[10px] sm:text-[11px] line-clamp-2"
        } ${brand.text}`}
      >
        {label}
      </span>
    </button>
  );
}

function RegimeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-base font-semibold transition active:scale-[0.98] ${
        active
          ? "border-brand-600 bg-brand-600/10 text-brand-800 ring-2 ring-brand-600/20"
          : "border-brand-200 bg-white text-ink hover:border-brand-300"
      }`}
    >
      {label}
    </button>
  );
}

function ProfilNutritionStep({
  selected,
  onSelect,
}: {
  selected?: ProfilNutrition;
  onSelect: (value: ProfilNutrition) => void;
}) {
  return (
    <div className="w-full">
      <h3 className={`text-[22px] font-bold leading-snug sm:text-[26px] ${brand.text}`}>Quel est votre profil ?</h3>
      <p className={`mt-2 text-base leading-snug sm:text-[17px] ${brand.muted}`}>
        Un régime adapté à votre morphologie et votre objectif. Si vous avez le SOPK, nous l’intégrons dans votre
        programme.
      </p>
      <div className="mt-5 space-y-3">
        {PROFIL_NUTRITION_OPTIONS.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`flex min-h-[64px] w-full flex-col justify-center rounded-2xl border-2 px-4 py-3.5 text-left transition active:scale-[0.99] ${
                active
                  ? "border-brand-600 bg-brand-600/8 shadow-sm ring-2 ring-brand-600/20"
                  : "border-[#e8e2eb] bg-white/90 hover:border-[#d4cdd8]"
              }`}
            >
              <span className={`block text-[17px] font-bold leading-snug ${brand.text}`}>{option.title}</span>
              <span className={`mt-1 block text-[15px] leading-snug ${brand.muted}`}>{option.subtitle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FoodPreferencesRegimeStep({
  profile,
  sopkProfile,
  onToggle,
  onRegimeChange,
}: {
  profile: OnboardingData;
  sopkProfile: boolean;
  onToggle: (field: "alimentsPreferes", key: string) => void;
  onRegimeChange: (regime: string) => void;
}) {
  return (
    <div className="w-full">
      <h3 className={`text-[22px] font-bold leading-snug sm:text-[24px] ${brand.text}`}>Régime et favoris</h3>
      <p className={`mt-2 text-base leading-snug sm:text-[17px] ${brand.muted}`}>
        {sopkProfile
          ? "Repas compatibles SOPK dès le jour 1."
          : "Repas adaptés à votre profil dès le jour 1."}
      </p>
      <OnboardingSectionLabel>Régime</OnboardingSectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        {REGIME_OPTIONS.map((item) => (
          <RegimeChip
            key={item}
            label={item}
            active={profile.regimeAlimentaire === item}
            onClick={() => onRegimeChange(item)}
          />
        ))}
      </div>
      <OnboardingSectionLabel>Souvent appréciés</OnboardingSectionLabel>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
        {FOOD_PREFERENCES.map(({ key, emoji }) => (
          <FoodIconTile
            key={key}
            emoji={emoji}
            label={key}
            selected={Boolean(profile.alimentsPreferes?.includes(key))}
            onClick={() => onToggle("alimentsPreferes", key)}
          />
        ))}
      </div>
    </div>
  );
}

function FoodPreferencesExclusionsStep({
  profile,
  onToggle,
}: {
  profile: OnboardingData;
  onToggle: (field: "allergies" | "alimentsDetestes", key: string) => void;
}) {
  return (
    <div className="w-full pb-2">
      <h3 className={`text-[22px] font-bold leading-snug sm:text-[24px] ${brand.text}`}>Allergies et exclusions</h3>
      <p className={`mt-2 text-base leading-snug sm:text-[17px] ${brand.muted}`}>
        Facultatif · cochez ce qui s’applique.
      </p>
      <section className="mt-5">
        <OnboardingSectionLabel>Allergènes</OnboardingSectionLabel>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {ALLERGY_ITEMS.map(({ key, emoji }) => (
            <FoodIconTile
              key={key}
              emoji={emoji}
              label={key}
              selected={Boolean(profile.allergies?.includes(key))}
              onClick={() => onToggle("allergies", key)}
            />
          ))}
        </div>
      </section>
      <section className="mt-6">
        <OnboardingSectionLabel>Exclusions (goût)</OnboardingSectionLabel>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {EXCLUSION_ITEMS.map(({ key, emoji }) => (
            <FoodIconTile
              key={key}
              emoji={emoji}
              label={key}
              selected={Boolean(profile.alimentsDetestes?.includes(key))}
              onClick={() => onToggle("alimentsDetestes", key)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Quatre horizons : même cible de poids, forme de courbe (vitesse) différente. */
const PROJECTION_HORIZONS: readonly {
  id: ParcoursPerte;
  days: number;
  cardTitle: string;
  power: number;
  lineColor: string;
  accentClass: string;
  tickIndices: number[];
  tickLabels: string[];
  ariaLabel: string;
  choiceTitle: string;
  choiceHint: string;
}[] = [
  {
    id: "j30",
    days: 30,
    cardTitle: "Intense - 30 jours",
    power: 1.22,
    lineColor: "#9b4d5a",
    accentClass: "text-[#7a3e45]",
    tickIndices: [0, 10, 20, 30],
    tickLabels: ["J1", "J10", "J20", "J30"],
    ariaLabel: "Courbe indicative du poids sur trente jours jusqu’à la cible",
    choiceTitle: "30 jours - intense",
    choiceHint: "Déficit le plus marqué dans le modèle ; discipline forte (repas, eau, marche).",
  },
  {
    id: "j90",
    days: 90,
    cardTitle: "Équilibré - 90 jours",
    power: 1.52,
    lineColor: "#6d5a7d",
    accentClass: brand.muted,
    tickIndices: [0, 30, 60, 90],
    tickLabels: ["J1", "J30", "J60", "J90"],
    ariaLabel: "Courbe indicative du poids sur quatre-vingt-dix jours jusqu’à la cible",
    choiceTitle: "90 jours - équilibré",
    choiceHint: "Compromis fréquent : assez court pour rester motivante, assez long pour s’habituer.",
  },
  {
    id: "j180",
    days: 180,
    cardTitle: "Progressive - 180 jours",
    power: 1.68,
    lineColor: "#5a6b8a",
    accentClass: brand.muted,
    tickIndices: [0, 60, 120, 180],
    tickLabels: ["J1", "J60", "J120", "J180"],
    ariaLabel: "Courbe indicative du poids sur six mois jusqu’à la cible",
    choiceTitle: "180 jours - progressive",
    choiceHint: "Rythme plus doux au quotidien ; les repères nutritionnels restent serrés mais moins « sprint ».",
  },
  {
    id: "j365",
    days: 365,
    cardTitle: "Ancrée - 1 an",
    power: 1.82,
    lineColor: "#4a6d72",
    accentClass: brand.muted,
    tickIndices: [0, 120, 240, 365],
    tickLabels: ["J1", "~4 m.", "~8 m.", "1 an"],
    ariaLabel: "Courbe indicative du poids sur un an jusqu’à la cible",
    choiceTitle: "365 jours - ancrée",
    choiceHint: "Même objectif poids, sur douze mois : idéal pour stabiliser sans yo-yo.",
  },
];

function MiniWeightChart({
  weights,
  xTickIndices,
  xTickLabels,
  gradientId,
  lineColor,
  ariaLabel,
  compact = false,
}: {
  weights: number[];
  xTickIndices: number[];
  xTickLabels: string[];
  gradientId: string;
  lineColor: string;
  ariaLabel: string;
  /** Hauteur réduite pour tenir sur petit écran (onboarding). */
  compact?: boolean;
}) {
  const segments = weights.length - 1;
  const wMin = Math.min(...weights) - 1;
  const wMax = Math.max(...weights) + 1;
  const pad = compact
    ? { l: 28, r: 10, t: 10, b: 22 }
    : { l: 36, r: 14, t: 18, b: 32 };
  const W = compact ? 280 : 300;
  const H = compact ? 118 : 168;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xAt = (i: number) => pad.l + (i / segments) * innerW;
  const yAt = (kg: number) => pad.t + ((wMax - kg) / (wMax - wMin)) * innerH;
  const pathD = weights
    .map((kg, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(kg).toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L ${xAt(segments).toFixed(1)} ${H - pad.b} L ${xAt(0).toFixed(1)} ${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-auto w-full sm:mt-2" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8fa89a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[wMax, (wMax + wMin) / 2, wMin].map((tick) => (
        <g key={tick}>
          <line x1={pad.l} y1={yAt(tick)} x2={W - pad.r} y2={yAt(tick)} stroke="#e8e2eb" strokeDasharray="4 4" strokeWidth="1" />
          <text x={2} y={yAt(tick) + 4} className="fill-[#9a9490] text-[9px]">
            {tick.toFixed(0)} kg
          </text>
        </g>
      ))}
      <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xAt(segments)} cy={yAt(weights[segments])} r="4.5" fill={lineColor} stroke="white" strokeWidth="2" />
      {xTickIndices.map((i, idx) => (
        <text key={`${i}-${idx}`} x={xAt(i) - (idx === 0 ? 0 : 6)} y={H - 8} className="fill-[#9a9490] text-[9px]">
          {xTickLabels[idx]}
        </text>
      ))}
    </svg>
  );
}

function ProjectionStep({
  profile,
  onParcoursChange,
  currentKg,
  targetKg,
  deltaKg,
  diagnosticTag,
  sopkProfile = true,
  compact = false,
}: {
  profile: OnboardingData;
  onParcoursChange: (parcours: OnboardingData["parcoursPerte"]) => void;
  currentKg: number;
  targetKg: number;
  deltaKg: number;
  diagnosticTag: string;
  sopkProfile?: boolean;
  compact?: boolean;
}) {
  const reactId = useId().replace(/:/g, "");
  const selected = normalizeParcours(profile.parcoursPerte);

  const weightsByHorizon = useMemo(() => {
    const m: Record<ParcoursPerte, number[]> = {
      j30: [],
      j90: [],
      j180: [],
      j365: [],
    };
    for (const h of PROJECTION_HORIZONS) {
      m[h.id] = buildWeightCurveEased(currentKg, targetKg, h.days, h.power);
    }
    return m;
  }, [currentKg, targetKg]);

  const selectedChoiceRing: Record<ParcoursPerte, string> = {
    j30: "border-[#9b4d5a] bg-[#9b4d5a]/8 shadow-sm",
    j90: "border-[#6d5a7d] bg-[#6d5a7d]/8 shadow-sm",
    j180: "border-[#5a6b8a] bg-[#5a6b8a]/8 shadow-sm",
    j365: "border-[#4a6d72] bg-[#4a6d72]/8 shadow-sm",
  };

  return (
    <div>
      <h3 className={`font-semibold leading-snug ${compact ? "text-base" : "text-base sm:text-[1.55rem] md:text-[2rem]"} ${brand.text}`}>
        {compact ? "Choisissez votre rythme" : "Quatre vitesses pour une même cible"}
      </h3>
      <p className={`mt-0.5 leading-snug ${compact ? "text-[11px]" : "mt-1 text-sm sm:mt-2 sm:text-base"} ${brand.muted}`}>
        {compact
          ? "Même cible de poids · durée et rythme quotidien différents."
          : "Les quatre courbes se rejoignent sur la même cible de poids que vous avez indiquée."}
      </p>

      <div className={`mt-2 rounded-xl border p-2.5 ${compact ? "" : "mt-3 rounded-[18px] p-3 sm:mt-6 sm:rounded-[22px] sm:p-4"} ${brand.card}`}>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className={`text-[9px] font-medium uppercase tracking-wide ${brand.muted}`}>Départ</p>
            <p className={`text-lg font-semibold tabular-nums ${brand.text}`}>{currentKg.toFixed(0)} kg</p>
          </div>
          <div className="pb-0.5 text-[#c4bdc8]">→</div>
          <div className="text-right">
            <p className={`text-[9px] font-medium uppercase tracking-wide ${brand.muted}`}>Cible</p>
            <p className={`text-lg font-semibold tabular-nums ${brand.text}`}>{targetKg.toFixed(0)} kg</p>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full border border-[#6d5a7d]/20 bg-[#6d5a7d]/8 px-2 py-0.5 text-[9px] font-semibold text-[#4a3d56]">
            −{deltaKg.toFixed(1)} kg
          </span>
          <span className="inline-flex rounded-full border border-[#dfe8e3] bg-[#f4faf6] px-2 py-0.5 text-[9px] font-medium text-[#5a6b62]">
            {diagnosticTag}
          </span>
        </div>
      </div>

      {!compact ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">
          {PROJECTION_HORIZONS.map((h) => {
            const loss = getEstimatedDailyLossGrams({ ...profile, parcoursPerte: h.id }, 1, 1, 1);
            const gradId = `${reactId}-fill-${h.id}`;
            return (
              <div key={h.id} className={`rounded-[16px] border p-2.5 sm:rounded-[22px] sm:p-4 ${brand.card}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.12em] ${h.accentClass}`}>{h.cardTitle}</p>
                <p className={`mt-0.5 text-[10px] leading-tight sm:mt-1 sm:text-[11px] sm:leading-snug ${brand.muted}`}>
                  Déficit estimé ~{Math.round(loss)} g/j - même arrivée à {targetKg.toFixed(0)} kg, sur {h.days} jours.
                </p>
                <MiniWeightChart
                  weights={weightsByHorizon[h.id]}
                  xTickIndices={[...h.tickIndices]}
                  xTickLabels={[...h.tickLabels]}
                  gradientId={gradId}
                  lineColor={h.lineColor}
                  ariaLabel={h.ariaLabel}
                  compact
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <p className={`mt-2 font-medium ${compact ? "text-[11px]" : "text-sm sm:mt-4"} ${brand.text}`}>
        Quel horizon pour votre plan ?
      </p>
      <div className={`mt-1.5 grid grid-cols-2 gap-1.5 ${compact ? "" : "mt-2 gap-2 sm:mt-3 sm:gap-3"}`}>
        {PROJECTION_HORIZONS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onParcoursChange(h.id)}
            className={`rounded-lg border-2 px-2 py-1.5 text-left transition active:scale-[0.99] ${
              compact ? "text-[11px]" : "rounded-xl px-2.5 py-2 text-xs sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
            } ${selected === h.id ? selectedChoiceRing[h.id] : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"}`}
          >
            <span className={`font-semibold ${brand.text}`}>{h.choiceTitle}</span>
            {!compact ? (
              <span className={`mt-0.5 block text-[10px] leading-tight sm:mt-1 sm:text-xs ${brand.muted}`}>{h.choiceHint}</span>
            ) : null}
          </button>
        ))}
      </div>

      {!compact ? (
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2 md:grid-cols-3">
          {[
            { t: sopkProfile ? "Menus SOPK" : "Menus adaptés", d: "De 30 jours à 1 an de menus selon l’horizon choisi" },
            { t: "Repères personnalisés", d: "Âge, symptômes, goûts, allergies" },
            { t: "Encadrement clair", d: "Repères nutritionnels, pas de promesse magique" },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-[#e8e2eb]/90 bg-white/70 px-1.5 py-2 text-center sm:rounded-2xl sm:px-2 sm:py-3">
              <p className={`text-[9px] font-semibold leading-tight sm:text-[11px] ${brand.text}`}>{c.t}</p>
              <p className={`mt-0.5 text-[8px] leading-tight sm:mt-1 sm:text-[10px] ${brand.muted}`}>{c.d}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WebBuildStamp() {
  const [stamp, setStamp] = useState<string | null>(null);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    const url = capacitorPublicAsset("/build-stamp.txt");
    void fetch(url)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => setStamp(text.trim() || null))
      .catch(() => setStamp(null));
  }, []);

  if (!stamp) return null;
  return <p className={`mt-4 text-center text-[10px] ${brand.muted}`}>Version app : {stamp}</p>;
}

export function PricingStep({
  billing,
  onSelect,
  storeProducts,
  storeLoading,
  nativeIap,
  showStoreConfigHint,
  onRetryStore,
  compact = false,
}: {
  billing: "monthly" | "yearly";
  onSelect: (plan: "monthly" | "yearly") => void;
  storeProducts: { monthly: Product; yearly: Product } | null | undefined;
  storeLoading: boolean;
  nativeIap: boolean;
  showStoreConfigHint: boolean;
  onRetryStore?: () => void;
  compact?: boolean;
}) {
  const yearlyProduct = storeProducts?.yearly;
  const monthlyProduct = storeProducts?.monthly;
  const yearlyTitle = yearlyProduct?.title?.trim() || "Abonnement annuel";
  const monthlyTitle = monthlyProduct?.title?.trim() || "Abonnement mensuel";
  const yearlyIntro = getProductIntroLabel(yearlyProduct, nativeIap);
  const monthlyIntro = getProductIntroLabel(monthlyProduct, nativeIap);
  const yearlyPrice = yearlyProduct?.priceString ?? (nativeIap ? "…" : "59,99 €");
  const monthlyPrice = monthlyProduct?.priceString ?? (nativeIap ? "…" : "7,99 €");
  const introMissingMessage = getIntroOfferMissingMessage(nativeIap, storeProducts ?? null, storeLoading);
  const storeHasFreeTrial =
    hasConfirmedStoreFreeTrial(yearlyProduct) || hasConfirmedStoreFreeTrial(monthlyProduct);

  return (
    <div>
      <h3 className={`font-semibold leading-snug ${compact ? "text-base" : "text-base sm:text-[1.55rem] md:text-[2rem]"} ${brand.text}`}>
        {compact
          ? nativeIap && storeHasFreeTrial
            ? "Essai 7 jours · App Store"
            : "Votre formule"
          : nativeIap && storeHasFreeTrial
            ? "Essai gratuit de 7 jours via l’App Store"
            : nativeIap
              ? "Choisissez votre abonnement"
              : "Choisissez votre formule"}
      </h3>
      {!compact ? (
        <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
          {nativeIap && storeHasFreeTrial
            ? "La première semaine est offerte par Apple (offre d’introduction). Choisissez ensuite la formule mensuelle ou annuelle - vous pouvez annuler avant la fin de l’essai."
            : nativeIap
              ? "Les tarifs et l’éligibilité à l’essai gratuit sont gérés par l’App Store."
              : "Tarifs indicatifs hors magasin. Sur iPhone, l’essai gratuit de 7 jours et l’abonnement sont gérés par l’App Store."}
        </p>
      ) : null}

      {nativeIap && storeHasFreeTrial && !compact ? (
        <p className="mt-3 rounded-xl border border-[#6d5a7d]/25 bg-[#6d5a7d]/8 px-3 py-2.5 text-center text-sm font-bold text-[#6d5a7d] sm:text-base">
          7 jours gratuits · puis abonnement au tarif choisi
        </p>
      ) : null}

      {introMissingMessage && !compact ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs font-medium leading-snug text-amber-950 sm:text-sm">
          {introMissingMessage}
        </p>
      ) : null}

      {showStoreConfigHint ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-center text-[10px] font-semibold leading-snug text-amber-900 sm:mt-3 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[11px]">
          Paiements natifs : ajoutez <span className="font-mono text-[10px]">NEXT_PUBLIC_IAP_MONTHLY_ID</span> et{" "}
          <span className="font-mono text-[10px]">NEXT_PUBLIC_IAP_YEARLY_ID</span> (identifiants App Store), puis
          reconstruisez l’app. En attendant, vous pouvez finaliser sans achat réel.
        </p>
      ) : null}

      {nativeIap && storeLoading ? (
        <p className={`${compact ? "mt-1" : "mt-3"} text-center text-xs font-medium ${brand.muted}`}>
          Chargement des offres…
        </p>
      ) : null}

      {nativeIap && storeProducts === null && onRetryStore ? (
        <div className={`${compact ? "mt-1" : "mt-3"} flex justify-center`}>
          <button
            type="button"
            onClick={onRetryStore}
            className="rounded-full border border-[#6d5a7d] bg-white px-4 py-2 text-xs font-semibold text-[#6d5a7d] transition hover:bg-[#6d5a7d]/10"
          >
            Recharger les offres
          </button>
        </div>
      ) : null}

      <div className={`${compact ? "mt-1.5 space-y-1.5" : "mt-3 space-y-2 sm:mt-6 sm:space-y-3"}`}>
        <button
          type="button"
          onClick={() => onSelect("yearly")}
          className={`w-full rounded-xl border-2 text-left transition ${compact ? "p-2" : "rounded-[16px] p-3 sm:rounded-[20px] sm:p-4"} ${
            billing === "yearly" ? "border-[#6d5a7d] bg-[#6d5a7d]/6 shadow-sm" : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {!compact ? (
                <p className={`text-xs font-bold uppercase tracking-wide text-[#6d5a7d]`}>Formule la plus avantageuse</p>
              ) : null}
              <p className={`line-clamp-1 font-semibold ${compact ? "text-sm" : "mt-0.5 text-base sm:mt-1 sm:text-lg"} ${brand.text}`}>{yearlyTitle}</p>
              {hasConfirmedStoreFreeTrial(yearlyProduct) ? (
                <p className="mt-1 text-sm font-bold text-[#6d5a7d]">{yearlyIntro}</p>
              ) : null}
              {hasConfirmedStoreFreeTrial(yearlyProduct) ? (
                <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700 sm:text-xl">
                  {yearlyProduct?.introductoryPrice?.priceString ?? "0,00 €"}
                  <span className={`ml-1 text-sm font-semibold ${brand.muted}`}>aujourd’hui</span>
                </p>
              ) : null}
              <p className={`${yearlyIntro ? "mt-0.5" : "mt-0"} font-bold tabular-nums ${compact ? "text-base" : "text-xl sm:text-2xl"} ${brand.text}`}>
                {storeLoading
                  ? "…"
                  : hasConfirmedStoreFreeTrial(yearlyProduct)
                    ? formatPriceAfterIntro(yearlyProduct, nativeIap) ?? yearlyPrice
                    : yearlyPrice}
                {!nativeIap && !yearlyIntro ? (
                  <span className={`text-sm font-normal ${brand.muted}`}>/an</span>
                ) : nativeIap && !yearlyIntro ? (
                  <span className={`text-sm font-normal ${brand.muted}`}> / période</span>
                ) : null}
              </p>
              {!compact ? (
                <p className={`mt-1 text-xs ${brand.muted}`}>
                  {nativeIap
                    ? "Durée : 1 an · Renouvelé une fois par an - annulable à tout moment depuis les réglages Apple."
                    : "Durée : 1 an · Un seul prélèvement par an, pour un tarif mensuel équivalent plus bas (indicatif hors magasin)."}
                </p>
              ) : null}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${billing === "yearly" ? "bg-[#6d5a7d] text-white" : "bg-[#e8e2eb] text-[#6b6560]"}`}>
              {billing === "yearly" ? "✓" : ""}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("monthly")}
          className={`w-full rounded-xl border-2 text-left transition ${compact ? "p-2" : "rounded-[16px] p-3 sm:rounded-[20px] sm:p-4"} ${
            billing === "monthly" ? "border-[#6d5a7d] bg-[#6d5a7d]/6 shadow-sm" : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`line-clamp-1 font-semibold ${compact ? "text-sm" : "text-base sm:text-lg"} ${brand.text}`}>{monthlyTitle}</p>
              {hasConfirmedStoreFreeTrial(monthlyProduct) ? (
                <p className="mt-1 text-sm font-bold text-[#6d5a7d]">{monthlyIntro}</p>
              ) : null}
              {hasConfirmedStoreFreeTrial(monthlyProduct) ? (
                <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700 sm:text-xl">
                  {monthlyProduct?.introductoryPrice?.priceString ?? "0,00 €"}
                  <span className={`ml-1 text-sm font-semibold ${brand.muted}`}>aujourd’hui</span>
                </p>
              ) : null}
              <p className={`${monthlyIntro ? "mt-0.5" : "mt-0"} font-bold tabular-nums ${compact ? "text-base" : "text-xl sm:text-2xl"} ${brand.text}`}>
                {storeLoading
                  ? "…"
                  : hasConfirmedStoreFreeTrial(monthlyProduct)
                    ? formatPriceAfterIntro(monthlyProduct, nativeIap) ?? monthlyPrice
                    : monthlyPrice}
                {!nativeIap && !monthlyIntro ? (
                  <span className={`text-sm font-normal ${brand.muted}`}>/mois</span>
                ) : nativeIap && !monthlyIntro ? (
                  <span className={`text-sm font-normal ${brand.muted}`}> / période</span>
                ) : null}
              </p>
              {!compact ? (
                <p className={`mt-1 text-xs ${brand.muted}`}>
                  {nativeIap
                    ? "Durée : 1 mois · Renouvelé chaque mois - annulable à tout moment depuis les réglages Apple."
                    : "Durée : 1 mois · Idéal si vous préférez évaluer mois après mois (indicatif hors magasin)."}
                </p>
              ) : null}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${billing === "monthly" ? "bg-[#6d5a7d] text-white" : "bg-[#e8e2eb] text-[#6b6560]"}`}>
              {billing === "monthly" ? "✓" : ""}
            </span>
          </div>
        </button>
      </div>

      {!compact ? (
        <>
          <SubscriptionLegalLinks compact className="mt-3 text-center sm:mt-4" />
          <WebBuildStamp />
        </>
      ) : null}
    </div>
  );
}

function OnboardingStepCard({ children }: { children: ReactNode }) {
  return (
    <div className="animate-[onboarding-fade-in_0.35s_ease-out] flex w-full flex-col justify-start py-1 sm:py-2">
      {children}
    </div>
  );
}

function OnboardingSectionLabel({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <p
      className={`font-semibold leading-snug text-brand-800 first:mt-0 ${
        compact ? "mt-3 text-xs" : "mt-5 text-sm sm:text-base"
      }`}
    >
      {children}
    </p>
  );
}

function WelcomeHero() {
  return (
    <div className="animate-[onboarding-fade-in_0.45s_ease-out] space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-brand-400/30 bg-gradient-to-br from-brand-800 via-brand-600 to-accent p-[1px] shadow-elevated">
        <div className="relative overflow-hidden rounded-[calc(0.75rem-1px)] bg-gradient-to-br from-brand-800 via-brand-600 to-brand-700 px-4 py-4 text-center text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <div className="relative mx-auto flex justify-center">
            <AppIconSvg size="md" className="ring-2 ring-white/20" />
          </div>
          <p className="relative mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-brand-100/90">
            {APP_NAME}
          </p>
          <h2 className="relative mt-1 text-xl font-black leading-snug tracking-tight">
            Reprendre le contrôle, sans culpabiliser
          </h2>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-snug text-white/90">
            Menus concrets, repères quotidiens et suivi personnalisé selon votre profil - avec ou sans SOPK.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {WELCOME_TRUST_PILLARS.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-brand-200/80 bg-white/95 px-1.5 py-2 text-center shadow-sm ring-1 ring-white/80"
          >
            <p className={`text-[11px] font-bold leading-tight sm:text-xs ${brand.text}`}>{item.title}</p>
            <p className={`mt-0.5 text-[10px] leading-tight sm:text-[11px] ${brand.muted}`}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceScreen({
  title,
  subtitle,
  items,
  selected,
  onPick,
  compact = false,
  singleSelect = false,
}: {
  title: string;
  subtitle: string;
  items: string[];
  selected: string[];
  onPick: (value: string) => void;
  compact?: boolean;
  singleSelect?: boolean;
}) {
  return (
    <div className="w-full">
      <h3
        className={`font-bold leading-snug ${
          compact ? "text-lg" : "text-[22px] sm:text-[24px] md:text-[26px]"
        } ${brand.text}`}
      >
        {title}
      </h3>
      <p
        className={`leading-snug ${
          compact ? "mt-1 text-sm" : "mt-2 text-base sm:text-[17px]"
        } ${brand.muted}`}
      >
        {subtitle}
      </p>
      <div className={`grid grid-cols-1 ${compact ? "mt-2 gap-1.5" : "mt-4 gap-3 sm:gap-4"}`}>
        {items.map((item) => (
          <ChoicePill
            compact={compact}
            key={item}
            label={item}
            active={selected.includes(item)}
            onClick={() => onPick(item)}
            singleSelect={singleSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ChoicePill({
  label,
  active,
  onClick,
  compact = false,
  singleSelect = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  singleSelect?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center border text-left font-semibold transition active:scale-[0.99] ${
        compact
          ? `gap-1.5 rounded-lg px-2 py-1.5 text-[10px] leading-tight ${singleSelect ? "col-span-1" : ""}`
          : "min-h-[56px] gap-3 rounded-2xl px-4 py-3.5 text-base sm:min-h-[60px] sm:text-[17px]"
      } ${
        active
          ? "border-brand-600 bg-gradient-to-r from-brand-600/10 to-brand-50 text-ink shadow-[0_8px_24px_-14px_rgba(109,90,125,0.4)] ring-2 ring-brand-600/20"
          : "border-brand-200/90 bg-white text-ink hover:border-brand-300 hover:bg-brand-50/50"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border-2 font-bold transition ${
          compact ? "h-4 w-4 text-[8px]" : "h-7 w-7 text-xs"
        } ${active ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 bg-white text-transparent"}`}
      >
        ✓
      </span>
      {label}
    </button>
  );
}

function SliderScreen({
  title,
  subtitle,
  value,
  unit,
  min,
  max,
  onChange,
  compact = false,
}: {
  title: string;
  subtitle: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="w-full">
      <h3
        className={`font-bold leading-snug ${
          compact ? "text-lg" : "text-[22px] sm:text-[24px] md:text-[26px]"
        } ${brand.text}`}
      >
        {title}
      </h3>
      <p
        className={`leading-snug ${
          compact ? "mt-1 text-sm" : "mt-2 text-base sm:text-[17px]"
        } ${brand.muted}`}
      >
        {subtitle}
      </p>
      <div className={`flex flex-col items-center ${compact ? "mt-2" : "mt-6 sm:mt-8"}`}>
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 shadow-[0_12px_32px_-8px_rgba(109,90,125,0.45)] ring-4 ring-brand-100 ${
            compact ? "h-20 w-20" : "h-32 w-32 sm:h-36 sm:w-36"
          }`}
        >
          <p
            className={`font-black tabular-nums tracking-tight text-white ${
              compact ? "text-3xl" : "text-5xl sm:text-6xl"
            }`}
          >
            {value}
          </p>
        </div>
        <p className={`font-semibold ${compact ? "mt-1 text-sm" : "mt-3 text-lg sm:text-xl"} ${brand.muted}`}>
          {unit}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-2.5 w-full cursor-pointer appearance-none rounded-full bg-brand-200/80 accent-brand-600 ${
          compact ? "mt-2" : "mt-6 sm:mt-8"
        } [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-md`}
      />
      <div className={`mt-2 flex justify-between ${compact ? "text-[10px]" : "text-sm sm:text-base"} ${brand.muted}`}>
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

function NumericCard({
  label,
  value,
  onChange,
  min = 35,
  max = 150,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commitDraft(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "." || trimmed === ",") {
      setDraft(String(value));
      return;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <label className={`font-semibold uppercase tracking-[0.12em] text-[#8a8494] ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`}>
      {label}
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          if (!/^\d*[.,]?\d*$/.test(raw)) return;
          setDraft(raw);
          if (raw === "" || raw === "." || raw === ",") return;
          const parsed = Number(raw.replace(",", "."));
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={() => commitDraft(draft)}
        className={`mt-1.5 w-full rounded-xl border border-[#e0d8e4] bg-white/90 px-3 font-semibold tabular-nums outline-none focus:border-[#6d5a7d] ${
          compact ? "h-9 text-base" : "h-14 text-2xl sm:h-16 sm:text-3xl"
        } ${brand.text}`}
      />
    </label>
  );
}
