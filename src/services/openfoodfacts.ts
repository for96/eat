// Lookup prodotto via EAN su OpenFoodFacts.
// API: GET https://world.openfoodfacts.org/api/v2/product/<ean>.json
// Richiede User-Agent identificativo (vedi OFF_USER_AGENT in .env).

import { loadEnv } from "../env.js";

const env = loadEnv();

export type OffFood = {
  name: string;
  category: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sugars100: number;
  satFat100: number;
  brand: string | null;
  imageUrl: string | null;
};

type OffResponse = {
  status: number;
  product?: {
    product_name?: string;
    product_name_it?: string;
    brands?: string;
    image_front_url?: string;
    categories_tags?: string[];
    nutriments?: Record<string, number | string | undefined>;
  };
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function fetchFoodByEan(ean: string): Promise<OffFood | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": env.OFF_USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) return null;
  const data = (await res.json()) as OffResponse;
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const name = p.product_name_it || p.product_name;
  if (!name) return null;

  const n = p.nutriments ?? {};
  const kcal100 = num(n["energy-kcal_100g"]);
  if (kcal100 <= 0) return null;

  let category = "Generico";
  if (p.categories_tags && p.categories_tags.length > 0) {
    const raw = p.categories_tags[0]!;
    category = raw.replace(/^[a-z]{2,3}:/, "").replace(/-/g, " ");
    category = category.charAt(0).toUpperCase() + category.slice(1);
  }

  return {
    name,
    category,
    kcal100,
    protein100: num(n["proteins_100g"]),
    carbs100: num(n["carbohydrates_100g"]),
    fat100: num(n["fat_100g"]),
    fiber100: num(n["fiber_100g"]),
    sugars100: num(n["sugars_100g"]),
    satFat100: num(n["saturated-fat_100g"]),
    brand: p.brands ?? null,
    imageUrl: p.image_front_url ?? null,
  };
}
