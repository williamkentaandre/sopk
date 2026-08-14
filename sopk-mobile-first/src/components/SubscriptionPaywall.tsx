"use client";

import { useEffect, useState } from "react";
import type { Product } from "@capgo/native-purchases";

import { BrandLogo } from "@/components/BrandLogo";
import { PricingStep } from "@/components/OnboardingForm";
import type { BillingPlan } from "@/utils/subscriptionPurchase";
import {
  fetchSubscriptionProducts,
  purchaseSubscription,
  shouldUseNativeIap,
} from "@/utils/subscriptionPurchase";
import {
  getNativeTrialFooterText,
  getSubscribeCtaLabel,
} from "@/utils/subscriptionIntro";

interface SubscriptionPaywallProps {
  billingPreference: BillingPlan;
  onBillingChange: (plan: BillingPlan) => void;
  onSubscribed: () => void;
}

export function SubscriptionPaywall({
  billingPreference,
  onBillingChange,
  onSubscribed,
}: SubscriptionPaywallProps) {
  const [iapProducts, setIapProducts] = useState<{ monthly: Product; yearly: Product } | null | undefined>(
    undefined,
  );
  const [iapError, setIapError] = useState<string | null>(null);
  const [iapBusy, setIapBusy] = useState(false);
  const nativeIap = shouldUseNativeIap();

  useEffect(() => {
    if (!nativeIap) {
      setIapProducts(null);
      return;
    }
    let cancelled = false;
    setIapProducts(undefined);
    setIapError(null);
    void fetchSubscriptionProducts()
      .then((r) => {
        if (cancelled) return;
        setIapProducts(r);
        if (!r) {
          setIapError("Impossible de charger les offres depuis l'App Store. Réessaie dans un instant.");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setIapProducts(null);
        setIapError(e instanceof Error ? e.message : "Erreur lors du chargement des offres.");
      });
    return () => {
      cancelled = true;
    };
  }, [nativeIap]);

  const iapGateBlocksContinue =
    nativeIap && (iapProducts === undefined || iapProducts === null);

  const selectedProduct =
    billingPreference === "monthly" ? iapProducts?.monthly : iapProducts?.yearly;

  async function handleSubscribe() {
    if (!nativeIap) return;
    const pack = iapProducts;
    if (!pack?.monthly || !pack?.yearly) return;
    const product = billingPreference === "monthly" ? pack.monthly : pack.yearly;
    setIapBusy(true);
    setIapError(null);
    try {
      await purchaseSubscription(billingPreference, product);
      onSubscribed();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel|annul|annulée|user cancelled/i.test(msg)) {
        setIapError("Paiement annulé.");
      } else {
        setIapError(msg || "Le paiement n’a pas abouti. Réessaie ou vérifie ton compte App Store.");
      }
    } finally {
      setIapBusy(false);
    }
  }

  return (
    <main className="mx-auto flex h-[100dvh] min-h-0 max-h-[100dvh] w-full max-w-2xl flex-col items-stretch overflow-hidden bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] px-4 pb-2 pt-[max(3.25rem,calc(env(safe-area-inset-top,0px)+2.75rem))]">
      <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
        <section className="relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-[22px] border border-[#e8e2eb]/80 bg-gradient-to-b from-[#faf7f4] via-[#f5f0f8] to-[#eef5f1] shadow-[0_24px_64px_-32px_rgba(45,36,58,0.22)] sm:rounded-[28px]">
          <header className="relative shrink-0 px-4 pb-1.5 pt-3 sm:px-5 sm:pt-4">
            <BrandLogo variant="onboarding" />
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 sm:px-5 sm:pb-4">
            <p className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-center text-xs font-semibold leading-snug text-amber-900 sm:text-sm">
              {getNativeTrialFooterText(selectedProduct)}
            </p>
            <PricingStep
              billing={billingPreference}
              onSelect={onBillingChange}
              storeProducts={iapProducts}
              storeLoading={nativeIap && iapProducts === undefined}
              nativeIap={nativeIap}
              showStoreConfigHint={false}
              onRetryStore={
                nativeIap
                  ? () => {
                      setIapProducts(undefined);
                      setIapError(null);
                      void fetchSubscriptionProducts()
                        .then((r) => {
                          setIapProducts(r);
                          if (!r) {
                            setIapError(
                              "Impossible de charger les offres depuis l'App Store. Réessaie dans un instant.",
                            );
                          }
                        })
                        .catch((e) => {
                          setIapProducts(null);
                          setIapError(e instanceof Error ? e.message : "Erreur lors du chargement des offres.");
                        });
                    }
                  : undefined
              }
            />
            {iapError ? (
              <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-rose-800 sm:mt-3 sm:px-3 sm:py-2 sm:text-xs">
                {iapError}
              </p>
            ) : null}
          </div>

          <footer className="relative shrink-0 border-t border-white/55 bg-white/85 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(45,36,58,0.12)] backdrop-blur-md sm:px-4 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pt-2">
            <div className="rounded-xl border border-white/60 bg-white/70 p-2 shadow-sm sm:rounded-[22px] sm:p-3">
              <button
                type="button"
                onClick={() => void handleSubscribe()}
                disabled={iapGateBlocksContinue || iapBusy}
                className="h-11 w-full rounded-xl bg-[#6d5a7d] px-3 text-sm font-semibold text-white transition hover:bg-[#5c4a6c] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99] sm:h-12 sm:rounded-2xl sm:px-4 sm:text-base"
              >
                {iapBusy ? "Abonnement en cours…" : getSubscribeCtaLabel(selectedProduct, "S’abonner et continuer", true)}
              </button>
              <p className="mt-1 line-clamp-4 text-center text-[9px] leading-snug text-[#6b6560] sm:mt-2 sm:text-xs">
                {getNativeTrialFooterText(selectedProduct)}
              </p>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
