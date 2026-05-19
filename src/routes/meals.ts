import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { HttpError } from "../lib/errors.js";
import { DateString, Slot, Unit, MealSource } from "../lib/schemas.js";
import { snapshotMacros } from "../services/macros.js";

const RangeQuery = z.object({
  from: DateString,
  to: DateString,
});

const DateParam = z.object({ date: DateString });
const IdParam = z.object({ id: z.string().min(1) });

const CreateBody = z.object({
  date: DateString,
  slot: Slot,
  food_id: z.string().min(1),
  qty: z.number().positive().max(10000),
  unit: Unit.optional(),
  source: MealSource.default("manual"),
});

const PatchBody = z
  .object({
    qty: z.number().positive().max(10000).optional(),
    slot: Slot.optional(),
  })
  .refine((v) => v.qty !== undefined || v.slot !== undefined, {
    message: "Almeno uno tra qty e slot",
  });

type MealEntryRow = import("@prisma/client").MealEntry;

function toApi(e: MealEntryRow) {
  return {
    id: e.id,
    date: e.date,
    slot: e.slot,
    foodId: e.foodId,
    qty: e.qty,
    unit: e.unit,
    grams: e.grams,
    kcal: e.kcal,
    p: e.proteinG,
    c: e.carbsG,
    fat: e.fatG,
    fb: e.fiberG,
    sg: e.sugarsG,
    sf: e.satFatG,
    source: e.source,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function mealsRoutes(app: FastifyInstance): Promise<void> {
  // Range: entries fra due date
  app.get("/meals", async (req) => {
    const userId = await currentUserId(req);
    const { from, to } = RangeQuery.parse(req.query);
    if (from > to) throw new HttpError(400, "Parametro from successivo a to");
    const entries = await prisma.mealEntry.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    return { entries: entries.map(toApi) };
  });

  // Singolo giorno strutturato in slot + water
  app.get("/meals/:date", async (req) => {
    const userId = await currentUserId(req);
    const { date } = DateParam.parse(req.params);
    const [entries, water] = await Promise.all([
      prisma.mealEntry.findMany({
        where: { userId, date },
        orderBy: { createdAt: "asc" },
      }),
      prisma.waterLog.findUnique({ where: { userId_date: { userId, date } } }),
    ]);
    const slots = {
      colazione: [] as ReturnType<typeof toApi>[],
      pranzo: [] as ReturnType<typeof toApi>[],
      cena: [] as ReturnType<typeof toApi>[],
      spuntini: [] as ReturnType<typeof toApi>[],
    };
    for (const e of entries) {
      const slot = e.slot as keyof typeof slots;
      if (slot in slots) slots[slot].push(toApi(e));
    }
    return { date, slots, water_ml: water?.ml ?? 0 };
  });

  app.post("/meals", async (req, reply) => {
    const userId = await currentUserId(req);
    const body = CreateBody.parse(req.body);
    const food = await prisma.food.findUnique({ where: { id: body.food_id } });
    if (!food) throw new HttpError(404, `Food ${body.food_id} non trovato`);
    if (
      food.source === "user" &&
      food.createdByUserId &&
      food.createdByUserId !== userId
    ) {
      throw new HttpError(404, `Food ${body.food_id} non trovato`);
    }
    const unit = body.unit ?? (food.unit as "g" | "ml" | "pz");
    const snap = snapshotMacros(food, body.qty);
    const entry = await prisma.mealEntry.create({
      data: {
        userId,
        date: body.date,
        slot: body.slot,
        foodId: food.id,
        qty: body.qty,
        unit,
        grams: snap.grams,
        kcal: snap.kcal,
        proteinG: snap.proteinG,
        carbsG: snap.carbsG,
        fatG: snap.fatG,
        fiberG: snap.fiberG,
        sugarsG: snap.sugarsG,
        satFatG: snap.satFatG,
        source: body.source,
      },
    });
    reply.code(201);
    return { entry: toApi(entry) };
  });

  app.patch("/meals/:id", async (req) => {
    const userId = await currentUserId(req);
    const { id } = IdParam.parse(req.params);
    const patch = PatchBody.parse(req.body);
    const existing = await prisma.mealEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new HttpError(404, "Pasto non trovato");

    let updateData: Parameters<typeof prisma.mealEntry.update>[0]["data"] = {};
    if (patch.slot) updateData.slot = patch.slot;
    if (patch.qty !== undefined && patch.qty !== existing.qty) {
      const food = await prisma.food.findUnique({
        where: { id: existing.foodId },
      });
      if (!food) throw new HttpError(500, "Food collegato sparito");
      const snap = snapshotMacros(food, patch.qty);
      updateData = {
        ...updateData,
        qty: patch.qty,
        grams: snap.grams,
        kcal: snap.kcal,
        proteinG: snap.proteinG,
        carbsG: snap.carbsG,
        fatG: snap.fatG,
        fiberG: snap.fiberG,
        sugarsG: snap.sugarsG,
        satFatG: snap.satFatG,
      };
    }
    const entry = await prisma.mealEntry.update({
      where: { id },
      data: updateData,
    });
    return { entry: toApi(entry) };
  });

  app.delete("/meals/:id", async (req, reply) => {
    const userId = await currentUserId(req);
    const { id } = IdParam.parse(req.params);
    const existing = await prisma.mealEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new HttpError(404, "Pasto non trovato");
    await prisma.mealEntry.delete({ where: { id } });
    reply.code(204);
  });
}
