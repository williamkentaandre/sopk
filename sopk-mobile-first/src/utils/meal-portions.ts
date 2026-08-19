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
  "pain complet + fromage blanc + kiwi": {
    ingredients: [
      { aliment: "Pain complet", grammes: 50 },
      { aliment: "Fromage blanc nature", grammes: 120 },
      { aliment: "Kiwi", grammes: 90 },
    ],
    why: "Petit-déjeuner équilibré sans œufs, riche en protéines et fibres pour une satiété durable.",
  },

  // --- Repas de secours sans aucun des 12 allergènes réglementaires ---
  "riz complet aux fruits rouges et graines de courge": {
    ingredients: [
      { aliment: "Riz complet cuit", grammes: 130 },
      { aliment: "Fruits rouges", grammes: 100 },
      { aliment: "Graines de courge", grammes: 15 },
    ],
    why: "Petit-déjeuner sans allergène majeur : glucides complets, fibres et magnésium pour une énergie stable.",
  },
  "compote pomme-cannelle et graines de chia": {
    ingredients: [
      { aliment: "Compote de pomme sans sucre", grammes: 200 },
      { aliment: "Graines de chia", grammes: 20 },
      { aliment: "Cannelle", grammes: 2 },
    ],
    why: "Option très digeste sans allergène majeur ; les graines de chia apportent fibres et bons lipides.",
  },
  "quinoa tiède, banane et graines de tournesol": {
    ingredients: [
      { aliment: "Quinoa cuit", grammes: 140 },
      { aliment: "Banane", grammes: 100 },
      { aliment: "Graines de tournesol", grammes: 15 },
    ],
    why: "Quinoa complet et graines : protéines végétales et satiété, sans gluten ni produit laitier.",
  },
  "salade de quinoa, pois chiches et concombre": {
    ingredients: [
      { aliment: "Quinoa cuit", grammes: 140 },
      { aliment: "Pois chiches cuits", grammes: 130 },
      { aliment: "Concombre", grammes: 120 },
    ],
    why: "Déjeuner complet sans allergène majeur : protéines végétales et fibres pour tenir l’après-midi.",
  },
  "riz complet, haricots rouges et avocat": {
    ingredients: [
      { aliment: "Riz complet cuit", grammes: 140 },
      { aliment: "Haricots rouges cuits", grammes: 130 },
      { aliment: "Avocat", grammes: 60 },
    ],
    why: "Association céréale + légumineuse pour des protéines complètes, sans allergène majeur.",
  },
  "pomme et graines de courge": {
    ingredients: [
      { aliment: "Pomme", grammes: 150 },
      { aliment: "Graines de courge", grammes: 15 },
    ],
    why: "Collation sans allergène majeur : fibres et bons lipides pour éviter le coup de fatigue.",
  },
  "myrtilles et graines de tournesol": {
    ingredients: [
      { aliment: "Myrtilles", grammes: 120 },
      { aliment: "Graines de tournesol", grammes: 15 },
    ],
    why: "Antioxydants et lipides de qualité, sans allergène majeur.",
  },
  "dahl de lentilles corail et riz basmati": {
    ingredients: [
      { aliment: "Lentilles corail cuites", grammes: 160 },
      { aliment: "Riz basmati cuit", grammes: 120 },
      { aliment: "Carottes", grammes: 80 },
    ],
    why: "Dîner végétal réconfortant, riche en fibres et protéines, sans allergène majeur.",
  },
  "patate douce rôtie, pois chiches et salade verte": {
    ingredients: [
      { aliment: "Patate douce", grammes: 180 },
      { aliment: "Pois chiches cuits", grammes: 130 },
      { aliment: "Salade verte", grammes: 60 },
    ],
    why: "Glucides à index glycémique modéré et protéines végétales, sans allergène majeur.",
  },

  // ---------- Variantes et alternatives du plan ----------
  // Ces plats étaient proposés sans portions déclarées : le détail était alors déduit du
  // libellé, ce qui produisait des lignes absurdes (« Salade lentilles vertes, concombre,
  // tomate, feta : 145 g »). Tout repas affichable a désormais ses grammages réels.
  "yaourt grec nature + fruits rouges + graines de chia": {
    ingredients: [
      { aliment: "Yaourt grec nature", grammes: 170 },
      { aliment: "Fruits rouges", grammes: 100 },
      { aliment: "Graines de chia", grammes: 12 },
    ],
    why: "Protéines lentes et fibres dès le matin pour limiter les fringales de la matinée.",
  },
  "salade quinoa, tofu grillé, avocat, legumes croquants": {
    ingredients: [
      { aliment: "Quinoa cuit", grammes: 120 },
      { aliment: "Tofu grillé", grammes: 140 },
      { aliment: "Avocat", grammes: 60 },
      { aliment: "Légumes croquants", grammes: 150 },
    ],
    why: "Version végétale du déjeuner : mêmes protéines et fibres, sans produit animal.",
  },
  "poire + noix": {
    ingredients: [
      { aliment: "Poire", grammes: 160 },
      { aliment: "Noix", grammes: 15 },
    ],
    why: "Fruit et bon gras pour ralentir l’absorption du sucre entre deux repas.",
  },
  "cabillaud + haricots verts + riz complet": {
    ingredients: [
      { aliment: "Cabillaud", grammes: 150 },
      { aliment: "Haricots verts", grammes: 180 },
      { aliment: "Riz complet cuit", grammes: 120 },
    ],
    why: "Protéines maigres et glucides complets pour un dîner rassasiant sans lourdeur.",
  },
  "buddha bowl pois chiches, crudites, feta": {
    ingredients: [
      { aliment: "Pois chiches cuits", grammes: 130 },
      { aliment: "Crudités", grammes: 180 },
      { aliment: "Feta", grammes: 35 },
    ],
    why: "Légumineuses riches en fibres et protéines pour la sensibilité à l’insuline.",
  },
  "skyr nature + cannelle": {
    ingredients: [
      { aliment: "Skyr nature", grammes: 150 },
      { aliment: "Cannelle", grammes: 2 },
    ],
    why: "Collation très protéinée, la cannelle relève sans ajouter de sucre.",
  },
  "tempeh sauté + legumes + quinoa": {
    ingredients: [
      { aliment: "Tempeh", grammes: 120 },
      { aliment: "Légumes de saison", grammes: 180 },
      { aliment: "Quinoa cuit", grammes: 110 },
    ],
    why: "Protéines végétales fermentées, bien tolérées et riches en fibres.",
  },
  "omelette 2 oeufs + tomates cerises": {
    ingredients: [
      { aliment: "Oeufs", grammes: 106 },
      { aliment: "Tomates cerises", grammes: 120 },
    ],
    why: "Petit-déjeuner protéiné à charge glycémique très basse.",
  },
  "wrap complet au poulet, crudites, houmous": {
    ingredients: [
      { aliment: "Galette de blé complet", grammes: 60 },
      { aliment: "Poulet grillé", grammes: 110 },
      { aliment: "Crudités", grammes: 120 },
      { aliment: "Houmous", grammes: 40 },
    ],
    why: "Déjeuner nomade complet : protéines, fibres et bon gras en un seul format.",
  },
  "concombre + guacamole leger": {
    ingredients: [
      { aliment: "Concombre", grammes: 150 },
      { aliment: "Guacamole léger", grammes: 50 },
    ],
    why: "Collation très peu calorique, le gras de l’avocat prolonge la satiété.",
  },
  "bol de lentilles epicees + salade verte": {
    ingredients: [
      { aliment: "Lentilles cuites", grammes: 180 },
      { aliment: "Épices et aromates", grammes: 5 },
      { aliment: "Salade verte", grammes: 70 },
    ],
    why: "Dîner végétal à index glycémique bas, très riche en fibres.",
  },
  "galettes de sarrasin + fromage blanc": {
    ingredients: [
      { aliment: "Galettes de sarrasin", grammes: 100 },
      { aliment: "Fromage blanc nature", grammes: 120 },
    ],
    why: "Alternative au pain de blé, avec une source de protéines pour tenir la matinée.",
  },
  "tofu mariné + quinoa + legumes": {
    ingredients: [
      { aliment: "Tofu mariné", grammes: 140 },
      { aliment: "Quinoa cuit", grammes: 110 },
      { aliment: "Légumes de saison", grammes: 170 },
    ],
    why: "Assiette végétale équilibrée en protéines, glucides complets et fibres.",
  },
  "clementines + noisettes": {
    ingredients: [
      { aliment: "Clémentines", grammes: 150 },
      { aliment: "Noisettes", grammes: 15 },
    ],
    why: "Sucre naturel du fruit tamponné par les lipides des oléagineux.",
  },
  "soupe de legumes + omelette aux herbes": {
    ingredients: [
      { aliment: "Soupe de légumes", grammes: 300 },
      { aliment: "Oeufs", grammes: 106 },
      { aliment: "Herbes fraîches", grammes: 5 },
    ],
    why: "Dîner léger mais protéiné, confortable quand les nuits sont agitées.",
  },
  "skyr + banane + graines de lin": {
    ingredients: [
      { aliment: "Skyr nature", grammes: 150 },
      { aliment: "Banane", grammes: 100 },
      { aliment: "Graines de lin", grammes: 12 },
    ],
    why: "Protéines et oméga-3 végétaux pour un petit-déjeuner rapide et rassasiant.",
  },
  "salade lentilles vertes, concombre, tomate, feta": {
    ingredients: [
      { aliment: "Lentilles vertes cuites", grammes: 150 },
      { aliment: "Concombre", grammes: 120 },
      { aliment: "Tomate", grammes: 100 },
      { aliment: "Feta", grammes: 35 },
    ],
    why: "Légumineuses froides et légumes crus : satiété durable sans cuisson longue.",
  },
  "fromage blanc + fraises": {
    ingredients: [
      { aliment: "Fromage blanc nature", grammes: 150 },
      { aliment: "Fraises", grammes: 120 },
    ],
    why: "Collation protéinée et peu sucrée, adaptée en fin d’après-midi.",
  },
  "curry de tofu + chou-fleur + riz complet": {
    ingredients: [
      { aliment: "Tofu", grammes: 140 },
      { aliment: "Chou-fleur", grammes: 180 },
      { aliment: "Riz complet cuit", grammes: 110 },
    ],
    why: "Curry végétal doux, protéines complètes et glucides à diffusion lente.",
  },
  "bol de muesli sans sucre + yaourt nature": {
    ingredients: [
      { aliment: "Muesli sans sucre ajouté", grammes: 50 },
      { aliment: "Yaourt nature", grammes: 150 },
    ],
    why: "Petit-déjeuner express : fibres des céréales complètes et protéines du yaourt.",
  },
  "bowl tofu fumé, riz complet, avocat, concombre": {
    ingredients: [
      { aliment: "Tofu fumé", grammes: 130 },
      { aliment: "Riz complet cuit", grammes: 120 },
      { aliment: "Avocat", grammes: 60 },
      { aliment: "Concombre", grammes: 120 },
    ],
    why: "Version végétale du bowl : mêmes apports, sans poisson.",
  },
  "pomme + pistaches": {
    ingredients: [
      { aliment: "Pomme", grammes: 150 },
      { aliment: "Pistaches", grammes: 15 },
    ],
    why: "Fruit entier et oléagineux pour éviter le pic glycémique de l’après-midi.",
  },
  "galette vegetale + legumes + quinoa": {
    ingredients: [
      { aliment: "Galette végétale", grammes: 110 },
      { aliment: "Légumes de saison", grammes: 180 },
      { aliment: "Quinoa cuit", grammes: 110 },
    ],
    why: "Dîner végétal complet, riche en fibres et en protéines végétales.",
  },
  "tofu brouillé + pain complet": {
    ingredients: [
      { aliment: "Tofu brouillé", grammes: 150 },
      { aliment: "Pain complet", grammes: 50 },
    ],
    why: "Équivalent végétal des œufs brouillés, même rôle rassasiant le matin.",
  },
  "salade nicoise vegetarienne aux pois chiches": {
    ingredients: [
      { aliment: "Pois chiches cuits", grammes: 140 },
      { aliment: "Oeufs", grammes: 53 },
      { aliment: "Haricots verts", grammes: 100 },
      { aliment: "Tomate", grammes: 100 },
      { aliment: "Salade verte", grammes: 60 },
    ],
    why: "Niçoise sans poisson : les pois chiches remplacent le thon à protéines égales.",
  },
  "compote sans sucre + yaourt nature": {
    ingredients: [
      { aliment: "Compote sans sucre ajouté", grammes: 100 },
      { aliment: "Yaourt nature", grammes: 125 },
    ],
    why: "Collation douce pour l’estomac, sans sucre ajouté.",
  },
  "gratin de legumes + tempeh": {
    ingredients: [
      { aliment: "Légumes gratinés", grammes: 250 },
      { aliment: "Tempeh", grammes: 120 },
    ],
    why: "Version végétale du gratin, protéines fermentées faciles à digérer.",
  },

  // ---------- Plats rapides ≤ 15 min ----------
  "oeufs brouilles aux tomates cerises": {
    ingredients: [
      { aliment: "Oeufs", grammes: 120 },
      { aliment: "Tomates cerises", grammes: 120 },
    ],
    why: "Petit-déjeuner protéiné sans gluten ni lait, prêt en quelques minutes.",
  },
  "banane, beurre d’amande et graines de chia": {
    ingredients: [
      { aliment: "Banane", grammes: 120 },
      { aliment: "Beurre d’amande", grammes: 20 },
      { aliment: "Graines de chia", grammes: 12 },
    ],
    why: "Aucun gluten, aucun lait : fibres et bons lipides pour tenir jusqu’au déjeuner.",
  },
  "salade pois chiches, concombre, tomate et avocat": {
    ingredients: [
      { aliment: "Pois chiches cuits", grammes: 140 },
      { aliment: "Concombre", grammes: 100 },
      { aliment: "Tomate", grammes: 100 },
      { aliment: "Avocat", grammes: 60 },
    ],
    why: "Déjeuner végétal sans fromage, assemblé à froid en moins de 15 minutes.",
  },
  "houmous, crudites et quinoa": {
    ingredients: [
      { aliment: "Houmous", grammes: 80 },
      { aliment: "Crudités", grammes: 180 },
      { aliment: "Quinoa cuit", grammes: 120 },
    ],
    why: "Assiette froide : protéines végétales et fibres, sans cuisson longue.",
  },
  "feuilles de laitue, tofu et crudites": {
    ingredients: [
      { aliment: "Feuilles de laitue", grammes: 80 },
      { aliment: "Tofu", grammes: 140 },
      { aliment: "Crudités", grammes: 150 },
    ],
    why: "Sans pain : le tofu et les légumes tiennent lieu de wrap, prêt en quelques minutes.",
  },
  "salade de lentilles, carottes rapees et citron": {
    ingredients: [
      { aliment: "Lentilles cuites", grammes: 160 },
      { aliment: "Carottes râpées", grammes: 120 },
      { aliment: "Citron et huile d’olive", grammes: 15 },
    ],
    why: "Dîner froid, sans œuf ni produit laitier, assemblé à partir de lentilles déjà cuites.",
  },
  "bol avocat, pois chiches et tomate": {
    ingredients: [
      { aliment: "Avocat", grammes: 80 },
      { aliment: "Pois chiches cuits", grammes: 140 },
      { aliment: "Tomate", grammes: 120 },
    ],
    why: "Dîner végétal sans cuisson, rassasiant grâce à l’avocat et aux légumineuses.",
  },
  "thon au naturel, crudites et riz complet": {
    ingredients: [
      { aliment: "Thon au naturel", grammes: 120 },
      { aliment: "Crudités", grammes: 180 },
      { aliment: "Riz complet cuit", grammes: 120 },
    ],
    why: "Dîner sans œuf, assemblé en dix minutes si le riz est déjà cuit.",
  },
  "salade de quinoa, avocat et concombre": {
    ingredients: [
      { aliment: "Quinoa cuit", grammes: 140 },
      { aliment: "Avocat", grammes: 70 },
      { aliment: "Concombre", grammes: 120 },
    ],
    why: "Dîner végétal froid, sans allergène majeur, prêt dès que le quinoa est cuit.",
  },
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
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

  // Découpage sur « + » ET sur les virgules : un nom du type « Salade quinoa, tofu,
  // avocat » ne contient aucun « + » et produisait alors une ligne unique égale au nom
  // du plat entier (« Salade quinoa, tofu, avocat : 145 g »), ce qui n'a aucun sens.
  const segments = trimmed
    .split(/\s*\+\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
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

let detailsByNormalizedName: Map<string, MealPortionDetails> | null = null;

function portionDetailsIndex(): Map<string, MealPortionDetails> {
  if (!detailsByNormalizedName) {
    detailsByNormalizedName = new Map(
      Object.entries(detailsByMealName).map(([key, value]) => [normalize(key), value]),
    );
  }
  return detailsByNormalizedName;
}

/**
 * Le repas a-t-il des portions rédigées à la main ? Tout plat proposable doit en avoir :
 * l'inférence depuis le libellé ne sert qu'aux repas saisis librement par l'utilisatrice.
 */
export function hasExplicitPortions(mealName: string): boolean {
  return portionDetailsIndex().has(normalize(mealName));
}

export function getMealPortionDetails(mealName: string, planMealKcal?: number): MealPortionDetails {
  const exactMatch = portionDetailsIndex().get(normalize(mealName));
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
