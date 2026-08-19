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

function inferMealWhyFromLabel(mealName: string, sopkProfile: boolean): string {
  const trimmed = mealName.trim();
  if (!trimmed) {
    return sopkProfile
      ? "Repas calibré pour limiter les pics glycémiques et soutenir la satiété avec le SOPK."
      : "Repas calibré pour limiter les pics glycémiques et soutenir la satiété.";
  }

  const segments = trimmed
    .split(/\s*\+\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const ingredientList = segments.slice(0, 4).join(", ");
  const blob = normalizeText(trimmed);
  const benefits: string[] = [];

  if (/oeuf|omelette|skyr|fromage|yaourt|tofu|tempeh|poulet|dinde|saumon|thon|poisson|steak|cabillaud|galette vegetale/.test(blob)) {
    benefits.push("les protéines calment la faim plus longtemps");
  }
  if (
    /lentille|pois chiche|haricot|quinoa|avoine|flocon|riz complet|pain complet|legume|crudit|salade|brocoli|courgette|chou-fleur|carotte|concombre/.test(
      blob,
    )
  ) {
    benefits.push("les fibres lissent la réponse glycémique");
  }
  if (/saumon|thon|noix|amande|avocat|houmous|graine|noisette|pistache|cajou/.test(blob)) {
    benefits.push("les bons gras stabilisent l’énergie");
  }
  if (/framboise|myrtille|fruits rouges|baie|kiwi|orange|pomme|poire|banane|fraise|clementine|clémentine/.test(blob)) {
    benefits.push("le fruit apporte antioxydants et fibres");
  }
  if (/cannelle|curry|epice|épic/.test(blob)) {
    benefits.push("les épices enrichissent le goût sans sel excessif");
  }

  const benefitText =
    benefits.length > 0
      ? benefits.slice(0, 2).join(" et ")
      : "l’équilibre protéines-fibres limite les fringales";

  return `Ce repas combine ${ingredientList} : ${benefitText}, ce qui convient bien${sopkProfile ? " au SOPK" : " à votre profil"}.`;
}

function formatPortionHighlight(ingredients: MealIngredientPortion[]): string | null {
  if (ingredients.length === 0) return null;

  const lines = ingredients.slice(0, 4).map((ingredient) => {
    if (ingredient.displayLine) return ingredient.displayLine;
    return `${ingredient.aliment} (~${ingredient.grammes} g)`;
  });

  const suffix = ingredients.length > 4 ? "…" : "";
  return `Vos portions aujourd’hui : ${lines.join(", ")}${suffix}.`;
}

function portionAdjustmentNote(baseGrams: number, adjustedGrams: number, dailyTarget: number): string | null {
  if (baseGrams <= 0) return null;
  const ratio = adjustedGrams / baseGrams;
  if (Math.abs(ratio - 1) < 0.04) return null;

  const pct = Math.round(Math.abs(ratio - 1) * 100);
  if (ratio < 1) {
    return `Quantités réduites d’environ ${pct} % par rapport au plan standard, selon votre morphologie et votre objectif (${dailyTarget} kcal/j).`;
  }
  return `Quantités majorées d’environ ${pct} % pour couvrir votre besoin énergétique personnel (${dailyTarget} kcal/j).`;
}

function buildProfileMealHook(profile: OnboardingData, mealName: string, mealType: MealType): string | null {
  const blob = normalizeText(mealName);
  const preferred = (profile.alimentsPreferes ?? []).filter((food) => blob.includes(normalizeText(food)));
  if (preferred.length > 0) {
    return `Vous aviez indiqué aimer ${preferred.slice(0, 2).join(" et ")}  - ce repas s’appuie dessus.`;
  }

  const symptoms = profile.symptomes ?? [];
  const proteinRich =
    /oeuf|omelette|skyr|fromage|yaourt|tofu|tempeh|poulet|dinde|saumon|thon|poisson|steak|cabillaud|lentille|pois chiche|haricot/.test(
      blob,
    );

  if (symptoms.some((symptom) => symptom.includes("Fringales")) && proteinRich) {
    return "Riche en protéines : un bon levier pour vous, car vous signalez des fringales difficiles à calmer.";
  }
  if (symptoms.some((symptom) => symptom.includes("fatigue")) && mealType === "dejeuner") {
    return "Un déjeuner structuré comme celui-ci peut limiter les coups de barre de l’après-midi.";
  }
  if (
    symptoms.some((symptom) => symptom.includes("gonflé") || symptom.includes("digestif")) &&
    /soupe|crudit|lentille|pois chiche|legume/.test(blob)
  ) {
    return "Fibres et légumes en volume : utile si vous avez un ventre sensible  - augmentez progressivement si besoin.";
  }
  if (symptoms.some((symptom) => symptom.includes("Nuits")) && mealType === "diner") {
    return "Dîner sans excès de sucres rapides : plus confortable si vos nuits sont agitées.";
  }
  if (symptoms.some((symptom) => symptom.includes("ventre") || symptom.includes("Graisse"))) {
    return "Repas à charge glycémique modérée, aligné avec votre objectif de régulation métabolique.";
  }

  const regime = profile.regimeAlimentaire ?? "";
  if (regime.includes("Végétalienne") && !/oeuf|fromage|skyr|yaourt|feta|saumon|thon|dinde|poulet|steak|cabillaud|poisson/.test(blob)) {
    return "Aligné avec votre régime végétalien.";
  }
  if (regime.includes("Végétarienne") && !/poulet|dinde|saumon|thon|steak|cabillaud|poisson/.test(blob)) {
    return "Conforme à votre régime végétarien.";
  }

  const allergyHit = (profile.allergies ?? []).find((allergy) => blob.includes(normalizeText(allergy)));
  if (allergyHit) {
    return `Ce libellé mentionne « ${allergyHit} »  - vérifiez la substitution si vous devez l’éviter.`;
  }

  const diagnostics = profile.diagnostics ?? [];
  if (diagnostics.some((diagnostic) => diagnostic.includes("insuline")) && /quinoa|riz complet|avoine|lentille|legume|crudit|brocoli/.test(blob)) {
    return "Glucides complets et fibres : pertinent si vous vivez une résistance à l’insuline.";
  }
  if (diagnostics.some((diagnostic) => diagnostic.includes("Endométriose")) && /saumon|thon|légume|legume|brocoli|fruits rouges|baie/.test(blob)) {
    return "Oméga-3 et légumes colorés : cohérent avec une approche anti-inflammatoire au quotidien.";
  }

  const detested = (profile.alimentsDetestes ?? []).filter((food) => blob.includes(normalizeText(food)));
  if (detested.length > 0) {
    return `Ce repas contient « ${detested[0]} » que vous aviez exclu  - pensez à une alternative du plan si besoin.`;
  }

  return null;
}

export function buildMealWhyToday(
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
    lookupMealWhyCatalog(meal.nom) ??
    (basePortions.why.includes("Portions estimées à partir du libellé")
      ? inferMealWhyFromLabel(meal.nom, isSopkNutritionProfile(profile))
      : basePortions.why);

  const baseGrams = basePortions.ingredients.reduce((sum, ingredient) => sum + ingredient.grammes, 0);
  const adjustedGrams = adjustedPortions.ingredients.reduce((sum, ingredient) => sum + ingredient.grammes, 0);

  return joinParagraphs([
    mealWhy,
    formatPortionHighlight(adjustedPortions.ingredients),
    buildProfileMealHook(profile, meal.nom, meal.type),
    portionAdjustmentNote(baseGrams, adjustedGrams, dailyTarget),
  ]);
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
