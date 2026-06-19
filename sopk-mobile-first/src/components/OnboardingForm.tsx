"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { Product } from "@capgo/native-purchases";

import { BrandLogo } from "@/components/BrandLogo";
import { SubscriptionLegalLinks } from "@/components/SubscriptionLegalLinks";
import { capacitorPublicAsset } from "@/utils/capacitorStaticHref";
import { isCapacitorNative } from "@/utils/capacitorRuntime";
import { getEstimatedDailyLossGrams } from "@/utils/mealPlan";
import { normalizeParcours } from "@/utils/profileMigrate";
import { STORAGE_KEYS } from "@/utils/storage";
import type { OnboardingData, ParcoursPerte } from "@/utils/types";
import {
  fetchSubscriptionProducts,
  purchaseSubscription,
  shouldUseNativeIap,
} from "@/utils/subscriptionPurchase";
import { buildWeightCurveEased } from "@/utils/weightSummary";

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
}

/** Palette Régime SOPK : perle chaud, prune douce, sauge — ton féminin, rassurant, premium. */
const brand = {
  shell: "from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1]",
  card: "border-[#e8e2eb]/90 bg-white/85 shadow-[0_18px_50px_-28px_rgba(45,36,58,0.18)]",
  accent: "bg-[#6d5a7d]",
  accentHover: "hover:bg-[#5d4c6d]",
  accentSoft: "bg-[#6d5a7d]/12 border-[#6d5a7d]/25",
  text: "text-[#2c2622]",
  muted: "text-[#6b6560]",
  progress: "bg-[#6d5a7d]",
  progressTrack: "bg-[#e5dfe8]/80",
  graphLine: "#6d5a7d",
  graphFill: "url(#projectionFill)",
};

/** Prénom d’exemple et repli si le champ est vide (cohérent avec le reste de l’app). */
const DEFAULT_DISPLAY_NAME = "Johana";

const defaultProfile: OnboardingData = {
  prenom: "Johana",
  age: 36,
  poidsKg: 87,
  tailleCm: 165,
  parcoursPerte: "j90",
  objectifPoidsKg: 77,
  objectifs: ["Apaiser mon poids dans le cadre du SOPK"],
  diagnostics: ["SOPK"],
  symptomes: ["Peu ou pas de tout cela"],
  tentativePertePoids: "Oui, plusieurs fois (yo-yo)",
  niveauActivite: "Sédentaire",
  rythmeRepas: "3 repas",
  tempsCuisine: "15 - 30 min",
  regimeAlimentaire: "Végétarienne",
  alimentsPreferes: ["Avocat", "Poulet"],
  allergies: ["Arachides"],
  alimentsDetestes: ["Brocoli"],
  billingPreference: "yearly",
};

const FOOD_PREFERENCES: { key: string; emoji: string }[] = [
  { key: "Poulet", emoji: "🍗" },
  { key: "Saumon", emoji: "🐟" },
  { key: "Riz complet", emoji: "🍚" },
  { key: "Légumes verts", emoji: "🥬" },
  { key: "Avocat", emoji: "🥑" },
  { key: "Yaourt", emoji: "🥛" },
  { key: "Œufs", emoji: "🥚" },
  { key: "Lentilles", emoji: "🫘" },
  { key: "Fraises", emoji: "🍓" },
  { key: "Fromage", emoji: "🧀" },
];

const ALLERGY_ITEMS: { key: string; emoji: string }[] = [
  { key: "Arachides", emoji: "🥜" },
  { key: "Lait", emoji: "🥛" },
  { key: "Gluten", emoji: "🌾" },
  { key: "Fruits à coque", emoji: "🌰" },
  { key: "Soja", emoji: "🌱" },
  { key: "Crustacés", emoji: "🦐" },
];

const EXCLUSION_ITEMS: { key: string; emoji: string }[] = [
  { key: "Brocoli", emoji: "🥦" },
  { key: "Champignons", emoji: "🍄" },
  { key: "Aubergine", emoji: "🍆" },
  { key: "Coriandre", emoji: "🌿" },
  { key: "Poivron", emoji: "🫑" },
  { key: "Tomate", emoji: "🍅" },
];

function draftStorageKey(userScope: string) {
  return `${STORAGE_KEYS.onboardingDraft}_${userScope}`;
}

function readOnboardingDraft(userScope: string): { step: number; profile: OnboardingData } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(userScope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: unknown; profile?: OnboardingData };
    if (typeof parsed.step !== "number" || !parsed.profile || !Number.isFinite(parsed.step)) return null;
    let migratedStep = Math.floor(parsed.step);
    if (migratedStep === 12) migratedStep = 11;
    else if (migratedStep === 13) migratedStep = 12;
    const draftProfile = { ...parsed.profile };
    delete draftProfile.onboardingCompleted;
    return {
      step: Math.max(0, Math.min(12, migratedStep)),
      profile: {
        ...defaultProfile,
        ...draftProfile,
        parcoursPerte: normalizeParcours(draftProfile.parcoursPerte as string),
      },
    };
  } catch {
    return null;
  }
}

function titleCasePrénom(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toLocaleUpperCase("fr-FR") + t.slice(1);
}

export function OnboardingForm({
  userScope,
  onComplete,
  onLeaveToAuth,
  skipPricingStep = false,
  resumeProfile = null,
  onCancelResume,
}: OnboardingFormProps) {
  /** Produits abonnement (App Store / Play) — undefined = pas encore chargé, null = échec. */
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
  /** 0–10 questions, 11 projection + courbes, 12 offre & essai (sauf si skipPricingStep). */
  const stepCount = skipPricingStep ? 12 : 13;
  const lastNavigableStep = skipPricingStep ? 11 : 12;

  useEffect(() => {
    if (typeof window === "undefined" || resumeProfile) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftStorageKey(userScope), JSON.stringify({ step, profile }));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [step, profile, userScope, resumeProfile]);

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
    if (step === 0) return Boolean(profile.prenom?.trim().length);
    if (!skipPricingStep && step === 12) {
      if (!profile.billingPreference) return false;
      if (iapGateBlocksContinue) return false;
    }
    return true;
  }, [iapGateBlocksContinue, profile.billingPreference, profile.prenom, skipPricingStep, step]);

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

    onComplete({
      ...profile,
      prenom: profile.prenom?.trim() || DEFAULT_DISPLAY_NAME,
      age: Math.min(60, Math.max(18, age)),
      poidsKg: Math.min(180, Math.max(40, poidsKg)),
      tailleCm: Math.min(210, Math.max(130, tailleCm)),
      objectifPoidsKg: Math.min(150, Math.max(35, objectifPoidsKg)),
      parcoursPerte: normalizeParcours(profile.parcoursPerte),
      billingPreference: profile.billingPreference ?? "yearly",
      onboardingCompleted: true,
    });
  }

  async function nextStep() {
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
            setIapError("Paiement annulé.");
          } else {
            setIapError(msg || "Le paiement n’a pas abouti. Réessaie ou vérifie ton compte App Store.");
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
    field: "objectifs" | "diagnostics" | "symptomes" | "alimentsPreferes" | "allergies" | "alimentsDetestes",
    value: string,
  ) {
    setProfile((prev) => {
      const source = prev[field] ?? [];
      return {
        ...prev,
        [field]: source.includes(value) ? source.filter((item) => item !== value) : [...source, value],
      };
    });
  }

  const displayName = titleCasePrénom(profile.prenom?.trim() || DEFAULT_DISPLAY_NAME);
  const diagnosticTag = (profile.diagnostics ?? []).find((d) => d !== "Aucun diagnostic") ?? "SOPK";

  return (
    <section
      className={`relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-[22px] border border-[#e8e2eb]/80 bg-gradient-to-b ${brand.shell} shadow-[0_24px_64px_-32px_rgba(45,36,58,0.22)] sm:rounded-[28px]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(109,90,125,0.08),transparent)]" />

      <header className="relative shrink-0 px-4 pb-1.5 pt-1 sm:px-5 sm:pb-2 sm:pt-2">
        <div className="mb-1.5 flex items-center justify-end sm:mb-2">
          <p className={`shrink-0 text-[10px] font-medium sm:text-xs ${brand.muted}`}>
            {step + 1} / {stepCount}
          </p>
        </div>
        <BrandLogo variant="onboarding" />
        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 sm:gap-1">
          {Array.from({ length: stepCount }).map((_, index) => (
            <div
              key={index}
              className={`h-0.5 rounded-full transition-all duration-300 sm:h-1 ${
                index <= step ? brand.progress : brand.progressTrack
              }`}
            />
          ))}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:px-5 sm:pb-3 sm:pt-1">
        {step > 0 || (step === 0 && (onLeaveToAuth || onCancelResume)) ? (
          <button
            type="button"
            onClick={() => {
              if (step === 0 && onCancelResume) {
                onCancelResume();
                return;
              }
              if (step === 0 && onLeaveToAuth) {
                onLeaveToAuth();
                return;
              }
              previousStep();
            }}
            className={`mb-2 text-xs font-medium sm:mb-3 sm:text-sm ${brand.muted} transition hover:text-[#4a4240]`}
          >
            ← Retour
          </button>
        ) : null}

        {step === 0 ? (
          <div className="text-center">
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#6d5a7d]/10 text-xl sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl"
              aria-hidden
            >
              ✦
            </div>
            <h2
              className={`mt-2 text-lg font-semibold leading-snug tracking-tight sm:mt-4 sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}
            >
              Par quel prénom souhaitez-vous qu’on vous accompagne&nbsp;?
            </h2>
            <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
              Il sera utilisé dans l’app, comme un petit marque-page entre vous et votre programme.
            </p>
            <input
              value={profile.prenom}
              onChange={(e) => setProfile((prev) => ({ ...prev, prenom: e.target.value }))}
              placeholder="Prénom"
              className={`mt-4 h-12 w-full rounded-xl border border-[#e0d8e4] bg-white/90 px-3 text-center text-xl font-medium outline-none transition focus:border-[#6d5a7d] focus:ring-2 focus:ring-[#6d5a7d]/20 sm:mt-8 sm:h-14 sm:rounded-2xl sm:text-2xl ${brand.text}`}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <ChoiceScreen
            title={`${displayName}, qu’est-ce qui compte le plus pour vous en ce moment\u00a0?`}
            subtitle="Vous pouvez cocher plusieurs réponses."
            items={[
              "Apaiser mon poids dans le cadre du SOPK",
              "Structurer mon assiette sans rigidité",
              "Mieux comprendre les signaux de mon corps",
              "Retrouver de l’énergie au fil des semaines",
            ]}
            selected={profile.objectifs ?? []}
            onPick={(v) => toggleArrayValue("objectifs", v)}
          />
        ) : null}

        {step === 2 ? (
          <MessageScreen
            title="Ici, on part de votre réalité — pas d’un modèle unique."
            text="Le syndrome des ovaires polykystiques modifie souvent la faim, la fatigue ou la façon dont le corps stocke l’énergie. Régime SOPK a été pensé avec des nutritionnistes pour traduire ces contraintes en menus concrets, en repères clairs et en encouragements mesurés — sans promesse magique, avec une méthode que vous pouvez tenir."
          />
        ) : null}

        {step === 3 ? (
          <SliderScreen
            title="Votre âge aujourd’hui"
            subtitle="Nous en tenons compte pour calibrer les repères du programme (sans réduire votre parcours à un chiffre)."
            value={profile.age}
            unit="ans"
            min={18}
            max={60}
            onChange={(value) => setProfile((prev) => ({ ...prev, age: value }))}
          />
        ) : null}

        {step === 4 ? (
          <SliderScreen
            title="Votre taille"
            subtitle="Elle nous aide à ajuster hydratation et portions — toujours en restant dans des fourchettes raisonnables."
            value={profile.tailleCm}
            unit="cm"
            min={140}
            max={195}
            onChange={(value) => setProfile((prev) => ({ ...prev, tailleCm: value }))}
          />
        ) : null}

        {step === 5 ? (
          <div>
            <h3 className={`text-base font-semibold leading-snug sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>
              Poids de départ et cible
            </h3>
            <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
              Indiquez où vous en êtes et où vous aimeriez vous rapprocher. Nous restons dans des objectifs compatibles
              avec un suivi encadré.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
              <NumericCard label="Poids saisi" value={profile.poidsKg} onChange={(v) => setProfile((p) => ({ ...p, poidsKg: v }))} />
              <NumericCard
                label="Cible saisie"
                value={profile.objectifPoidsKg ?? 77}
                onChange={(v) => setProfile((p) => ({ ...p, objectifPoidsKg: v }))}
              />
            </div>
            <p className={`mt-2 rounded-xl border border-[#dfe8e3] bg-[#f4faf6] px-3 py-2 text-xs leading-snug sm:mt-4 sm:px-4 sm:py-3 sm:text-sm ${brand.muted}`}>
              Rappel des équipes diététiques Régime SOPK&nbsp;: viser en général environ{" "}
              <strong className={brand.text}>0,5 à 1&nbsp;kg</strong> par semaine limite les rechutes et préserve la
              masse maigre.
            </p>
          </div>
        ) : null}

        {step === 6 ? (
          <ChoiceScreen
            title="Parcours de santé"
            subtitle="Cochez tout ce qui correspond à votre dossier ou à ce que vous soupçonnez — rien n’est définitif ici, c’est pour affiner les conseils."
            items={[
              "SOPK",
              "Endométriose",
              "Hypothyroïdie / Hashimoto",
              "Ménopause / périménopause",
              "Résistance à l’insuline",
              "Aucun diagnostic",
            ]}
            selected={profile.diagnostics ?? []}
            onPick={(v) => toggleArrayValue("diagnostics", v)}
          />
        ) : null}

        {step === 7 ? (
          <ChoiceScreen
            title="Signaux du quotidien"
            subtitle="Ce qui revient souvent, même quand vous faites attention."
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
        ) : null}

        {step === 8 ? (
          <ChoiceScreen
            title="Mouvement au quotidien"
            subtitle="Une seule réponse — on ajuste ensuite les pas suggérés sans vous mettre la pression."
            items={["Sédentaire", "Légèrement active", "Modérément active", "Très active"]}
            selected={[profile.niveauActivite ?? "Sédentaire"]}
            onPick={(v) => setProfile((prev) => ({ ...prev, niveauActivite: v }))}
          />
        ) : null}

        {step === 9 ? (
          <div>
            <h3 className={`text-base font-semibold leading-snug sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>Repas et temps en cuisine</h3>
            <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
              On évite les plans irréalistes&nbsp;: dites-nous simplement comment vous vivez la semaine.
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8494] sm:mt-6 sm:text-[11px]">Nombre de prises alimentaires</p>
            <div className="mt-1.5 grid gap-1.5 sm:mt-2 sm:gap-2">
              {["2 repas", "3 repas", "3 repas + collations"].map((item) => (
                <ChoicePill key={item} label={item} active={profile.rythmeRepas === item} onClick={() => setProfile((p) => ({ ...p, rythmeRepas: item }))} />
              ))}
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8494] sm:mt-5 sm:text-[11px]">Temps pour préparer</p>
            <div className="mt-1.5 grid gap-1.5 sm:mt-2 sm:gap-2">
              {["Moins de 15 min", "15 – 30 min", "30 – 45 min", "Peu importe"].map((item) => (
                <ChoicePill key={item} label={item} active={profile.tempsCuisine === item} onClick={() => setProfile((p) => ({ ...p, tempsCuisine: item }))} />
              ))}
            </div>
          </div>
        ) : null}

        {step === 10 ? (
          <FoodPreferencesStep
            profile={profile}
            onToggle={(field, key) => toggleArrayValue(field, key)}
          />
        ) : null}

        {step === 11 ? (
          <ProjectionStep
            profile={profile}
            onParcoursChange={(parcoursPerte) =>
              setProfile((p) => ({ ...p, parcoursPerte: normalizeParcours(parcoursPerte) }))
            }
            displayName={displayName}
            currentKg={profile.poidsKg}
            targetKg={targetKg}
            deltaKg={deltaKg}
            diagnosticTag={diagnosticTag}
          />
        ) : null}

        {!skipPricingStep && step === 12 ? (
          <PricingStep
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
        ) : null}
        {!skipPricingStep && step === 12 && iapError ? (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-rose-800 sm:mt-3 sm:px-3 sm:py-2 sm:text-xs">
            {iapError}
          </p>
        ) : null}
      </div>

      <footer className="relative shrink-0 border-t border-white/55 bg-white/85 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(45,36,58,0.12)] backdrop-blur-md sm:px-4 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pt-2">
        <div className="rounded-xl border border-white/60 bg-white/70 p-2 shadow-sm sm:rounded-[22px] sm:p-3">
          <button
            type="button"
            onClick={() => void nextStep()}
            disabled={!canProceed || iapBusy}
            className={`h-11 w-full rounded-xl px-3 text-sm font-semibold text-white transition sm:h-12 sm:rounded-2xl sm:px-4 sm:text-base ${brand.accent} ${brand.accentHover} disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]`}
          >
            {iapBusy
              ? "Paiement en cours…"
              : skipPricingStep && step === 11
                ? "Enregistrer le profil"
                : step === 11
                  ? "Suite"
                  : step === 12
                    ? shouldUseNativeIap()
                      ? "Payer et activer l’abonnement"
                      : "Lancer mon essai de 7 jours"
                    : "Suite"}
          </button>
          <p className={`mt-1 line-clamp-3 text-center text-[9px] leading-snug sm:mt-2 sm:text-xs ${brand.muted}`}>
            {step === 11 &&
              (skipPricingStep
                ? "Vos critères et préférences sont mis à jour ; votre accès reste inchangé."
                : "Courbe à titre indicatif — la régularité du programme et votre médecin restent les repères essentiels.")}
            {!skipPricingStep && step === 12 &&
              (shouldUseNativeIap()
                ? "Le tarif affiché vient de l'App Store (obligatoire pour la publication). Le paiement s’effectue via Apple avant l’accès au programme."
                : "Après l’essai gratuit de 7\u00a0jours\u00a0: les montants indicatifs 7,99\u00a0€/mois ou 59,99\u00a0€/an s’appliquent selon l’offre retenue sur les stores. Vous pouvez annuler avant la fin de l’essai.")}
            {step < 11 && "Vous pourrez ajuster ces informations depuis les réglages du compte."}
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
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border-2 px-0.5 py-1.5 text-center transition active:scale-[0.97] sm:min-h-[5.25rem] sm:rounded-2xl sm:px-1 sm:py-2.5 ${
        selected
          ? "border-[#6d5a7d] bg-[#6d5a7d]/10 shadow-sm ring-1 ring-[#6d5a7d]/25"
          : "border-[#e8e2eb] bg-white/90 hover:border-[#cfc8d4]"
      }`}
    >
      <span className="text-lg leading-none sm:text-[1.75rem]" aria-hidden>
        {emoji}
      </span>
      <span className={`mt-0.5 px-0.5 text-[9px] font-semibold leading-tight sm:mt-1.5 sm:text-[10px] sm:leading-tight md:text-[11px] ${brand.text}`}>{label}</span>
    </button>
  );
}

function FoodPreferencesStep({
  profile,
  onToggle,
}: {
  profile: OnboardingData;
  onToggle: (field: "alimentsPreferes" | "allergies" | "alimentsDetestes", key: string) => void;
}) {
  return (
    <div>
      <h3 className={`text-base font-semibold leading-snug sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>
        Ingrédients que vous aimez… ou pas
      </h3>
      <p className={`mt-1 text-xs leading-snug sm:mt-2 sm:text-sm md:text-base ${brand.muted}`}>
        Touchez une icône pour l’activer ou la désactiver. Allergènes et exclusions «&nbsp;goût&nbsp;» sont séparés&nbsp;:
        les deux listes comptent pour vos futurs menus.
      </p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8494] sm:mt-4 sm:text-[11px] sm:tracking-[0.14em]">Souvent appréciés</p>
      <div className="mt-1.5 grid grid-cols-5 gap-1 sm:mt-2 sm:grid-cols-5 sm:gap-2">
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
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8494] sm:mt-6 sm:text-[11px] sm:tracking-[0.14em]">Allergènes</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1 sm:mt-2 sm:grid-cols-6 sm:gap-2">
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
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8494] sm:mt-6 sm:text-[11px] sm:tracking-[0.14em]">Exclusions (goût)</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1 sm:mt-2 sm:grid-cols-6 sm:gap-2">
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
    cardTitle: "Intense — 30 jours",
    power: 1.22,
    lineColor: "#9b4d5a",
    accentClass: "text-[#7a3e45]",
    tickIndices: [0, 10, 20, 30],
    tickLabels: ["J1", "J10", "J20", "J30"],
    ariaLabel: "Courbe indicative du poids sur trente jours jusqu’à la cible",
    choiceTitle: "30 jours — intense",
    choiceHint: "Déficit le plus marqué dans le modèle ; discipline forte (repas, eau, marche).",
  },
  {
    id: "j90",
    days: 90,
    cardTitle: "Équilibré — 90 jours",
    power: 1.52,
    lineColor: "#6d5a7d",
    accentClass: brand.muted,
    tickIndices: [0, 30, 60, 90],
    tickLabels: ["J1", "J30", "J60", "J90"],
    ariaLabel: "Courbe indicative du poids sur quatre-vingt-dix jours jusqu’à la cible",
    choiceTitle: "90 jours — équilibré",
    choiceHint: "Compromis fréquent : assez court pour rester motivante, assez long pour s’habituer.",
  },
  {
    id: "j180",
    days: 180,
    cardTitle: "Progressive — 180 jours",
    power: 1.68,
    lineColor: "#5a6b8a",
    accentClass: brand.muted,
    tickIndices: [0, 60, 120, 180],
    tickLabels: ["J1", "J60", "J120", "J180"],
    ariaLabel: "Courbe indicative du poids sur six mois jusqu’à la cible",
    choiceTitle: "180 jours — progressive",
    choiceHint: "Rythme plus doux au quotidien ; les repères nutritionnels restent serrés mais moins « sprint ».",
  },
  {
    id: "j365",
    days: 365,
    cardTitle: "Ancrée — 1 an",
    power: 1.82,
    lineColor: "#4a6d72",
    accentClass: brand.muted,
    tickIndices: [0, 120, 240, 365],
    tickLabels: ["J1", "~4 m.", "~8 m.", "1 an"],
    ariaLabel: "Courbe indicative du poids sur un an jusqu’à la cible",
    choiceTitle: "365 jours — ancrée",
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
  displayName,
  currentKg,
  targetKg,
  deltaKg,
  diagnosticTag,
}: {
  profile: OnboardingData;
  onParcoursChange: (parcours: OnboardingData["parcoursPerte"]) => void;
  displayName: string;
  currentKg: number;
  targetKg: number;
  deltaKg: number;
  diagnosticTag: string;
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
      <h3 className={`text-base font-semibold leading-snug sm:text-[1.55rem] sm:leading-tight md:text-[2rem] ${brand.text}`}>
        {displayName}, quatre vitesses pour une même cible
      </h3>
      <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
        Les quatre courbes se rejoignent sur <strong className={brand.text}>la même cible de poids</strong> que vous
        avez indiquée. Ce qui change, c’est la durée et donc le rythme quotidien (déficit modélisé, repères marche et
        hydratation dans l’app). Choisissez l’horizon qui colle à votre réalité — vous pourrez l’ajuster plus tard.
      </p>
      <p className={`mt-1 text-xs leading-snug sm:mt-2 sm:text-sm ${brand.muted}`}>
        Estimations indicatives à partir de votre âge, taille, poids, activité et symptômes — pas une prescription
        médicale.
      </p>

      <div className={`mt-3 rounded-[18px] border p-3 sm:mt-6 sm:rounded-[22px] sm:p-4 ${brand.card}`}>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wide sm:text-xs ${brand.muted}`}>Poids indiqué</p>
            <p className={`text-xl font-semibold tabular-nums sm:text-2xl ${brand.text}`}>{currentKg.toFixed(0)} kg</p>
          </div>
          <div className="pb-0.5 text-[#c4bdc8] sm:pb-1">→</div>
          <div className="text-right">
            <p className={`text-[10px] font-medium uppercase tracking-wide sm:text-xs ${brand.muted}`}>Cible indiquée</p>
            <p className={`text-xl font-semibold tabular-nums sm:text-2xl ${brand.text}`}>{targetKg.toFixed(0)} kg</p>
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#6d5a7d]/20 bg-[#6d5a7d]/8 px-2.5 py-1 text-[10px] font-semibold text-[#4a3d56] sm:mt-3 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
          <span aria-hidden>◎</span>
          Écart cible sur le long terme : environ −{deltaKg.toFixed(1)} kg
        </div>
        <div className="mt-1.5 inline-flex rounded-full border border-[#dfe8e3] bg-[#f4faf6] px-2 py-0.5 text-[10px] font-medium text-[#5a6b62] sm:mt-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
          {diagnosticTag}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">
        {PROJECTION_HORIZONS.map((h) => {
          const loss = getEstimatedDailyLossGrams({ ...profile, parcoursPerte: h.id }, 1, 1, 1);
          const gradId = `${reactId}-fill-${h.id}`;
          return (
            <div key={h.id} className={`rounded-[16px] border p-2.5 sm:rounded-[22px] sm:p-4 ${brand.card}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.12em] ${h.accentClass}`}>{h.cardTitle}</p>
              <p className={`mt-0.5 text-[10px] leading-tight sm:mt-1 sm:text-[11px] sm:leading-snug ${brand.muted}`}>
                Déficit estimé ~{Math.round(loss)} g/j (si suivi strict) — même arrivée à {targetKg.toFixed(0)} kg, sur{" "}
                {h.days} jours.
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

      <p className={`mt-2 text-sm font-medium sm:mt-4 ${brand.text}`}>Quel horizon appliquer à votre plan ?</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
        {PROJECTION_HORIZONS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onParcoursChange(h.id)}
            className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs transition active:scale-[0.99] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
              selected === h.id ? selectedChoiceRing[h.id] : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"
            }`}
          >
            <span className={`font-semibold ${brand.text}`}>{h.choiceTitle}</span>
            <span className={`mt-0.5 block text-[10px] leading-tight sm:mt-1 sm:text-xs ${brand.muted}`}>{h.choiceHint}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2 md:grid-cols-3">
        {[
          { t: "Menus SOPK", d: "De 30 jours à 1 an de menus selon l’horizon choisi" },
          { t: "Repères personnalisés", d: "Âge, symptômes, goûts, allergies" },
          { t: "Encadrement clair", d: "Repères nutritionnels, pas de promesse magique" },
        ].map((c) => (
          <div key={c.t} className="rounded-lg border border-[#e8e2eb]/90 bg-white/70 px-1.5 py-2 text-center sm:rounded-2xl sm:px-2 sm:py-3">
            <p className={`text-[9px] font-semibold leading-tight sm:text-[11px] ${brand.text}`}>{c.t}</p>
            <p className={`mt-0.5 text-[8px] leading-tight sm:mt-1 sm:text-[10px] ${brand.muted}`}>{c.d}</p>
          </div>
        ))}
      </div>
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

function PricingStep({
  billing,
  onSelect,
  storeProducts,
  storeLoading,
  nativeIap,
  showStoreConfigHint,
  onRetryStore,
}: {
  billing: "monthly" | "yearly";
  onSelect: (plan: "monthly" | "yearly") => void;
  storeProducts: { monthly: Product; yearly: Product } | null | undefined;
  storeLoading: boolean;
  nativeIap: boolean;
  showStoreConfigHint: boolean;
  onRetryStore?: () => void;
}) {
  const yearlyProduct = storeProducts?.yearly;
  const monthlyProduct = storeProducts?.monthly;
  const yearlyTitle = yearlyProduct?.title?.trim() || "Abonnement annuel";
  const monthlyTitle = monthlyProduct?.title?.trim() || "Abonnement mensuel";
  const yearlyPrice = yearlyProduct?.priceString ?? (nativeIap ? "…" : "59,99 €");
  const monthlyPrice = monthlyProduct?.priceString ?? (nativeIap ? "…" : "7,99 €");

  return (
    <div>
      <h3 className={`text-base font-semibold leading-snug sm:text-[1.55rem] md:text-[2rem] ${brand.text}`}>Abonnement après l’essai gratuit</h3>
      <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>
        Sept jours pour explorer l’app sans payer. Ensuite, choisissez la formule qui correspond à votre budget — vous
        gardez la main sur l’arrêt avant la fin de l’essai.
      </p>

      {showStoreConfigHint ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-center text-[10px] font-semibold leading-snug text-amber-900 sm:mt-3 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[11px]">
          Paiements natifs : ajoutez <span className="font-mono text-[10px]">NEXT_PUBLIC_IAP_MONTHLY_ID</span> et{" "}
          <span className="font-mono text-[10px]">NEXT_PUBLIC_IAP_YEARLY_ID</span> (identifiants App Store), puis
          reconstruisez l’app. En attendant, vous pouvez finaliser sans achat réel.
        </p>
      ) : null}

      {nativeIap && storeLoading ? (
        <p className={`mt-3 text-center text-sm font-medium ${brand.muted}`}>Chargement des offres depuis le magasin…</p>
      ) : null}

      {nativeIap && storeProducts === null && onRetryStore ? (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onRetryStore}
            className="rounded-full border border-[#6d5a7d] bg-white px-4 py-2 text-xs font-semibold text-[#6d5a7d] transition hover:bg-[#6d5a7d]/10"
          >
            Recharger les offres
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-2 sm:mt-6 sm:space-y-3">
        <button
          type="button"
          onClick={() => onSelect("yearly")}
          className={`w-full rounded-[16px] border-2 p-3 text-left transition sm:rounded-[20px] sm:p-4 ${
            billing === "yearly" ? "border-[#6d5a7d] bg-[#6d5a7d]/6 shadow-sm" : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wide text-[#6d5a7d]`}>Formule la plus avantageuse</p>
              <p className={`mt-0.5 line-clamp-2 text-base font-semibold sm:mt-1 sm:text-lg ${brand.text}`}>{yearlyTitle}</p>
              <p className={`text-xl font-bold tabular-nums sm:text-2xl ${brand.text}`}>
                {storeLoading ? "…" : yearlyPrice}
                {!nativeIap ? (
                  <span className={`text-sm font-normal ${brand.muted}`}>/an</span>
                ) : (
                  <span className={`text-sm font-normal ${brand.muted}`}> / période</span>
                )}
              </p>
              <p className={`mt-1 text-xs ${brand.muted}`}>
                {nativeIap
                  ? "Durée : 1 an · Renouvelé une fois par an — annulable à tout moment depuis les réglages Apple."
                  : "Durée : 1 an · Un seul prélèvement par an, pour un tarif mensuel équivalent plus bas (indicatif hors magasin)."}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${billing === "yearly" ? "bg-[#6d5a7d] text-white" : "bg-[#e8e2eb] text-[#6b6560]"}`}>
              {billing === "yearly" ? "✓" : ""}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("monthly")}
          className={`w-full rounded-[16px] border-2 p-3 text-left transition sm:rounded-[20px] sm:p-4 ${
            billing === "monthly" ? "border-[#6d5a7d] bg-[#6d5a7d]/6 shadow-sm" : "border-[#e8e2eb] bg-white/80 hover:border-[#d4cdd8]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`line-clamp-2 text-base font-semibold sm:text-lg ${brand.text}`}>{monthlyTitle}</p>
              <p className={`text-xl font-bold tabular-nums sm:text-2xl ${brand.text}`}>
                {storeLoading ? "…" : monthlyPrice}
                {!nativeIap ? (
                  <span className={`text-sm font-normal ${brand.muted}`}>/mois</span>
                ) : (
                  <span className={`text-sm font-normal ${brand.muted}`}> / période</span>
                )}
              </p>
              <p className={`mt-1 text-xs ${brand.muted}`}>
                {nativeIap
                  ? "Durée : 1 mois · Renouvelé chaque mois — annulable à tout moment depuis les réglages Apple."
                  : "Durée : 1 mois · Idéal si vous préférez évaluer mois après mois (indicatif hors magasin)."}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${billing === "monthly" ? "bg-[#6d5a7d] text-white" : "bg-[#e8e2eb] text-[#6b6560]"}`}>
              {billing === "monthly" ? "✓" : ""}
            </span>
          </div>
        </button>
      </div>

      <SubscriptionLegalLinks compact className="mt-3 text-center sm:mt-4" />
      <WebBuildStamp />
    </div>
  );
}

function ChoiceScreen({
  title,
  subtitle,
  items,
  selected,
  onPick,
}: {
  title: string;
  subtitle: string;
  items: string[];
  selected: string[];
  onPick: (value: string) => void;
}) {
  return (
    <div>
      <h3 className={`text-base font-semibold leading-snug sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>{title}</h3>
      <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>{subtitle}</p>
      <div className="mt-3 grid gap-1.5 sm:mt-5 sm:gap-2.5">
        {items.map((item) => (
          <ChoicePill key={item} label={item} active={selected.includes(item)} onClick={() => onPick(item)} />
        ))}
      </div>
    </div>
  );
}

function ChoicePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.99] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-base ${
        active
          ? "border-[#6d5a7d] bg-[#6d5a7d]/8 text-[#2c2622] shadow-[0_8px_24px_-16px_rgba(109,90,125,0.35)]"
          : "border-[#e8e2eb] bg-white/85 text-[#2c2622] hover:border-[#d4cdd8]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
          active ? "border-[#6d5a7d] bg-[#6d5a7d] text-white" : "border-[#cfc8d4] bg-white"
        }`}
      >
        {active ? "✓" : ""}
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
}: {
  title: string;
  subtitle: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <h3 className={`text-base font-semibold leading-snug sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>{title}</h3>
      <p className={`mt-1 text-sm leading-snug sm:mt-2 sm:text-base ${brand.muted}`}>{subtitle}</p>
      <p className={`mt-4 text-center text-4xl font-semibold tabular-nums tracking-tight sm:mt-8 sm:text-6xl md:text-7xl ${brand.text}`}>{value}</p>
      <p className={`mt-0.5 text-center text-lg sm:mt-1 sm:text-2xl ${brand.muted}`}>{unit}</p>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e5dfe8] accent-[#6d5a7d] sm:mt-8"
      />
      <div className={`mt-1 flex justify-between text-xs sm:mt-2 sm:text-sm ${brand.muted}`}>
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

function MessageScreen({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#8fa89a]/15 text-lg text-[#5a6b62] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl" aria-hidden>
        ❀
      </div>
      <h3 className={`mt-2 text-center text-base font-semibold leading-snug sm:mt-5 sm:text-[1.65rem] sm:leading-tight md:text-4xl ${brand.text}`}>{title}</h3>
      <div className="mt-3 border-l-2 border-[#8fa89a]/50 pl-3 sm:mt-6 sm:pl-4">
        <p className={`text-sm leading-snug sm:text-base sm:leading-relaxed ${brand.muted}`}>{text}</p>
      </div>
    </div>
  );
}

function NumericCard({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8494]`}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-1.5 h-11 w-full rounded-xl border border-[#e0d8e4] bg-white/90 px-2 text-lg font-semibold tabular-nums outline-none focus:border-[#6d5a7d] sm:mt-2 sm:h-14 sm:rounded-2xl sm:px-3 sm:text-2xl ${brand.text}`}
      />
    </label>
  );
}
