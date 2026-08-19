import type { OnboardingData, ProfilNutrition } from "@/utils/types";

export const PROFIL_NUTRITION_OPTIONS: {
  id: ProfilNutrition;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "sopk",
    title: "Je sais que j’ai le SOPK",
    subtitle: "Menus et conseils adaptés au syndrome des ovaires polykystiques.",
  },
  {
    id: "incertain",
    title: "Je ne suis pas sûre / je ne sais pas",
    subtitle: "Un régime personnalisé selon votre profil, sans partir du SOPK.",
  },
  {
    id: "general",
    title: "Je n’ai pas le SOPK",
    subtitle: "Un régime adapté à votre morphologie et votre objectif de poids.",
  },
];

/** Déduit le parcours nutrition à partir du profil (compatibilité anciens profils). */
export function resolveProfilNutrition(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): ProfilNutrition {
  if (profile.profilNutrition === "sopk" || profile.profilNutrition === "incertain" || profile.profilNutrition === "general") {
    return profile.profilNutrition;
  }
  const diagnostics = profile.diagnostics ?? [];
  if (diagnostics.includes("SOPK")) return "sopk";
  return "general";
}

export function isSopkNutritionProfile(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): boolean {
  return resolveProfilNutrition(profile) === "sopk";
}

export function profileNutritionShortLabel(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): string {
  const path = resolveProfilNutrition(profile);
  if (path === "sopk") return "SOPK";
  if (path === "incertain") return "Profil à affiner";
  return "Perte de poids";
}

export function profileSectionTitle(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): string {
  return isSopkNutritionProfile(profile) ? "Votre profil SOPK" : "Votre profil nutrition";
}

export function mealAlternativesLabel(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): string {
  return isSopkNutritionProfile(profile) ? "Alternatives SOPK" : "Alternatives adaptées";
}

export function defaultFoodFiltersLabel(profile: Pick<OnboardingData, "profilNutrition" | "diagnostics">): string {
  return isSopkNutritionProfile(profile) ? "Omnivore · menus SOPK standards" : "Omnivore · menus standards";
}

/** Marqueur « aucun profil associé » conservé pour les anciens profils enregistrés. */
export const DIAGNOSTIC_NONE = "Aucun diagnostic";

/** Réponse « Je ne sais pas » de l'étape Profils associés. */
export const COMORBIDITY_UNKNOWN = "Je ne sais pas";

/**
 * `diagnostics` mélange le parcours (« SOPK ») et les profils associés déclarés.
 * Ces deux lecteurs sont la seule façon autorisée de les séparer : le filtre était
 * recopié à cinq endroits et une copie contenait une faute de frappe qui la rendait
 * inopérante.
 */
export function comorbiditiesOnly(diagnostics: string[] | undefined): string[] {
  return (diagnostics ?? []).filter(
    (d) => d !== "SOPK" && d !== DIAGNOSTIC_NONE && d !== COMORBIDITY_UNKNOWN,
  );
}

/** Idem, mais garde « Je ne sais pas » : c'est une réponse cochable à l'écran. */
export function comorbiditySelection(diagnostics: string[] | undefined): string[] {
  return (diagnostics ?? []).filter((d) => d !== "SOPK" && d !== DIAGNOSTIC_NONE);
}

export function buildDiagnosticsForProfile(
  profilNutrition: ProfilNutrition,
  comorbidities: string[],
): string[] {
  const cleaned = comorbiditiesOnly(comorbidities);
  if (profilNutrition === "sopk") {
    return ["SOPK", ...cleaned];
  }
  return cleaned;
}
