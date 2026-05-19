import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { currentUserId } from "../currentUser.js";
import { HttpError } from "../lib/errors.js";
import { getLLMProvider, type FoodHint } from "../services/llm.js";

const TextBody = z.object({
  description: z.string().min(2).max(500),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic bytes
function isJpeg(b: Buffer): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}
function isPng(b: Buffer): boolean {
  return (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  );
}

async function loadFoodHints(): Promise<FoodHint[]> {
  const foods = await prisma.food.findMany({
    where: { source: "seed" },
    select: { id: true, name: true, kcal100: true },
    take: 200,
  });
  return foods;
}

async function ensureMatchExists(matchId: string): Promise<void> {
  const exists = await prisma.food.findUnique({ where: { id: matchId } });
  if (!exists) {
    throw new HttpError(422, `matchId ${matchId} non esiste nel DB`);
  }
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // Rate-limit specifico: 20/h per ip (brief §6)
  const aiRateLimit = {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 hour",
      },
    },
  };

  app.post("/ai/estimate-text", aiRateLimit, async (req) => {
    await currentUserId(req);
    const { description } = TextBody.parse(req.body);
    const foods = await loadFoodHints();
    const provider = getLLMProvider();
    const estimate = await provider.estimateFromText({ description, foods });
    await ensureMatchExists(estimate.matchId);
    await prisma.user.update({
      where: { id: await currentUserId(req) },
      data: { aiCreditsUsed: { increment: 1 } },
    });
    return estimate;
  });

  app.post("/ai/estimate-image", aiRateLimit, async (req) => {
    const userId = await currentUserId(req);

    if (!req.isMultipart()) {
      throw new HttpError(400, "Richiesto multipart/form-data con campo 'image'");
    }
    const file = await req.file({ limits: { fileSize: MAX_IMAGE_BYTES } });
    if (!file) throw new HttpError(400, "Campo 'image' assente");

    const buf = await file.toBuffer();
    if (buf.length > MAX_IMAGE_BYTES) {
      throw new HttpError(413, "Immagine troppo grande (max 5MB)");
    }
    const mime = file.mimetype;
    if (mime !== "image/jpeg" && mime !== "image/png") {
      throw new HttpError(415, `Content-Type ${mime} non supportato (jpeg/png)`);
    }
    if (mime === "image/jpeg" && !isJpeg(buf)) {
      throw new HttpError(400, "Magic bytes non corrispondono a JPEG");
    }
    if (mime === "image/png" && !isPng(buf)) {
      throw new HttpError(400, "Magic bytes non corrispondono a PNG");
    }

    const foods = await loadFoodHints();
    const provider = getLLMProvider();
    const estimate = await provider.estimateFromImage({
      imageBuffer: buf,
      mime,
      foods,
    });
    await ensureMatchExists(estimate.matchId);
    await prisma.user.update({
      where: { id: userId },
      data: { aiCreditsUsed: { increment: 1 } },
    });
    return estimate;
  });
}
