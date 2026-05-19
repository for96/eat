import { z } from "zod";

export const Slot = z.enum(["colazione", "pranzo", "cena", "spuntini"]);
export type Slot = z.infer<typeof Slot>;

export const Unit = z.enum(["g", "ml", "pz"]);
export type Unit = z.infer<typeof Unit>;

export const MealSource = z.enum([
  "search",
  "barcode",
  "photo",
  "ai",
  "favorite",
  "manual",
]);
export type MealSource = z.infer<typeof MealSource>;

// YYYY-MM-DD locale utente
export const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data atteso: YYYY-MM-DD");
export type DateString = z.infer<typeof DateString>;

export const FoodSource = z.enum(["seed", "openfoodfacts", "user", "ai"]);
export type FoodSource = z.infer<typeof FoodSource>;
