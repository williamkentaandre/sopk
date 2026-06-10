export const STORAGE_KEYS = {
  authSession: "sopk_auth_session_v1",
  /** Abonnement / essai validé une fois pour ce compte Apple — conservé après déconnexion. */
  entitlement: "sopk_entitlement_v1",
  onboarding: "sopk_onboarding_v1",
  onboardingDraft: "sopk_onboarding_draft_v1",
  tracking: "sopk_tracking_v1",
  hydrationMl: "sopk_hydration_ml_v1",
  hydrationDate: "sopk_hydration_date_v1",
  mealChecklist: "sopk_meal_checklist_v1",
  waterProgress: "sopk_water_progress_v1",
  stepProgress: "sopk_step_progress_v1",
  /** Après la 1ʳᵉ tentative de lecture des pas (Santé / Health Connect), ne plus rouvrir la feuille système automatiquement. */
  healthStepsPromptShown: "sopk_health_steps_prompt_v1",
} as const;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Date locale (YYYY-MM-DD) pour le calendrier du programme (évite le décal UTC de minuit). */
export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
