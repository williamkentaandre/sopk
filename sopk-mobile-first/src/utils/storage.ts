export const STORAGE_KEYS = {
  onboarding: "sopk_onboarding_v1",
  tracking: "sopk_tracking_v1",
  hydrationMl: "sopk_hydration_ml_v1",
  hydrationDate: "sopk_hydration_date_v1",
  mealChecklist: "sopk_meal_checklist_v1",
  mealPhotoEstimates: "sopk_meal_photo_estimates_v1",
  aiApiKey: "sopk_ai_api_key_v1",
} as const;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
