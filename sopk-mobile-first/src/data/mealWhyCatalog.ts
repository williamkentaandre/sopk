/** Pédagogie « pourquoi ces aliments, à ce dosage » (clé = nom normalisé). */

export function normalizeMealKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/\u2019|\u2018|\u00b4|\u2032/g, "'")
    .toLowerCase()
    .trim();
}

/**
 * Texte spécifique au plat : aliments nommés + au moins une idée de dose
 * (plafond, volume, unité comptée). Jamais un slogan interchangeable.
 */
export const MEAL_WHY_CATALOG: Record<string, string> = {
  "omelette epinards + pain complet":
    "Les œufs portent la satiété du matin ; les épinards ajoutent du volume et du fer sans sucre. Le pain complet reste volontairement modéré : assez de glucides pour tenir, pas le centre de l’assiette.",
  "yaourt grec nature + fruits rouges + graines de chia":
    "Le yaourt grec dose les protéines ; les fruits rouges sucrent sans dessert. Une petite cuillère de chia suffit : fibres solubles qui ralentissent le fruit, sans alourdir.",
  "salade quinoa, poulet, avocat, legumes croquants":
    "Le poulet ancre le déjeuner ; les légumes occupent le volume. Le quinoa et l’avocat sont mesurés : énergie et gras utiles, pas une assiette de féculents ni d’avocat entier.",
  "salade quinoa, tofu grille, avocat, legumes croquants":
    "Le tofu grillé remplace la viande à protéines égales ; les légumes remplissent l’assiette. Quinoa et avocat restent plafonnés pour garder une charge glycémique et calorique maîtrisées.",
  "pomme + 10 amandes":
    "La pomme hydrate et fibre entre deux repas. Les 10 amandes sont un plafond : assez de gras pour calmer la courbe de sucre, trop en ferait un en-cas calorique.",
  "poire + noix":
    "La poire apporte l’eau et les fibres ; les noix (petite poignée) tamponnent le fructose. Au-delà, le gras l’emporte sur l’intérêt de la collation.",
  "saumon au four + brocoli + patate douce":
    "Le saumon apporte les oméga-3 du dîner ; le brocoli occupe le volume. La patate douce est la part féculente, volontairement limitée pour un soir sans pic d’amidon.",
  "cabillaud + haricots verts + riz complet":
    "Le cabillaud est maigre : beaucoup de protéines pour peu de calories. Les haricots verts font le volume ; le riz complet reste la part mesurée d’énergie, pas une assiette de riz.",
  "porridge flocons d'avoine, lait vegetal, cannelle":
    "Les flocons sont dosés (une petite tasse sèche) : bêta-glucanes sans porridge débordant. Le lait végétal allonge le volume ; la cannelle relève sans sucre ajouté.",
  "pain complet + fromage blanc + kiwi":
    "Le fromage blanc porte les protéines du matin ; le kiwi ajoute fibres et vitamine C. Le pain complet reste une tranche raisonnable, pas un petit-déjeuner pain-confiture.",
  "buddha bowl lentilles, crudites, feta":
    "Les lentilles et les crudités font satiété et volume. La feta est un condiment (quelques cubes) : le goût salé sans transformer le bowl en plat fromager.",
  "buddha bowl pois chiches, crudites, feta":
    "Les pois chiches tiennent plus longtemps que des crudités seules ; le volume vient des légumes. La feta reste plafonnée : assaisonnement, pas source principale de calories.",
  "fromage blanc nature + graines de courge":
    "Le fromage blanc (bol, pas pot sucré) cale grâce à la caséine. Une poignée de graines de courge suffit pour le zinc et le gras : au-delà, la collation n’est plus légère.",
  "skyr nature + cannelle":
    "Le skyr est presque que des protéines, d’où un pot entier sans extra sucré. La cannelle (une pincée) relève le goût : elle ne remplace pas une portion, elle évite le miel.",
  "dinde sautee + courgettes + riz basmati complet":
    "La dinde porte les protéines du soir ; les courgettes gonflent l’assiette à peu de calories. Le riz basmati complet est la part d’énergie, volontairement plus petite que la viande et les légumes.",
  "tempeh saute + legumes + quinoa":
    "Le tempeh (fermenté) concentre les protéines végétales du dîner. Les légumes font le volume ; le quinoa reste mesuré pour ne pas empiler deux féculents.",
  "skyr + noix + framboises":
    "Le skyr cale dès le matin ; les framboises sucrent avec beaucoup de fibres. Les noix sont une petite poignée : assez pour ralentir le fruit, pas un mélange trail calorique.",
  "omelette 2 oeufs + tomates cerises":
    "Deux œufs, pas plus : protéines du matin sans pain. Les tomates cerises ajoutent du volume et de l’eau, pas des glucides rapides.",
  "wrap complet au thon, crudites, houmous":
    "Le thon et le houmous portent protéines et pois chiches ; les crudités remplissent le wrap. La galette complète reste une seule unité : c’est le plafond de glucides du midi.",
  "wrap complet au poulet, crudites, houmous":
    "Le poulet cale le midi ; le houmous et les crudités ajoutent fibres et volume. Une seule galette : au-delà, le wrap redevient un sandwich trop amidonné.",
  "carottes + houmous":
    "Les carottes se mangent en volume (bâtonnets) : croquant peu calorique. Le houmous est la cuillère dosée : protéines et gras du pois chiche, pas un bol à tremper sans limite.",
  "concombre + guacamole leger":
    "Le concombre est presque de l’eau : on en met beaucoup. Le guacamole reste une petite ramequin : l’avocat rassasie vite ; trop, et la collation vaut un repas.",
  "chili maison haricots rouges + salade verte":
    "Les haricots rouges (bol, pas casserole) apportent fibres solubles et protéines. La salade verte double le volume de l’assiette sans rajouter d’amidon.",
  "bol de lentilles epicees + salade verte":
    "Les lentilles sont le dîner, pas un accompagnement. La salade ajoute du volume cru ; les épices remplacent le sel et le fromage trop généreux.",
  "toast complet, avocat, oeuf poche":
    "L’œuf poché ancre le matin ; l’avocat (quelques tranches, pas l’avocat entier) ralentit le toast. Une tranche de pain complet : le glucide est plafonné.",
  "galettes de sarrasin + fromage blanc":
    "Le fromage blanc apporte les protéines que la galette seule n’a pas. Les galettes de sarrasin restent en petit nombre : amidon sans gluten, pas une pile de crêpes.",
  "poisson blanc, quinoa, legumes rotis":
    "Le poisson blanc est maigre, donc généreux en protéines. Les légumes rôtis occupent l’assiette ; le quinoa cuit reste la part mesurée, plus petite que les légumes.",
  "tofu marine + quinoa + legumes":
    "Le tofu mariné tient lieu de viande. Les légumes dominent en grammes ; le quinoa est dosé pour un dîner végétal sans double ration de céréales.",
  "orange + 1 carre chocolat noir 85%":
    "L’orange est le fruit entier, pas un jus. Un seul carré de 85 % : le plaisir est prévu, la tablette ne l’est pas.",
  "clementines + noisettes":
    "Les clémentines hydratent ; une petite poignée de noisettes ralentit leur sucre. Compter les noisettes évite de grignoter le sachet.",
  "soupe de legumes + pois chiches + salade":
    "Le bol de soupe fait le volume chaud à peu de calories. Les pois chiches (une louche, pas tout le bocal) ajoutent les protéines ; la salade allonge encore l’assiette.",
  "soupe de legumes + omelette aux herbes":
    "La soupe remplit l’estomac sans amidon. L’omelette (deux œufs) apporte les protéines du soir : assez pour tenir la nuit, pas un gratin en plus.",
  "smoothie proteine (sans sucre ajoute) + flocons":
    "La poudre (une dose) et le lait végétal calent sans jus sucré. Les flocons restent une poignée : ils épaississent, ils ne transforment pas le verre en petit-déjeuner céréales.",
  "skyr + banane + graines de lin":
    "Le skyr encadre le sucre de la banane (un fruit, pas deux). Une cuillère de lin suffit pour les fibres et les oméga-3 végétaux.",
  "salade pois chiches, concombre, tomate, feta":
    "Les pois chiches sont la base protéinée ; concombre et tomate font l’eau et le volume. La feta reste quelques cubes : salé et rassasiant, pas une salade de fromage.",
  "salade lentilles vertes, concombre, tomate, feta":
    "Les lentilles vertes, plus fermes, se dosent comme un féculent-protéine. Concombre et tomate gonflent l’assiette ; la feta reste un condiment.",
  "yaourt nature + myrtilles":
    "Le yaourt nature (non sucré) porte les protéines. Les myrtilles restent une poignée : fibres et goût, pas un coulis.",
  "fromage blanc + fraises":
    "Le fromage blanc cale jusqu’au dîner (un bol, pas un dessert sucré). Les fraises restent une poignée : on n’ajoute pas de miel.",
  "poulet au curry doux + chou-fleur + riz complet":
    "Le poulet structure le midi ; le chou-fleur remplace une partie du riz. Le riz complet cuit reste mesuré : le curry ne doit pas devenir un bol de riz épicé.",
  "curry de tofu + chou-fleur + riz complet":
    "Le tofu tient les protéines végétales ; le chou-fleur fait le volume du curry. Le riz complet est la part d’énergie, plus petite que les légumes.",
  "pancakes flocons d'avoine maison + skyr":
    "Les flocons remplacent la farine blanche, en quantité de galette petite. Le skyr à côté (pas de sirop) apporte les protéines qu’un pancake classique n’a pas.",
  "bol de muesli sans sucre + yaourt nature":
    "Le muesli sans sucre ajouté se pèse (petite coupelle) : trop, et ce n’est plus un petit-déjeuner adapté. Le yaourt nature mouille et protéine, à la place du lait sucré.",
  "bowl saumon fume, riz complet, avocat, concombre":
    "Le saumon fumé est salé et gras : la portion reste courte. Riz complet mesuré, avocat en quelques tranches, concombre en volume pour hydrater sans calories.",
  "bowl tofu fume, riz complet, avocat, concombre":
    "Le tofu fumé dose les protéines sans poisson. Même logique d’assiette : riz plafonné, avocat limité, concombre généreux.",
  "kiwi + noix de cajou":
    "Le kiwi (un à deux fruits) apporte fibres et vitamine C. Les noix de cajou se comptent : gras utile en petite poignée, dense si on picore.",
  "pomme + pistaches":
    "La pomme entière, pas un jus. Les pistaches (petite poignée décortiquée) ralentissent le fructose : le sachet n’est pas la portion.",
  "steak hache 5% + haricots verts + quinoa":
    "Le steak 5 % MG apporte fer et protéines maigres, d’où une pièce correcte. Les haricots verts dominent en volume ; le quinoa cuit reste l’accompagnement, pas l’inverse.",
  "galette vegetale + legumes + quinoa":
    "La galette végétale remplace la viande, une unité. Les légumes font le volume du dîner ; le quinoa reste mesuré pour ne pas doubler les féculents.",
  "oeufs brouilles + champignons + pain complet":
    "Les œufs brouillés calent le matin ; les champignons gonflent l’assiette. Une tranche de pain complet : le glucide s’arrête là.",
  "tofu brouille + pain complet":
    "Le tofu brouillé joue le rôle des œufs, donc en quantité généreuse. Le pain complet reste une tranche : sans ça, le matin redevient pain seul.",
  "salade nicoise revisitee (sans pommes de terre)":
    "Thon et œuf portent les protéines ; haricots verts et tomates le volume. Sans pommes de terre : l’amidon du midi est retiré exprès, on ne le remplace pas par du pain.",
  "salade nicoise vegetarienne aux pois chiches":
    "Les pois chiches remplacent le thon. L’œuf reste un, pas une omelette ; haricots et tomates font le volume, toujours sans pommes de terre.",
  "fruits rouges + fromage blanc":
    "Le fromage blanc est la base (bol). Les fruits rouges, une poignée, colorent sans coulis sucré : l’ordre protéines puis fruit évite de grignoter sucré.",
  "compote sans sucre + yaourt nature":
    "La compote sans sucre ajouté est un fruit cuit, en petit pot. Le yaourt nature autour empêche que la collation soit uniquement du fructose.",
  "gratin de legumes + filet de poisson":
    "Le gratin de légumes occupe l’assiette (volume chaud). Le filet de poisson apporte les protéines du soir, sans ajouter un féculent à côté.",
  "gratin de legumes + tempeh":
    "Même volume de légumes gratinés ; le tempeh (tranche généreuse, pas tout le bloc) remplace le poisson en protéines fermentées.",
  "oeufs brouilles aux tomates cerises":
    "Les œufs, en quantité d’omelette, calent sans pain. Les tomates cerises ajoutent de l’eau et de l’acidité : elles ne comptent pas comme féculent, on n’en met pas moins.",
  "banane, beurre d'amande et graines de chia":
    "Une banane, pas un milk-shake de fruits. Une cuillère de beurre d’amande et une de chia : le gras et les fibres plafonnent le sucre de la banane.",
  "salade pois chiches, concombre, tomate et avocat":
    "Les pois chiches sont la base du midi. Concombre et tomate en volume ; l’avocat en quelques cubes, pas un demi-fruit entier en plus du reste.",
  "houmous, crudites et quinoa":
    "Les crudités se mangent sans compter les calories. Le houmous est la part rassasiante, dosée ; le quinoa cuit reste l’accompagnement, plus petit que les légumes.",
  "feuilles de laitue, tofu et crudites":
    "Le tofu porte les protéines ; les crudités le volume croquant. La laitue remplace le pain : on en met assez pour envelopper, presque zéro glucide.",
  "salade de lentilles, carottes rapees et citron":
    "Les lentilles déjà cuites sont le dîner (bol). Les carottes râpées allongent le volume ; citron et un filet d’huile : l’huile se dose, ce n’est pas une vinaigrette copieuse.",
  "bol avocat, pois chiches et tomate":
    "Les pois chiches calent le soir ; la tomate hydrate. L’avocat (demi, pas entier si le bol est déjà dense) apporte le gras utile en quantité courte.",
  "thon au naturel, crudites et riz complet":
    "Le thon au naturel (boîte égouttée) est la protéine, sans mayo. Les crudités dominent ; le riz complet déjà cuit reste une louche, pas un saladier.",
  "salade de quinoa, avocat et concombre":
    "Le quinoa cuit est mesuré : c’est le seul féculent. Le concombre se met en volume ; l’avocat en tranches limitées pour ne pas doubler les lipides.",
  "riz complet aux fruits rouges et graines de courge":
    "Le riz complet du matin se pèse cuit, comme un porridge. Les fruits rouges sucrent sans sirop ; une poignée de graines de courge suffit pour le gras.",
  "compote pomme-cannelle et graines de chia":
    "La compote sans sucre est le fruit, en bol. Les chia (cuillère) gélifient et ralentissent l’absorption ; la cannelle remplace le sucre ajouté.",
  "quinoa tiede, banane et graines de tournesol":
    "Le quinoa tiède remplace les flocons, en portion de bol petit. Une banane ; une poignée de tournesol pour le gras, pas une tasse de graines.",
  "salade de quinoa, pois chiches et concombre":
    "Pois chiches + quinoa : association céréale-légumineuse, chacun en louche, pas deux bols. Le concombre double le volume d’eau.",
  "riz complet, haricots rouges et avocat":
    "Riz et haricots se partagent l’assiette à parts mesurées (protéines complètes). L’avocat reste quelques tranches : le gras s’ajoute, il ne remplace pas les haricots.",
  "pomme et graines de courge":
    "La pomme entière. Une petite poignée de graines de courge : zinc et gras, le sachet n’est pas la portion.",
  "myrtilles et graines de tournesol":
    "Les myrtilles, une petite barquette. Les graines de tournesol se comptent : collation courte, pas un mélange de graines à grignoter.",
  "dahl de lentilles corail et riz basmati":
    "Les lentilles corail sont le plat (volume du dahl). Le riz basmati reste l’accompagnement, plus petit que les lentilles ; les carottes allongent sans amidon extra.",
  "patate douce rotie, pois chiches et salade verte":
    "La patate douce rôtie est le féculent du soir, en morceaux mesurés. Les pois chiches ajoutent les protéines ; la salade verte remplit le reste de l’assiette.",
};

const mealWhyByNormalizedKey = new Map(
  Object.entries(MEAL_WHY_CATALOG).map(([key, value]) => [normalizeMealKey(key), value]),
);

export function lookupMealWhyCatalog(mealName: string): string | undefined {
  return mealWhyByNormalizedKey.get(normalizeMealKey(mealName));
}
