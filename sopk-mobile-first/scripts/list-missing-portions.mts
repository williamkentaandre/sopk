import { SAFE_FALLBACK_MEALS } from "../src/data/mealAllergenCatalog";
import { hasExplicitPortions } from "../src/utils/meal-portions";
import { getMealCatalog } from "../src/utils/mealPersonalization";

for (const meal of [...getMealCatalog(), ...SAFE_FALLBACK_MEALS]) {
  if (!hasExplicitPortions(meal.nom)) {
    console.log(`${meal.type.padEnd(15)} ${meal.calories} kcal  ${meal.nom}`);
  }
}
