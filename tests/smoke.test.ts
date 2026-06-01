import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAppRequest } from "../src/app.js";
import { scoreQuality, type OffProduct } from "../src/services/openfoodfacts.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Pasto lightweight proxy", () => {
  it("GET /api/health -> 200", async () => {
    const res = await handleAppRequest({ method: "GET", url: "/api/health" });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("POST /api/v1/barcode/lookup rejects invalid EAN", async () => {
    const res = await handleAppRequest({
      method: "POST",
      url: "/api/v1/barcode/lookup",
      body: { ean: "abc" },
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/barcode/lookup returns 404 when OFF has no product", async () => {
    mockOffResponse({ status: 0 });
    const res = await handleAppRequest({
      method: "POST",
      url: "/api/v1/barcode/lookup",
      body: { ean: "12345678" },
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/v1/barcode/lookup maps food and quality fields", async () => {
    mockOffResponse({
      status: 1,
      product: {
        product_name_it: "Pasta test",
        brands: "Pasto Lab",
        image_front_url: "https://example.com/pasta.jpg",
        categories_tags: ["it:pasta"],
        nutriscore_grade: "b",
        nova_group: 2,
        ecoscore_grade: "a",
        additives_n: 0,
        nutriments: {
          "energy-kcal_100g": 350,
          proteins_100g: 12,
          carbohydrates_100g: 70,
          fat_100g: 2,
          fiber_100g: 8,
          sugars_100g: 3,
          "saturated-fat_100g": 0.5,
          salt_100g: 0.1,
        },
      },
    });

    const res = await handleAppRequest({
      method: "POST",
      url: "/api/v1/barcode/lookup",
      body: { ean: "8076809513692" },
    });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.food).toMatchObject({
      id: "off-8076809513692",
      name: "Pasta test",
      brand: "Pasto Lab",
      kcal: 350,
      p: 12,
      c: 70,
      f: 2,
    });
    expect(body.quality.score).toBeGreaterThanOrEqual(70);
    expect(body.quality.nutriScore).toBe("b");
    expect(body.quality.novaGroup).toBe(2);
    expect(body.quality.ecoScore).toBe("a");
  });
});

describe("quality scoring", () => {
  it("penalizes ultra-processed products with critical nutrients", () => {
    const quality = scoreQuality({
      nutriscore_grade: "e",
      nova_group: 4,
      ecoscore_grade: "d",
      additives_n: 6,
      nutriments: {
        sugars_100g: 28,
        "saturated-fat_100g": 8,
        salt_100g: 2,
      },
    } satisfies OffProduct);

    expect(quality.grade).toBe("poor");
    expect(quality.score).toBeLessThan(30);
    expect(quality.negatives).toContain("Prodotto ultra-processato NOVA 4");
    expect(quality.negatives).toContain("Zuccheri elevati");
  });

  it("marks incomplete OFF data without inventing quality", () => {
    const quality = scoreQuality({
      nutriments: {},
    } satisfies OffProduct);

    expect(quality.grade).toBe("unknown");
    expect(quality.warnings.length).toBeGreaterThanOrEqual(4);
  });
});

function mockOffResponse(payload: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })),
  );
}
