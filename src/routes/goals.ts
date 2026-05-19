import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";

const GoalsPatch = z
  .object({
    kcal: z.number().int().min(800).max(6000).optional(),
    protein_g: z.number().int().min(0).max(500).optional(),
    carbs_g: z.number().int().min(0).max(800).optional(),
    fat_g: z.number().int().min(0).max(300).optional(),
    fiber_g: z.number().int().min(0).max(100).optional(),
    water_ml: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

function toApi(g: {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}) {
  return {
    kcal: g.kcal,
    protein_g: g.proteinG,
    carbs_g: g.carbsG,
    fat_g: g.fatG,
    fiber_g: g.fiberG,
    water_ml: g.waterMl,
  };
}

export async function goalsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/goals", async (req) => {
    const userId = await currentUserId(req);
    const goals = await prisma.goals.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return toApi(goals);
  });

  app.put("/goals", async (req) => {
    const userId = await currentUserId(req);
    const patch = GoalsPatch.parse(req.body);
    const goals = await prisma.goals.upsert({
      where: { userId },
      update: {
        ...(patch.kcal !== undefined && { kcal: patch.kcal }),
        ...(patch.protein_g !== undefined && { proteinG: patch.protein_g }),
        ...(patch.carbs_g !== undefined && { carbsG: patch.carbs_g }),
        ...(patch.fat_g !== undefined && { fatG: patch.fat_g }),
        ...(patch.fiber_g !== undefined && { fiberG: patch.fiber_g }),
        ...(patch.water_ml !== undefined && { waterMl: patch.water_ml }),
      },
      create: {
        userId,
        ...(patch.kcal !== undefined && { kcal: patch.kcal }),
        ...(patch.protein_g !== undefined && { proteinG: patch.protein_g }),
        ...(patch.carbs_g !== undefined && { carbsG: patch.carbs_g }),
        ...(patch.fat_g !== undefined && { fatG: patch.fat_g }),
        ...(patch.fiber_g !== undefined && { fiberG: patch.fiber_g }),
        ...(patch.water_ml !== undefined && { waterMl: patch.water_ml }),
      },
    });
    return toApi(goals);
  });
}
