import mealPlanData from "@/data/mealPlan.json";
import {
  getDeclaredAllergens,
  hiddenAllergensForLabel,
  normalizeFoodLabel,
  QUICK_CATALOG_MEALS,
  SAFE_FALLBACK_MEALS,
  type AllergenKey,
} from "@/data/mealAllergenCatalog";
import { fitsPrepBudget } from "@/data/mealPrepTimeCatalog";
import { clinicalAffinityScore } from "@/utils/clinicalAffinity";
import { getMealPortionDetails } from "@/utils/meal-portions";
import { comorbiditiesOnly } from "@/utils/profilePath";
import { mealKey } from "@/utils/planTracking";
import type { MealEntry, MealOverrideEntry, MealOverrideState, MealPlanData, OnboardingData } from "@/utils/types";

const MEAT_TERMS = ["poulet", "dinde", "bœuf", "boeuf", "viande", "porc", "jambon", "bacon", "lard", "canard", "steak"];
const FISH_TERMS = ["saumon", "cabillaud", "thon", "poisson", "crevettes", "sardine", "anchois"];
const DAIRY_TERMS = ["fromage", "yaourt", "lait", "feta", "skyr", "creme", "beurre", "mozzarella", "cheddar"];
const GLUTEN_TERMS = [
  "pain",
  "pates",
  "ble",
  "orge",
  "semoule",
  "wrap",
  "galette",
  "toast",
  "muesli",
  "flocon",
  "biscotte",
  "farine",
  "seigle",
  "panure",
];
const EGG_TERMS = ["oeuf", "omelette"];
const SOJA_TERMS = ["soja", "tofu", "tempeh", "edamame"];
const NUT_TERMS = ["amande", "noix", "noisette", "cajou", "pistache", "macadamia"];
const PEANUT_TERMS = ["arachide", "cacahuete", "peanut"];
const CRUSTACEAN_TERMS = ["crevette", "crustace", "homard", "crabe", "langoustine"];

/** Synonymes pour les exclusions de goût (onboarding). */
const EXCLUSION_SYNONYMS: Record<string, string[]> = {
  brocoli: ["brocoli"],
  champignons: ["champignon"],
  aubergine: ["aubergine"],
  coriandre: ["coriandre"],
  poivron: ["poivron"],
  tomate: ["tomate", "sauce tomate"],
  oignon: ["oignon"],
  epinards: ["epinard"],
  courgette: ["courgette"],
  chou: [" chou", "chou "],
  fromage: ["fromage", "feta", "mozzarella", "cheddar", "skyr"],
  poisson: [...FISH_TERMS, "filet de poisson"],
  "viande rouge": ["steak", "boeuf", "viande hachee", "steak hache"],
  piment: ["piment", "pimente", "harissa"],
  ananas: ["ananas"],
  oeufs: [...EGG_TERMS, "oeufs"],
};

const normalizeText = normalizeFoodLabel;

function containsTerm(blob: string, term: string): boolean {
  const t = normalizeText(term);
  if (t.length <= 4) {
    return new RegExp(`(?:^|[^a-z])${t}s?(?:$|[^a-z])`).test(blob);
  }
  return blob.includes(t);
}

function containsAny(blob: string, terms: string[]): boolean {
  return terms.some((t) => containsTerm(blob, t));
}

function isPlantMilkOrDairyFree(blob: string): boolean {
  return (
    blob.includes("lait veget") ||
    blob.includes("boisson veget") ||
    blob.includes("sans lactose") ||
    blob.includes("vegetal") ||
    blob.includes("beurre d'amande") ||
    blob.includes("beurre de cacah") ||
    blob.includes("beurre de cajou")
  );
}

function hasDairy(blob: string): boolean {
  if (isPlantMilkOrDairyFree(blob) && !containsAny(blob, ["fromage", "yaourt", "feta", "skyr", "mozzarella", "cheddar"])) {
    return false;
  }
  const withoutPlantButter = blob.replace(/beurre d[' ]amande|beurre de [a-z]+/g, " ");
  return containsAny(withoutPlantButter, DAIRY_TERMS);
}

function allergyHits(blob: string, allergy: string): boolean {
  const a = normalizeText(allergy);
  if (a === "lait") {
    return hasDairy(blob);
  }
  if (a === "gluten") {
    if (blob.includes("sans gluten")) return false;
    return containsAny(blob, GLUTEN_TERMS);
  }
  if (a === "fruits a coque") return containsAny(blob, NUT_TERMS);
  if (a === "arachides") return containsAny(blob, PEANUT_TERMS);
  if (a === "oeufs") return containsAny(blob, EGG_TERMS);
  if (a === "poisson") return containsAny(blob, FISH_TERMS);
  if (a === "crustaces") return containsAny(blob, CRUSTACEAN_TERMS);
  if (a === "soja") return containsAny(blob, SOJA_TERMS);
  if (a === "sesame") return containsAny(blob, ["sesame", "tahini"]);
  if (a === "celeri") return containsAny(blob, ["celeri"]);
  if (a === "moutarde") return containsAny(blob, ["moutarde"]);
  if (a === "sulfites") return containsAny(blob, ["sulfite", "sulfites"]);
  return blob.includes(a);
}

function exclusionHits(blob: string, exclusion: string): boolean {
  const key = normalizeText(exclusion);
  if (key === "chou") {
    return /(?:^|[^a-z])chou(?:$|[^a-z])/.test(blob) && !blob.includes("chou-fleur");
  }
  const terms = EXCLUSION_SYNONYMS[key];
  if (terms) return containsAny(blob, terms);
  return blob.includes(key);
}

function passesRegime(blob: string, regime: string | undefined): boolean {
  const r = normalizeText(regime ?? "omnivore");
  if (r.includes("vegetalien")) {
    if (containsAny(blob, [...MEAT_TERMS, ...FISH_TERMS, ...CRUSTACEAN_TERMS, ...EGG_TERMS, "miel"])) return false;
    if (hasDairy(blob)) return false;
  } else if (r.includes("vegetarien")) {
    if (containsAny(blob, [...MEAT_TERMS, ...FISH_TERMS, ...CRUSTACEAN_TERMS])) return false;
  } else if (r.includes("pescet")) {
    if (containsAny(blob, MEAT_TERMS)) return false;
  }
  if (r.includes("sans gluten") && !blob.includes("sans gluten") && containsAny(blob, GLUTEN_TERMS)) {
    return false;
  }
  if (r.includes("sans lactose")) {
    if (hasDairy(blob)) return false;
  }
  if (r.includes("halal") && containsAny(blob, ["porc", "jambon", "bacon", "lard"])) return false;
  return true;
}

/** Un aliment (nom de repas ou ingrédient) est-il incompatible avec le profil ? */
function isFoodBlobIncompatibleWithProfile(blob: string, profile: OnboardingData): boolean {
  if (!passesRegime(blob, profile.regimeAlimentaire)) return true;

  const hidden = hiddenAllergensForLabel(blob).map((a) => normalizeText(a));
  for (const allergy of profile.allergies ?? []) {
    if (allergyHits(blob, allergy)) return true;
    if (hidden.includes(normalizeText(allergy))) return true;
  }
  for (const hate of profile.alimentsDetestes ?? []) {
    if (exclusionHits(blob, hate)) return true;
  }
  return false;
}

/** Le repas déclare-t-il un allergène coché par l’utilisateur ? */
function hasDeclaredAllergenConflict(nom: string, profile: OnboardingData): boolean {
  const declared = getDeclaredAllergens(nom);
  if (!declared) return false;
  const selected = (profile.allergies ?? []).map((a) => normalizeText(a));
  return declared.some((allergene: AllergenKey) => selected.includes(normalizeText(allergene)));
}

function mealPortionIngredientBlobs(meal: Pick<MealEntry, "nom" | "calories">): string[] {
  const portions = getMealPortionDetails(meal.nom, meal.calories ?? 450);
  return portions.ingredients.map((ing) => normalizeText(ing.aliment));
}

/** Indique si un ingrédient (liste de courses) est exclu par le profil. */
export function isIngredientExcludedForProfile(aliment: string, profile: OnboardingData): boolean {
  return isFoodBlobIncompatibleWithProfile(normalizeText(aliment), profile);
}

/**
 * Trois filtres cumulatifs, du plus fiable au plus permissif : allergènes déclarés du
 * repas, puis mots-clés sur le nom, puis mots-clés sur chaque ingrédient de la portion.
 * Un seul suffit à rejeter le repas.
 */
export function isMealCompatibleWithProfile(
  meal: Pick<MealEntry, "nom" | "substitution" | "calories" | "type">,
  profile: OnboardingData,
): boolean {
  if (hasDeclaredAllergenConflict(meal.nom, profile)) return false;

  const nameBlob = normalizeText(meal.nom);
  if (isFoodBlobIncompatibleWithProfile(nameBlob, profile)) return false;

  for (const ingBlob of mealPortionIngredientBlobs(meal)) {
    if (isFoodBlobIncompatibleWithProfile(ingBlob, profile)) return false;
  }
  return true;
}

/**
 * Goûts favoris réellement retenus : régime, allergies et exclusions priment tous.
 * Une utilisatrice végétalienne ne doit pas garder « Poulet » en favori, même si elle
 * l'avait coché avant de choisir son régime.
 */
export function activeFoodPreferences(profile: OnboardingData): string[] {
  return (profile.alimentsPreferes ?? []).filter(
    (pref) => !isFoodBlobIncompatibleWithProfile(normalizeText(pref), profile),
  );
}

function preferenceScore(meal: Pick<MealEntry, "nom" | "calories">, profile: OnboardingData): number {
  const prefs = activeFoodPreferences(profile);
  if (!prefs.length) return 0;
  const blobs = [normalizeText(meal.nom), ...mealPortionIngredientBlobs(meal)];
  return prefs.reduce((score, pref) => {
    const p = normalizeText(pref);
    return blobs.some((b) => b.includes(p)) ? score + 1 : score;
  }, 0);
}

/** 1 si le repas tient dans le budget temps déclaré en onboarding, 0 sinon. */
function prepTimeScore(meal: Pick<MealEntry, "nom">, profile: OnboardingData): number {
  return fitsPrepBudget(meal.nom, profile.tempsCuisine) ? 1 : 0;
}

/** Goûts favoris + affinité avec les symptômes et profils associés déclarés. */
function profileAffinityScore(meal: Pick<MealEntry, "nom" | "calories" | "type">, profile: OnboardingData): number {
  return preferenceScore(meal, profile) + clinicalAffinityScore(meal.nom, meal.type, profile);
}

/**
 * Largeur de la bande calorique dans laquelle les goûts peuvent départager deux repas.
 * Au-delà, la calibration énergétique reprend la main : un plat favori 400 kcal trop
 * riche reste un mauvais repas.
 */
const CALORIE_TOLERANCE_KCAL = 150;

function calorieBand(meal: Pick<MealEntry, "calories">, plannedCalories: number): number {
  return Math.floor(Math.abs(meal.calories - plannedCalories) / CALORIE_TOLERANCE_KCAL);
}

function rankMealCandidates(
  candidates: MealEntry[],
  profile: OnboardingData,
  plannedCalories: number,
): MealEntry[] {
  return [...candidates].sort((a, b) => {
    const bandDiff = calorieBand(a, plannedCalories) - calorieBand(b, plannedCalories);
    if (bandDiff !== 0) return bandDiff;
    // Le temps disponible est une contrainte de vie, les goûts une préférence :
    // le budget temps passe donc avant les favoris.
    const prepDiff = prepTimeScore(b, profile) - prepTimeScore(a, profile);
    if (prepDiff !== 0) return prepDiff;
    // Symptômes / profils associés et goûts s'additionnent : aucun des deux n'écrase l'autre.
    const affinityDiff = profileAffinityScore(b, profile) - profileAffinityScore(a, profile);
    if (affinityDiff !== 0) return affinityDiff;
    return Math.abs(a.calories - plannedCalories) - Math.abs(b.calories - plannedCalories);
  });
}

/**
 * Empreinte des champs profil qui influencent le menu automatique.
 * Tout champ capable de changer le repas retenu doit y figurer, sinon le menu reste
 * figé après une modification du profil.
 */
export function profileMealPersonalizationFingerprint(profile: OnboardingData): string {
  return JSON.stringify({
    regime: profile.regimeAlimentaire ?? "",
    allergies: [...(profile.allergies ?? [])].sort(),
    detests: [...(profile.alimentsDetestes ?? [])].sort(),
    prefs: [...(profile.alimentsPreferes ?? [])].sort(),
    temps: profile.tempsCuisine ?? "",
    parcours: profile.parcoursPerte,
    symptomes: [...(profile.symptomes ?? [])].sort(),
    diagnostics: [...comorbiditiesOnly(profile.diagnostics)].sort(),
  });
}

/**
 * Repas de secours du même type, garanti sans allergène majeur. Utilisé quand le
 * catalogue principal ne propose plus rien : sans lui, l’app retomberait sur le repas
 * planifié, donc potentiellement sur un allergène.
 */
function pickSafeFallbackMeal(
  profile: OnboardingData,
  planned: MealEntry,
  rotationSeed: number,
): MealEntry | null {
  const safe = SAFE_FALLBACK_MEALS.filter(
    (meal) => meal.type === planned.type && isMealCompatibleWithProfile(meal, profile),
  );
  if (safe.length === 0) return null;
  const index = ((rotationSeed % safe.length) + safe.length) % safe.length;
  return safe[index];
}

export function pickBestCompatibleMeal(
  profile: OnboardingData,
  planned: MealEntry,
  excludeNoms: Set<string>,
  rotationSeed = 0,
): MealEntry | null {
  // Un repas sûr mais trop long reste un repas sûr : on ne le remplace que si une
  // option compatible ET plus rapide existe, jamais par un repas interdit.
  const plannedUsable = isMealCompatibleWithProfile(planned, profile) && !excludeNoms.has(planned.nom);
  if (plannedUsable && fitsPrepBudget(planned.nom, profile.tempsCuisine)) {
    return planned;
  }

  const findCandidates = (kcalWindow: number) =>
    getMealCatalog().filter((meal) => {
      if (meal.type !== planned.type) return false;
      if (meal.nom === planned.nom || excludeNoms.has(meal.nom)) return false;
      if (Math.abs(meal.calories - planned.calories) > kcalWindow) return false;
      return isMealCompatibleWithProfile(meal, profile);
    });

  let candidates = findCandidates(220);
  if (candidates.length === 0) candidates = findCandidates(400);
  if (candidates.length === 0) candidates = findCandidates(800);

  const substitution = planned.substitution?.trim();
  if (substitution && !excludeNoms.has(substitution)) {
    const subMeal = findCatalogMealByName(substitution);
    if (
      subMeal &&
      isMealCompatibleWithProfile(subMeal, profile) &&
      fitsPrepBudget(subMeal.nom, profile.tempsCuisine)
    ) {
      return subMeal;
    }
  }

  const ranked = rankMealCandidates(candidates, profile, planned.calories);
  const best = plannedUsable
    ? ranked.find((meal) => fitsPrepBudget(meal.nom, profile.tempsCuisine))
    : ranked[0];
  if (best) return best;

  // Rien de plus rapide au catalogue : garder le repas prévu plutôt que dégrader l'assiette.
  if (plannedUsable) return planned;

  return pickSafeFallbackMeal(profile, planned, rotationSeed);
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
      const rawExisting = existing[key];
      const existingSource = getMealOverrideSource(rawExisting);

      if (existingSource === "manual") {
        const effective = getEffectiveMeal(planned, rawExisting);
        if (isMealCompatibleWithProfile(effective, profile)) {
          usedNoms.add(effective.nom);
          continue;
        }
      }

      const pick = pickBestCompatibleMeal(profile, planned, usedNoms, day.jour + mi);
      if (!pick) {
        // Aucun repas sûr : on retire l’override plutôt que d’en imposer un faux, et la
        // couche d’affichage signalera explicitement l’absence de repas compatible.
        if (existingSource === "auto") delete result[key];
        continue;
      }

      if (pick.nom === planned.nom) {
        if (existingSource === "auto") delete result[key];
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

/**
 * Tournures qui décrivent un remplacement au lieu de nommer un plat
 * (« Tofu grillé à la place du poulet »). Comparées sur le libellé sans accents :
 * `\b` de JavaScript ne considère pas « à » comme un caractère de mot.
 */
const RELATIVE_LABEL_PATTERNS = [
  /a la place/,
  /au lieu de/,
  /^version /,
  /(^| )ou (tofu|poulet|dinde|saumon|thon|poisson)( |$)/,
  /remplacer?( |$)/,
  /^idem/,
];

/**
 * Un libellé qui ne se comprend qu'en référence à un autre plat ne peut pas devenir un
 * repas : il apparaîtrait tel quel dans le plan, les portions et la liste de courses.
 */
export function isRelativeMealLabel(label: string): boolean {
  const normalized = normalizeText(label);
  return RELATIVE_LABEL_PATTERNS.some((pattern) => pattern.test(normalized));
}

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
      if (sub && !seen.has(sub) && !isRelativeMealLabel(sub)) {
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

  for (const extra of [...QUICK_CATALOG_MEALS, ...SAFE_FALLBACK_MEALS]) {
    if (seen.has(extra.nom) || isRelativeMealLabel(extra.nom)) continue;
    seen.add(extra.nom);
    out.push({ ...extra });
  }

  catalogCache = out;
  return out;
}

export function findCatalogMealByName(nom: string): MealEntry | undefined {
  return getMealCatalog().find((m) => m.nom === nom);
}

function getMealOverrideSource(raw: MealOverrideEntry | string | undefined): "auto" | "manual" | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") return "manual";
  return raw.source ?? "manual";
}

export function resolveMealOverride(
  raw: MealOverrideEntry | string | undefined,
): MealOverrideEntry | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    const nom = raw.trim();
    if (!nom) return undefined;
    return { nom, calories: 0, custom: false, source: "manual" };
  }
  const nom = raw.nom?.trim();
  if (!nom) return undefined;
  return {
    nom,
    calories: Number.isFinite(raw.calories) ? Math.max(0, raw.calories) : 0,
    custom: raw.custom === true,
    source: raw.source,
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

/**
 * Repas réellement affichable pour ce profil.
 *
 * Retourne `null` quand aucun repas sûr n’existe : c’est volontaire. Renvoyer le repas
 * planifié ferait réapparaître un allergène coché par l’utilisateur ; l’interface doit
 * afficher un état explicite plutôt qu’un plat interdit.
 */
export function getProfileAdjustedEffectiveMeal(
  planned: MealEntry,
  overrideRaw: MealOverrideEntry | string | undefined,
  profile: OnboardingData,
  rotationSeed = 0,
): MealEntry | null {
  const meal = getEffectiveMeal(planned, overrideRaw);
  const source = getMealOverrideSource(overrideRaw);
  // Un choix manuel de l'utilisatrice n'est jamais remplacé pour un budget temps.
  if (source === "manual" && isMealCompatibleWithProfile(meal, profile)) return meal;
  if (isMealCompatibleWithProfile(meal, profile) && fitsPrepBudget(meal.nom, profile.tempsCuisine)) {
    return meal;
  }
  return pickBestCompatibleMeal(profile, planned, new Set(), rotationSeed);
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
  const subMeal = substitution && !isRelativeMealLabel(substitution) ? findCatalogMealByName(substitution) : undefined;
  const withSubstitution =
    subMeal &&
    isMealCompatibleWithProfile(subMeal, profile) &&
    fitsPrepBudget(subMeal.nom, profile.tempsCuisine)
      ? subMeal
      : undefined;

  const ranked = rankMealCandidates(candidates, profile, planned.calories);

  const safeFallbacks = SAFE_FALLBACK_MEALS.filter(
    (meal) =>
      meal.type === planned.type &&
      meal.nom !== planned.nom &&
      meal.nom !== excludeNom &&
      isMealCompatibleWithProfile(meal, profile),
  );

  const result: MealEntry[] = [];
  if (withSubstitution && withSubstitution.nom !== planned.nom) {
    result.push(withSubstitution);
  }
  for (const meal of [...ranked, ...safeFallbacks]) {
    if (result.some((m) => m.nom === meal.nom)) continue;
    result.push(meal);
    if (result.length >= 8) break;
  }
  return result;
}
