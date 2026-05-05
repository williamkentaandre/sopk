export type MealType = "petit_dejeuner" | "dejeuner" | "collation" | "diner";

export interface MealEntry {
  type: MealType;
  nom: string;
  calories: number;
  substitution: string;
  image: string;
}

export interface DayPlan {
  jour: number;
  hydratationLitres: number;
  repas: MealEntry[];
  conseils: string[];
}

export interface MealPlanData {
  objectif: string;
  caloriesMoyennes: number;
  jours: DayPlan[];
}

export interface OnboardingData {
  prenom: string;
  age: number;
  poidsKg: number;
  tailleCm: number;
  objectifPrincipal:
    | "perte_poids"
    | "reduction_fringales"
    | "meilleure_energie"
    | "cycle_plus_regulier";
  niveauActivite: "faible" | "modere" | "eleve";
  hydratationCibleMl: number;
}

export interface DailyTrackingData {
  date: string;
  humeur: 1 | 2 | 3 | 4 | 5;
  energie: 1 | 2 | 3 | 4 | 5;
  fringales: 1 | 2 | 3 | 4 | 5;
  sommeilHeures: number;
  pas: number;
  repasSuivis: boolean;
}

export interface AdviceEntry {
  id: string;
  titre: string;
  description: string;
  categorie: "repas" | "fringales" | "energie" | "stress" | "sommeil";
}

export type MealChecklistState = Record<string, boolean>;

export type WaterProgressState = Record<string, number>;
