/**
 * Audit lecture seule de la cohérence onboarding -> plan affiché.
 * Mesure les invariants I1 à I6 et sort des compteurs de violations.
 * Aucune écriture : sert de mesure avant / après correction.
 */
import { REGIME_OPTIONS } from "../src/data/foodPreferenceCatalog";
import {
  getDailyWalkingRecommendation,
  getMealCaloriesForTarget,
  getMealPlan,
  getPersonalizedCalories,
  getPersonalizedHydrationLiters,
} from "../src/utils/mealPlan";
import {
  buildAutoMealOverrides,
  getMealAlternatives,
  getProfileAdjustedEffectiveMeal,
  profileMealPersonalizationFingerprint,
} from "../src/utils/mealPersonalization";
import { visibleMealIndicesForDay } from "../src/utils/mealRhythm";
import { mealKey } from "../src/utils/planTracking";
import { buildProfileDayTips } from "../src/utils/profileAdvice";
import { buildShoppingList } from "../src/utils/shoppingList";
import { buildMealWhyToday } from "../src/utils/taskWhyToday";
import type { OnboardingData } from "../src/utils/types";

const RYTHMES = ["2 repas", "3 repas", "3 repas + collations"] as const;
const PARCOURS = ["j30", "j90", "j180", "j365"] as const;
const NIVEAUX = ["Sédentaire", "Légèrement active", "Modérément active", "Très active"] as const;

const base: OnboardingData = {
  prenom: "Audit",
  age: 32,
  poidsKg: 70,
  tailleCm: 165,
  parcoursPerte: "j90",
  objectifPoidsKg: 65,
  alimentsPreferes: [],
  alimentsDetestes: [],
  allergies: [],
  regimeAlimentaire: "Omnivore",
};

/** Profils morphologiques extrêmes : bornes déclarées dans l'onboarding. */
const MORPHOS: { label: string; p: Partial<OnboardingData> }[] = [
  { label: "18a/140cm/45kg", p: { age: 18, tailleCm: 140, poidsKg: 45 } },
  { label: "18a/210cm/120kg", p: { age: 18, tailleCm: 210, poidsKg: 120 } },
  { label: "32a/165cm/70kg", p: { age: 32, tailleCm: 165, poidsKg: 70 } },
  { label: "60a/150cm/95kg", p: { age: 60, tailleCm: 150, poidsKg: 95 } },
  { label: "60a/210cm/55kg", p: { age: 60, tailleCm: 210, poidsKg: 55 } },
];

let violations = 0;
const report = (n: number, label: string) => {
  violations += n;
  const flag = n === 0 ? "OK  " : "FAIL";
  console.log(`${flag} ${label.padEnd(58)} ${n} violation(s)`);
};

// ---------------------------------------------------------------- I1
// Somme des repas VISIBLES = cible calorique du jour (+/- 2 %).
console.log("\n=== I1 · cible calorique respectée par le rythme de repas ===");

let i1Total = 0;
const worstByRythme = new Map<string, { pct: number; detail: string }>();

for (const rythme of RYTHMES) {
  for (const parcours of PARCOURS) {
    for (const niveau of NIVEAUX) {
      for (const morpho of MORPHOS) {
        const profile: OnboardingData = {
          ...base,
          ...morpho.p,
          parcoursPerte: parcours,
          niveauActivite: niveau,
          rythmeRepas: rythme,
        };
        const target = getPersonalizedCalories(profile);
        const plan = getMealPlan(profile);
        for (const day of plan.jours.slice(0, 14)) {
          const served = visibleMealIndicesForDay(day.repas, rythme).reduce(
            (sum, i) => sum + getMealCaloriesForTarget(day.repas[i]!.calories, day, target, rythme),
            0,
          );
          const pct = (served / target) * 100;
          if (Math.abs(pct - 100) > 2) {
            i1Total++;
            const prev = worstByRythme.get(rythme);
            if (!prev || Math.abs(pct - 100) > Math.abs(prev.pct - 100)) {
              worstByRythme.set(rythme, {
                pct,
                detail: `${morpho.label} ${parcours} ${niveau} J${day.jour} : ${served}/${target} kcal`,
              });
            }
          }
        }
      }
    }
  }
}
for (const [rythme, worst] of worstByRythme) {
  console.log(`   pire écart "${rythme}" : ${worst.pct.toFixed(0)} % — ${worst.detail}`);
}
report(i1Total, "I1 jours hors cible (+/- 2 %)");

/*
 * Plancher / plafond par repas. Le total du jour reste l'invariant médical : si une
 * femme a besoin de 2300 kcal et choisit « 2 repas », deux repas de ~1150 kcal sont la
 * réponse correcte, pas un déficit. On vérifie donc l'absence de découpage absurde
 * (repas résiduel ou repas qui avale la journée), pas des bornes absolues par type.
 */
console.log("\n=== I1b · pas de découpage absurde (>= 120 kcal, <= 65 % du jour) ===");
const MEAL_FLOOR_KCAL = 120;
const MEAL_MAX_SHARE = 0.65;
let i1bTotal = 0;
const outliers = new Set<string>();
for (const rythme of RYTHMES) {
  for (const morpho of MORPHOS) {
    for (const parcours of PARCOURS) {
      const profile: OnboardingData = {
        ...base,
        ...morpho.p,
        parcoursPerte: parcours,
        niveauActivite: "Très active",
        rythmeRepas: rythme,
      };
      const target = getPersonalizedCalories(profile);
      const plan = getMealPlan(profile);
      for (const day of plan.jours.slice(0, 14)) {
        for (const i of visibleMealIndicesForDay(day.repas, rythme)) {
          const meal = day.repas[i]!;
          const kcal = getMealCaloriesForTarget(meal.calories, day, target, rythme);
          if (kcal < MEAL_FLOOR_KCAL || kcal > target * MEAL_MAX_SHARE) {
            i1bTotal++;
            outliers.add(
              `${rythme} · ${meal.type} = ${kcal} kcal (${((100 * kcal) / target).toFixed(0)} % du jour, ${morpho.label})`,
            );
          }
        }
      }
    }
  }
}
for (const line of [...outliers].slice(0, 8)) console.log(`   - ${line}`);
report(i1bTotal, "I1b repas hors bornes physiologiques");

// ---------------------------------------------------------------- I4
/*
 * Test empirique, pas déclaratif : pour chaque champ, on compare le menu réellement
 * produit avant et après modification. Si le menu change mais que l'empreinte ne change
 * pas, l'utilisatrice garde un menu périmé après avoir modifié son profil.
 */
console.log("\n=== I4 · un menu qui change impose une empreinte qui change ===");
const variations: { field: keyof OnboardingData; a: unknown; b: unknown }[] = [
  { field: "regimeAlimentaire", a: "Omnivore", b: "Végétalienne" },
  { field: "allergies", a: [], b: ["Gluten"] },
  { field: "alimentsDetestes", a: [], b: ["Tomate"] },
  { field: "alimentsPreferes", a: [], b: ["Poulet"] },
  { field: "tempsCuisine", a: "Peu importe", b: "Moins de 15 min" },
  { field: "parcoursPerte", a: "j90", b: "j30" },
  { field: "rythmeRepas", a: "3 repas", b: "2 repas" },
  { field: "symptomes", a: [], b: ["Fringales difficiles à calmer"] },
  { field: "diagnostics", a: [], b: ["Résistance à l’insuline"] },
  { field: "niveauActivite", a: "Sédentaire", b: "Très active" },
  { field: "profilNutrition", a: "sopk", b: "general" },
];

function menuSignature(profile: OnboardingData): string {
  const plan = getMealPlan(profile);
  const overrides = buildAutoMealOverrides(profile, plan, {});
  return plan.jours
    .slice(0, 14)
    .flatMap((day) =>
      day.repas.map((planned, mi) => {
        const shown = getProfileAdjustedEffectiveMeal(planned, overrides[mealKey(day.jour, mi)], profile, day.jour + mi);
        return `${day.jour}-${mi}:${shown?.nom ?? "∅"}`;
      }),
    )
    .join("|");
}

let i4Total = 0;
for (const { field, a, b } of variations) {
  const pa = { ...base, [field]: a } as OnboardingData;
  const pb = { ...base, [field]: b } as OnboardingData;
  const menuChanged = menuSignature(pa) !== menuSignature(pb);
  const fingerprintChanged =
    profileMealPersonalizationFingerprint(pa) !== profileMealPersonalizationFingerprint(pb);
  const state = `menu ${menuChanged ? "change" : "identique"} / empreinte ${fingerprintChanged ? "change" : "identique"}`;
  if (menuChanged && !fingerprintChanged) {
    i4Total++;
    console.log(`   - "${String(field)}" : ${state}  -> menu périmé après modification du profil`);
  } else {
    console.log(`   OK "${String(field)}" : ${state}`);
  }
}
report(i4Total, "I4 menus périmés après modification du profil");

// ---------------------------------------------------------------- I3
/*
 * Chaque réponse d'onboarding doit produire un effet observable quelque part.
 * On compare l'ensemble des sorties visibles par l'utilisatrice, pas seulement le menu :
 * une réponse peut légitimement n'agir que sur les alternatives proposées ou sur les
 * repères. Une réponse sans aucun effet est une question posée pour rien.
 */
console.log("\n=== I3 · chaque réponse a un effet observable ===");

function outputSignatures(profile: OnboardingData): Record<string, string> {
  const plan = getMealPlan(profile);
  const overrides = buildAutoMealOverrides(profile, plan, {});
  const days = plan.jours.slice(0, 7);

  const alternatives = days
    .flatMap((day) =>
      day.repas.map((planned) => getMealAlternatives(profile, planned).map((m) => m.nom).join(">")),
    )
    .join("|");

  const courses = buildShoppingList(profile, plan.jours, 1, 7, overrides)
    .lines.map((l) => `${l.aliment}:${l.grammes}`)
    .join("|");

  const target = getPersonalizedCalories(profile);
  const reperes = [
    target,
    getPersonalizedHydrationLiters(2, profile),
    getDailyWalkingRecommendation(profile).steps,
  ].join("/");

  const portions = days
    .flatMap((day) =>
      visibleMealIndicesForDay(day.repas, profile.rythmeRepas).map((i) =>
        String(getMealCaloriesForTarget(day.repas[i]!.calories, day, target, profile.rythmeRepas)),
      ),
    )
    .join("|");

  const conseils = buildProfileDayTips(profile).join("|");

  const pourquoi = days
    .flatMap((day) => day.repas.map((meal) => buildMealWhyToday(profile, meal, day, target)))
    .join("|");

  return { menu: menuSignature(profile), alternatives, courses, reperes, portions, conseils, pourquoi };
}

let i3Total = 0;
for (const { field, a, b } of variations) {
  const sa = outputSignatures({ ...base, [field]: a } as OnboardingData);
  const sb = outputSignatures({ ...base, [field]: b } as OnboardingData);
  const changed = Object.keys(sa).filter((k) => sa[k] !== sb[k]);
  if (changed.length === 0) {
    i3Total++;
    console.log(`   - "${String(field)}" : AUCUN effet observable`);
  } else {
    console.log(`   OK "${String(field)}" agit sur : ${changed.join(", ")}`);
  }
}
report(i3Total, "I3 réponses sans aucun effet");

// ---------------------------------------------------------------- I6
// Repères médicaux dans des bornes défendables pour tous les profils extrêmes.
console.log("\n=== I6 · bornes des repères (calories, eau, pas) ===");
let i6Total = 0;
for (const morpho of MORPHOS) {
  for (const parcours of PARCOURS) {
    for (const niveau of NIVEAUX) {
      const profile: OnboardingData = {
        ...base,
        ...morpho.p,
        parcoursPerte: parcours,
        niveauActivite: niveau,
      };
      const kcal = getPersonalizedCalories(profile);
      const eau = getPersonalizedHydrationLiters(2, profile);
      const pas = getDailyWalkingRecommendation(profile).steps;
      if (kcal < 1200 || kcal > 2600) {
        i6Total++;
        console.log(`   - calories ${kcal} hors bornes (${morpho.label} ${parcours} ${niveau})`);
      }
      if (eau < 1.5 || eau > 4) {
        i6Total++;
        console.log(`   - eau ${eau} L hors bornes (${morpho.label})`);
      }
      if (pas < 3000 || pas > 15000) {
        i6Total++;
        console.log(`   - pas ${pas} hors bornes (${morpho.label})`);
      }
    }
  }
}
report(i6Total, "I6 repères hors bornes");

// ---------------------------------------------------------------- I5
// Aucun rythme ne doit produire un plan vide, aucun régime ne doit casser le plan.
console.log("\n=== I5 · aucun état vide silencieux ===");
let i5Total = 0;
for (const rythme of [...RYTHMES, undefined, "", "4 repas"]) {
  const jour = getMealPlan(base).jours[0]!;
  const idx = visibleMealIndicesForDay(jour.repas, rythme as string | undefined);
  if (idx.length === 0) {
    i5Total++;
    console.log(`   - rythme "${rythme}" -> aucun repas visible`);
  }
}
for (const regime of REGIME_OPTIONS) {
  const profile: OnboardingData = { ...base, regimeAlimentaire: regime };
  const plan = getMealPlan(profile);
  if (plan.jours.length === 0) {
    i5Total++;
    console.log(`   - régime "${regime}" -> plan vide`);
  }
}
report(i5Total, "I5 états vides silencieux");

console.log(`\n>>> TOTAL VIOLATIONS : ${violations}`);
