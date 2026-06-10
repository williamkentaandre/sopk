"use client";

import { Capacitor } from "@capacitor/core";

import { toCapacitorStaticFileHref } from "@/utils/capacitorStaticHref";

/**
 * Barre de retour en haut d’écran : safe area iOS + marge sous la barre d’état,
 * zone tactile ≥ 44px, sticky pour rester accessible au scroll.
 */
export function LegalBackHeader() {
  function handleBack() {
    if (typeof window === "undefined") return;
    /** Natif : ne pas utiliser `history.back()` — la pile peut contenir des chemins sans `.html` que le routeur iOS ne résout pas. */
    if (Capacitor.getPlatform() !== "web") {
      window.location.assign(toCapacitorStaticFileHref("/plan/"));
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-4xl items-center px-4 pb-3 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))] md:px-8">
        <button
          type="button"
          onClick={handleBack}
          className="touch-manipulation -ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-start gap-1 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70 active:bg-slate-200"
        >
          ← Retour
        </button>
      </div>
    </header>
  );
}
