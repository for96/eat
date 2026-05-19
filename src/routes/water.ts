import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { DateString } from "../lib/schemas.js";

const PutBody = z.object({ ml: z.number().int().min(0).max(20000) });
const DeltaBody = z.object({ delta: z.number().int().min(-5000).max(5000) });
const Params = z.object({ date: DateString });

export async function waterRoutes(app: FastifyInstance): Promise<void> {
  app.get("/water/:date", async (req) => {
    const userId = await currentUserId(req);
    const { date } = Params.parse(req.params);
    const row = await prisma.waterLog.findUnique({
      where: { userId_date: { userId, date } },
    });
    return { date, ml: row?.ml ?? 0 };
  });

  app.put("/water/:date", async (req) => {
    const userId = await currentUserId(req);
    const { date } = Params.parse(req.params);
    const { ml } = PutBody.parse(req.body);
    const row = await prisma.waterLog.upsert({
      where: { userId_date: { userId, date } },
      update: { ml },
      create: { userId, date, ml },
    });
    return { date, ml: row.ml };
  });

  app.post("/water/:date/delta", async (req) => {
    const userId = await currentUserId(req);
    const { date } = Params.parse(req.params);
    const { delta } = DeltaBody.parse(req.body);
    const existing = await prisma.waterLog.findUnique({
      where: { userId_date: { userId, date } },
    });
    const newMl = Math.max(0, (existing?.ml ?? 0) + delta);
    const row = await prisma.waterLog.upsert({
      where: { userId_date: { userId, date } },
      update: { ml: newMl },
      create: { userId, date, ml: newMl },
    });
    return { date, ml: row.ml };
  });
}
