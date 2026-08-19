import { publicImagePath } from "@/utils/publicImagePath";

/** Listes partagées onboarding + filtrage des repas. */

export const REGIME_OPTIONS = [
  "Omnivore",
  "Pescétarienne",
  "Végétarienne",
  "Végétalienne",
  "Sans gluten",
  "Sans lactose",
  "Halal",
] as const;

export type RegimeOption = (typeof REGIME_OPTIONS)[number];

export const FOOD_PREFERENCES: { key: string; emoji: string }[] = [
  { key: "Poulet", emoji: "🍗" },
  { key: "Saumon", emoji: "🐟" },
  { key: "Œufs", emoji: "🥚" },
  { key: "Tofu", emoji: "🧈" },
  { key: "Lentilles", emoji: "🫘" },
  { key: "Quinoa", emoji: "🌾" },
  { key: "Riz complet", emoji: "🍚" },
  { key: "Avocat", emoji: "🥑" },
  { key: "Légumes verts", emoji: "🥬" },
  { key: "Patate douce", emoji: "🍠" },
  { key: "Yaourt", emoji: "🥛" },
  { key: "Fromage", emoji: "🧀" },
  { key: "Fruits rouges", emoji: "🍓" },
  { key: "Banane", emoji: "🍌" },
  { key: "Amandes", emoji: "🌰" },
  { key: "Noix", emoji: "🥜" },
  { key: "Pois chiches", emoji: "🫛" },
  { key: "Dinde", emoji: "🦃" },
  { key: "Cabillaud", emoji: "🐟" },
  { key: "Skyr", emoji: "🥣" },
  { key: "Pain complet", emoji: "🍞" },
  { key: "Champignons", emoji: "🍄" },
];

export const ALLERGY_ITEMS: { key: string; emoji: string }[] = [
  { key: "Arachides", emoji: "🥜" },
  { key: "Lait", emoji: "🥛" },
  { key: "Gluten", emoji: "🌾" },
  { key: "Fruits à coque", emoji: "🌰" },
  { key: "Soja", emoji: "🌱" },
  { key: "Crustacés", emoji: "🦐" },
  { key: "Poisson", emoji: "🐟" },
  { key: "Œufs", emoji: "🥚" },
  { key: "Sésame", emoji: "🫘" },
  { key: "Céleri", emoji: "🥬" },
  { key: "Moutarde", emoji: "🟡" },
  { key: "Sulfites", emoji: "🍷" },
];

export const EXCLUSION_ITEMS: { key: string; emoji: string }[] = [
  { key: "Brocoli", emoji: "🥦" },
  { key: "Champignons", emoji: "🍄" },
  { key: "Aubergine", emoji: "🍆" },
  { key: "Coriandre", emoji: "🌿" },
  { key: "Poivron", emoji: "🫑" },
  { key: "Tomate", emoji: "🍅" },
  { key: "Oignon", emoji: "🧅" },
  { key: "Épinards", emoji: "🥬" },
  { key: "Courgette", emoji: "🥒" },
  { key: "Chou", emoji: "🥬" },
  { key: "Fromage", emoji: "🧀" },
  { key: "Poisson", emoji: "🐟" },
  { key: "Viande rouge", emoji: "🥩" },
  { key: "Œufs", emoji: "🥚" },
  { key: "Piment", emoji: "🌶️" },
  { key: "Ananas", emoji: "🍍" },
];

/** Écarts courants - kcal indicatives pour ajuster le bilan du jour. */
export const INDULGENCE_PRESETS: {
  id: string;
  label: string;
  kcal: number;
  emoji: string;
  image: string;
}[] = [
  { id: "vin", label: "Verre de vin", kcal: 125, emoji: "🍷", image: "/images/deviations/verre-de-vin.jpg" },
  { id: "apero", label: "Apéritif / cocktail", kcal: 180, emoji: "🍸", image: "/images/deviations/apero-cocktail.jpg" },
  { id: "biere", label: "Bière", kcal: 150, emoji: "🍺", image: "/images/deviations/biere.jpg" },
  { id: "dessert", label: "Dessert", kcal: 250, emoji: "🍰", image: "/images/deviations/dessert.jpg" },
  { id: "grignotage", label: "Grignotage", kcal: 150, emoji: "🥔", image: "/images/deviations/grignotage.jpg" },
  {
    id: "repas_hors_plan",
    label: "Repas hors plan",
    kcal: 400,
    emoji: "🍽️",
    image: "/images/deviations/repas-hors-plan.jpg",
  },
];

export const DEVIATION_CUSTOM_IMAGE = "/images/deviations/autre.jpg";

export function findIndulgencePreset(presetId?: string, label?: string) {
  if (presetId) {
    const byId = INDULGENCE_PRESETS.find((preset) => preset.id === presetId);
    if (byId) return byId;
  }
  if (label) {
    return INDULGENCE_PRESETS.find((preset) => preset.label === label);
  }
  return undefined;
}

export function getDeviationPresetImage(presetId?: string, label?: string): string {
  const path = findIndulgencePreset(presetId, label)?.image ?? DEVIATION_CUSTOM_IMAGE;
  return publicImagePath(path);
}
