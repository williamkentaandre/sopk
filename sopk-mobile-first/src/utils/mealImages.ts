import { getMealPortionDetails } from "@/utils/meal-portions";
import type { MealEntry, MealType } from "@/utils/types";

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

export function mealImageSlug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Illustrations abstraites par type de repas. Interdites pour un plat du catalogue :
 * elles ne représentent pas un aliment. Conservées pour un état non alimentaire
 * (créneau vide, saisie libre).
 */
export const MEAL_TYPE_FALLBACK: Record<MealType, string> = {
  petit_dejeuner: "/images/meal-petit-dejeuner.svg",
  dejeuner: "/images/meal-dejeuner.svg",
  collation: "/images/meal-collation.svg",
  diner: "/images/meal-diner.svg",
};

/** Photo de plat nommé (Unsplash), utilisée telle quelle. */
export const MEAL_IMAGE_BY_NAME: Record<string, string> = {
  "Omelette épinards + pain complet": UNSPLASH("photo-1510693206972-df098062cb71"),
  "Salade quinoa, poulet, avocat, légumes croquants": UNSPLASH("photo-1540189549336-e6e99c3679fe"),
  "Pomme + 10 amandes": UNSPLASH("photo-1568702846914-96b305d2aaeb"),
  "Saumon au four + brocoli + patate douce": UNSPLASH("photo-1467003909585-2f8a72700288"),
  "Porridge flocons d’avoine, lait végétal, cannelle": UNSPLASH("photo-1515003197210-e0cd71810b5f"),
  "Buddha bowl lentilles, crudités, feta": UNSPLASH("photo-1543332164-6e82f355badc"),
  "Fromage blanc nature + graines de courge": UNSPLASH("photo-1488477181946-6428a0291777"),
  "Dinde sautée + courgettes + riz basmati complet": UNSPLASH("photo-1603133872878-684f208fb84b"),
  "Skyr + noix + framboises": UNSPLASH("photo-1490474418585-ba9bad8fd0ea"),
  "Wrap complet au thon, crudités, houmous": UNSPLASH("photo-1626700051175-6818013e1d4f"),
  "Carottes + houmous": UNSPLASH("photo-1540189549336-e6e99c3679fe"),
  "Chili maison haricots rouges + salade verte": UNSPLASH("photo-1604908176997-125f25cc6f3d"),
  "Toast complet, avocat, œuf poché": UNSPLASH("photo-1525351484163-7529414344d8"),
  "Poisson blanc, quinoa, légumes rôtis": UNSPLASH("photo-1551248429-40975aa4de74"),
  "Orange + 1 carré chocolat noir 85%": UNSPLASH("photo-1611080626919-7cf5a9dbab5b"),
  "Soupe de légumes + pois chiches + salade": UNSPLASH("photo-1547592166-23ac45744acd"),
  "Smoothie protéiné (sans sucre ajouté) + flocons": UNSPLASH("photo-1553530666-ba11a7da3888"),
  "Salade pois chiches, concombre, tomate, feta": UNSPLASH("photo-1512621776951-a57141f2eefd"),
  "Yaourt nature + myrtilles": UNSPLASH("photo-1498837167922-ddd27525d352"),
  "Poulet au curry doux + chou-fleur + riz complet": UNSPLASH("photo-1596797038530-2c107229654b"),
  "Pancakes flocons d’avoine maison + skyr": UNSPLASH("photo-1519676867240-f03562e64548"),
  "Bowl saumon fumé, riz complet, avocat, concombre": UNSPLASH("photo-1553621042-f6e147245754"),
  "Kiwi + noix de cajou": UNSPLASH("photo-1619566636858-adf3ef46400b"),
  "Steak haché 5% + haricots verts + quinoa": UNSPLASH("photo-1600891964092-4316c288032e"),
  "Œufs brouillés + champignons + pain complet": UNSPLASH("photo-1510693206972-df098062cb71"),
  "Salade niçoise revisitée (sans pommes de terre)": UNSPLASH("photo-1539136788836-5699e78bfc75"),
  "Fruits rouges + fromage blanc": UNSPLASH("photo-1563805042-7684c019e1cb"),
  "Gratin de légumes + filet de poisson": UNSPLASH("photo-1625944525533-473f1a3d54e7"),
};

/**
 * Photos d'aliments, du plus spécifique au plus générique.
 * Un plat sans photo dédiée prend celle de son aliment principal, pas un SVG.
 */
const FOOD_PHOTOS: { terms: string[]; url: string }[] = [
  { terms: ["avocat", "guacamole"], url: UNSPLASH("photo-1523049673857-eb18f1d7b578") },
  { terms: ["pois chiche", "houmous"], url: UNSPLASH("photo-1512621776951-a57141f2eefd") },
  { terms: ["tomate"], url: UNSPLASH("photo-1546094096-0df4bcaaa337") },
  { terms: ["tofu"], url: UNSPLASH("photo-1546069901-ba9599a7e63c") },
  { terms: ["laitue"], url: UNSPLASH("photo-1556801712-76c8eb07bbc9") },
  { terms: ["lentille", "dahl"], url: UNSPLASH("photo-1547592166-23ac45744acd") },
  { terms: ["quinoa"], url: UNSPLASH("photo-1543332164-6e82f355badc") },
  { terms: ["thon"], url: UNSPLASH("photo-1539136788836-5699e78bfc75") },
  { terms: ["saumon", "cabillaud", "poisson"], url: UNSPLASH("photo-1467003909585-2f8a72700288") },
  { terms: ["omelette", "oeuf", "œuf", "brouill", "pancake", "toast"], url: UNSPLASH("photo-1510693206972-df098062cb71") },
  { terms: ["porridge", "avoine", "flocon", "smoothie"], url: UNSPLASH("photo-1515003197210-e0cd71810b5f") },
  { terms: ["poulet", "dinde", "steak", "viande", "curry"], url: UNSPLASH("photo-1596797038530-2c107229654b") },
  { terms: ["wrap"], url: UNSPLASH("photo-1626700051175-6818013e1d4f") },
  { terms: ["soupe", "chili", "haricot"], url: UNSPLASH("photo-1547592166-23ac45744acd") },
  { terms: ["yaourt", "fromage", "skyr", "compote"], url: UNSPLASH("photo-1488477181946-6428a0291777") },
  { terms: ["banane"], url: UNSPLASH("photo-1571771894821-ce9b6c11bba9") },
  { terms: ["clementine", "clémentine"], url: UNSPLASH("photo-1611080626919-7cf5a9dbab5b") },
  { terms: ["concombre"], url: UNSPLASH("photo-1449301377387-8186cdd4230e") },
  { terms: ["pomme", "poire", "orange", "kiwi", "framboise", "myrtille", "fruit", "amande", "noix", "noisette", "chocolat"], url: UNSPLASH("photo-1568702846914-96b305d2aaeb") },
  { terms: ["riz", "patate"], url: UNSPLASH("photo-1512058564366-18510be2db19") },
  { terms: ["tempeh"], url: UNSPLASH("photo-1546069901-ba9599a7e63c") },
  { terms: ["salade", "bowl", "bol", "crudit"], url: UNSPLASH("photo-1540189549336-e6e99c3679fe") },
];

/** Dernier repli encore alimentaire (un vrai plat), par type de repas. */
export const FOOD_BY_MEAL_TYPE: Record<MealType, string> = {
  petit_dejeuner: UNSPLASH("photo-1510693206972-df098062cb71"),
  dejeuner: UNSPLASH("photo-1540189549336-e6e99c3679fe"),
  collation: UNSPLASH("photo-1568702846914-96b305d2aaeb"),
  diner: UNSPLASH("photo-1467003909585-2f8a72700288"),
};

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[œŒ]/g, "oe");
}

function matchFoodPhoto(text: string): string | null {
  const n = normalizeForMatch(text);
  for (const { terms, url } of FOOD_PHOTOS) {
    if (terms.some((term) => n.includes(normalizeForMatch(term)))) return url;
  }
  return null;
}

export function isMealTypeSvgFallback(url: string): boolean {
  return url.endsWith(".svg") || Object.values(MEAL_TYPE_FALLBACK).includes(url);
}

/**
 * Image d'un repas : photo du plat, sinon photo de l'aliment principal, sinon
 * photo alimentaire du type de repas. Jamais le SVG abstrait pour un plat nommé.
 */
export function getMealImageUrl(
  meal: Pick<MealEntry, "nom" | "type" | "image"> & Partial<Pick<MealEntry, "calories">>,
): string {
  const byName = MEAL_IMAGE_BY_NAME[meal.nom];
  if (byName) return byName;

  const byLabel = matchFoodPhoto(meal.nom);
  if (byLabel) return byLabel;

  const portions = getMealPortionDetails(meal.nom, meal.calories);
  for (const ingredient of portions.ingredients) {
    const byIngredient = matchFoodPhoto(ingredient.aliment);
    if (byIngredient) return byIngredient;
  }

  const declared = meal.image?.trim();
  if (declared && !isMealTypeSvgFallback(declared) && !declared.startsWith("/images/meals/")) {
    return declared;
  }

  return FOOD_BY_MEAL_TYPE[meal.type];
}

export function isLocalMealImage(url: string): boolean {
  return url.startsWith("/");
}
