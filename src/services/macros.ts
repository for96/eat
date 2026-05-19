// Calcolo snapshot macros: identico alla formula in frontend data.js:60-73 e
// servingToGrams a data.js:76-80. Lo replico server-side perché lo storico
// non deve dipendere dal Food corrente (vedi brief §3 "Note importanti").

import type { Food } from "@prisma/client";

export type MacroSnapshot = {
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarsG: number;
  satFatG: number;
};

export function servingToGrams(
  food: Pick<Food, "unit" | "perUnitG">,
  qty: number,
): number {
  if (food.unit === "pz") return (food.perUnitG ?? 100) * qty;
  // 1ml ≈ 1g approssimazione (uguale al frontend)
  return qty;
}

export function snapshotMacros(food: Food, qty: number): MacroSnapshot {
  const grams = servingToGrams(food, qty);
  const k = grams / 100;
  return {
    grams,
    kcal: Math.round(food.kcal100 * k),
    proteinG: round1(food.protein100 * k),
    carbsG: round1(food.carbs100 * k),
    fatG: round1(food.fat100 * k),
    fiberG: round1(food.fiber100 * k),
    sugarsG: round1(food.sugars100 * k),
    satFatG: round1(food.satFat100 * k),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
