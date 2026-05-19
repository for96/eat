// Smoke test: copre il "happy path" di ogni endpoint principale.
// Usa l'app costruita via buildApp() + .inject() di Fastify (zero HTTP overhead).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Pasto API smoke", () => {
  it("GET /health → 200", async () => {
    const r = await app.inject({ method: "GET", url: "/health" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
  });

  it("GET /api/v1/me → utente default", async () => {
    const r = await app.inject({ method: "GET", url: "/api/v1/me" });
    expect(r.statusCode).toBe(200);
    expect(r.json().user.id).toBeTruthy();
    expect(r.json().user.passwordHash).toBeUndefined();
  });

  it("GET /api/v1/goals → default 2200 kcal", async () => {
    const r = await app.inject({ method: "GET", url: "/api/v1/goals" });
    expect(r.statusCode).toBe(200);
    expect(r.json().kcal).toBeGreaterThan(0);
  });

  it("PUT /api/v1/goals → aggiorna kcal", async () => {
    const r = await app.inject({
      method: "PUT",
      url: "/api/v1/goals",
      payload: { kcal: 2400 },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().kcal).toBe(2400);
  });

  it("GET /api/v1/foods/search?q=pasta → almeno 3 pasta", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/foods/search?q=pasta",
    });
    expect(r.statusCode).toBe(200);
    const foods = r.json().foods as Array<{ id: string }>;
    expect(foods.length).toBeGreaterThanOrEqual(3);
    expect(foods.some((f) => f.id === "pasta-pomodoro")).toBe(true);
  });

  it("POST /api/v1/meals → 201 con macros snapshottati", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/meals",
      payload: {
        date: "2030-01-15",
        slot: "pranzo",
        food_id: "pasta-pomodoro",
        qty: 150,
        unit: "g",
        source: "manual",
      },
    });
    expect(r.statusCode).toBe(201);
    const entry = r.json().entry;
    expect(entry.grams).toBe(150);
    expect(entry.kcal).toBe(222); // 148 * 1.5
  });

  it("GET /api/v1/meals/:date → ritrova l'entry appena creato", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/meals/2030-01-15",
    });
    expect(r.statusCode).toBe(200);
    const day = r.json();
    expect(day.slots.pranzo.length).toBeGreaterThan(0);
    expect(day.slots.pranzo[0].foodId).toBe("pasta-pomodoro");
  });

  it("PATCH /api/v1/meals/:id → ricalcola macros", async () => {
    // crea
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/meals",
      payload: {
        date: "2030-01-16",
        slot: "cena",
        food_id: "pollo-petto",
        qty: 100,
        source: "manual",
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().entry.id;
    // patch a 200g → kcal raddoppiati
    const r = await app.inject({
      method: "PATCH",
      url: `/api/v1/meals/${id}`,
      payload: { qty: 200 },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().entry.kcal).toBe(330); // 165 * 2
  });

  it("DELETE /api/v1/meals/:id → 204", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/meals",
      payload: {
        date: "2030-01-17",
        slot: "spuntini",
        food_id: "mela",
        qty: 1,
        source: "manual",
      },
    });
    const id = created.json().entry.id;
    const r = await app.inject({
      method: "DELETE",
      url: `/api/v1/meals/${id}`,
    });
    expect(r.statusCode).toBe(204);
  });

  it("POST /api/v1/water/:date/delta → cumula", async () => {
    // reset esplicito: il test non è isolato dal DB (SQLite condiviso fra run)
    await app.inject({
      method: "PUT",
      url: "/api/v1/water/2030-02-01",
      payload: { ml: 0 },
    });
    const r1 = await app.inject({
      method: "POST",
      url: "/api/v1/water/2030-02-01/delta",
      payload: { delta: 250 },
    });
    expect(r1.json().ml).toBe(250);
    const r2 = await app.inject({
      method: "POST",
      url: "/api/v1/water/2030-02-01/delta",
      payload: { delta: 250 },
    });
    expect(r2.json().ml).toBe(500);
  });

  it("GET /api/v1/favorites → 4 preferiti seed", async () => {
    const r = await app.inject({ method: "GET", url: "/api/v1/favorites" });
    expect(r.statusCode).toBe(200);
    expect(r.json().favorites.length).toBeGreaterThanOrEqual(4);
  });

  it("POST /api/v1/favorites/:id/apply → crea N MealEntry", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/favorites" });
    const fav = all.json().favorites[0];
    const r = await app.inject({
      method: "POST",
      url: `/api/v1/favorites/${fav.id}/apply`,
      payload: { date: "2030-03-01", slot: "colazione" },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().entries.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/ai/estimate-text → matcha pasta-pomodoro", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/ai/estimate-text",
      payload: { description: "un piatto di pasta al pomodoro con parmigiano" },
    });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.matchId).toBe("pasta-pomodoro");
    expect(j.kcal).toBeGreaterThan(100);
    expect(j.confidence).toBeGreaterThan(0.5);
  });

  it("GET /api/v1/stats/summary?days=30 → numeri ragionevoli", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/stats/summary?days=30",
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().total_days).toBe(30);
  });

  it("GET /api/v1/export.json → dump completo", async () => {
    const r = await app.inject({ method: "GET", url: "/api/v1/export.json" });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.user).toBeTruthy();
    expect(j.goals).toBeTruthy();
    expect(Array.isArray(j.meals)).toBe(true);
  });

  it("POST /api/v1/foods → crea food custom", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/foods",
      payload: {
        name: "Insalata test custom",
        category: "Verdure",
        kcal_100: 25,
        protein_100: 1.2,
        carbs_100: 4,
        fat_100: 0.3,
        unit: "g",
        default_serving: 100,
      },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().food.source).toBe("user");
  });
});
