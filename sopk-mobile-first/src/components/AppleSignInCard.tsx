"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppleSignIn, SignInScope } from "@capawesome/capacitor-apple-sign-in";

import { isCapacitorIos } from "@/utils/capacitorRuntime";
import { AuthSession } from "@/utils/types";

interface AppleSignInCardProps {
  onAuthenticated: (session: AuthSession) => void;
  compact?: boolean;
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.1 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c20.6-22.4 34.5-53.4 30.5-84.7-29.2 1.3-56.4 15.4-76.4 34.4-19.4 18.9-35.8 46.3-31.3 74.6 29.3 1.1 58.8-13.7 77.2-34.3z"
      />
    </svg>
  );
}

function userIdFromIdToken(idToken: string): string | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string };
    const sub = json.sub?.trim();
    return sub || null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} : délai dépassé (${ms / 1000}s).`)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function appleSignInErrorMessage(err: unknown): string {
  const capErr = err as { message?: string; code?: string };
  const code = capErr?.code ?? "";
  const message = capErr?.message ?? (err instanceof Error ? err.message : String(err ?? ""));
  if (code === "SIGN_IN_CANCELED" || /cancel/i.test(message)) {
    return "";
  }
  console.error("[AppleSignIn]", { code, message, err });
  if (/clientId must be provided/i.test(message)) {
    return "Plugin Apple Sign In non disponible sur cet appareil. Reconstruis l’app depuis Xcode (⌘B puis ⌘R).";
  }
  if (/sign in failed/i.test(message)) {
    return "Apple a refusé la connexion. Active « Sign in with Apple » pour com.nutrisopk.app sur developer.apple.com.";
  }
  return message || "Connexion impossible. Réessaie.";
}

export function AppleSignInCard({ onAuthenticated, compact = false }: AppleSignInCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAppleSignIn() {
    setLoading(true);
    setError(null);

    try {
      if (isCapacitorIos()) {
        if (!Capacitor.isPluginAvailable("AppleSignIn")) {
          setError("Plugin Apple Sign In absent. Fais Product → Clean Build Folder puis rebuild dans Xcode.");
          return;
        }

        const result = await withTimeout(
          AppleSignIn.signIn({
            scopes: [SignInScope.Email, SignInScope.FullName],
          }),
          30_000,
          "Connexion Apple",
        );

        const userId = result.user?.trim() || userIdFromIdToken(result.idToken ?? "") || "";
        if (!userId) {
          setError("Connexion Apple incomplète (identifiant manquant). Réessaie.");
          return;
        }

        onAuthenticated({
          provider: "apple",
          userId,
          email: result.email ?? undefined,
          fullName: [result.givenName, result.familyName].filter(Boolean).join(" ") || undefined,
          signedAtIso: new Date().toISOString(),
        });
        return;
      }

      onAuthenticated({
        provider: "apple",
        userId: "web-apple-preview-user",
        email: "preview@regimesopk.app",
        fullName: "Compte Apple",
        signedAtIso: new Date().toISOString(),
      });
    } catch (err) {
      const msg = appleSignInErrorMessage(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <>
      {!compact ? (
        <div className="mb-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenue</h2>
          <p className="mt-1.5 text-[15px] text-slate-500">Connecte-toi pour accéder à ton programme.</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleAppleSignIn()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-black px-5 py-4 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        <AppleLogo className="h-[1.15rem] w-[0.95rem] shrink-0 text-white" />
        {loading ? "Connexion…" : "Continuer avec Apple"}
      </button>

      {error ? <p className="mt-3 text-center text-[13px] font-medium text-rose-600">{error}</p> : null}

      {!compact ? (
        <p className="mt-4 text-center text-[12px] leading-relaxed text-slate-400">
          Tes données restent privées. Apple te permet de masquer ton e-mail lors de la connexion.
        </p>
      ) : null}
    </>
  );

  if (compact) {
    return <div className="w-full">{inner}</div>;
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
      {inner}
    </section>
  );
}
