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

function localMealImagePath(nom: string): string {
  return `/images/meals/${mealImageSlug(nom)}.jpg`;
}

export const MEAL_TYPE_FALLBACK: Record<MealType, string> = {
  petit_dejeuner: "/images/meal-petit-dejeuner.svg",
  dejeuner: "/images/meal-dejeuner.svg",
  collation: "/images/meal-collation.svg",
  diner: "/images/meal-diner.svg",
};

/** Photo la plus fidèle par plat (clé = nom exact dans mealPlan.json). */
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

const KEYWORD_FALLBACKS: { keys: string[]; url: string }[] = [
  { keys: ["omelette", "œuf poché", "oeuf poché", "brouill", "pancake", "toast"], url: UNSPLASH("photo-1510693206972-df098062cb71") },
  { keys: ["porridge", "avoine", "flocon", "smoothie", "skyr"], url: UNSPLASH("photo-1515003197210-e0cd71810b5f") },
  { keys: ["saumon", "poisson", "thon", "cabillaud", "gratin"], url: UNSPLASH("photo-1467003909585-2f8a72700288") },
  { keys: ["poulet", "dinde", "steak", "viande", "curry"], url: UNSPLASH("photo-1596797038530-2c107229654b") },
  { keys: ["salade", "bowl", "quinoa", "lentille", "niçoise", "wrap", "houmous", "carotte"], url: UNSPLASH("photo-1540189549336-e6e99c3679fe") },
  { keys: ["soupe", "chili", "haricot"], url: UNSPLASH("photo-1547592166-23ac45744acd") },
  { keys: ["yaourt", "fromage blanc"], url: UNSPLASH("photo-1488477181946-6428a0291777") },
  { keys: ["pomme", "poire", "orange", "kiwi", "framboise", "myrtille", "fruit", "amande", "noix", "chocolat"], url: UNSPLASH("photo-1568702846914-96b305d2aaeb") },
];

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function matchByKeywords(nom: string): string | null {
  const n = normalizeForMatch(nom);
  for (const { keys, url } of KEYWORD_FALLBACKS) {
    if (keys.some((k) => n.includes(normalizeForMatch(k)))) return url;
  }
  return null;
}

export function getMealImageUrl(meal: Pick<MealEntry, "nom" | "type" | "image">): string {
  if (MEAL_IMAGE_BY_NAME[meal.nom]) return localMealImagePath(meal.nom);
  const byKeyword = matchByKeywords(meal.nom);
  if (byKeyword) return byKeyword;
  if (meal.image?.trim()) return meal.image.trim();
  return MEAL_TYPE_FALLBACK[meal.type];
}

export function isLocalMealImage(url: string): boolean {
  return url.startsWith("/");
}
