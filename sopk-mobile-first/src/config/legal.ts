/** Chemins in-app (Capacitor : …/privacy/index.html). */
export const LEGAL_PATHS = {
  privacy: "/privacy/",
  terms: "/terms/",
} as const;

/** URLs publiques pour App Store Connect (description, champs dédiés). */
export const LEGAL_PUBLIC_URLS = {
  privacy: "https://regimesopk.com/privacy",
  terms: "https://regimesopk.com/terms",
  /** EULA standard Apple si vous n’utilisez pas de CGU personnalisée dans ASC. */
  appleStandardEula: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
} as const;
