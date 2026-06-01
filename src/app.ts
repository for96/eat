import { loadEnv } from "./env.js";
import { isValidEan, lookupBarcode } from "./services/openfoodfacts.js";

type AppRequest = {
  method: string;
  url: string;
  body?: unknown;
};

export type AppResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export async function handleAppRequest(req: AppRequest): Promise<AppResponse> {
  const env = loadEnv();
  const method = req.method.toUpperCase();
  const url = new URL(req.url, "http://localhost");
  const corsHeaders = cors(env.CORS_ORIGIN);

  if (method === "OPTIONS") {
    return {
      status: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
    return json(200, { ok: true }, corsHeaders);
  }

  if (method === "POST" && url.pathname === "/api/v1/barcode/lookup") {
    const ean = readEan(req.body);
    if (!ean || !isValidEan(ean)) {
      return json(400, { error: "EAN deve essere 8-14 cifre" }, corsHeaders);
    }

    const result = await lookupBarcode(ean);
    if (!result) {
      return json(
        404,
        { error: "Prodotto non trovato su Open Food Facts" },
        corsHeaders,
      );
    }

    return json(
      200,
      result,
      {
        ...corsHeaders,
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    );
  }

  return json(404, { error: "Endpoint non trovato" }, corsHeaders);
}

function readEan(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { ean?: unknown }).ean;
  return typeof value === "string" ? value.trim() : null;
}

function json(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
): AppResponse {
  return {
    status,
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(payload),
  };
}

function cors(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,accept",
  };
}
