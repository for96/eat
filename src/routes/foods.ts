import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { HttpError } from "../lib/errors.js";
import { Unit } from "../lib/schemas.js";
import { fuzzyFindFoods, normalize } from "../services/search.js";
import { fetchFoodByEan } from "../services/openfoodfacts.js";

const SearchQuery = z.object({
  q: z.string().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const IdParam = z.object({ id: z.string().min(1) });

const BarcodeBody = z.object({ ean: z.string().regex(/^\d{8,14}$/, "EAN deve essere 8-14 cifre") });

const CreateFoodBody = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  kcal_100: z.number().min(0).max(2000),
  protein_100: z.number().min(0).max(100),
  carbs_100: z.number().min(0).max(100),
  fat_100: z.number().min(0).max(100),
  fiber_100: z.number().min(0).max(100).default(0),
  sugars_100: z.number().min(0).max(100).default(0),
  sat_fat_100: z.number().min(0).max(100).default(0),
  unit: Unit,
  default_serving: z.number().positive().max(2000),
  per_unit_g: z.number().positive().max(2000).nullish(),
  brand: z.string().max(120).nullish(),
});

function toApi(f: import("@prisma/client").Food) {
  return {
    id: f.id,
    source: f.source,
    external_id: f.externalId,
    name: f.name,
    category: f.category,
    kcal_100: f.kcal100,
    protein_100: f.protein100,
    carbs_100: f.carbs100,
    fat_100: f.fat100,
    fiber_100: f.fiber100,
    sugars_100: f.sugars100,
    sat_fat_100: f.satFat100,
    unit: f.unit,
    default_serving: f.defaultServing,
    per_unit_g: f.perUnitG,
    brand: f.brand,
    image_url: f.imageUrl,
    // Comodità per il frontend (matcha la shape di window.FOODS)
    kcal: f.kcal100,
    p: f.protein100,
    c: f.carbs100,
    f: f.fat100,
    fb: f.fiber100,
    sg: f.sugars100,
    sf: f.satFat100,
    cat: f.category,
    serving: f.defaultServing,
  };
}

export async function foodsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/foods/search", async (req) => {
    const userId = await currentUserId(req);
    const { q, limit } = SearchQuery.parse(req.query);
    const foods = await fuzzyFindFoods({ q, limit, userId });
    return { foods: foods.map(toApi) };
  });

  app.get("/foods/:id", async (req) => {
    const userId = await currentUserId(req);
    const { id } = IdParam.parse(req.params);
    const food = await prisma.food.findUnique({ where: { id } });
    if (!food) throw new HttpError(404, "Alimento non trovato");
    if (
      food.source === "user" &&
      food.createdByUserId &&
      food.createdByUserId !== userId
    ) {
      throw new HttpError(404, "Alimento non trovato");
    }
    return { food: toApi(food) };
  });

  app.post("/foods", async (req, reply) => {
    const userId = await currentUserId(req);
    const body = CreateFoodBody.parse(req.body);
    const id = `user-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const food = await prisma.food.create({
      data: {
        id,
        source: "user",
        name: body.name,
        nameNorm: normalize(body.name),
        category: body.category,
        kcal100: body.kcal_100,
        protein100: body.protein_100,
        carbs100: body.carbs_100,
        fat100: body.fat_100,
        fiber100: body.fiber_100,
        sugars100: body.sugars_100,
        satFat100: body.sat_fat_100,
        unit: body.unit,
        defaultServing: body.default_serving,
        perUnitG: body.per_unit_g ?? null,
        brand: body.brand ?? null,
        createdByUserId: userId,
      },
    });
    reply.code(201);
    return { food: toApi(food) };
  });

  app.post("/foods/barcode", async (req) => {
    await currentUserId(req); // assicura utente
    const { ean } = BarcodeBody.parse(req.body);

    // cache locale
    const cached = await prisma.food.findFirst({
      where: { source: "openfoodfacts", externalId: ean },
    });
    if (cached) return { food: toApi(cached) };

    const fetched = await fetchFoodByEan(ean);
    if (!fetched) throw new HttpError(404, "Prodotto non trovato su OpenFoodFacts");

    const food = await prisma.food.create({
      data: {
        id: `off-${ean}`,
        source: "openfoodfacts",
        externalId: ean,
        name: fetched.name,
        nameNorm: normalize(fetched.name),
        category: fetched.category,
        kcal100: fetched.kcal100,
        protein100: fetched.protein100,
        carbs100: fetched.carbs100,
        fat100: fetched.fat100,
        fiber100: fetched.fiber100,
        sugars100: fetched.sugars100,
        satFat100: fetched.satFat100,
        unit: "g",
        defaultServing: 100,
        brand: fetched.brand,
        imageUrl: fetched.imageUrl,
      },
    });
    return { food: toApi(food) };
  });
}
