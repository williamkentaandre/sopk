import { normalizeFoodLabel, SAFE_FALLBACK_MEALS } from "@/data/mealAllergenCatalog";

/**
 * Temps de préparation déclaré, en minutes, pour chaque repas du catalogue.
 *
 * Compte le temps réellement mobilisant (préparation + cuisson surveillée), pas le
 * temps de four sans présence. Sans cette table, le choix « Temps pour préparer » de
 * l'onboarding était deviné à partir de mots-clés du nom du repas, donc faux dès qu'un
 * libellé ne contenait pas le bon mot.
 */
const PREP_MINUTES: Record<string, number> = {
  // Petits-déjeuners
  "Omelette épinards + pain complet": 10,
  "Yaourt grec nature + fruits rouges + graines de chia": 3,
  "Porridge flocons d’avoine, lait végétal, cannelle": 8,
  "Pain complet + fromage blanc + kiwi": 5,
  "Skyr + noix + framboises": 3,
  "Omelette 2 œufs + tomates cerises": 10,
  "Toast complet, avocat, œuf poché": 12,
  "Galettes de sarrasin + fromage blanc": 20,
  "Smoothie protéiné (sans sucre ajouté) + flocons": 5,
  "Skyr + banane + graines de lin": 3,
  "Pancakes flocons d’avoine maison + skyr": 20,
  "Bol de muesli sans sucre + yaourt nature": 3,
  "Œufs brouillés + champignons + pain complet": 12,
  "Tofu brouillé + pain complet": 12,

  // Déjeuners
  "Salade quinoa, poulet, avocat, légumes croquants": 25,
  "Salade quinoa, tofu grillé, avocat, légumes croquants": 20,
  "Buddha bowl lentilles, crudités, feta": 25,
  "Buddha bowl pois chiches, crudités, feta": 15,
  "Wrap complet au thon, crudités, houmous": 10,
  "Wrap complet au poulet, crudités, houmous": 15,
  "Poisson blanc, quinoa, légumes rôtis": 35,
  "Tofu mariné + quinoa + légumes": 30,
  "Salade pois chiches, concombre, tomate, feta": 12,
  "Salade lentilles vertes, concombre, tomate, feta": 12,
  "Bowl saumon fumé, riz complet, avocat, concombre": 25,
  "Bowl tofu fumé, riz complet, avocat, concombre": 25,
  "Salade niçoise revisitée (sans pommes de terre)": 20,
  "Salade niçoise végétarienne aux pois chiches": 15,

  // Collations
  "Pomme + 10 amandes": 2,
  "Poire + noix": 2,
  "Fromage blanc nature + graines de courge": 2,
  "Skyr nature + cannelle": 2,
  "Carottes + houmous": 5,
  "Concombre + guacamole léger": 8,
  "Orange + 1 carré chocolat noir 85%": 2,
  "Clémentines + noisettes": 2,
  "Yaourt nature + myrtilles": 2,
  "Fromage blanc + fraises": 3,
  "Kiwi + noix de cajou": 3,
  "Pomme + pistaches": 2,
  "Fruits rouges + fromage blanc": 3,
  "Compote sans sucre + yaourt nature": 2,

  // Dîners
  "Saumon au four + brocoli + patate douce": 35,
  "Cabillaud + haricots verts + riz complet": 30,
  "Dinde sautée + courgettes + riz basmati complet": 30,
  "Tempeh sauté + légumes + quinoa": 25,
  "Chili maison haricots rouges + salade verte": 35,
  "Bol de lentilles épicées + salade verte": 25,
  "Soupe de légumes + pois chiches + salade": 30,
  "Soupe de légumes + omelette aux herbes": 25,
  "Poulet au curry doux + chou-fleur + riz complet": 35,
  "Curry de tofu + chou-fleur + riz complet": 30,
  "Steak haché 5% + haricots verts + quinoa": 25,
  "Galette végétale + légumes + quinoa": 25,
  "Gratin de légumes + filet de poisson": 45,
  "Gratin de légumes + tempeh": 45,

  // Repas de secours hypoallergéniques
  "Riz complet aux fruits rouges et graines de courge": 20,
  "Compote pomme-cannelle et graines de chia": 5,
  "Quinoa tiède, banane et graines de tournesol": 20,
  "Salade de quinoa, pois chiches et concombre": 20,
  "Riz complet, haricots rouges et avocat": 25,
  "Pomme et graines de courge": 2,
  "Myrtilles et graines de tournesol": 2,
  "Dahl de lentilles corail et riz basmati": 30,
  "Patate douce rôtie, pois chiches et salade verte": 40,

  // Plats rapides ajoutés au catalogue
  "Œufs brouillés aux tomates cerises": 10,
  "Banane, beurre d’amande et graines de chia": 3,
  "Salade pois chiches, concombre, tomate et avocat": 10,
  "Houmous, crudités et quinoa": 8,
  "Feuilles de laitue, tofu et crudités": 12,
  "Salade de lentilles, carottes râpées et citron": 10,
  "Bol avocat, pois chiches et tomate": 8,
  "Thon au naturel, crudités et riz complet": 10,
  "Salade de quinoa, avocat et concombre": 8,
};

const PREP_BY_NORMALIZED_NAME = new Map<string, number>(
  Object.entries(PREP_MINUTES).map(([nom, minutes]) => [normalizeFoodLabel(nom), minutes]),
);

/** Temps de préparation déclaré, ou `undefined` si le repas n'est pas référencé. */
export function getPrepMinutes(nom: string): number | undefined {
  return PREP_BY_NORMALIZED_NAME.get(normalizeFoodLabel(nom));
}

/** Noms référencés, pour le test de couverture du catalogue. */
export function prepTimeMealNames(): string[] {
  return Object.keys(PREP_MINUTES);
}

/**
 * Budget en minutes correspondant à la réponse d'onboarding.
 * `null` = « Peu importe » : aucune contrainte de temps.
 */
export function prepBudgetMinutes(tempsCuisine: string | undefined): number | null {
  const t = normalizeFoodLabel(tempsCuisine ?? "");
  if (t.includes("moins de 15")) return 15;
  if (t.includes("15") && t.includes("30")) return 30;
  if (t.includes("30") && t.includes("45")) return 45;
  return null;
}

/**
 * Le repas tient-il dans le budget temps déclaré ?
 * Un repas non référencé est considéré comme tenant : mieux vaut ne rien promettre que
 * d'écarter un repas sûr sur une donnée manquante (le test de couverture interdit ce cas).
 */
export function fitsPrepBudget(nom: string, tempsCuisine: string | undefined): boolean {
  const budget = prepBudgetMinutes(tempsCuisine);
  if (budget == null) return true;
  const minutes = getPrepMinutes(nom);
  if (minutes == null) return true;
  return minutes <= budget;
}

/** Repas de secours les plus rapides d'abord, à budget temps serré. */
export function safeFallbackNamesByPrepTime(): string[] {
  return [...SAFE_FALLBACK_MEALS]
    .sort((a, b) => (getPrepMinutes(a.nom) ?? 999) - (getPrepMinutes(b.nom) ?? 999))
    .map((meal) => meal.nom);
}
