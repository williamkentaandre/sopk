import type { OnboardingData } from "@/utils/types";
import { comorbiditiesOnly, defaultFoodFiltersLabel, isSopkNutritionProfile } from "@/utils/profilePath";

const SYMPTOM_TIPS: Record<string, string> = {
  "Coupes de fatigue à répétition":
    "Privilégiez protéines + fibres au déjeuner pour limiter les coups de barre l’après-midi.",
  "Fringales difficiles à calmer":
    "Anticipez une collation protéinée (skyr, œufs, poisson) quand la faim revient entre les repas.",
  "Ventre gonflé ou inconfort digestif":
    "Misez sur cuisson douce et portions modérées de légumineuses - augmentez progressivement.",
  "Graisse qui se concentre au niveau du ventre":
    "La marche quotidienne et les repas à index glycémique modéré aident à cibler la régulation métabolique.",
  "Nuits agitées ou trop courtes":
    "Un dîner plus léger et plus tôt peut améliorer la qualité du sommeil sur plusieurs jours.",
  "Humeur qui varie vite":
    "Stabilisez les prises alimentaires régulières : sautes de repas = sautes d’humeur fréquentes.",
  "Jambes lourdes / sensation de rétention":
    "Hydratation régulière et mouvement léger en fin de journée aident la sensation de lourdeur.",
};

const COMORBIDITY_TIPS: Record<string, string> = {
  Endométriose: "Anti-inflammatoire au quotidien : oméga-3, légumes colorés, limiter les excès de sucre.",
  "Hypothyroïdie / Hashimoto": "Attention au gluten et au lactose si vous les tolérez mal - adaptez via vos filtres alimentaires.",
  "Résistance à l’insuline": "Associez protéines et fibres à chaque repas pour lisser la glycémie.",
  "Ménopause / périménopause": "Calcium, protéines et marche régulière soutiennent masse maigre et métabolisme.",
};

/** Conseils courts issus du profil onboarding (symptômes, comorbidités, activité). */
export function buildProfileDayTips(profile: OnboardingData, max = 3): string[] {
  const tips: string[] = [];
  const seen = new Set<string>();

  for (const s of profile.symptomes ?? []) {
    if (s === "Peu ou pas de tout cela") continue;
    const tip = SYMPTOM_TIPS[s];
    if (tip && !seen.has(tip)) {
      tips.push(tip);
      seen.add(tip);
    }
    if (tips.length >= max) return tips;
  }

  for (const d of comorbiditiesOnly(profile.diagnostics)) {
    const tip = COMORBIDITY_TIPS[d];
    if (tip && !seen.has(tip)) {
      tips.push(tip);
      seen.add(tip);
    }
    if (tips.length >= max) return tips;
  }

  const niveau = (profile.niveauActivite ?? "").toLowerCase();
  if (niveau.includes("sédent") || niveau.includes("sedent")) {
    tips.push("Objectif pas calibré pour un rythme sédentaire : de courtes marches après les repas comptent.");
  }

  if (tips.length === 0) {
    tips.push(
      isSopkNutritionProfile(profile)
        ? "Vos repères (calories, eau, pas) sont calibrés à partir de votre profil SOPK."
        : "Vos repères (calories, eau, pas) sont calibrés à partir de votre profil.",
    );
  }

  return tips.slice(0, max);
}

/** Résumé lisible des filtres alimentaires actifs. */
export function profileFoodFiltersLabel(profile: OnboardingData): string {
  const parts: string[] = [];
  if (profile.regimeAlimentaire?.trim()) parts.push(profile.regimeAlimentaire.trim());
  const allergies = profile.allergies ?? [];
  if (allergies.length) parts.push(`sans ${allergies.slice(0, 2).join(", ")}${allergies.length > 2 ? "…" : ""}`);
  const detests = profile.alimentsDetestes ?? [];
  if (detests.length) parts.push(`${detests.length} exclusion${detests.length > 1 ? "s" : ""}`);
  const prefs = profile.alimentsPreferes ?? [];
  if (prefs.length) parts.push(`${prefs.length} favori${prefs.length > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : defaultFoodFiltersLabel(profile);
}
