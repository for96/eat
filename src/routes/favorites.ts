import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { HttpError } from "../lib/errors.js";
import { DateString, Slot, Unit } from "../lib/schemas.js";
import { snapshotMacros } from "../services/macros.js";

const ItemSchema = z.object({
  foodId: z.string().min(1),
  qty: z.number().positive().max(10000),
  unit: Unit.optional().nullable(),
});

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  items: z.array(ItemSchema).min(1).max(20),
});

const IdParam = z.object({ id: z.string().min(1) });

const ApplyBody = z.object({
  date: DateString,
  slot: Slot,
});

type FavoriteRow = import("@prisma/client").Favorite;

function toApi(f: FavoriteRow) {
  let items: unknown = [];
  try {
    items = JSON.parse(f.items);
  } catch {}
  return {
    id: f.id,
    name: f.name,
    items,
    createdAt: f.createdAt.toISOString(),
  };
}

export async function favoritesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/favorites", async (req) => {
    const userId = await currentUserId(req);
    const rows = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return { favorites: rows.map(toApi) };
  });

  app.post("/favorites", async (req, reply) => {
    const userId = await currentUserId(req);
    const body = CreateBody.parse(req.body);
    const fav = await prisma.favorite.create({
      data: {
        userId,
        name: body.name,
        items: JSON.stringify(body.items),
      },
    });
    reply.code(201);
    return { favorite: toApi(fav) };
  });

  app.delete("/favorites/:id", async (req, reply) => {
    const userId = await currentUserId(req);
    const { id } = IdParam.parse(req.params);
    const existing = await prisma.favorite.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Preferito non trovato");
    await prisma.favorite.delete({ where: { id } });
    reply.code(204);
  });

  app.post("/favorites/:id/apply", async (req) => {
    const userId = await currentUserId(req);
    const { id } = IdParam.parse(req.params);
    const { date, slot } = ApplyBody.parse(req.body);

    const fav = await prisma.favorite.findFirst({ where: { id, userId } });
    if (!fav) throw new HttpError(404, "Preferito non trovato");

    let items: z.infer<typeof ItemSchema>[] = [];
    try {
      const parsed = JSON.parse(fav.items);
      items = z.array(ItemSchema).parse(parsed);
    } catch {
      throw new HttpError(500, "Items del preferito corrotti");
    }

    const foodIds = items.map((i) => i.foodId);
    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
    });
    const foodMap = new Map(foods.map((f) => [f.id, f]));

    const created = await prisma.$transaction(
      items.map((item) => {
        const food = foodMap.get(item.foodId);
        if (!food)
          throw new HttpError(404, `Food ${item.foodId} dei preferiti sparito`);
        const snap = snapshotMacros(food, item.qty);
        return prisma.mealEntry.create({
          data: {
            userId,
            date,
            slot,
            foodId: food.id,
            qty: item.qty,
            unit: item.unit ?? food.unit,
            grams: snap.grams,
            kcal: snap.kcal,
            proteinG: snap.proteinG,
            carbsG: snap.carbsG,
            fatG: snap.fatG,
            fiberG: snap.fiberG,
            sugarsG: snap.sugarsG,
            satFatG: snap.satFatG,
            source: "favorite",
          },
        });
      }),
    );

    return {
      entries: created.map((e) => ({
        id: e.id,
        foodId: e.foodId,
        qty: e.qty,
        unit: e.unit,
        grams: e.grams,
        kcal: e.kcal,
      })),
    };
  });
}
