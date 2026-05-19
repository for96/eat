// Fuzzy search senza pg_trgm: normalizzazione + LIKE.
// Per 38 seed + handful di custom user è abbondantemente sufficiente.
// Migrazione a Postgres: sostituire questa funzione con similarity() + index GIN.

import type { Food } from "@prisma/client";
import { prisma } from "../prisma.js";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[''`]/g, "'")
    .trim();
}

export type SearchOptions = {
  q: string;
  limit?: number;
  userId: string;
};

export async function fuzzyFindFoods({
  q,
  limit = 20,
  userId,
}: SearchOptions): Promise<Food[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  const query = normalize(q);

  // Includi sempre seed + openfoodfacts (pubblici); user custom solo dell'utente corrente
  const visibility = {
    OR: [
      { source: "seed" },
      { source: "openfoodfacts" },
      { source: "ai" },
      { createdByUserId: userId },
    ],
  };

  if (!query) {
    return prisma.food.findMany({
      where: visibility,
      take: cap,
      orderBy: { name: "asc" },
    });
  }

  // Match per token: "pasta pomodoro" → ogni token deve apparire in nameNorm
  const tokens = query.split(/\s+/).filter(Boolean);
  const where = {
    AND: [visibility, ...tokens.map((t) => ({ nameNorm: { contains: t } }))],
  };

  const rows = await prisma.food.findMany({ where, take: cap });

  // Ordina per "vicinanza": prima i match esatti, poi prefix, poi length
  return rows.sort((a, b) => {
    const an = a.nameNorm;
    const bn = b.nameNorm;
    const aExact = an === query ? 0 : 1;
    const bExact = bn === query ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aPrefix = an.startsWith(query) ? 0 : 1;
    const bPrefix = bn.startsWith(query) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return an.length - bn.length;
  });
}
