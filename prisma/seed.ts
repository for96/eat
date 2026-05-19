// Seed iniziale: 38 alimenti italiani + utente default + 4 preferiti.
// Idempotente: rilanciarlo non duplica nulla.

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

type SeedFood = {
  id: string;
  name: string;
  cat: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fb: number;
  sg: number;
  sf: number;
  unit: "g" | "ml" | "pz";
  serving: number;
  per_unit_g?: number;
};

type SeedFav = {
  id: string;
  name: string;
  items: [string, number, string?][];
};

type SeedFile = {
  foods: SeedFood[];
  favorites: SeedFav[];
  default_goals: {
    kcal: number;
    p: number;
    c: number;
    fat: number;
    fb: number;
    water_ml: number;
  };
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[''`]/g, "'")
    .trim();
}

async function main() {
  const raw = readFileSync(join(__dirname, "foods-seed.json"), "utf8");
  const seed: SeedFile = JSON.parse(raw);

  const userId = process.env.DEFAULT_USER_ID || "default-user";

  // 1. Default user (single-user mode)
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "Marco",
      timezone: "Europe/Rome",
    },
  });

  // 2. Goals di default
  await prisma.goals.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      kcal: seed.default_goals.kcal,
      proteinG: seed.default_goals.p,
      carbsG: seed.default_goals.c,
      fatG: seed.default_goals.fat,
      fiberG: seed.default_goals.fb,
      waterMl: seed.default_goals.water_ml,
    },
  });

  // 3. 38 alimenti seed
  for (const f of seed.foods) {
    await prisma.food.upsert({
      where: { id: f.id },
      update: {
        // refresh nei campi caso il seed JSON venga aggiornato in futuro
        name: f.name,
        nameNorm: normalize(f.name),
        category: f.cat,
        kcal100: f.kcal,
        protein100: f.p,
        carbs100: f.c,
        fat100: f.f,
        fiber100: f.fb,
        sugars100: f.sg,
        satFat100: f.sf,
        unit: f.unit,
        defaultServing: f.serving,
        perUnitG: f.per_unit_g ?? null,
      },
      create: {
        id: f.id,
        source: "seed",
        name: f.name,
        nameNorm: normalize(f.name),
        category: f.cat,
        kcal100: f.kcal,
        protein100: f.p,
        carbs100: f.c,
        fat100: f.f,
        fiber100: f.fb,
        sugars100: f.sg,
        satFat100: f.sf,
        unit: f.unit,
        defaultServing: f.serving,
        perUnitG: f.per_unit_g ?? null,
      },
    });
  }

  // 4. Favorites di template
  for (const fav of seed.favorites) {
    const items = fav.items.map(([foodId, qty, unit]) => ({
      foodId,
      qty,
      unit: unit ?? null,
    }));
    await prisma.favorite.upsert({
      where: { id: `${userId}-${fav.id}` },
      update: { name: fav.name, items: JSON.stringify(items) },
      create: {
        id: `${userId}-${fav.id}`,
        userId,
        name: fav.name,
        items: JSON.stringify(items),
      },
    });
  }

  const [users, foods, favs, goals] = await Promise.all([
    prisma.user.count(),
    prisma.food.count(),
    prisma.favorite.count(),
    prisma.goals.count(),
  ]);

  console.log(
    `Seed completato — users=${users}, foods=${foods}, favorites=${favs}, goals=${goals}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
