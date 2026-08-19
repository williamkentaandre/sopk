import {
  getMealPortionDetails,
  getMealPortionDetailsAdjusted,
  type MealIngredientPortion,
} from "@/utils/meal-portions";
import { lookupMealWhyCatalog } from "@/data/mealWhyCatalog";
import { defaultFoodFiltersLabel, isSopkNutritionProfile } from "@/utils/profilePath";
import {
  getDailyWalkingRecommendation,
  getMealCaloriesForTarget,
  parcoursHorizonLabel,
} from "@/utils/mealPlan";
import { profileFoodFiltersLabel } from "@/utils/profileAdvice";
import type { DayPlan, MealEntry, MealType, OnboardingData } from "@/utils/types";

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/\u2019|\u2018|\u00b4|\u2032/g, "'")
    .toLowerCase()
    .trim();
}

function joinParagraphs(parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join("\n\n");
}

type IngredientRole = "protein" | "legume" | "dairy" | "starch" | "fat" | "fruit" | "spice" | "veg";

function roleOf(aliment: string): IngredientRole {
  const n = normalizeText(aliment);
  if (
    /oeuf|omelette|poulet|dinde|saumon|thon|cabillaud|poisson|steak|tofu|tempeh|galette vegetale|poudre proteine/.test(
      n,
    )
  ) {
    return "protein";
  }
  if (/lentille|pois chiche|haricot|houmous/.test(n)) return "legume";
  if (/skyr|fromage|yaourt|feta/.test(n)) return "dairy";
  if (
    /pain|riz|quinoa|patate|wrap|galette|muesli|flocon|avoine|porridge|pate\b/.test(n)
  ) {
    return "starch";
  }
  if (
    /noix|amande|cajou|pistache|graine|chia|noisette|avocat|guacamole|chocolat|beurre d.amande|huile/.test(
      n,
    )
  ) {
    return "fat";
  }
  if (
    /pomme|poire|orange|kiwi|banane|myrtille|framboise|fraise|clementine|fruit|compote/.test(n)
  ) {
    return "fruit";
  }
  if (/cannelle|epice/.test(n)) return "spice";
  return "veg";
}

function slotHint(mealType: MealType): string {
  if (mealType === "petit_dejeuner") return "dès le matin";
  if (mealType === "dejeuner") return "jusqu’à l’après-midi";
  if (mealType === "collation") return "entre deux repas";
  return "le soir";
}

/**
 * Filet de sécurité si le plat n’a pas de texte catalogue : enseigne à partir
 * des aliments et grammes affichés, sans slogan générique ni relecture de la liste.
 */
export function teachFromDisplayedPortions(
  ingredients: MealIngredientPortion[],
  mealType: MealType,
): string | null {
  if (ingredients.length === 0) return null;

  const classified = ingredients.map((ingredient) => ({
    ...ingredient,
    role: roleOf(ingredient.aliment),
  }));

  const ideas: string[] = [];
  const used = new Set<string>();
  const remember = (key: string, sentence: string) => {
    if (used.has(key) || ideas.length >= 3) return;
    used.add(key);
    ideas.push(sentence);
  };

  const protein = classified.find((item) => item.role === "protein" || item.role === "legume" || item.role === "dairy");
  if (protein) {
    remember(
      "protein",
      `${protein.aliment} porte les protéines ${slotHint(mealType)} : c’est lui qui cale, pas le reste de l’assiette.`,
    );
  }

  const cappedFat = classified.find((item) => item.role === "fat" && item.grammes <= 80);
  if (cappedFat) {
    remember(
      "fat",
      `${cappedFat.aliment} est volontairement limité : assez de lipides pour ralentir le sucre, trop ferait exploser les calories.`,
    );
  }

  const cappedStarch = classified.find((item) => item.role === "starch" && item.grammes <= 140);
  if (cappedStarch) {
    remember(
      "starch",
      `${cappedStarch.aliment} reste la part d’énergie mesurée, pas le centre du repas.`,
    );
  }

  const volume = classified.find(
    (item) => (item.role === "veg" || item.role === "legume") && item.grammes >= 100,
  );
  if (volume) {
    remember(
      "volume",
      `${volume.aliment} occupe le volume : beaucoup d’assiette, peu de calories.`,
    );
  }

  const fruit = classified.find((item) => item.role === "fruit");
  if (fruit && ideas.length < 2) {
    remember(
      "fruit",
      `${fruit.aliment} reste une portion fruit, pas un jus ni un dessert sucré.`,
    );
  }

  const spice = classified.find((item) => item.role === "spice");
  if (spice && ideas.length < 2) {
    remember("spice", `${spice.aliment} relève le goût sans ajouter de sucre ni de sel excessif.`);
  }

  if (ideas.length === 0) {
    const first = classified[0];
    if (!first) return null;
    remember(
      "fallback",
      `${first.aliment} structure ce créneau ; les quantités affichées évitent de surdoser les aliments denses.`,
    );
  }

  return ideas.join(" ");
}

function portionAdjustmentNote(baseGrams: number, adjustedGrams: number, dailyTarget: number): string | null {
  if (baseGrams <= 0) return null;
  const ratio = adjustedGrams / baseGrams;
  if (Math.abs(ratio - 1) < 0.04) return null;

  const pct = Math.round(Math.abs(ratio - 1) * 100);
  if (ratio < 1) {
    return `Quantités réduites d’environ ${pct} % par rapport au plan standard, pour coller à votre objectif (${dailyTarget} kcal/j).`;
  }
  return `Quantités majorées d’environ ${pct} % pour couvrir votre besoin énergétique (${dailyTarget} kcal/j).`;
}

function buildProfileMealHook(profile: OnboardingData, mealName: string, mealType: MealType): string | null {
  const blob = normalizeText(mealName);
  const preferred = (profile.alimentsPreferes ?? []).filter((food) => blob.includes(normalizeText(food)));
  if (preferred.length > 0) {
    return `Vous aviez indiqué aimer ${preferred.slice(0, 2).join(" et ")} — ce repas s’appuie dessus.`;
  }

  const symptoms = profile.symptomes ?? [];
  const proteinRich =
    /oeuf|omelette|skyr|fromage|yaourt|tofu|tempeh|poulet|dinde|saumon|thon|poisson|steak|cabillaud|lentille|pois chiche|haricot/.test(
      blob,
    );

  if (symptoms.some((symptom) => symptom.includes("Fringales")) && proteinRich) {
    return "Riche en protéines : un levier concret pour vous, car vous signalez des fringales difficiles à calmer.";
  }
  if (symptoms.some((symptom) => symptom.includes("fatigue")) && mealType === "dejeuner") {
    return "Un déjeuner structuré comme celui-ci peut limiter les coups de barre de l’après-midi.";
  }
  if (
    symptoms.some((symptom) => symptom.includes("gonflé") || symptom.includes("digestif")) &&
    /soupe|crudit|lentille|pois chiche/.test(blob)
  ) {
    return "Fibres et volume : utile si le ventre est sensible — augmentez progressivement si besoin.";
  }
  if (symptoms.some((symptom) => symptom.includes("Nuits")) && mealType === "diner" && /soupe|poisson|legume|omelette/.test(blob)) {
    return "Dîner sans amidon excessif : plus confortable si vos nuits sont agitées.";
  }

  const allergyHit = (profile.allergies ?? []).find((allergy) => blob.includes(normalizeText(allergy)));
  if (allergyHit) {
    return `Ce libellé mentionne « ${allergyHit} » — vérifiez la substitution si vous devez l’éviter.`;
  }

  const diagnostics = profile.diagnostics ?? [];
  if (diagnostics.some((diagnostic) => diagnostic.includes("insuline")) && /quinoa|riz complet|avoine|lentille|brocoli/.test(blob)) {
    return "Glucides complets dosés : pertinent si vous vivez une résistance à l’insuline.";
  }
  if (diagnostics.some((diagnostic) => diagnostic.includes("Endométriose")) && /saumon|thon|brocoli|fruits rouges|baie/.test(blob)) {
    return "Oméga-3 ou légumes colorés dans ce plat : cohérent avec une approche anti-inflammatoire au quotidien.";
  }

  const detested = (profile.alimentsDetestes ?? []).filter((food) => blob.includes(normalizeText(food)));
  if (detested.length > 0) {
    return `Ce repas contient « ${detested[0]} » que vous aviez exclu — pensez à une alternative du plan si besoin.`;
  }

  return null;
}

/** Pédagogie à afficher sous la liste des portions (pas une 2ᵉ feature). */
export function buildMealPortionTeaching(
  profile: OnboardingData,
  meal: MealEntry,
  day: DayPlan,
  dailyTarget: number,
): string {
  const adjustedKcal = getMealCaloriesForTarget(meal.calories, day, dailyTarget, profile.rythmeRepas);
  const kcalRatio = adjustedKcal / Math.max(1, meal.calories);

  const basePortions = getMealPortionDetails(meal.nom, meal.calories);
  const adjustedPortions = getMealPortionDetailsAdjusted(
    meal.nom,
    kcalRatio,
    {
      age: profile.age,
      poidsKg: profile.poidsKg,
      tailleCm: profile.tailleCm,
      parcoursPerte: profile.parcoursPerte,
      objectifKcalJour: dailyTarget,
    },
    meal.type,
    meal.calories,
  );

  const mealWhy =
    lookupMealWhyCatalog(meal.nom) ?? teachFromDisplayedPortions(adjustedPortions.ingredients, meal.type);

  const baseGrams = basePortions.ingredients.reduce((sum, ingredient) => sum + ingredient.grammes, 0);
  const adjustedGrams = adjustedPortions.ingredients.reduce((sum, ingredient) => sum + ingredient.grammes, 0);

  return joinParagraphs([
    mealWhy,
    buildProfileMealHook(profile, meal.nom, meal.type),
    portionAdjustmentNote(baseGrams, adjustedGrams, dailyTarget),
  ]);
}

/** @deprecated Utiliser buildMealPortionTeaching — conservé pour les audits de profil. */
export function buildMealWhyToday(
  profile: OnboardingData,
  meal: MealEntry,
  day: DayPlan,
  dailyTarget: number,
): string {
  return buildMealPortionTeaching(profile, meal, day, dailyTarget);
}

function symptomHydrationHint(profile: OnboardingData): string | null {
  const symptoms = profile.symptomes ?? [];
  if (symptoms.some((symptom) => symptom.includes("rétention") || symptom.includes("Jambes lourdes"))) {
    return "L’hydratation régulière peut aussi soulager la sensation de jambes lourdes ou de rétention.";
  }
  if (symptoms.some((symptom) => symptom.includes("Fringales"))) {
    return "Avant de grignoter, vérifiez si vous n’avez pas soif  - la faim et la soif se confondent souvent.";
  }
  if (symptoms.some((symptom) => symptom.includes("fatigue"))) {
    return "Une déshydratation légère accentue parfois la fatigue  - un verre régulier aide.";
  }
  return null;
}

function activityStepsHint(profile: OnboardingData, stepsTarget: number): string | null {
  const niveau = (profile.niveauActivite ?? "").toLowerCase();
  if (niveau.includes("sédent") || niveau.includes("sedent")) {
    return `À ${stepsTarget.toLocaleString("fr-FR")} pas, l’objectif reste progressif pour un rythme sédentaire : chaque marche compte.`;
  }
  if (niveau.includes("très active") || niveau.includes("tres active")) {
    return "Votre niveau d’activité habituel permet de viser un peu plus haut sans vous épuiser.";
  }
  if ((profile.symptomes ?? []).some((symptom) => symptom.includes("Graisse") || symptom.includes("ventre"))) {
    return "La marche quotidienne améliore la sensibilité à l’insuline  - un levier clé pour la régulation métabolique.";
  }
  return null;
}

export function buildWaterWhyToday(profile: OnboardingData, waterTargetMl: number): string {
  const targetL = (waterTargetMl / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const filters = profileFoodFiltersLabel(profile);

  return joinParagraphs([
    `Objectif ${targetL} L aujourd’hui, calculé à partir de vos ${profile.poidsKg} kg, ${profile.tailleCm} cm et votre niveau d’activité.`,
    isSopkNutritionProfile(profile)
      ? "Avec le SOPK, boire régulièrement soutient le métabolisme, la digestion et limite les fausses fringales."
      : "Boire régulièrement soutient le métabolisme, la digestion et limite les fausses fringales.",
    symptomHydrationHint(profile),
    filters !== defaultFoodFiltersLabel(profile) ? `Profil alimentaire : ${filters}.` : null,
  ]);
}

export function buildStepsWhyToday(profile: OnboardingData, stepsTarget: number): string {
  const walking = getDailyWalkingRecommendation(profile);
  const stepsLabel = stepsTarget.toLocaleString("fr-FR");
  const horizon = parcoursHorizonLabel(profile.parcoursPerte);

  return joinParagraphs([
    `${stepsLabel} pas pour améliorer la sensibilité à l’insuline, sans surcharge  - parcours ${horizon}.`,
    walking.note,
    activityStepsHint(profile, stepsTarget),
  ]);
}
