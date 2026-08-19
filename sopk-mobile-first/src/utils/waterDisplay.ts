/** Pas du curseur hydratation (ml) - 100 ml = 10 cl (centilitres). */
export const WATER_STEP_ML = 100;

/** Une bouteille d’eau standard 1,5 L (repère texte / objectif « cocher » côté pas). */
export const WATER_BOTTLE_ML = 1500;

/** Verre indicatif pour le discours (~250 ml, repère courant en France). */
export const WATER_GLASS_ML = 250;

export function formatLitersFr(liters: number): string {
  return `${liters.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
}

export function formatLitersFrFromMl(ml: number): string {
  return formatLitersFr(ml / 1000);
}

export function waterTargetVerres(targetMl: number): number {
  return Math.max(1, Math.round(targetMl / WATER_GLASS_ML));
}

/** Remplissage 0–1 de chaque verre (gauche → droite) pour `filledMl` sur la cible. */
export function waterGlassFillFractions(filledMl: number, targetMl: number): number[] {
  const count = waterTargetVerres(targetMl);
  let remaining = Math.max(0, filledMl);
  const fractions: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const portion = Math.min(WATER_GLASS_ML, remaining);
    fractions.push(Math.max(0, Math.min(1, portion / WATER_GLASS_ML)));
    remaining -= WATER_GLASS_ML;
  }
  return fractions;
}

export function formatWaterSliderAria(filledMl: number, targetMl: number): string {
  const filledGlasses = filledMl / WATER_GLASS_ML;
  const glassesLabel = filledGlasses.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  return `${formatLitersFrFromMl(filledMl)} sur ${formatLitersFrFromMl(targetMl)}, soit ${glassesLabel} verre${filledGlasses >= 1.05 ? "s" : ""}`;
}

/** Nombre entier de bouteilles de 1,5 L suffisant pour couvrir ou dépasser l’objectif (ex. 2,9 L → 2). */
export function bottlesToCoverTarget(targetMl: number): number {
  return Math.max(1, Math.ceil(targetMl / WATER_BOTTLE_ML));
}

/** Plafond du curseur : assez de pas pour dépasser l’objectif avec quelques bouteilles de marge. */
export function waterSliderMaxMl(targetMl: number): number {
  return bottlesToCoverTarget(targetMl) * WATER_BOTTLE_ML + 2 * WATER_BOTTLE_ML;
}

export function snapWaterStepMl(ml: number): number {
  return Math.round(Math.max(0, ml) / WATER_STEP_ML) * WATER_STEP_ML;
}

/** Alignement sur des multiples de 1,5 L (ancien curseur bouteilles). */
export function snapMlToBottles(ml: number): number {
  return Math.round(ml / WATER_BOTTLE_ML) * WATER_BOTTLE_ML;
}

/** 100 % dès que l’objectif en ml est atteint ou dépassé. */
export function waterProgressPercent(rawMl: number, targetMl: number): number {
  if (targetMl <= 0) return 0;
  return Math.min(100, Math.round((rawMl / targetMl) * 100));
}

/** Libellé du type « 2 × 1,5 L » (nombre de bouteilles indicatif). */
export function formatBouteillesCountFr(ml: number): string {
  const n = ml / WATER_BOTTLE_ML;
  const s = n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${s} × 1,5 L`;
}
