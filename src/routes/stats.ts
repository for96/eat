import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";

const Query = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
});

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stats/summary", async (req) => {
    const userId = await currentUserId(req);
    const { days } = Query.parse(req.query);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    const from = dateKey(start);
    const to = dateKey(today);

    const entries = await prisma.mealEntry.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: {
        date: true,
        kcal: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
      },
    });

    const byDate = new Map<
      string,
      { kcal: number; p: number; c: number; f: number }
    >();
    for (const e of entries) {
      const cur = byDate.get(e.date) ?? { kcal: 0, p: 0, c: 0, f: 0 };
      cur.kcal += e.kcal;
      cur.p += e.proteinG;
      cur.c += e.carbsG;
      cur.f += e.fatG;
      byDate.set(e.date, cur);
    }

    const logged = [...byDate.values()].filter((d) => d.kcal > 0);
    const sum = logged.reduce(
      (a, d) => ({
        kcal: a.kcal + d.kcal,
        p: a.p + d.p,
        c: a.c + d.c,
        f: a.f + d.f,
      }),
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
    const n = logged.length || 1;

    return {
      from,
      to,
      avg_kcal: Math.round(sum.kcal / n),
      avg_p: Math.round((sum.p / n) * 10) / 10,
      avg_c: Math.round((sum.c / n) * 10) / 10,
      avg_f: Math.round((sum.f / n) * 10) / 10,
      logged_days: logged.length,
      total_days: days,
    };
  });
}
