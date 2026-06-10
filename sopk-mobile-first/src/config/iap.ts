/**
 * Identifiants d’abonnements (App Store Connect).
 * Définir dans `.env` avec le préfixe NEXT_PUBLIC_ pour l’export statique Capacitor.
 *
 * Apple : un identifiant par abonnement auto-renouvelable (ex. com.nutrisopk.app.sub.monthly).
 * iOS : productIdentifier = id d’abonnement App Store.
 */

export function iapMonthlyProductId(): string {
  return (process.env.NEXT_PUBLIC_IAP_MONTHLY_ID ?? "").trim();
}

export function iapYearlyProductId(): string {
  return (process.env.NEXT_PUBLIC_IAP_YEARLY_ID ?? "").trim();
}

export function iapProductIdsConfigured(): boolean {
  return Boolean(iapMonthlyProductId() && iapYearlyProductId());
}

/** Base plan Android pour l’offre mensuelle (obligatoire à l’achat côté Play). */
export function iapAndroidMonthlyBasePlanId(): string {
  return (process.env.NEXT_PUBLIC_IAP_ANDROID_PLAN_MONTHLY ?? "monthly").trim();
}

export function iapAndroidYearlyBasePlanId(): string {
  return (process.env.NEXT_PUBLIC_IAP_ANDROID_PLAN_YEARLY ?? "yearly").trim();
}

/** Contournement explicite (build interne uniquement) : finalise l’onboarding sans achat natif. */
export function iapDevBypass(): boolean {
  return process.env.NEXT_PUBLIC_IAP_DEV_BYPASS === "1";
}
