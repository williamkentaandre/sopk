import { getProgramDayCount } from "@/utils/mealPlan";
import type { ParcoursPerte } from "@/utils/types";

export interface MealIngredientPortion {
  aliment: string;
  grammes: number;
  /** Si défini, remplace le rendu « aliment : X g » (ex. nombre d’œufs adapté au profil). */
  displayLine?: string;
}

export interface MealPortionDetails {
  ingredients: MealIngredientPortion[];
  why: string;
}

interface PortionProfileInput {
  age: number;
  poidsKg: number;
  tailleCm: number;
  parcoursPerte: ParcoursPerte;
  objectifKcalJour?: number;
}

type MealType = "petit_dejeuner" | "dejeuner" | "collation" | "diner";

const detailsByMealName: Record<string, MealPortionDetails> = {
  "omelette epinards + pain complet": {
    ingredients: [
      { aliment: "Oeufs", grammes: 120 },
      { aliment: "Epinards", grammes: 80 },
      { aliment: "Pain complet", grammes: 50 },
    ],
    why: "Apport élevé en protéines et fibres pour limiter les pics glycémiques matinaux.",
  },
  "salade quinoa, poulet, avocat, legumes croquants": {
    ingredients: [
      { aliment: "Quinoa cuit", grammes: 120 },
      { aliment: "Poulet grillé", grammes: 130 },
      { aliment: "Avocat", grammes: 60 },
      { aliment: "Légumes croquants", grammes: 150 },
    ],
    why: "Répartition protéines-glucides-lipides pour améliorer la satiété et éviter les fringales.",
  },
  "pomme + 10 amandes": {
    ingredients: [
      { aliment: "Pomme", grammes: 150 },
      { aliment: "Amandes", grammes: 15 },
    ],
    why: "Fruit + gras de qualité pour ralentir l’absorption du sucre et stabiliser l’énergie.",
  },
  "saumon au four + brocoli + patate douce": {
    ingredients: [
      { aliment: "Saumon", grammes: 140 },
      { aliment: "Brocoli", grammes: 180 },
      { aliment: "Patate douce", grammes: 130 },
    ],
    why: "Oméga-3 anti-inflammatoires + fibres, utile pour SOPK et gestion du poids.",
  },
  "porridge flocons d’avoine, lait vegetal, cannelle": {
    ingredients: [
      { aliment: "Flocons d’avoine", grammes: 55 },
      { aliment: "Lait végétal sans sucre", grammes: 180 },
      { aliment: "Cannelle", grammes: 2 },
    ],
    why: "Glucides complexes dosés pour une énergie progressive sans crash.",
  },
  "buddha bowl lentilles, crudites, feta": {
    ingredients: [
      { aliment: "Lentilles cuites", grammes: 130 },
      { aliment: "Crudités", grammes: 180 },
      { aliment: "Feta", grammes: 35 },
    ],
    why: "Légumineuses riches en fibres/protéines pour meilleure sensibilité à l’insuline.",
  },
  "fromage blanc nature + graines de courge": {
    ingredients: [
      { aliment: "Fromage blanc nature", grammes: 150 },
      { aliment: "Graines de courge", grammes: 12 },
    ],
    why: "Protéines + micronutriments (magnésium, zinc) pour soutenir le métabolisme hormonal.",
  },
  "dinde sautee + courgettes + riz basmati complet": {
    ingredients: [
      { aliment: "Dinde", grammes: 130 },
      { aliment: "Courgettes", grammes: 170 },
      { aliment: "Riz basmati complet cuit", grammes: 120 },
    ],
    why: "Repas complet avec charge glycémique modérée et bon contrôle de satiété.",
  },
  "skyr + noix + framboises": {
    ingredients: [
      { aliment: "Skyr nature", grammes: 170 },
      { aliment: "Noix", grammes: 15 },
      { aliment: "Framboises", grammes: 80 },
    ],
    why: "Petit-déjeuner riche en protéines, pauvre en sucres rapides, utile contre les fringales.",
  },
  "wrap complet au thon, crudites, houmous": {
    ingredients: [
      { aliment: "Wrap complet", grammes: 60 },
      { aliment: "Thon au naturel", grammes: 110 },
      { aliment: "Crudités", grammes: 120 },
      { aliment: "Houmous", grammes: 35 },
    ],
    why: "Dose contrôlée de glucides avec protéines élevées pour une meilleure stabilité glycémique.",
  },
  "carottes + houmous": {
    ingredients: [
      { aliment: "Carottes", grammes: 140 },
      { aliment: "Houmous", grammes: 40 },
    ],
    why: "Collation fibre + protéines végétales pour limiter les envies sucrées de fin de journée.",
  },
  "chili maison haricots rouges + salade verte": {
    ingredients: [
      { aliment: "Haricots rouges cuits", grammes: 150 },
      { aliment: "Sauce tomate maison", grammes: 120 },
      { aliment: "Salade verte", grammes: 120 },
    ],
    why: "Repas riche en fibres solubles favorisant la satiété et le confort digestif.",
  },
  "toast complet, avocat, oeuf poche": {
    ingredients: [
      { aliment: "Pain complet", grammes: 55 },
      { aliment: "Avocat", grammes: 70 },
      { aliment: "Oeuf poché", grammes: 60 },
    ],
    why: "Association protéines + graisses de qualité pour réduire les pics glycémiques.",
  },
  "poisson blanc, quinoa, legumes rotis": {
    ingredients: [
      { aliment: "Poisson blanc", grammes: 150 },
      { aliment: "Quinoa cuit", grammes: 110 },
      { aliment: "Légumes rôtis", grammes: 170 },
    ],
    why: "Profil léger et rassasiant, idéal pour déficit calorique sans fatigue.",
  },
  "orange + 1 carre chocolat noir 85%": {
    ingredients: [
      { aliment: "Orange", grammes: 150 },
      { aliment: "Chocolat noir 85%", grammes: 10 },
    ],
    why: "Apport plaisir contrôlé pour éviter la frustration et les écarts importants.",
  },
  "soupe de legumes + pois chiches + salade": {
    ingredients: [
      { aliment: "Soupe de légumes", grammes: 300 },
      { aliment: "Pois chiches cuits", grammes: 90 },
      { aliment: "Salade", grammes: 100 },
    ],
    why: "Volume alimentaire élevé avec calories maîtrisées pour un dîner rassasiant.",
  },
  "smoothie proteine (sans sucre ajoute) + flocons": {
    ingredients: [
      { aliment: "Lait végétal sans sucre", grammes: 200 },
      { aliment: "Poudre protéinée", grammes: 25 },
      { aliment: "Flocons d’avoine", grammes: 30 },
    ],
    why: "Boost protéique matinal pour mieux contrôler l’appétit sur la journée.",
  },
  "salade pois chiches, concombre, tomate, feta": {
    ingredients: [
      { aliment: "Pois chiches cuits", grammes: 130 },
      { aliment: "Concombre", grammes: 90 },
      { aliment: "Tomate", grammes: 90 },
      { aliment: "Feta", grammes: 35 },
    ],
    why: "Combinaison fibres + protéines pour soutenir la perte de poids durable.",
  },
  "yaourt nature + myrtilles": {
    ingredients: [
      { aliment: "Yaourt nature", grammes: 140 },
      { aliment: "Myrtilles", grammes: 70 },
    ],
    why: "Collation faible charge glycémique et antioxydante.",
  },
  "poulet au curry doux + chou-fleur + riz complet": {
    ingredients: [
      { aliment: "Poulet", grammes: 130 },
      { aliment: "Chou-fleur", grammes: 170 },
      { aliment: "Riz complet cuit", grammes: 110 },
    ],
    why: "Apport protéique solide et glucides mesurés pour limiter le stockage excessif.",
  },
  "pancakes flocons d’avoine maison + skyr": {
    ingredients: [
      { aliment: "Flocons d’avoine", grammes: 50 },
      { aliment: "Oeuf", grammes: 60 },
      { aliment: "Skyr nature", grammes: 120 },
    ],
    why: "Version pancake plus protéinée pour garder un petit-déjeuner rassasiant.",
  },
  "bowl saumon fume, riz complet, avocat, concombre": {
    ingredients: [
      { aliment: "Saumon fumé", grammes: 90 },
      { aliment: "Riz complet cuit", grammes: 120 },
      { aliment: "Avocat", grammes: 60 },
      { aliment: "Concombre", grammes: 90 },
    ],
    why: "Bon équilibre en lipides/protéines pour une énergie stable l’après-midi.",
  },
  "kiwi + noix de cajou": {
    ingredients: [
      { aliment: "Kiwi", grammes: 120 },
      { aliment: "Noix de cajou", grammes: 18 },
    ],
    why: "Collation simple, micronutriments + gras rassasiants, sans surcharge calorique.",
  },
  "steak hache 5% + haricots verts + quinoa": {
    ingredients: [
      { aliment: "Steak haché 5%", grammes: 120 },
      { aliment: "Haricots verts", grammes: 180 },
      { aliment: "Quinoa cuit", grammes: 100 },
    ],
    why: "Forte densité en protéines maigres pour préserver la masse musculaire en perte de poids.",
  },
  "oeufs brouilles + champignons + pain complet": {
    ingredients: [
      { aliment: "Oeufs brouillés", grammes: 120 },
      { aliment: "Champignons", grammes: 110 },
      { aliment: "Pain complet", grammes: 50 },
    ],
    why: "Repas matinal rassasiant, glucides maîtrisés et protéines de bonne qualité.",
  },
  "salade nicoise revisitée (sans pommes de terre)": {
    ingredients: [
      { aliment: "Thon", grammes: 100 },
      { aliment: "Haricots verts", grammes: 120 },
      { aliment: "Tomates", grammes: 100 },
      { aliment: "Oeuf", grammes: 60 },
    ],
    why: "Version à charge glycémique plus basse, utile pour SOPK et contrôle du poids.",
  },
  "fruits rouges + fromage blanc": {
    ingredients: [
      { aliment: "Fruits rouges", grammes: 100 },
      { aliment: "Fromage blanc", grammes: 140 },
    ],
    why: "Apporte protéines et fibres avec peu de sucres rapides.",
  },
  "gratin de legumes + filet de poisson": {
    ingredients: [
      { aliment: "Gratin de légumes", grammes: 220 },
      { aliment: "Filet de poisson", grammes: 140 },
    ],
    why: "Dîner léger en calories mais riche en volume et protéines pour mieux tenir la nuit.",
  },
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/\u2019|\u2018|\u00b4|\u2032/g, "'")
    .toLowerCase();
}

/** Œuf cru / cocotte ~53 g ; utilisé pour estimer le nombre d’œufs à partir des g déjà ajustés au régime. */
const EGG_GRAMS_PER_UNIT = 53;

function isEggIngredient(aliment: string): boolean {
  const x = normalize(aliment);
  return x.includes("oeuf") || x.includes("omelett");
}

function eggCountFromGrams(grammes: number): number {
  return Math.max(1, Math.round(grammes / EGG_GRAMS_PER_UNIT));
}

function formatEggPortionLine(aliment: string, grammes: number): string {
  const n = eggCountFromGrams(grammes);
  const plural = n > 1;
  const x = normalize(aliment);
  const gPart = `≈${grammes} g au total`;

  if (x.includes("poch")) {
    return plural ? `${n} œufs pochés (${gPart})` : `${n} œuf poché (${gPart})`;
  }
  if (x.includes("brouill")) {
    return plural ? `${n} œufs brouillés (${gPart})` : `${n} œuf brouillé (${gPart})`;
  }
  if (x.includes("omelett")) {
    return plural ? `${n} œufs en omelette (${gPart})` : `${n} œuf en omelette (${gPart})`;
  }
  return plural ? `${n} œufs (${gPart})` : `${n} œuf (${gPart})`;
}

const INFER_WHY =
  "Portions estimées à partir du libellé du plat et des calories prévues dans ton plan, puis ajustées selon ton profil et ton objectif calorique; adapte selon ta faim ou ton accompagnement.";

function parseExplicitEggCount(segment: string): number | undefined {
  const m = normalize(segment).match(/(\d+)\s*oeufs?/);
  if (!m) return undefined;
  const n = Number.parseInt(m[1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Segments type « A + B » du plan ou des alternatives. */
function inferPortionsFromMealLabel(mealName: string, planMealKcal: number): MealPortionDetails {
  const trimmed = mealName.trim();
  if (!trimmed) {
    return { ingredients: [], why: INFER_WHY };
  }

  const segments = trimmed.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    return { ingredients: [{ aliment: trimmed, grammes: 200 }], why: INFER_WHY };
  }

  const kcal = Math.max(120, planMealKcal);
  const totalTarget = clamp(Math.round(kcal / 2.35), 200, 720);

  const weights = segments.map((seg) => {
    const n = normalize(seg);
    let w = 1;
    if (/oeuf|omelette/.test(n)) w += 1.35;
    if (
      /pain|riz|quinoa|pate\b|patate|wrap|galette|muesli|porridge|flocon|legume|courgette|haricot|brocoli|salade|crudit|tomate|concombre|carotte|champignon|soupe|legumes/.test(
        n,
      )
    ) {
      w += 0.55;
    }
    if (
      /yaourt|skyr|fromage|houmous|tofu|tempeh|thon|saumon|cabillaud|poisson|dinde|poulet|steak|lentille|pois chiche|curry|bol\b|gratin|guacamole|compote/.test(
        n,
      )
    ) {
      w += 0.75;
    }
    if (/noix|amande|cajou|pistache|graine|chia|noisette/.test(n)) w += 0.12;
    if (/fruit|pomme|poire|orange|kiwi|banane|myrtille|framboise|baie|clémentine|clementine|fraise/.test(n)) w += 0.32;
    return w;
  });

  const sumW = weights.reduce((a, b) => a + b, 0) || 1;

  let ingredients: MealIngredientPortion[] = segments.map((seg, i) => {
    const share = (weights[i] ?? 1) / sumW;
    let grammes = Math.max(25, Math.round(totalTarget * share));
    const explicitEggs = parseExplicitEggCount(seg);
    const nLow = normalize(seg);
    if (explicitEggs !== undefined && /oeuf|omelette/.test(nLow)) {
      grammes = Math.max(grammes, explicitEggs * EGG_GRAMS_PER_UNIT);
    }
    return { aliment: seg, grammes };
  });

  const sumG = ingredients.reduce((s, x) => s + x.grammes, 0);
  if (sumG > totalTarget * 1.22) {
    ingredients = ingredients.map((x) => ({
      ...x,
      grammes: Math.max(15, Math.round((x.grammes / sumG) * totalTarget)),
    }));
  }

  return { ingredients, why: INFER_WHY };
}

export function getMealPortionDetails(mealName: string, planMealKcal?: number): MealPortionDetails {
  const normalized = normalize(mealName);
  const exactMatch = Object.entries(detailsByMealName).find(([key]) => normalize(key) === normalized)?.[1];
  if (exactMatch) return exactMatch;

  return inferPortionsFromMealLabel(mealName, planMealKcal ?? 450);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function portionParcoursT(parcours: ParcoursPerte): number {
  const d = getProgramDayCount(parcours);
  return Math.max(0, Math.min(1, (d - 30) / (365 - 30)));
}

function getProfilePortionRatio(profile: PortionProfileInput, mealType: MealType): number {
  const sizeIndex = profile.poidsKg / ((profile.tailleCm / 100) * (profile.tailleCm / 100));
  let ratio = 1;

  const t = portionParcoursT(profile.parcoursPerte);
  ratio += -0.07 * (1 - t) + 0.02 * t;

  if (sizeIndex < 21) ratio += 0.08;
  if (sizeIndex >= 21 && sizeIndex < 25) ratio += 0.03;
  if (sizeIndex >= 30) ratio -= 0.05;

  if (profile.age >= 45) ratio -= 0.03;
  if (profile.age <= 24) ratio += 0.02;

  if (mealType === "collation") ratio = 1 + (ratio - 1) * 0.6;
  if (mealType === "diner" && t < 0.12) ratio -= 0.02;

  return clamp(ratio, 0.85, 1.15);
}

function getObjectivePortionRatio(objectifKcalJour?: number, mealType?: MealType): number {
  if (!objectifKcalJour) return 1;

  let ratio = 1;
  if (objectifKcalJour <= 1450) ratio -= 0.08;
  else if (objectifKcalJour <= 1600) ratio -= 0.04;
  else if (objectifKcalJour >= 2100) ratio += 0.05;
  else if (objectifKcalJour >= 1900) ratio += 0.02;

  if (mealType === "collation") ratio = 1 + (ratio - 1) * 0.7;
  if (mealType === "diner" && objectifKcalJour <= 1600) ratio -= 0.02;

  return clamp(ratio, 0.86, 1.12);
}

export function getMealPortionDetailsAdjusted(
  mealName: string,
  kcalRatio: number,
  profile?: PortionProfileInput,
  mealType?: MealType,
  planMealKcal?: number
): MealPortionDetails {
  const base = getMealPortionDetails(mealName, planMealKcal);
  const safeKcalRatio = clamp(kcalRatio, 0.75, 1.3);
  const profileRatio = profile && mealType ? getProfilePortionRatio(profile, mealType) : 1;
  const objectiveRatio = getObjectivePortionRatio(profile?.objectifKcalJour, mealType);
  const safeRatio = clamp(safeKcalRatio * profileRatio * objectiveRatio, 0.68, 1.35);

  return {
    ingredients: base.ingredients.map((ingredient) => {
      const grammes = Math.max(5, Math.round(ingredient.grammes * safeRatio));
      if (isEggIngredient(ingredient.aliment)) {
        return {
          aliment: ingredient.aliment,
          grammes,
          displayLine: formatEggPortionLine(ingredient.aliment, grammes),
        };
      }
      return { ...ingredient, grammes };
    }),
    why:
      safeRatio === 1
        ? `${base.why} Portions maintenues (profil proche du plan standard).`
        : safeRatio < 1
          ? `${base.why} Portions ajustées à la baisse selon ton objectif calorique, ton profil (âge, morphologie, parcours) et le type de repas.`
          : `${base.why} Portions ajustées à la hausse selon ton besoin énergétique, ton objectif et ton profil personnel.`,
  };
}
