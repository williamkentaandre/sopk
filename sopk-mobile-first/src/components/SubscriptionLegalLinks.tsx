"use client";

import { CapacitorNavLink } from "@/components/CapacitorNavLink";
import { LEGAL_PATHS, LEGAL_PUBLIC_URLS } from "@/config/legal";

const linkClass =
  "font-semibold text-[#6d5a7d] underline decoration-[#6d5a7d]/35 underline-offset-2 hover:text-[#5d4c6d]";

type Props = {
  className?: string;
  /** Texte plus petit pour l’écran d’onboarding. */
  compact?: boolean;
};

/** Liens fonctionnels exigés par Apple (3.1.2) dans le flux d’abonnement. */
export function SubscriptionLegalLinks({ className = "", compact = false }: Props) {
  const size = compact ? "text-[10px] sm:text-[11px]" : "text-xs sm:text-sm";
  return (
    <p className={`leading-relaxed text-[#6b6560] ${size} ${className}`}>
      En vous abonnant, vous acceptez nos{" "}
      <CapacitorNavLink href={LEGAL_PATHS.terms} className={linkClass}>
        Conditions d&apos;utilisation
      </CapacitorNavLink>{" "}
      et notre{" "}
      <CapacitorNavLink href={LEGAL_PATHS.privacy} className={linkClass}>
        Politique de confidentialité
      </CapacitorNavLink>
      . L&apos;abonnement se renouvelle automatiquement sauf annulation au moins 24&nbsp;h avant la fin
      de la période en cours (Réglages Apple → Abonnements).{" "}
      <a href={LEGAL_PUBLIC_URLS.appleStandardEula} className={linkClass} target="_blank" rel="noopener noreferrer">
        EULA Apple
      </a>
    </p>
  );
}
