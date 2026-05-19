import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { loadEnv } from "./env.js";
import { registerErrorHandler } from "./lib/errors.js";
import { meRoutes } from "./routes/me.js";
import { goalsRoutes } from "./routes/goals.js";
import { foodsRoutes } from "./routes/foods.js";
import { mealsRoutes } from "./routes/meals.js";
import { waterRoutes } from "./routes/water.js";
import { favoritesRoutes } from "./routes/favorites.js";
import { aiRoutes } from "./routes/ai.js";
import { statsRoutes } from "./routes/stats.js";
import { exportRoutes } from "./routes/export.js";

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "warn" : "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body.password",
          "req.body.description",
        ],
        remove: true,
      },
    },
    bodyLimit: 6 * 1024 * 1024, // 6 MB: lascia margine sopra il 5MB delle immagini
  });

  registerErrorHandler(app);

  // CORS
  const corsOrigins =
    env.CORS_ORIGIN === "*"
      ? true
      : env.CORS_ORIGIN.split(",").map((s) => s.trim());
  await app.register(cors, {
    origin: corsOrigins,
    credentials: false,
  });

  // Rate limit globale
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Multipart per image upload
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // Healthcheck — esposto anche sotto /api/v1 così Vercel (che route solo /api/*)
  // ce l'ha senza configurazione extra. Lo lasciamo anche a /health per i test locali.
  app.get("/health", async () => ({ ok: true }));

  // Tutte le route sotto /api/v1
  await app.register(
    async (api) => {
      api.get("/health", async () => ({ ok: true }));
      await api.register(meRoutes);
      await api.register(goalsRoutes);
      await api.register(foodsRoutes);
      await api.register(mealsRoutes);
      await api.register(waterRoutes);
      await api.register(favoritesRoutes);
      await api.register(aiRoutes);
      await api.register(statsRoutes);
      await api.register(exportRoutes);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
