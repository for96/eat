// Single-user mode: ritorna sempre lo stesso userId.
// Quando aggiungerai auth, qui dentro leggerai il JWT dalla request invece di
// usare un default da env. Tutte le route chiamano questo helper, quindi il
// punto di cambio è centralizzato.

import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { loadEnv } from "./env.js";

const env = loadEnv();

export async function currentUserId(_req: FastifyRequest): Promise<string> {
  // Assicura che l'utente esista (il seed lo crea, ma in test/dev fresco potrebbe mancare)
  await prisma.user.upsert({
    where: { id: env.DEFAULT_USER_ID },
    update: {},
    create: { id: env.DEFAULT_USER_ID },
  });
  return env.DEFAULT_USER_ID;
}
