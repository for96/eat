// LLM provider — interfaccia astratta + stub.
// Lo stub fa keyword matching deterministico sui foods seed,
// replicando il "feel" della stima senza chiamare nessuna API esterna.
// Quando avrai una API key Anthropic: imposta LLM_PROVIDER=anthropic in .env
// e implementa la classe AnthropicProvider sotto (placeholder commentato).

import { prisma } from "../prisma.js";
import { normalize } from "./search.js";
import { snapshotMacros } from "./macros.js";
import { loadEnv } from "../env.js";

const env = loadEnv();

export type FoodHint = { id: string; name: string; kcal100: number };

export type Estimate = {
  matchId: string;
  name: string;
  grams: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  confidence: number;
};

export interface LLMProvider {
  estimateFromText(input: {
    description: string;
    foods: FoodHint[];
  }): Promise<Estimate>;
  estimateFromImage(input: {
    imageBuffer: Buffer;
    mime: string;
    foods: FoodHint[];
  }): Promise<Estimate>;
}

// ─── Stub provider ────────────────────────────────────────────────────────
// Strategy:
// 1. normalizza la descrizione
// 2. per ogni food calcola uno score = numero di token della descrizione che
//    appaiono nel nome normalizzato del food (parole >= 3 char per filtrare "di", "a")
// 3. prende il top match, applica defaultServing, deriva macros via snapshotMacros
// 4. confidence ∝ rapporto (token matched / token totali nella descrizione)

class StubProvider implements LLMProvider {
  async estimateFromText({
    description,
  }: {
    description: string;
  }): Promise<Estimate> {
    const tokens = normalize(description)
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    // Carica tutti i food seed (lista corta, ok caricarli tutti)
    const seedFoods = await prisma.food.findMany({
      where: { source: "seed" },
    });
    if (seedFoods.length === 0) {
      throw new Error("Nessun food seed disponibile per stub LLM");
    }

    let best = seedFoods[0]!;
    let bestScore = 0;

    for (const food of seedFoods) {
      const nameTokens = food.nameNorm
        .split(/\s+/)
        .filter((t) => t.length >= 3);
      let score = 0;
      for (const t of tokens) {
        if (
          nameTokens.includes(t) ||
          food.nameNorm.includes(t) ||
          normalize(food.category).includes(t)
        ) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = food;
      }
    }

    // Se zero match, fallback al primo food. Confidence bassa.
    const denom = Math.max(1, tokens.length);
    const confidence = bestScore === 0 ? 0.35 : Math.min(0.92, 0.5 + (bestScore / denom) * 0.5);

    const snap = snapshotMacros(best, best.defaultServing);
    return {
      matchId: best.id,
      name: best.name,
      grams: snap.grams,
      kcal: snap.kcal,
      p: snap.proteinG,
      c: snap.carbsG,
      f: snap.fatG,
      confidence: round2(confidence),
    };
  }

  async estimateFromImage({
    foods,
  }: {
    imageBuffer: Buffer;
    mime: string;
    foods: FoodHint[];
  }): Promise<Estimate> {
    // Stub: replica la logica mock del frontend (pre-backend) —
    // sceglie deterministicamente uno dei piatti tipici.
    const picks = [
      "pasta-pomodoro",
      "salmone",
      "insalata-mista",
      "risotto-funghi",
      "pollo-petto",
    ];
    const id = picks[Math.floor(Math.random() * picks.length)]!;
    const food = await prisma.food.findUnique({ where: { id } });
    if (!food) {
      // fallback al primo hint
      const hint = foods[0];
      if (!hint) throw new Error("Nessun food disponibile per stub vision");
      const f = await prisma.food.findUniqueOrThrow({ where: { id: hint.id } });
      const snap = snapshotMacros(f, f.defaultServing);
      return {
        matchId: f.id,
        name: f.name,
        grams: snap.grams,
        kcal: snap.kcal,
        p: snap.proteinG,
        c: snap.carbsG,
        f: snap.fatG,
        confidence: 0.6,
      };
    }
    // grams jitter realistico
    const grams = food.defaultServing * (0.85 + Math.random() * 0.3);
    const snap = snapshotMacros(food, grams / (food.unit === "pz" ? (food.perUnitG ?? 100) : 1));
    const confidence = 0.78 + Math.random() * 0.18;
    return {
      matchId: food.id,
      name: food.name,
      grams: Math.round(snap.grams),
      kcal: snap.kcal,
      p: snap.proteinG,
      c: snap.carbsG,
      f: snap.fatG,
      confidence: round2(confidence),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Anthropic provider (placeholder) ─────────────────────────────────────
// Da implementare quando avrai ANTHROPIC_API_KEY. Tutto il prompt vero del
// brief §5 va incollato qui sotto. La signature è già conforme all'interfaccia.
/*
class AnthropicProvider implements LLMProvider {
  async estimateFromText({ description, foods }) {
    const system = "...";
    const user = `L'utente descrive un pasto in italiano. ...`;  // prompt brief §5.1
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        temperature: 0.2,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    const text = data.content[0].text as string;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new HttpError(502, 'LLM ha ritornato JSON non parsabile');
    return JSON.parse(m[0]);
  }
  // estimateFromImage: idem con un content multimodale `image` block.
}
*/

let cached: LLMProvider | null = null;
export function getLLMProvider(): LLMProvider {
  if (cached) return cached;
  if (env.LLM_PROVIDER === "stub") {
    cached = new StubProvider();
  } else {
    // Quando il provider Anthropic sarà pronto:
    // cached = new AnthropicProvider();
    throw new Error(
      `LLM_PROVIDER=${env.LLM_PROVIDER} non ancora implementato — usa 'stub' per ora`,
    );
  }
  return cached;
}
