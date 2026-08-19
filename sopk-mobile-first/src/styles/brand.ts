/**
 * Charte SOPK Nutrition - source unique couleurs & classes Tailwind (Geist partout).
 * Primaire : prune douce · Accent santé : teal · Sémantique : emerald / amber / rose
 */
export const brandColors = {
  primary: "#6d5a7d",
  primaryHover: "#5d4c6d",
  primaryLight: "#7c6a8f",
  primaryDark: "#4a3d56",
  ink: "#2c2622",
  inkMuted: "#6b6560",
  inkSubtle: "#8a8494",
  border: "#e8e2eb",
  borderStrong: "#d4cdd8",
  surface: "#faf8f6",
  surfaceMuted: "#f5f0f8",
  surfaceElevated: "#ffffff",
  accentTeal: "#0d9488",
  accentTealSoft: "#ecfdf8",
  shadowRgb: "61, 42, 74",
} as const;

/** Classes Tailwind réutilisables (tokens `brand-*` dans globals.css). */
export const brand = {
  shell: "from-[var(--surface)] via-[var(--surface-muted)] to-[#eef5f1]",
  card: "border-brand-200/90 bg-white/90 shadow-card",
  cardPremium: "border-brand-200/50 bg-white/95 shadow-card ring-1 ring-white/80",
  accent: "bg-brand-600",
  accentHover: "hover:bg-brand-700",
  accentSoft: "bg-brand-600/12 border-brand-600/25",
  accentText: "text-brand-600",
  accentRing: "focus:border-brand-600 focus:ring-brand-600/20",
  text: "text-ink",
  muted: "text-ink-muted",
  progress: "bg-brand-600",
  progressTrack: "bg-brand-200/80",
  btnPrimary:
    "rounded-xl bg-brand-600 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(109,90,125,0.45)] transition hover:bg-brand-700 active:scale-[0.99]",
  btnSecondary:
    "rounded-xl border border-brand-200 bg-brand-50 font-semibold text-brand-700 transition hover:bg-brand-100",
  btnGhost: "rounded-xl border border-brand-200 bg-white font-semibold text-ink transition hover:bg-brand-50",
  eyebrow: "text-eyebrow text-brand-600/80",
  sectionTitle: "text-section-title text-ink",
  body: "text-body text-ink-muted",
  graphLine: brandColors.primary,
  graphFill: "url(#projectionFill)",
  gradientHero: "from-brand-700 via-brand-600 to-accent",
  gradientHeader: "from-brand-50/90 via-white to-brand-50/40",
  /** Tâche du jour encore ouverte : reliquaire crème, pas un feu rouge. */
  taskOpen:
    "border-brand-200 bg-gradient-to-br from-white to-brand-50 text-ink shadow-card ring-1 ring-brand-100/80",
  /** Tâche honorée : cachet prune → teal (charte), jamais émeraude. */
  taskHonored:
    "border-accent/45 bg-gradient-to-br from-brand-800 via-brand-600 to-accent text-white shadow-[0_10px_28px_rgba(61,42,74,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-white/15",
} as const;
