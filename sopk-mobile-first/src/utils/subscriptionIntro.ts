import type { Product, SKProductDiscount, SubscriptionPeriod } from "@capgo/native-purchases";
export const APPLE_INTRO_TRIAL_DAYS = 7;
export const APPLE_INTRO_TRIAL_LABEL = "Essai gratuit de 7 jours";

/** StoreKit : 0 = essai gratuit, 1 = paiement échelonné, 2 = paiement anticipé. */
const PAYMENT_MODE_FREE_TRIAL = 0;

function formatPeriodFr(period: SubscriptionPeriod): string {
  const n = period.numberOfUnits;
  const unit = period.unitString ?? unitFromNumeric(period.unit);
  if (unit === "week") return n === 1 ? "1 semaine" : `${n} semaines`;
  if (unit === "day") return n === 1 ? "1 jour" : `${n} jours`;
  if (unit === "month") return n === 1 ? "1 mois" : `${n} mois`;
  if (unit === "year") return n === 1 ? "1 an" : `${n} ans`;
  return n === 1 ? "1 période" : `${n} périodes`;
}

function unitFromNumeric(unit: number): "day" | "week" | "month" | "year" | "unknown" {
  if (unit === 0) return "day";
  if (unit === 1) return "week";
  if (unit === 2) return "month";
  if (unit === 3) return "year";
  return "unknown";
}

export function isFreeTrialIntro(intro: SKProductDiscount | null | undefined): boolean {
  if (!intro) return false;
  return intro.paymentMode === PAYMENT_MODE_FREE_TRIAL || intro.price === 0;
}

/** Libellé court de l’offre d’introduction (ex. « Essai gratuit de 1 semaine »). */
export function formatIntroOfferLabel(intro: SKProductDiscount | null | undefined): string | null {
  if (!intro) return null;
  const period = formatPeriodFr(intro.subscriptionPeriod);
  if (isFreeTrialIntro(intro)) {
    return `Essai gratuit de ${period}`;
  }
  return `${intro.priceString} · ${period}`;
}

export function formatProductIntroSummary(product: Product | undefined): string | null {
  if (!product) return null;
  return formatIntroOfferLabel(product.introductoryPrice);
}

/** Libellé essai : StoreKit si dispo, sinon l’offre ASC attendue (7 jours). */
export function getProductIntroLabel(product: Product | undefined, nativeIap: boolean): string | null {
  const fromStore = formatProductIntroSummary(product);
  if (fromStore) return fromStore;
  if (nativeIap) return null;
  return APPLE_INTRO_TRIAL_LABEL;
}

export function formatPriceAfterIntro(product: Product | undefined, nativeIap = false): string | null {
  if (product?.introductoryPrice) {
    return `Puis ${product.priceString}`;
  }
  if (nativeIap && product?.priceString) {
    return `Puis ${product.priceString}`;
  }
  return null;
}

export function hasStoreIntroOffer(product: Product | undefined): boolean {
  const intro = product?.introductoryPrice;
  return intro != null && intro !== (null as unknown as typeof intro);
}

/** Essai gratuit confirmé par StoreKit (pas un simple texte marketing). */
export function hasConfirmedStoreFreeTrial(product: Product | undefined): boolean {
  const intro = product?.introductoryPrice;
  if (!intro) return false;
  return isFreeTrialIntro(intro);
}

/** Sur iOS : n’afficher l’essai gratuit que si StoreKit expose une offre d’introduction. */
export function showsAppleFreeTrial(product: Product | undefined, nativeIap: boolean): boolean {
  if (!nativeIap) {
    return hasConfirmedStoreFreeTrial(product);
  }
  if (!product) return false;
  return hasConfirmedStoreFreeTrial(product);
}

export function getIntroOfferMissingMessage(
  nativeIap: boolean,
  products: { monthly: Product; yearly: Product } | null | undefined,
  storeLoading: boolean,
): string | null {
  if (!nativeIap || storeLoading || products == null) return null;
  const hasTrial =
    hasConfirmedStoreFreeTrial(products.monthly) || hasConfirmedStoreFreeTrial(products.yearly);
  if (hasTrial) return null;
  return "L’App Store affiche le tarif plein (ex. 7,99 €/mois) : l’offre d’essai n’est pas active pour ce compte ou pas encore configurée dans App Store Connect. Utilisez un compte Sandbox neuf et vérifiez « Offres d’introduction → Essai gratuit, 1 semaine » sur les deux abonnements.";
}

export function getSubscribeCtaLabel(
  product: Product | undefined,
  fallback = "S’abonner",
  nativeIap = false,
): string {
  if (hasConfirmedStoreFreeTrial(product)) {
    return "Commencer l’essai gratuit de 7 jours";
  }
  if (nativeIap) return "Continuer avec l’App Store";
  const intro = formatProductIntroSummary(product);
  if (intro) return "Profiter de l’offre d’introduction";
  return fallback;
}

export function getNativeTrialFooterText(product: Product | undefined): string {
  const intro = getProductIntroLabel(product, true) ?? APPLE_INTRO_TRIAL_LABEL;
  const trialPrice = formatTrialIntroPrice(product);
  const after = formatPriceAfterIntro(product, true);
  const pricePart = trialPrice ? ` ${trialPrice} via Apple.` : " via Apple.";
  return `Offre d’introduction App Store Connect : ${intro}.${pricePart}${after ? ` ${after}.` : ""} Annulable avant la fin de l’essai dans Réglages → Abonnements.`;
}

/** Prix affiché par StoreKit pour l’essai (souvent 0,00 €). */
export function formatTrialIntroPrice(product: Product | undefined): string | null {
  const intro = product?.introductoryPrice;
  if (intro && isFreeTrialIntro(intro)) {
    const period = formatIntroOfferLabel(intro);
    return `${intro.priceString ?? "0,00 €"}${period ? ` · ${period}` : ""}`;
  }
  return null;
}
