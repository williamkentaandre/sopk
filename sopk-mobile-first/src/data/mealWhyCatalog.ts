/** Explication éducative unique par repas / alternative du plan (clé = nom normalisé). */

export function normalizeMealKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/\u2019|\u2018|\u00b4|\u2032/g, "'")
    .toLowerCase()
    .trim();
}

/** Une phrase par plat : aliments cités + bénéfice SOPK concret. */
export const MEAL_WHY_CATALOG: Record<string, string> = {
  "omelette epinards + pain complet":
    "Les œufs et les épinards apportent des protéines et du fer végétal ; le pain complet, en portion modérée, donne des fibres pour un petit-déjeuner qui limite la faim du matin avec le SOPK.",
  "yaourt grec nature + fruits rouges + graines de chia":
    "Yaourt grec, fruits rouges et chia : protéines, antioxydants et fibres solubles pour une collation sucrée à index glycémique plus doux.",
  "salade quinoa, poulet, avocat, legumes croquants":
    "Quinoa, poulet, avocat et légumes croquants : glucides complets, protéines maigres et bonnes graisses pour un déjeuner rassasiant sans pic glycémique brutal.",
  "salade quinoa, tofu grille, avocat, legumes croquants":
    "Tofu grillé, quinoa, avocat et légumes : protéines végétales, peu de saturés, repas complet sans viande.",
  "pomme + 10 amandes":
    "Pomme et amandes : fibres, eau et gras insaturés qui ralentissent l’absorption du sucre  - utile entre deux repas avec le SOPK.",
  "poire + noix":
    "Poire juteuse et noix : le fruit hydrate et les noix stabilisent l’énergie grâce aux fibres et aux lipides de qualité.",
  "saumon au four + brocoli + patate douce":
    "Saumon, brocoli et patate douce : oméga-3 anti-inflammatoires, légumes crucifères et glucide à libération lente pour le dîner.",
  "cabillaud + haricots verts + riz complet":
    "Cabillaud maigre, haricots verts et riz complet : repas léger en calories, riche en protéines et en fibres pour la satiété.",
  "porridge flocons d'avoine, lait vegetal, cannelle":
    "Flocons d’avoine, lait végétal et cannelle : bêta-glucanes et fibres pour un petit-déjeuner chaud qui tient jusqu’à midi.",
  "pain complet + fromage blanc + kiwi":
    "Pain complet, fromage blanc et kiwi : protéines du matin, vitamine C et fibres pour démarrer sans excès de sucre rapide.",
  "buddha bowl lentilles, crudites, feta":
    "Lentilles, crudités et feta : légumineuses riches en fibres et protéines végétales, légumes volumeux et un peu de feta pour le goût.",
  "buddha bowl pois chiches, crudites, feta":
    "Pois chiches, crudités et feta : même logique de légumineuse (fibres + protéines), texture plus ferme que les lentilles.",
  "fromage blanc nature + graines de courge":
    "Fromage blanc et graines de courge : caséine lente, zinc et magnésium  - collation protéinée qui calme la faim de l’après-midi.",
  "skyr nature + cannelle":
    "Skyr nature et cannelle : très riche en protéines, quasi sans sucre ajouté ; la cannelle peut aider à modérer la réponse glycémique.",
  "dinde sautee + courgettes + riz basmati complet":
    "Dinde, courgettes et riz basmati complet : protéines maigres, légumes peu caloriques et riz complet pour un dîner équilibré.",
  "tempeh saute + legumes + quinoa":
    "Tempeh fermenté, légumes et quinoa : protéines végétales complètes, probiotiques naturels du tempeh et fibres pour la sensibilité à l’insuline.",
  "skyr + noix + framboises":
    "Skyr, noix et framboises : trio protéines-gras-fibres/antioxydants pour un petit-déjeuner froid qui limite les fringales.",
  "omelette 2 oeufs + tomates cerises":
    "Deux œufs et tomates cerises : protéines matinales et lycopène ; repas simple, peu de glucides rapides.",
  "wrap complet au thon, crudites, houmous":
    "Wrap complet, thon, crudités et houmous : poisson gras en omega-3, légumes croquants et pois chiches mixés pour la satiété.",
  "wrap complet au poulet, crudites, houmous":
    "Wrap complet, poulet, crudités et houmous : protéines maigres, légumes croquants et pois chiches mixés pour la satiété.",
  "carottes + houmous":
    "Carottes et houmous : bêta-carotène, fibres et protéines végétales  - collation croquante qui évite le grignotage sucré.",
  "concombre + guacamole leger":
    "Concombre et guacamole léger : hydratation, potassium et gras du avocat en petite quantité pour une collation fraîche.",
  "chili maison haricots rouges + salade verte":
    "Haricots rouges, sauce tomate maison et salade : fibres solubles, fer végétal et volume sans excès calorique.",
  "bol de lentilles epicees + salade verte":
    "Lentilles épicées et salade verte : légumineuse riche en fibres et protéines, épices pour le goût sans sel excessif.",
  "toast complet, avocat, oeuf poche":
    "Pain complet, avocat et œuf poché : protéines, bonnes graisses et fibres  - classique SOPK-friendly au petit-déjeuner.",
  "galettes de sarrasin + fromage blanc":
    "Galettes de sarrasin sans gluten et fromage blanc : protéines et glucide alternatif pour varier les matins.",
  "poisson blanc, quinoa, legumes rotis":
    "Poisson blanc, quinoa et légumes rôtis : repas léger, digeste le soir, avec protéines maigres et fibres.",
  "tofu marine + quinoa + legumes":
    "Tofu mariné, quinoa et légumes : protéines végétales, quinoa complet et légumes rôtis pour un dîner végétarien complet.",
  "orange + 1 carre chocolat noir 85%":
    "Orange et carré de chocolat noir 85 % : plaisir contrôlé, vitamine C et antioxydants  - mieux qu’un dessert industriel sucré.",
  "clementines + noisettes":
    "Clémentines et noisettes : vitamine C, fibres du fruit et gras des noisettes pour une collation équilibrée.",
  "soupe de legumes + pois chiches + salade":
    "Soupe de légumes, pois chiches et salade : volume, fibres et protéines végétales pour un dîner rassasiant en calories modérées.",
  "soupe de legumes + omelette aux herbes":
    "Soupe de légumes et omelette aux herbes : chaud, léger et protéiné  - idéal le soir si vous avez faim sans alourdir.",
  "smoothie proteine (sans sucre ajoute) + flocons":
    "Smoothie protéiné sans sucre ajouté et flocons : protéines liquides le matin pour étaler l’appétit sur plusieurs heures.",
  "skyr + banane + graines de lin":
    "Skyr, banane et graines de lin : protéines du skyr encadrent le sucre naturel de la banane ; les graines ajoutent fibres et oméga-3.",
  "salade pois chiches, concombre, tomate, feta":
    "Pois chiches, concombre, tomate et feta : salade méditerranéenne riche en fibres, eau et protéines végétales.",
  "salade lentilles vertes, concombre, tomate, feta":
    "Lentilles vertes, concombre, tomate et feta : même apport en fibres et protéines, texture plus ferme que les pois chiches.",
  "yaourt nature + myrtilles":
    "Yaourt nature et myrtilles : protéines lactées (ou à adapter si intolérance) et baies antioxydantes à charge glycémique modérée.",
  "fromage blanc + fraises":
    "Fromage blanc et fraises : collation protéinée avec fruits rouges  - fibres et caséine pour tenir jusqu’au dîner.",
  "poulet au curry doux + chou-fleur + riz complet":
    "Poulet, chou-fleur et riz complet : épices douces, légume peu calorique et glucides complets pour un déjeuner complet.",
  "curry de tofu + chou-fleur + riz complet":
    "Curry de tofu, chou-fleur et riz complet : protéines végétales et épices anti-inflammatoires, sans viande.",
  "pancakes flocons d'avoine maison + skyr":
    "Pancakes maison aux flocons d’avoine et skyr : version plus protéinée qu’un pancake classique, fibres de l’avoine au petit-déjeuner.",
  "bol de muesli sans sucre + yaourt nature":
    "Muesli sans sucre ajouté et yaourt nature : fibres des céréales complètes et protéines du yaourt pour un matin sans pic sucré.",
  "bowl saumon fume, riz complet, avocat, concombre":
    "Saumon fumé, riz complet, avocat et concombre : oméga-3, glucides complets et bonnes graisses pour l’énergie de l’après-midi.",
  "bowl tofu fume, riz complet, avocat, concombre":
    "Tofu fumé, riz complet, avocat et concombre : protéines végétales, même logique d’assiette que le bowl au saumon.",
  "kiwi + noix de cajou":
    "Kiwi et noix de cajou : vitamine C, fibres et gras végétaux pour une collation qui rassasie sans sucres ajoutés.",
  "pomme + pistaches":
    "Pomme et pistaches : fibres du fruit et lipides des pistaches  - duo classique pour calmer une fringale.",
  "steak hache 5% + haricots verts + quinoa":
    "Steak haché 5 % MG, haricots verts et quinoa : fer, protéines maigres et fibres  - repas complet pour préserver la masse musculaire.",
  "galette vegetale + legumes + quinoa":
    "Galette végétale, légumes et quinoa : protéines végétales et fibres sans viande, adapté si vous réduisez les produits animaux.",
  "oeufs brouilles + champignons + pain complet":
    "Œufs brouillés, champignons et pain complet : protéines, vitamine D des champignons (si exposés UV) et fibres en portion modérée.",
  "tofu brouille + pain complet":
    "Tofu brouillé et pain complet : alternative végétale aux œufs, protéines du soja et glucides complets le matin.",
  "salade nicoise revisitee (sans pommes de terre)":
    "Thon, haricots verts, tomates et œuf : version allégée de la salade niçoise sans pommes de terre pour limiter l’amidon du midi.",
  "salade nicoise vegetarienne aux pois chiches":
    "Pois chiches, haricots verts, tomates et œuf : niçoise sans poisson, protéines et fibres végétales.",
  "fruits rouges + fromage blanc":
    "Fruits rouges et fromage blanc : antioxydants des baies et protéines laitières pour une collation douce mais structurée.",
  "compote sans sucre + yaourt nature":
    "Compote sans sucre ajouté et yaourt nature : douceur du fruit cuit encadrée par les protéines du yaourt.",
  "gratin de legumes + filet de poisson":
    "Gratin de légumes et filet de poisson : volume des légumes, protéines maigres du poisson  - dîner chaud et rassasiant.",
  "gratin de legumes + tempeh":
    "Gratin de légumes et tempeh : même confort d’un gratin avec protéines végétales fermentées au lieu du poisson.",
  "oeufs brouilles aux tomates cerises":
    "Œufs et tomates cerises : protéines matinales sans pain ni lait, prêt en quelques minutes.",
  "banane, beurre d'amande et graines de chia":
    "Banane, beurre d’amande et chia : petit-déjeuner sans gluten ni lait, fibres et bons lipides.",
  "salade pois chiches, concombre, tomate et avocat":
    "Pois chiches, concombre, tomate et avocat : déjeuner végétal froid, sans fromage, assemblé en moins de 15 minutes.",
  "houmous, crudites et quinoa":
    "Houmous, crudités et quinoa : assiette froide, protéines végétales et fibres sans cuisson longue.",
  "feuilles de laitue, tofu et crudites":
    "Laitue, tofu et crudités : roulé sans pain, protéines végétales et volume de légumes.",
  "salade de lentilles, carottes rapees et citron":
    "Lentilles, carottes et citron : dîner froid sans œuf, assemblé à partir de lentilles déjà cuites.",
  "bol avocat, pois chiches et tomate":
    "Avocat, pois chiches et tomate : dîner végétal sans cuisson, rassasiant et simple.",
  "thon au naturel, crudites et riz complet":
    "Thon, crudités et riz complet : dîner sans œuf, assemblé en dix minutes.",
  "salade de quinoa, avocat et concombre":
    "Quinoa, avocat et concombre : dîner végétal froid, sans allergène majeur.",
};

export function lookupMealWhyCatalog(mealName: string): string | undefined {
  const key = normalizeMealKey(mealName);
  return MEAL_WHY_CATALOG[key];
}
