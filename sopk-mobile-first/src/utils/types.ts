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
  rappelHydratation: string;
  repas: MealEntry[];
  conseils: string[];
}

export interface MealPlanData {
  objectif: string;
  caloriesMoyennes: number;
  jours: DayPlan[];
}

/** Horizon du programme (jours) : même objectif de poids, vitesses et déficits adaptés. */
export type ParcoursPerte = "j30" | "j90" | "j180" | "j365";

export interface OnboardingData {
  prenom: string;
  age: number;
  poidsKg: number;
  tailleCm: number;
  parcoursPerte: ParcoursPerte;
  /** 1er jour du plan = jour 1 (date locale YYYY-MM-DD). Sans valeur, repli historique sur le jour de l’année. */
  programStartDateIso?: string;
  /** Incrémenté à chaque « Reset du suivi » pour forcer le retour au jour 1 dans l’UI même si la date de début reste identique. */
  trackingResetEpoch?: number;
  /** À true uniquement après la dernière étape d’onboarding (évite d’accéder au plan sans finir). */
  onboardingCompleted?: boolean;
  objectifPoidsKg?: number;
  objectifs?: string[];
  diagnostics?: string[];
  symptomes?: string[];
  tentativePertePoids?: string;
  niveauActivite?: string;
  rythmeRepas?: string;
  tempsCuisine?: string;
  regimeAlimentaire?: string;
  alimentsPreferes?: string[];
  allergies?: string[];
  alimentsDetestes?: string[];
  /** Préférence d'abonnement choisie à la fin de l'onboarding (après essai gratuit). */
  billingPreference?: "monthly" | "yearly";
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

export type StepProgressState = Record<string, number>;

export interface AuthSession {
  provider: "apple";
  userId: string;
  email?: string;
  fullName?: string;
  signedAtIso: string;
}
