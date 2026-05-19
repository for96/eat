import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { HttpError } from "../lib/errors.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (req) => {
    const userId = await currentUserId(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        timezone: true,
        createdAt: true,
        aiCreditsUsed: true,
      },
    });
    if (!user) throw new HttpError(404, "Utente non trovato");
    return { user };
  });
}
