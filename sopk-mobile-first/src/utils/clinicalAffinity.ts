import { normalizeFoodLabel } from "@/data/mealAllergenCatalog";
import { comorbiditiesOnly } from "@/utils/profilePath";
import type { MealType, OnboardingData } from "@/utils/types";

/**
 * Affinité entre un repas et les réponses « Ce qui vous parle le plus » et
 * « Profils associés » de l'onboarding.
 *
 * Ces deux étapes ne changeaient rien au menu : elles ne pilotaient que des textes de
 * conseil, alors que l'écran laisse croire qu'elles personnalisent le programme. Les
 * règles ci-dessous n'inventent aucune affirmation nouvelle : ce sont exactement les
 * associations aliment / profil que l'application énonce déjà dans ses conseils
 * (`profileAdvice`) et dans le « pourquoi ce repas » (`taskWhyToday`). Elles servent de
 * critère de préférence, jamais de filtre : elles ne peuvent pas retirer un repas sûr.
 */

const PROTEIN_RICH =
  /oeuf|omelette|skyr|fromage|yaourt|tofu|tempeh|poulet|dinde|saumon|thon|poisson|steak|cabillaud|lentille|pois chiche|haricot/;
const LOW_GI_FIBER = /quinoa|riz complet|avoine|lentille|legume|crudit|brocoli|pois chiche|haricot|sarrasin/;
const ANTI_INFLAMMATORY = /saumon|thon|legume|brocoli|fruits rouges|baie|myrtille|framboise|epinard|avocat/;
const CALCIUM_RICH = /yaourt|skyr|fromage|feta|amande|chou|epinard|sardine/;
const GENTLE_DIGESTION = /soupe|veloute|compote|riz|quinoa|patate douce|banane|carotte/;
const LIGHT_DINNER = /soupe|salade|legume|poisson|cabillaud|veloute|gratin de legumes/;

/**
 * Points d'affinité du repas avec le profil déclaré (0 = neutre).
 * Volontairement borné : chaque règle vaut 1 point, pour rester un départage et non
 * une prescription.
 */
export function clinicalAffinityScore(
  mealName: string,
  mealType: MealType,
  profile: OnboardingData,
): number {
  const blob = normalizeFoodLabel(mealName);
  const symptoms = profile.symptomes ?? [];
  const comorbidities = comorbiditiesOnly(profile.diagnostics);
  let score = 0;

  // Profils associés
  if (comorbidities.some((d) => d.includes("insuline")) && LOW_GI_FIBER.test(blob)) score++;
  if (comorbidities.some((d) => d.includes("Endométriose")) && ANTI_INFLAMMATORY.test(blob)) score++;
  if (comorbidities.some((d) => d.includes("Ménopause")) && (CALCIUM_RICH.test(blob) || PROTEIN_RICH.test(blob))) {
    score++;
  }

  // Ce qui vous parle le plus
  if (symptoms.some((s) => s.includes("Fringales")) && PROTEIN_RICH.test(blob)) score++;
  if (symptoms.some((s) => s.includes("fatigue")) && mealType === "dejeuner" && PROTEIN_RICH.test(blob)) score++;
  if (symptoms.some((s) => s.includes("gonflé") || s.includes("digestif")) && GENTLE_DIGESTION.test(blob)) score++;
  if (symptoms.some((s) => s.includes("Nuits")) && mealType === "diner" && LIGHT_DINNER.test(blob)) score++;
  if (symptoms.some((s) => s.includes("Graisse") || s.includes("ventre")) && LOW_GI_FIBER.test(blob)) score++;

  return score;
}

/** Le profil déclare-t-il au moins une réponse qui influence le classement des repas ? */
export function hasClinicalSignal(profile: OnboardingData): boolean {
  const symptoms = (profile.symptomes ?? []).filter((s) => s !== "Peu ou pas de tout cela");
  return symptoms.length > 0 || comorbiditiesOnly(profile.diagnostics).length > 0;
}
