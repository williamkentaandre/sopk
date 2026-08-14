import type { OnboardingData, ParcoursPerte } from "@/utils/types";
import { todayIsoLocal } from "@/utils/storage";

/** Anciennes valeurs persistées (y compris l’ancienne paire 2 modes). */
type LegacyParcours =
  | ParcoursPerte
  | "radical"
  | "modere"
  | "durable"
  | "agressif"
  | "lifestyle"
  | string
  | undefined;

export function normalizeParcours(raw: LegacyParcours): ParcoursPerte {
  if (raw === "j30" || raw === "j90" || raw === "j180" || raw === "j365") return raw;
  if (raw === "agressif" || raw === "radical") return "j30";
  if (raw === "lifestyle") return "j90";
  if (raw === "modere") return "j180";
  if (raw === "durable") return "j365";
  return "j90";
}

export function canAccessPlan(
  profile: OnboardingData | null | undefined,
  opts?: {
    hasEntitlement?: boolean;
    hasActiveSubscription?: boolean;
    /** Web / dev sans IAP : accès après onboarding sans paywall. */
    skipSubscriptionGate?: boolean;
    /** iOS : accès uniquement via abonnement Apple actif (essai 7 jours ou payant). */
    requireAppleSubscription?: boolean;
  },
): boolean {
  if (!profile) return false;
  if (opts?.hasActiveSubscription === true) return true;
  if (opts?.requireAppleSubscription) {
    return opts?.hasEntitlement === true;
  }
  if (opts?.hasEntitlement === true) return true;
  if (opts?.skipSubscriptionGate && profile.onboardingCompleted === true) return true;
  return false;
}

function shouldBackfillProgramStart(profile: OnboardingData): boolean {
  if (profile.programStartDateIso?.trim()) return false;
  return (
    profile.onboardingCompleted === true ||
    profile.billingPreference === "monthly" ||
    profile.billingPreference === "yearly"
  );
}

export function normalizeStoredProfile(profile: OnboardingData | null): OnboardingData | null {
  if (!profile) return null;
  const parcoursPerte = normalizeParcours(profile.parcoursPerte as LegacyParcours);
  let programStartDateIso = profile.programStartDateIso?.trim();
  if (programStartDateIso && !/^\d{4}-\d{2}-\d{2}$/.test(programStartDateIso)) {
    programStartDateIso = undefined;
  }
  if (!programStartDateIso && shouldBackfillProgramStart(profile)) {
    programStartDateIso = todayIsoLocal();
  }
  return {
    ...profile,
    parcoursPerte,
    ...(programStartDateIso ? { programStartDateIso } : {}),
  };
}
