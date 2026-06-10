import { Capacitor } from "@capacitor/core";
import type { Product } from "@capgo/native-purchases";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";

import {
  iapAndroidMonthlyBasePlanId,
  iapAndroidYearlyBasePlanId,
  iapDevBypass,
  iapMonthlyProductId,
  iapProductIdsConfigured,
  iapYearlyProductId,
} from "@/config/iap";

export type BillingPlan = "monthly" | "yearly";

export function shouldUseNativeIap(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.getPlatform() === "web") return false;
  if (iapDevBypass()) return false;
  return iapProductIdsConfigured();
}

function wantedId(plan: BillingPlan): string {
  return plan === "monthly" ? iapMonthlyProductId() : iapYearlyProductId();
}

/**
 * Associe un produit retourné par les stores à notre offre mensuelle / annuelle.
 * iOS : identifier = id produit App Store.
 * Android : souvent identifier = base plan, planIdentifier = id abonnement Play.
 */
export function matchStoreProduct(products: Product[], plan: BillingPlan): Product | undefined {
  const id = wantedId(plan);
  return (
    products.find((p) => p.identifier === id) ||
    products.find((p) => p.planIdentifier === id) ||
    products.find((p) => p.identifier === (plan === "monthly" ? iapAndroidMonthlyBasePlanId() : iapAndroidYearlyBasePlanId()))
  );
}

export async function fetchSubscriptionProducts(): Promise<{ monthly: Product; yearly: Product } | null> {
  if (!iapProductIdsConfigured()) return null;
  if (Capacitor.getPlatform() === "web") return null;

  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  if (!isBillingSupported) return null;

  const ids = [iapMonthlyProductId(), iapYearlyProductId()];
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: ids,
    productType: PURCHASE_TYPE.SUBS,
  });

  const monthly = matchStoreProduct(products, "monthly");
  const yearly = matchStoreProduct(products, "yearly");
  if (!monthly || !yearly) return null;
  return { monthly, yearly };
}

export async function purchaseSubscription(plan: BillingPlan, product: Product): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    const subId = product.planIdentifier ?? wantedId(plan);
    const basePlan = product.identifier;
    await NativePurchases.purchaseProduct({
      productIdentifier: subId,
      planIdentifier: basePlan,
      productType: PURCHASE_TYPE.SUBS,
    });
    return;
  }

  await NativePurchases.purchaseProduct({
    productIdentifier: product.identifier,
    productType: PURCHASE_TYPE.SUBS,
  });
}

export async function restoreSubscriptionPurchases(): Promise<void> {
  if (Capacitor.getPlatform() === "web") return;
  await NativePurchases.restorePurchases();
}

/** Ouvre la page native de gestion des abonnements (App Store). */
export async function openSubscriptionManagement(): Promise<void> {
  if (Capacitor.getPlatform() === "web") return;
  await NativePurchases.manageSubscriptions();
}

export async function hasActiveSubscriptionFromStore(): Promise<boolean> {
  if (Capacitor.getPlatform() === "web" || !iapProductIdsConfigured()) return false;
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  const mid = iapMonthlyProductId();
  const yid = iapYearlyProductId();
  return purchases.some((p) => p.productIdentifier === mid || p.productIdentifier === yid);
}
