"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";

import { AuthSession } from "@/utils/types";

interface AppleSignInCardProps {
  onAuthenticated: (session: AuthSession) => void;
}

export function AppleSignInCard({ onAuthenticated }: AppleSignInCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAppleSignIn() {
    setLoading(true);
    setError(null);

    try {
      const platform = Capacitor.getPlatform();

      if (platform === "ios") {
        setError("Connexion Apple indisponible sur cette version. Utilise le mode local.");
        return;
      }

      // Web fallback so the app remains usable outside iPhone build.
      onAuthenticated({
        provider: "apple",
        userId: "web-apple-preview-user",
        email: "preview@nutrisopk.app",
        fullName: "Compte Apple",
        signedAtIso: new Date().toISOString(),
      });
    } catch {
      setError("Connexion Apple impossible pour le moment. Réessaie dans quelques secondes.");
    } finally {
      setLoading(false);
    }
  }

  function handleLocalAccess() {
    onAuthenticated({
      provider: "apple",
      userId: `local-${Date.now()}`,
      email: "local@nutrisopk.app",
      fullName: "Mode local",
      signedAtIso: new Date().toISOString(),
    });
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Connexion</h2>
      <p className="mt-1 text-sm text-slate-600">
        Connecte-toi avec Apple pour accéder à ton programme personnalisé.
      </p>

      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Connexion..." : "Continuer avec Apple"}
      </button>

      <button
        type="button"
        onClick={handleLocalAccess}
        disabled={loading}
        className="mt-2 flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Continuer sans Apple (mode local)
      </button>

      {error ? <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p> : null}
    </section>
  );
}
