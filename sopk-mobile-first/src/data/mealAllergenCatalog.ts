import type { MealEntry, MealType } from "@/utils/types";

/**
 * Source de vérité des allergènes par repas.
 *
 * La détection par mots-clés sur le libellé est structurellement faillible : un allergène
 * présent dans la recette mais absent du nom (tahini du houmous, fruits à coque du muesli,
 * lactosérum de la poudre protéinée) passerait inaperçu. Cette table déclare explicitement
 * les allergènes de chaque repas du catalogue ; elle est combinée aux mots-clés, jamais
 * substituée à eux. Un test échoue si un repas du plan n’a pas d’entrée ici.
 */

/** Doit rester aligné sur les `key` de `ALLERGY_ITEMS` (foodPreferenceCatalog). */
export type AllergenKey =
  | "Arachides"
  | "Lait"
  | "Gluten"
  | "Fruits à coque"
  | "Soja"
  | "Crustacés"
  | "Poisson"
  | "Œufs"
  | "Sésame"
  | "Céleri"
  | "Moutarde"
  | "Sulfites";

export function normalizeFoodLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[œŒ]/g, "oe")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’`´]/g, "'");
}

/**
 * Allergènes déclarés par repas (nom affiché → allergènes présents).
 * Un tableau vide signifie « aucun des 12 allergènes réglementaires », et c’est une
 * affirmation vérifiée, pas une absence d’information.
 */
const DECLARED_ALLERGENS: Record<string, AllergenKey[]> = {
  // ---------- Petits-déjeuners ----------
  "Omelette épinards + pain complet": ["Œufs", "Gluten"],
  "Omelette 2 œufs + tomates cerises": ["Œufs"],
  "Œufs brouillés + champignons + pain complet": ["Œufs", "Gluten", "Lait"],
  "Toast complet, avocat, œuf poché": ["Œufs", "Gluten"],
  "Pancakes flocons d’avoine maison + skyr": ["Gluten", "Œufs", "Lait"],
  "Porridge flocons d’avoine, lait végétal, cannelle": ["Gluten"],
  "Smoothie protéiné (sans sucre ajouté) + flocons": ["Gluten", "Lait", "Soja"],
  "Bol de muesli sans sucre + yaourt nature": ["Gluten", "Lait", "Fruits à coque"],
  "Galettes de sarrasin + fromage blanc": ["Gluten", "Lait", "Œufs"],
  "Pain complet + fromage blanc + kiwi": ["Gluten", "Lait"],
  "Tofu brouillé + pain complet": ["Soja", "Gluten"],
  "Skyr + banane + graines de lin": ["Lait"],
  "Skyr + noix + framboises": ["Lait", "Fruits à coque"],
  "Yaourt grec nature + fruits rouges + graines de chia": ["Lait"],

  // ---------- Déjeuners ----------
  "Salade quinoa, poulet, avocat, légumes croquants": [],
  "Salade quinoa, tofu grillé, avocat, légumes croquants": ["Soja"],
  "Salade pois chiches, concombre, tomate, feta": ["Lait"],
  "Salade lentilles vertes, concombre, tomate, feta": ["Lait"],
  "Salade niçoise revisitée (sans pommes de terre)": ["Poisson", "Œufs", "Moutarde"],
  "Salade niçoise végétarienne aux pois chiches": ["Œufs", "Moutarde"],
  "Buddha bowl lentilles, crudités, feta": ["Lait"],
  "Buddha bowl pois chiches, crudités, feta": ["Lait"],
  "Bowl saumon fumé, riz complet, avocat, concombre": ["Poisson"],
  "Bowl tofu fumé, riz complet, avocat, concombre": ["Soja"],
  "Poisson blanc, quinoa, légumes rôtis": ["Poisson"],
  "Wrap complet au thon, crudités, houmous": ["Gluten", "Poisson", "Sésame"],
  "Wrap complet au poulet, crudités, houmous": ["Gluten", "Sésame"],
  "Tofu mariné + quinoa + légumes": ["Soja"],

  // ---------- Collations ----------
  "Carottes + houmous": ["Sésame"],
  "Concombre + guacamole léger": [],
  "Pomme + 10 amandes": ["Fruits à coque"],
  "Pomme + pistaches": ["Fruits à coque"],
  "Poire + noix": ["Fruits à coque"],
  "Kiwi + noix de cajou": ["Fruits à coque"],
  "Clémentines + noisettes": ["Fruits à coque"],
  "Orange + 1 carré chocolat noir 85%": ["Soja", "Lait"],
  "Fromage blanc + fraises": ["Lait"],
  "Fromage blanc nature + graines de courge": ["Lait"],
  "Fruits rouges + fromage blanc": ["Lait"],
  "Yaourt nature + myrtilles": ["Lait"],
  "Compote sans sucre + yaourt nature": ["Lait"],
  "Skyr nature + cannelle": ["Lait"],

  // ---------- Dîners ----------
  "Saumon au four + brocoli + patate douce": ["Poisson"],
  "Cabillaud + haricots verts + riz complet": ["Poisson"],
  "Gratin de légumes + filet de poisson": ["Poisson", "Lait"],
  "Gratin de légumes + tempeh": ["Soja", "Lait"],
  "Poulet au curry doux + chou-fleur + riz complet": [],
  "Dinde sautée + courgettes + riz basmati complet": [],
  "Steak haché 5% + haricots verts + quinoa": [],
  "Chili maison haricots rouges + salade verte": [],
  "Soupe de légumes + pois chiches + salade": ["Céleri"],
  "Soupe de légumes + omelette aux herbes": ["Œufs", "Céleri"],
  "Curry de tofu + chou-fleur + riz complet": ["Soja"],
  "Tempeh sauté + légumes + quinoa": ["Soja"],
  "Galette végétale + légumes + quinoa": ["Gluten", "Soja"],
  "Bol de lentilles épicées + salade verte": [],

  // ---------- Plats rapides (≤ 15 min), plats autonomes ----------
  "Œufs brouillés aux tomates cerises": ["Œufs"],
  "Banane, beurre d’amande et graines de chia": ["Fruits à coque"],
  "Salade pois chiches, concombre, tomate et avocat": [],
  "Houmous, crudités et quinoa": ["Sésame"],
  "Feuilles de laitue, tofu et crudités": ["Soja"],
  "Salade de lentilles, carottes râpées et citron": [],
  "Bol avocat, pois chiches et tomate": [],
  "Thon au naturel, crudités et riz complet": ["Poisson"],
  "Salade de quinoa, avocat et concombre": [],
};

/**
 * Repas de secours sans aucun des 12 allergènes réglementaires, entièrement végétaux
 * (donc compatibles avec tous les régimes) et sans aucun aliment de la liste
 * d’exclusions de goût. Utilisés uniquement quand le catalogue principal ne propose
 * plus rien pour un type de repas.
 */
const FALLBACK_DEFINITIONS: { type: MealType; nom: string; calories: number }[] = [
  { type: "petit_dejeuner", nom: "Riz complet aux fruits rouges et graines de courge", calories: 360 },
  { type: "petit_dejeuner", nom: "Compote pomme-cannelle et graines de chia", calories: 320 },
  { type: "petit_dejeuner", nom: "Quinoa tiède, banane et graines de tournesol", calories: 390 },
  { type: "dejeuner", nom: "Salade de quinoa, pois chiches et concombre", calories: 460 },
  { type: "dejeuner", nom: "Riz complet, haricots rouges et avocat", calories: 480 },
  { type: "collation", nom: "Pomme et graines de courge", calories: 180 },
  { type: "collation", nom: "Myrtilles et graines de tournesol", calories: 160 },
  { type: "diner", nom: "Dahl de lentilles corail et riz basmati", calories: 430 },
  { type: "diner", nom: "Patate douce rôtie, pois chiches et salade verte", calories: 410 },
];

export const SAFE_FALLBACK_MEALS: MealEntry[] = FALLBACK_DEFINITIONS.map((def) => ({
  type: def.type,
  nom: def.nom,
  calories: def.calories,
  substitution: "",
  image: "",
}));

/**
 * Plats autonomes, rapides, nommés comme des assiettes. Ils enrichissent le catalogue
 * pour que « Moins de 15 min » + allergie ou régime ne laisse plus un seul pseudo-repas
 * (ni un plat de 25 min avec un avertissement).
 */
const QUICK_CATALOG_DEFINITIONS: { type: MealType; nom: string; calories: number }[] = [
  { type: "petit_dejeuner", nom: "Œufs brouillés aux tomates cerises", calories: 330 },
  { type: "petit_dejeuner", nom: "Banane, beurre d’amande et graines de chia", calories: 340 },
  { type: "dejeuner", nom: "Salade pois chiches, concombre, tomate et avocat", calories: 460 },
  { type: "dejeuner", nom: "Houmous, crudités et quinoa", calories: 440 },
  { type: "dejeuner", nom: "Feuilles de laitue, tofu et crudités", calories: 430 },
  { type: "diner", nom: "Salade de lentilles, carottes râpées et citron", calories: 430 },
  { type: "diner", nom: "Bol avocat, pois chiches et tomate", calories: 420 },
  { type: "diner", nom: "Thon au naturel, crudités et riz complet", calories: 450 },
  { type: "diner", nom: "Salade de quinoa, avocat et concombre", calories: 410 },
];

export const QUICK_CATALOG_MEALS: MealEntry[] = QUICK_CATALOG_DEFINITIONS.map((def) => ({
  type: def.type,
  nom: def.nom,
  calories: def.calories,
  substitution: "",
  image: "",
}));

for (const meal of SAFE_FALLBACK_MEALS) {
  DECLARED_ALLERGENS[meal.nom] = [];
}

const DECLARED_BY_NORMALIZED_NAME = new Map<string, AllergenKey[]>(
  Object.entries(DECLARED_ALLERGENS).map(([nom, allergenes]) => [normalizeFoodLabel(nom), allergenes]),
);

/** Allergènes déclarés pour ce repas, ou `undefined` si le repas n’est pas référencé. */
export function getDeclaredAllergens(nom: string): AllergenKey[] | undefined {
  return DECLARED_BY_NORMALIZED_NAME.get(normalizeFoodLabel(nom));
}

/**
 * Allergènes invisibles dans le libellé, mais présents dans la recette.
 * S’applique aussi bien aux noms de repas qu’aux lignes de la liste de courses :
 * « Houmous » contient du tahini (sésame), le muesli du commerce contient des fruits
 * à coque, la poudre protéinée est le plus souvent à base de lactosérum ou de soja.
 */
const HIDDEN_ALLERGEN_TERMS: { terms: string[]; allergenes: AllergenKey[]; sauf?: string[] }[] = [
  { terms: ["houmous", "hoummous", "tahini"], allergenes: ["Sésame"] },
  { terms: ["muesli", "granola"], allergenes: ["Gluten", "Fruits à coque"] },
  { terms: ["poudre proteinee", "whey", "proteine en poudre"], allergenes: ["Lait", "Soja"] },
  { terms: ["chocolat"], allergenes: ["Soja", "Lait"] },
  { terms: ["sarrasin"], allergenes: ["Gluten", "Œufs"] },
  { terms: ["galette vegetale", "galettes vegetales"], allergenes: ["Gluten", "Soja"] },
  { terms: ["gratin"], allergenes: ["Lait"] },
  { terms: ["soupe", "veloute", "bouillon"], allergenes: ["Céleri"] },
  { terms: ["omelette"], allergenes: ["Œufs"] },
  { terms: ["pancake"], allergenes: ["Gluten", "Œufs", "Lait"] },
  // La niçoise classique contient thon et anchois ; la version végétarienne, non.
  // Sans cette exception, un profil allergique au poisson perdait un plat pourtant sûr.
  { terms: ["nicoise"], allergenes: ["Poisson", "Œufs", "Moutarde"], sauf: ["vegetarien", "vegetalien"] },
  { terms: ["vinaigrette"], allergenes: ["Moutarde", "Sulfites"] },
  { terms: ["smoothie proteine"], allergenes: ["Lait", "Soja"] },
];

/** Allergènes déduits d’un libellé déjà normalisé (nom de repas ou ingrédient). */
export function hiddenAllergensForLabel(normalizedBlob: string): AllergenKey[] {
  const found: AllergenKey[] = [];
  for (const entry of HIDDEN_ALLERGEN_TERMS) {
    if (entry.sauf?.some((term) => normalizedBlob.includes(term))) continue;
    if (entry.terms.some((term) => normalizedBlob.includes(term))) {
      for (const allergene of entry.allergenes) {
        if (!found.includes(allergene)) found.push(allergene);
      }
    }
  }
  return found;
}

/** Noms de repas référencés (pour le test de couverture). */
export function declaredMealNames(): string[] {
  return Object.keys(DECLARED_ALLERGENS);
}

export function isSafeFallbackMeal(nom: string): boolean {
  const normalized = normalizeFoodLabel(nom);
  return SAFE_FALLBACK_MEALS.some((meal) => normalizeFoodLabel(meal.nom) === normalized);
}
