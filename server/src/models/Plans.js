/**
 * Monthly mess membership combinations.
 *
 * A member can take any set of meals: breakfast alone, lunch alone, dinner
 * alone, any pair, or all three. The combo key is the meal ids joined with
 * "+" in a fixed order, and it is the key used to look up the price in
 * Setting.messes[].monthlyPlans.
 */

export const MEAL_IDS = ["breakfast", "lunch", "dinner"];

export const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner"
};

export const MEAL_COMBOS = [
  { key: "breakfast", label: "Breakfast only", meals: ["breakfast"] },
  { key: "lunch", label: "Lunch only", meals: ["lunch"] },
  { key: "dinner", label: "Dinner only", meals: ["dinner"] },
  { key: "breakfast+lunch", label: "Breakfast + Lunch", meals: ["breakfast", "lunch"] },
  { key: "breakfast+dinner", label: "Breakfast + Dinner", meals: ["breakfast", "dinner"] },
  { key: "lunch+dinner", label: "Lunch + Dinner", meals: ["lunch", "dinner"] },
  { key: "breakfast+lunch+dinner", label: "All three meals", meals: ["breakfast", "lunch", "dinner"] }
];

const ORDER = { breakfast: 0, lunch: 1, dinner: 2 };

/** Normalise any set of meal ids into the canonical combo key. */
export function comboKey(meals) {
  if (!Array.isArray(meals)) return "";
  const clean = MEAL_IDS.filter((id) => meals.includes(id)).sort((a, b) => ORDER[a] - ORDER[b]);
  return clean.join("+");
}

export function isValidCombo(meals) {
  return MEAL_COMBOS.some((c) => c.key === comboKey(meals));
}

export function comboLabel(meals) {
  const key = comboKey(meals);
  const found = MEAL_COMBOS.find((c) => c.key === key);
  if (found) return found.label;
  return MEAL_IDS.filter((id) => (meals || []).includes(id)).map((id) => MEAL_LABELS[id]).join(" + ") || "No meals";
}

/** Default price matrix. PLACEHOLDER figures - set real ones in the admin panel. */
export function defaultMonthlyPlans() {
  const base = {
    breakfast: 1800,
    lunch: 3500,
    dinner: 3200,
    "breakfast+lunch": 4500,
    "breakfast+dinner": 4200,
    "lunch+dinner": 6000,
    "breakfast+lunch+dinner": 7600
  };
  return base;
}