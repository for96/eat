// Vercel serverless entry — riceve tutti i request a /api/v1/* e /health
// tramite le `rewrites` configurate in vercel.json.
//
// Strategia: usiamo `app.inject()` di Fastify (interfaccia di test che simula
// HTTP senza socket reali). Questo evita problemi con il body parser di
// @vercel/node che consuma lo stream prima che Fastify possa leggerlo.
//
// L'istanza Fastify viene cacheata nel module scope: paghiamo il costo di
// `buildApp()` solo al primo request dopo un cold start.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FastifyInstance, InjectOptions } from "fastify";
import type { Response as InjectResponse } from "light-my-request";
import { buildApp } from "../src/app.js";

let appPromise: Promise<FastifyInstance> | undefined;

function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

async function readRawBody(req: VercelRequest): Promise<Buffer | undefined> {
  // Se Vercel ha già parsato il body (JSON, urlencoded, text) → ri-serializza.
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body);
    if (typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  }
  // Body non parsato (es. multipart/form-data per upload immagini): leggi il raw stream.
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    const payload = await readRawBody(req);

    const injectOpts: InjectOptions = {
      // light-my-request usa un set ristretto di HTTPMethods rispetto a Fastify
      // (no PROPFIND ecc.) — cast a InjectOptions["method"] per allinearci.
      method: (req.method || "GET") as InjectOptions["method"],
      // Importante: req.url è preservato attraverso le `rewrites` di Vercel,
      // quindi Fastify riceve il path originale (es. /api/v1/favorites) e
      // matcha le sue route normalmente.
      url: req.url || "/",
      headers: req.headers as Record<string, string | string[]>,
      payload,
    };
    // Cast: il tipo restituito da inject() è una chain Promise — facciamo l'await
    // e diciamo a TS che è una Response di light-my-request.
    const response = (await app.inject(injectOpts)) as InjectResponse;

    res.statusCode = response.statusCode;
    for (const [name, value] of Object.entries(response.headers)) {
      if (value === undefined) continue;
      // Fastify a volte ritorna array (es. set-cookie). Lo passiamo così com'è.
      res.setHeader(name, value as string | string[]);
    }
    res.end(response.rawPayload);
  } catch (err) {
    // Fallback: errore in fase di boot (env mancanti, DB non raggiungibile, ...)
    console.error("Errore handler Vercel:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal Server Error",
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
