import mealPlanData from "@/data/mealPlan.json";
import { mealKey } from "@/utils/planTracking";
import type { MealEntry, MealOverrideEntry, MealOverrideState, MealPlanData, OnboardingData } from "@/utils/types";

const MEAT_TERMS = ["poulet", "dinde", "bœuf", "boeuf", "viande", "porc", "jambon", "bacon", "lard", "canard"];
const FISH_TERMS = ["saumon", "cabillaud", "thon", "poisson", "crevettes", "sardine"];
const DAIRY_TERMS = ["fromage", "yaourt", "lait", "feta", "skyr", "crème", "beurre"];
const GLUTEN_TERMS = ["pain", "pâtes", "pates", "blé", "ble", "orge", "semoule"];
const EGG_TERMS = ["œuf", "oeuf", "omelette"];
const QUICK_MEAL_TERMS = ["salade", "wrap", "smoothie", "yaourt", "omelette", "soupe", "bowl", "toast", "galette"];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function mealTextBlob(meal: Pick<MealEntry, "nom" | "substitution">): string {
  return normalizeText(`${meal.nom} ${meal.substitution ?? ""}`);
}

function containsAny(blob: string, terms: string[]): boolean {
  return terms.some((t) => blob.includes(normalizeText(t)));
}

function allergyHits(blob: string, allergy: string): boolean {
  const a = normalizeText(allergy);
  if (a === "lait") return containsAny(blob, DAIRY_TERMS);
  if (a === "gluten") return containsAny(blob, GLUTEN_TERMS);
  if (a === "fruits a coque") return containsAny(blob, ["amande", "noix", "noisette", "cajou", "pistache"]);
  if (a === "oeufs") return containsAny(blob, EGG_TERMS);
  if (a === "poisson") return containsAny(blob, FISH_TERMS);
  if (a === "crustaces") return containsAny(blob, ["crevette", "crustace", "homard"]);
  return blob.includes(a);
}

function exclusionHits(blob: string, exclusion: string): boolean {
  return blob.includes(normalizeText(exclusion));
}

function passesRegime(blob: string, regime: string | undefined): boolean {
  const r = normalizeText(regime ?? "omnivore");
  if (r.includes("vegetalien")) {
    if (containsAny(blob, [...MEAT_TERMS, ...FISH_TERMS, ...DAIRY_TERMS, ...EGG_TERMS, "miel"])) return false;
  } else if (r.includes("vegetarien")) {
    if (containsAny(blob, [...MEAT_TERMS, ...FISH_TERMS])) return false;
  } else if (r.includes("pescet")) {
    if (containsAny(blob, MEAT_TERMS)) return false;
  }
  if (r.includes("sans gluten") && containsAny(blob, GLUTEN_TERMS) && !blob.includes("sans gluten")) {
    return false;
  }
  if (r.includes("sans lactose") && containsAny(blob, DAIRY_TERMS)) return false;
  if (r.includes("halal") && containsAny(blob, ["porc", "jambon", "bacon", "lard"])) return false;
  return true;
}

export function isMealCompatibleWithProfile(
  meal: Pick<MealEntry, "nom" | "substitution">,
  profile: OnboardingData,
): boolean {
  const blob = mealTextBlob(meal);
  if (!passesRegime(blob, profile.regimeAlimentaire)) return false;
  for (const allergy of profile.allergies ?? []) {
    if (allergyHits(blob, allergy)) return false;
  }
  for (const hate of profile.alimentsDetestes ?? []) {
    if (exclusionHits(blob, hate)) return false;
  }
  return true;
}

function preferenceScore(meal: Pick<MealEntry, "nom">, prefs: string[] | undefined): number {
  if (!prefs?.length) return 0;
  const blob = normalizeText(meal.nom);
  return prefs.reduce((score, pref) => (blob.includes(normalizeText(pref)) ? score + 1 : score), 0);
}

function quickMealScore(meal: Pick<MealEntry, "nom">, tempsCuisine: string | undefined): number {
  const t = normalizeText(tempsCuisine ?? "");
  const blob = normalizeText(meal.nom);
  const isQuick = QUICK_MEAL_TERMS.some((k) => blob.includes(normalizeText(k)));
  if (t.includes("moins de 15")) return isQuick ? 2 : -1;
  if (t.includes("15 - 30") || t.includes("15-30")) return isQuick ? 1 : 0;
  return 0;
}

function rankMealCandidates(
  candidates: MealEntry[],
  profile: OnboardingData,
  plannedCalories: number,
): MealEntry[] {
  return [...candidates].sort((a, b) => {
    const prefDiff = preferenceScore(b, profile.alimentsPreferes) - preferenceScore(a, profile.alimentsPreferes);
    if (prefDiff !== 0) return prefDiff;
    const quickDiff = quickMealScore(b, profile.tempsCuisine) - quickMealScore(a, profile.tempsCuisine);
    if (quickDiff !== 0) return quickDiff;
    return Math.abs(a.calories - plannedCalories) - Math.abs(b.calories - plannedCalories);
  });
}

/** Empreinte des champs profil qui influencent le menu automatique. */
export function profileMealPersonalizationFingerprint(profile: OnboardingData): string {
  return JSON.stringify({
    regime: profile.regimeAlimentaire ?? "",
    allergies: [...(profile.allergies ?? [])].sort(),
    detests: [...(profile.alimentsDetestes ?? [])].sort(),
    prefs: [...(profile.alimentsPreferes ?? [])].sort(),
    temps: profile.tempsCuisine ?? "",
    parcours: profile.parcoursPerte,
  });
}

export function pickBestCompatibleMeal(
  profile: OnboardingData,
  planned: MealEntry,
  excludeNoms: Set<string>,
): MealEntry | null {
  if (isMealCompatibleWithProfile(planned, profile) && !excludeNoms.has(planned.nom)) {
    return planned;
  }

  const kcalWindow = 220;
  const candidates = getMealCatalog().filter((meal) => {
    if (meal.type !== planned.type) return false;
    if (meal.nom === planned.nom || excludeNoms.has(meal.nom)) return false;
    if (Math.abs(meal.calories - planned.calories) > kcalWindow) return false;
    return isMealCompatibleWithProfile(meal, profile);
  });

  const substitution = planned.substitution?.trim();
  if (substitution && !excludeNoms.has(substitution)) {
    const subMeal = findCatalogMealByName(substitution);
    if (subMeal && isMealCompatibleWithProfile(subMeal, profile)) {
      return subMeal;
    }
  }

  const ranked = rankMealCandidates(candidates, profile, planned.calories);
  return ranked[0] ?? null;
}

/**
 * Applique des remplacements automatiques pour les repas incompatibles avec le profil.
 * Les overrides `manual` de l’utilisateur ne sont jamais écrasés.
 */
export function buildAutoMealOverrides(
  profile: OnboardingData,
  mealPlan: MealPlanData,
  existing: MealOverrideState,
): MealOverrideState {
  const result: MealOverrideState = { ...existing };

  for (const day of mealPlan.jours) {
    const usedNoms = new Set<string>();

    for (let mi = 0; mi < day.repas.length; mi++) {
      const planned = day.repas[mi];
      const key = mealKey(day.jour, mi);
      const existingOverride = resolveMealOverride(existing[key]);

      if (existingOverride?.source === "manual") {
        const effective = getEffectiveMeal(planned, existing[key]);
        usedNoms.add(effective.nom);
        continue;
      }

      const pick = pickBestCompatibleMeal(profile, planned, usedNoms);
      if (!pick) {
        if (existingOverride?.source === "auto") delete result[key];
        continue;
      }

      if (pick.nom === planned.nom) {
        if (existingOverride?.source === "auto") delete result[key];
        usedNoms.add(planned.nom);
        continue;
      }

      result[key] = catalogMealOverride(pick, "auto");
      usedNoms.add(pick.nom);
    }
  }

  return result;
}

function mealOverridesEqual(a: MealOverrideState, b: MealOverrideState): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k, i) => keysB[i] === k && JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

export function syncAutoMealOverridesIfNeeded(
  profile: OnboardingData,
  mealPlan: MealPlanData,
  existing: MealOverrideState,
): MealOverrideState | null {
  const next = buildAutoMealOverrides(profile, mealPlan, existing);
  return mealOverridesEqual(existing, next) ? null : next;
}

let catalogCache: MealEntry[] | null = null;

export function getMealCatalog(): MealEntry[] {
  if (catalogCache) return catalogCache;
  const parsed = mealPlanData as MealPlanData;
  const seen = new Set<string>();
  const out: MealEntry[] = [];

  for (const day of parsed.jours) {
    for (const meal of day.repas) {
      if (!seen.has(meal.nom)) {
        seen.add(meal.nom);
        out.push({ ...meal });
      }
      const sub = meal.substitution?.trim();
      if (sub && !seen.has(sub)) {
        seen.add(sub);
        out.push({
          type: meal.type,
          nom: sub,
          calories: meal.calories,
          substitution: "",
          image: meal.image,
        });
      }
    }
  }
  catalogCache = out;
  return out;
}

export function findCatalogMealByName(nom: string): MealEntry | undefined {
  return getMealCatalog().find((m) => m.nom === nom);
}

export function resolveMealOverride(
  raw: MealOverrideEntry | string | undefined,
): MealOverrideEntry | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    const nom = raw.trim();
    if (!nom) return undefined;
    return { nom, calories: 0, custom: false };
  }
  const nom = raw.nom?.trim();
  if (!nom) return undefined;
  return {
    nom,
    calories: Number.isFinite(raw.calories) ? Math.max(0, raw.calories) : 0,
    custom: raw.custom === true,
  };
}

export function getEffectiveMeal(
  planned: MealEntry,
  overrideRaw: MealOverrideEntry | string | undefined,
): MealEntry {
  const override = resolveMealOverride(overrideRaw);
  if (!override || override.nom === planned.nom) return planned;

  if (override.custom) {
    const kcal = override.calories > 0 ? override.calories : planned.calories;
    return {
      ...planned,
      nom: override.nom,
      calories: kcal,
      substitution: "",
      image: "",
    };
  }

  const fromCatalog = findCatalogMealByName(override.nom);
  if (fromCatalog) return fromCatalog;
  return { ...planned, nom: override.nom };
}

export function catalogMealOverride(meal: MealEntry, source: "auto" | "manual" = "manual"): MealOverrideEntry {
  return { nom: meal.nom, calories: meal.calories, custom: false, source };
}

export function customMealOverride(nom: string, calories: number): MealOverrideEntry {
  const label = nom.trim() || "Autre repas équivalent personnalisé";
  const kcal = Math.min(1500, Math.max(50, Math.round(calories)));
  return { nom: label, calories: kcal, custom: true, source: "manual" };
}

export function getMealAlternatives(
  profile: OnboardingData,
  planned: MealEntry,
  excludeNom?: string,
): MealEntry[] {
  const kcalWindow = 220;
  const candidates = getMealCatalog().filter((meal) => {
    if (meal.type !== planned.type) return false;
    if (meal.nom === planned.nom || meal.nom === excludeNom) return false;
    if (Math.abs(meal.calories - planned.calories) > kcalWindow) return false;
    return isMealCompatibleWithProfile(meal, profile);
  });

  const substitution = planned.substitution?.trim();
  const withSubstitution =
    substitution && isMealCompatibleWithProfile({ nom: substitution, substitution: "" }, profile)
      ? findCatalogMealByName(substitution)
      : undefined;

  const ranked = rankMealCandidates(candidates, profile, planned.calories);

  const result: MealEntry[] = [];
  if (withSubstitution && withSubstitution.nom !== planned.nom) {
    result.push(withSubstitution);
  }
  for (const meal of ranked) {
    if (result.some((m) => m.nom === meal.nom)) continue;
    result.push(meal);
    if (result.length >= 8) break;
  }
  return result;
}
