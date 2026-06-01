import { loadEnv } from "../env.js";

const env = loadEnv();
const OFF_PRODUCT_FIELDS = [
  "code",
  "product_name",
  "product_name_it",
  "brands",
  "image_front_url",
  "categories_tags",
  "nutriments",
  "nutriscore_grade",
  "nutriscore_score",
  "nova_group",
  "ecoscore_grade",
  "additives_n",
  "additives_tags",
  "allergens_tags",
  "ingredients_text",
  "quantity",
  "serving_size",
].join(",");

const LOOKUP_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 60 * 60 * 1000;

export type ProxyFood = {
  id: string;
  source: "openfoodfacts";
  external_id: string;
  name: string;
  cat: string;
  category: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fb: number;
  sg: number;
  sf: number;
  unit: "g";
  serving: number;
  brand: string | null;
  image_url: string | null;
};

export type ProductQuality = {
  score: number;
  grade: "excellent" | "good" | "fair" | "poor" | "unknown";
  nutriScore: string | null;
  novaGroup: number | null;
  ecoScore: string | null;
  positives: string[];
  negatives: string[];
  warnings: string[];
};

export type BarcodeLookupResult = {
  food: ProxyFood;
  quality: ProductQuality;
};

export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_it?: string;
  brands?: string;
  image_front_url?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  nova_group?: number;
  ecoscore_grade?: string;
  additives_n?: number;
  additives_tags?: string[];
  allergens_tags?: string[];
  ingredients_text?: string;
  quantity?: string;
  serving_size?: string;
};

type OffResponse = {
  status: number;
  product?: OffProduct;
};

type CacheEntry = {
  expiresAt: number;
  data: BarcodeLookupResult;
};

const cache = new Map<string, CacheEntry>();

export function isValidEan(ean: string): boolean {
  return /^\d{8,14}$/.test(ean);
}

export async function lookupBarcode(ean: string): Promise<BarcodeLookupResult | null> {
  const normalized = ean.trim();
  if (!isValidEan(normalized)) {
    throw new Error("EAN deve essere 8-14 cifre");
  }

  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  cache.delete(normalized);

  const product = await fetchProduct(normalized);
  if (!product) return null;

  const data = {
    food: mapFood(normalized, product),
    quality: scoreQuality(product),
  };
  cache.set(normalized, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}

async function fetchProduct(ean: string): Promise<OffProduct | null> {
  const params = new URLSearchParams({ fields: OFF_PRODUCT_FIELDS });
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": env.OFF_USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OffResponse;
    if (data.status !== 1 || !data.product) return null;
    return data.product;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapFood(ean: string, product: OffProduct): ProxyFood {
  const n = product.nutriments ?? {};
  const name =
    cleanText(product.product_name_it) ||
    cleanText(product.product_name) ||
    `Prodotto ${ean}`;
  const category = categoryFromTags(product.categories_tags);
  return {
    id: `off-${ean}`,
    source: "openfoodfacts",
    external_id: ean,
    name,
    cat: category,
    category,
    kcal: round1(num(n["energy-kcal_100g"])),
    p: round1(num(n["proteins_100g"])),
    c: round1(num(n["carbohydrates_100g"])),
    f: round1(num(n["fat_100g"])),
    fb: round1(num(n["fiber_100g"])),
    sg: round1(num(n["sugars_100g"])),
    sf: round1(num(n["saturated-fat_100g"])),
    unit: "g",
    serving: 100,
    brand: cleanText(product.brands) || null,
    image_url: product.image_front_url ?? null,
  };
}

export function scoreQuality(product: OffProduct): ProductQuality {
  const positives: string[] = [];
  const negatives: string[] = [];
  const warnings: string[] = [];
  const nutriScore = normalizeGrade(product.nutriscore_grade);
  const ecoScore = normalizeGrade(product.ecoscore_grade);
  const novaGroup = typeof product.nova_group === "number" ? product.nova_group : null;

  let score = 50;

  if (nutriScore) {
    const nutriBase: Record<string, number> = { a: 88, b: 74, c: 56, d: 38, e: 20 };
    score = nutriBase[nutriScore] ?? score;
    if (nutriScore === "a" || nutriScore === "b") {
      positives.push(`Nutri-Score ${nutriScore.toUpperCase()}`);
    } else if (nutriScore === "d" || nutriScore === "e") {
      negatives.push(`Nutri-Score ${nutriScore.toUpperCase()}`);
    }
  } else {
    warnings.push("Nutri-Score non disponibile");
  }

  if (novaGroup !== null) {
    if (novaGroup <= 2) {
      score += novaGroup === 1 ? 5 : 2;
      positives.push(`Trasformazione NOVA ${novaGroup}`);
    } else if (novaGroup === 3) {
      score -= 8;
      negatives.push("Prodotto trasformato NOVA 3");
    } else {
      score -= 18;
      negatives.push("Prodotto ultra-processato NOVA 4");
    }
  } else {
    warnings.push("Gruppo NOVA non disponibile");
  }

  if (ecoScore) {
    const ecoDelta: Record<string, number> = { a: 5, b: 3, c: 0, d: -3, e: -6 };
    score += ecoDelta[ecoScore] ?? 0;
    if (ecoScore === "a" || ecoScore === "b") {
      positives.push(`Eco-score ${ecoScore.toUpperCase()}`);
    } else if (ecoScore === "d" || ecoScore === "e") {
      warnings.push(`Eco-score ${ecoScore.toUpperCase()}`);
    }
  } else {
    warnings.push("Eco-score non disponibile");
  }

  applyNutrientSignals(product, positives, negatives, warnings, (delta) => {
    score += delta;
  });

  const additives = safeNumber(product.additives_n);
  if (additives !== null) {
    if (additives === 0) {
      positives.push("Nessun additivo indicato");
      score += 3;
    } else if (additives <= 2) {
      warnings.push(`${additives} additivi indicati`);
      score -= 3;
    } else {
      negatives.push(`${additives} additivi indicati`);
      score -= Math.min(12, additives * 2);
    }
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: bounded,
    grade: qualityGrade(bounded, warnings.length),
    nutriScore,
    novaGroup,
    ecoScore,
    positives: dedupe(positives).slice(0, 5),
    negatives: dedupe(negatives).slice(0, 5),
    warnings: dedupe(warnings).slice(0, 6),
  };
}

function applyNutrientSignals(
  product: OffProduct,
  positives: string[],
  negatives: string[],
  warnings: string[],
  addScore: (delta: number) => void,
): void {
  const n = product.nutriments ?? {};
  const sugars = metric(n, "sugars_100g");
  const satFat = metric(n, "saturated-fat_100g");
  const fiber = metric(n, "fiber_100g");
  const salt = metric(n, "salt_100g") ?? metric(n, "sodium_100g", 2.5);

  if (sugars === null) warnings.push("Zuccheri non indicati");
  else if (sugars > 22.5) {
    negatives.push("Zuccheri elevati");
    addScore(-10);
  } else if (sugars <= 5) {
    positives.push("Zuccheri contenuti");
    addScore(3);
  }

  if (satFat === null) warnings.push("Grassi saturi non indicati");
  else if (satFat > 5) {
    negatives.push("Grassi saturi elevati");
    addScore(-8);
  } else if (satFat <= 1.5) {
    positives.push("Grassi saturi contenuti");
    addScore(2);
  }

  if (salt === null) warnings.push("Sale non indicato");
  else if (salt > 1.5) {
    negatives.push("Sale elevato");
    addScore(-8);
  } else if (salt <= 0.3) {
    positives.push("Sale contenuto");
    addScore(2);
  }

  if (fiber !== null && fiber >= 6) {
    positives.push("Buon apporto di fibre");
    addScore(4);
  }
}

function qualityGrade(
  score: number,
  warningCount: number,
): ProductQuality["grade"] {
  if (warningCount >= 4 && score < 65) return "unknown";
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function categoryFromTags(tags: string[] | undefined): string {
  const first = tags?.[0];
  if (!first) return "Generico";
  const label = first.replace(/^[a-z]{2,3}:/, "").replace(/-/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function metric(
  source: Record<string, number | string | undefined>,
  key: string,
  multiplier = 1,
): number | null {
  const value = safeNumber(source[key]);
  return value === null ? null : value * multiplier;
}

function num(value: unknown): number {
  return safeNumber(value) ?? 0;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGrade(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return /^[a-e]$/.test(v) ? v : null;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
