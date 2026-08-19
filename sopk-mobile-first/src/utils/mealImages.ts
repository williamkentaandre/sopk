import { getMealPortionDetails } from "@/utils/meal-portions";
import type { MealEntry, MealType } from "@/utils/types";

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

/** Pomme rouge — uniquement pour les libellés « pomme », jamais poire / fruits / noix. */
export const APPLE_PHOTO_ID = "photo-1568702846914-96b305d2aaeb";

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

const PHOTO = {
  apple: UNSPLASH(APPLE_PHOTO_ID),
  pear: UNSPLASH("photo-1633932701157-d1e26452a327"),
  kiwi: UNSPLASH("photo-1585059895524-72359e06133a"),
  orange: UNSPLASH("photo-1611080626919-7cf5a9dbab5b"),
  strawberry: UNSPLASH("photo-1518635017498-87f514b751ba"),
  blueberry: UNSPLASH("photo-1626433281588-ae724357378d"),
  yogurtBerry: UNSPLASH("photo-1488477181946-6428a0291777"),
  bananaBowl: UNSPLASH("photo-1641579719214-534970165dc9"),
  walnut: UNSPLASH("photo-1524593000379-d4729b2c4f99"),
  avocado: UNSPLASH("photo-1523049673857-eb18f1d7b578"),
  cucumber: UNSPLASH("photo-1604977042946-1eecc30f269e"),
  carrot: UNSPLASH("photo-1598170845058-32b9d6a5da37"),
  hummus: UNSPLASH("photo-1637949907734-d5583aa35b41"),
  chickpeaSalad: UNSPLASH("photo-1512621776951-a57141f2eefd"),
  quinoaBowl: UNSPLASH("photo-1512621776951-a57141f2eefd"),
  mixedSalad: UNSPLASH("photo-1540189549336-e6e99c3679fe"),
  soup: UNSPLASH("photo-1547592166-23ac45744acd"),
  eggs: UNSPLASH("photo-1510693206972-df098062cb71"),
  toastAvocado: UNSPLASH("photo-1525351484163-7529414344d8"),
  porridge: UNSPLASH("photo-1515003197210-e0cd71810b5f"),
  smoothie: UNSPLASH("photo-1553530666-ba11a7da3888"),
  pancakes: UNSPLASH("photo-1519676867240-f03562e64548"),
  wrap: UNSPLASH("photo-1626700051175-6818013e1d4f"),
  tunaNicoise: UNSPLASH("photo-1539136788836-5699e78bfc75"),
  salmon: UNSPLASH("photo-1467003909585-2f8a72700288"),
  salmonBowl: UNSPLASH("photo-1553621042-f6e147245754"),
  chickenCurry: UNSPLASH("photo-1596797038530-2c107229654b"),
  turkeyStir: UNSPLASH("photo-1603133872878-684f208fb84b"),
  steak: UNSPLASH("photo-1600891964092-4316c288032e"),
  chili: UNSPLASH("photo-1604908176997-125f25cc6f3d"),
  gratin: UNSPLASH("photo-1625944525533-473f1a3d54e7"),
  tofuBowl: UNSPLASH("photo-1546069901-ba9599a7e63c"),
  lettuce: UNSPLASH("photo-1556801712-76c8eb07bbc9"),
  tomato: UNSPLASH("photo-1546094096-0df4bcaaa337"),
  rice: UNSPLASH("photo-1512058564366-18510be2db19"),
  yogurt: UNSPLASH("photo-1488477181946-6428a0291777"),
  breakfastFruit: UNSPLASH("photo-1490474418585-ba9bad8fd0ea"),
} as const;

/** Photo de plat nommé (Unsplash), utilisée telle quelle. */
export const MEAL_IMAGE_BY_NAME: Record<string, string> = {
  // Petits-déjeuners
  "Omelette épinards + pain complet": PHOTO.eggs,
  "Yaourt grec nature + fruits rouges + graines de chia": PHOTO.yogurtBerry,
  "Porridge flocons d’avoine, lait végétal, cannelle": PHOTO.porridge,
  "Pain complet + fromage blanc + kiwi": PHOTO.kiwi,
  "Skyr + noix + framboises": PHOTO.breakfastFruit,
  "Omelette 2 œufs + tomates cerises": PHOTO.eggs,
  "Toast complet, avocat, œuf poché": PHOTO.toastAvocado,
  "Galettes de sarrasin + fromage blanc": PHOTO.pancakes,
  "Smoothie protéiné (sans sucre ajouté) + flocons": PHOTO.smoothie,
  "Skyr + banane + graines de lin": PHOTO.bananaBowl,
  "Pancakes flocons d’avoine maison + skyr": PHOTO.pancakes,
  "Bol de muesli sans sucre + yaourt nature": PHOTO.bananaBowl,
  "Œufs brouillés + champignons + pain complet": PHOTO.eggs,
  "Tofu brouillé + pain complet": PHOTO.tofuBowl,
  "Œufs brouillés aux tomates cerises": PHOTO.eggs,
  "Banane, beurre d’amande et graines de chia": PHOTO.bananaBowl,
  "Riz complet aux fruits rouges et graines de courge": PHOTO.blueberry,
  "Compote pomme-cannelle et graines de chia": PHOTO.apple,
  "Quinoa tiède, banane et graines de tournesol": PHOTO.bananaBowl,

  // Déjeuners
  "Salade quinoa, poulet, avocat, légumes croquants": PHOTO.mixedSalad,
  "Salade quinoa, tofu grillé, avocat, légumes croquants": PHOTO.tofuBowl,
  "Buddha bowl lentilles, crudités, feta": PHOTO.quinoaBowl,
  "Buddha bowl pois chiches, crudités, feta": PHOTO.chickpeaSalad,
  "Wrap complet au thon, crudités, houmous": PHOTO.wrap,
  "Wrap complet au poulet, crudités, houmous": PHOTO.wrap,
  "Poisson blanc, quinoa, légumes rôtis": PHOTO.quinoaBowl,
  "Tofu mariné + quinoa + légumes": PHOTO.tofuBowl,
  "Salade pois chiches, concombre, tomate, feta": PHOTO.chickpeaSalad,
  "Salade lentilles vertes, concombre, tomate, feta": PHOTO.quinoaBowl,
  "Bowl saumon fumé, riz complet, avocat, concombre": PHOTO.salmonBowl,
  "Bowl tofu fumé, riz complet, avocat, concombre": PHOTO.tofuBowl,
  "Salade niçoise revisitée (sans pommes de terre)": PHOTO.tunaNicoise,
  "Salade niçoise végétarienne aux pois chiches": PHOTO.chickpeaSalad,
  "Salade de quinoa, pois chiches et concombre": PHOTO.chickpeaSalad,
  "Riz complet, haricots rouges et avocat": PHOTO.avocado,
  "Salade pois chiches, concombre, tomate et avocat": PHOTO.chickpeaSalad,
  "Houmous, crudités et quinoa": PHOTO.hummus,
  "Feuilles de laitue, tofu et crudités": PHOTO.lettuce,
  "Salade de lentilles, carottes râpées et citron": PHOTO.carrot,
  "Thon au naturel, crudités et riz complet": PHOTO.tunaNicoise,
  "Salade de quinoa, avocat et concombre": PHOTO.avocado,

  // Collations — sujet = aliment du libellé
  "Pomme + 10 amandes": PHOTO.apple,
  "Poire + noix": PHOTO.pear,
  "Fromage blanc nature + graines de courge": PHOTO.yogurt,
  "Skyr nature + cannelle": PHOTO.yogurt,
  "Carottes + houmous": PHOTO.hummus,
  "Concombre + guacamole léger": PHOTO.avocado,
  "Orange + 1 carré chocolat noir 85%": PHOTO.orange,
  "Clémentines + noisettes": PHOTO.orange,
  "Yaourt nature + myrtilles": PHOTO.blueberry,
  "Fromage blanc + fraises": PHOTO.yogurtBerry,
  "Kiwi + noix de cajou": PHOTO.kiwi,
  "Pomme + pistaches": PHOTO.apple,
  "Fruits rouges + fromage blanc": PHOTO.strawberry,
  "Compote sans sucre + yaourt nature": PHOTO.yogurt,
  "Pomme et graines de courge": PHOTO.apple,
  "Myrtilles et graines de tournesol": PHOTO.blueberry,

  // Dîners
  "Saumon au four + brocoli + patate douce": PHOTO.salmon,
  "Cabillaud + haricots verts + riz complet": PHOTO.quinoaBowl,
  "Dinde sautée + courgettes + riz basmati complet": PHOTO.turkeyStir,
  "Tempeh sauté + légumes + quinoa": PHOTO.tofuBowl,
  "Chili maison haricots rouges + salade verte": PHOTO.chili,
  "Bol de lentilles épicées + salade verte": PHOTO.soup,
  "Soupe de légumes + pois chiches + salade": PHOTO.soup,
  "Soupe de légumes + omelette aux herbes": PHOTO.soup,
  "Poulet au curry doux + chou-fleur + riz complet": PHOTO.chickenCurry,
  "Curry de tofu + chou-fleur + riz complet": PHOTO.tofuBowl,
  "Steak haché 5% + haricots verts + quinoa": PHOTO.steak,
  "Galette végétale + légumes + quinoa": PHOTO.quinoaBowl,
  "Gratin de légumes + filet de poisson": PHOTO.gratin,
  "Gratin de légumes + tempeh": PHOTO.gratin,
  "Dahl de lentilles corail et riz basmati": PHOTO.soup,
  "Patate douce rôtie, pois chiches et salade verte": PHOTO.chickpeaSalad,
  "Bol avocat, pois chiches et tomate": PHOTO.avocado,
};

/**
 * Photos d'aliments, du plus spécifique au plus générique.
 * Un plat sans photo dédiée prend celle de son aliment principal, pas un SVG.
 */
const FOOD_PHOTOS: { terms: string[]; url: string }[] = [
  { terms: ["guacamole", "avocat"], url: PHOTO.avocado },
  { terms: ["houmous"], url: PHOTO.hummus },
  { terms: ["pois chiche"], url: PHOTO.chickpeaSalad },
  { terms: ["tomate"], url: PHOTO.tomato },
  { terms: ["tofu", "tempeh"], url: PHOTO.tofuBowl },
  { terms: ["laitue"], url: PHOTO.lettuce },
  { terms: ["lentille", "dahl"], url: PHOTO.soup },
  { terms: ["quinoa"], url: PHOTO.quinoaBowl },
  { terms: ["thon"], url: PHOTO.tunaNicoise },
  { terms: ["saumon"], url: PHOTO.salmon },
  { terms: ["cabillaud", "poisson"], url: PHOTO.quinoaBowl },
  { terms: ["omelette", "oeuf", "œuf", "brouill", "pancake", "toast"], url: PHOTO.eggs },
  { terms: ["porridge", "avoine", "flocon", "smoothie", "muesli"], url: PHOTO.porridge },
  { terms: ["poulet", "dinde", "steak", "viande", "curry"], url: PHOTO.chickenCurry },
  { terms: ["wrap"], url: PHOTO.wrap },
  { terms: ["soupe", "chili"], url: PHOTO.soup },
  { terms: ["yaourt", "fromage", "skyr", "compote"], url: PHOTO.yogurt },
  { terms: ["banane"], url: PHOTO.bananaBowl },
  { terms: ["clementine", "clémentine"], url: PHOTO.orange },
  { terms: ["concombre"], url: PHOTO.cucumber },
  { terms: ["kiwi"], url: PHOTO.kiwi },
  { terms: ["poire"], url: PHOTO.pear },
  { terms: ["orange"], url: PHOTO.orange },
  { terms: ["fraise"], url: PHOTO.strawberry },
  { terms: ["myrtille", "framboise", "fruits rouges"], url: PHOTO.blueberry },
  { terms: ["noix de cajou", "cajou"], url: PHOTO.walnut },
  { terms: ["pistache", "amande", "noisette"], url: PHOTO.walnut },
  { terms: ["noix"], url: PHOTO.walnut },
  { terms: ["pomme"], url: PHOTO.apple },
  { terms: ["carotte"], url: PHOTO.carrot },
  { terms: ["haricot"], url: PHOTO.chili },
  { terms: ["riz", "patate"], url: PHOTO.rice },
  { terms: ["salade", "bowl", "bol", "crudit"], url: PHOTO.mixedSalad },
  { terms: ["fruit"], url: PHOTO.strawberry },
];

/** Dernier repli encore alimentaire (un vrai plat), par type de repas. */
export const FOOD_BY_MEAL_TYPE: Record<MealType, string> = {
  petit_dejeuner: PHOTO.eggs,
  dejeuner: PHOTO.mixedSalad,
  collation: PHOTO.yogurt,
  diner: PHOTO.salmon,
};

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[œŒ]/g, "oe");
}

function termMatches(normalizedHaystack: string, term: string): boolean {
  const t = normalizeForMatch(term);
  if (t === "pomme") {
    const withoutPotato = normalizedHaystack.replace(/pommes?\s+de\s+terre/g, " ");
    return /(?:^|[^a-z])pommes?(?:$|[^a-z])/.test(withoutPotato);
  }
  if (t.length <= 5) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${escaped}(?:s)?(?:$|[^a-z])`).test(normalizedHaystack);
  }
  return normalizedHaystack.includes(t);
}

function matchFoodPhoto(text: string): string | null {
  const n = normalizeForMatch(text);
  for (const { terms, url } of FOOD_PHOTOS) {
    if (terms.some((term) => termMatches(n, term))) return url;
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
