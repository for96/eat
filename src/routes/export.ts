import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";

// GET /export.json — dump completo per GDPR (brief §9).
export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/export.json", async (req, reply) => {
    const userId = await currentUserId(req);
    const [user, goals, meals, water, favorites, customFoods] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            timezone: true,
            createdAt: true,
          },
        }),
        prisma.goals.findUnique({ where: { userId } }),
        prisma.mealEntry.findMany({
          where: { userId },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        }),
        prisma.waterLog.findMany({
          where: { userId },
          orderBy: { date: "asc" },
        }),
        prisma.favorite.findMany({ where: { userId } }),
        prisma.food.findMany({ where: { createdByUserId: userId } }),
      ]);

    reply.header(
      "Content-Disposition",
      `attachment; filename="pasto-export-${userId}-${Date.now()}.json"`,
    );
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      user,
      goals,
      meals,
      water,
      favorites: favorites.map((f) => ({
        id: f.id,
        name: f.name,
        items: JSON.parse(f.items),
        createdAt: f.createdAt,
      })),
      customFoods,
    };
  });
}
