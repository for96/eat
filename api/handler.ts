import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleAppRequest } from "../src/app.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const appRes = await handleAppRequest({
      method: req.method || "GET",
      url: req.url || "/",
      body: normalizeBody(req.body),
      headers: req.headers,
    });

    res.statusCode = appRes.status;
    for (const [name, value] of Object.entries(appRes.headers)) {
      res.setHeader(name, value);
    }
    res.end(appRes.body);
  } catch (error) {
    console.error("Errore handler Pasto:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

function normalizeBody(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }
  return body;
}
