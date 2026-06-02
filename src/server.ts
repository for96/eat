import { createServer, type IncomingMessage } from "node:http";
import { loadEnv } from "./env.js";
import { handleAppRequest } from "./app.js";

const env = loadEnv();

const server = createServer(async (req, res) => {
  try {
    const body = await readJsonBody(req);
    const appRes = await handleAppRequest({
      method: req.method || "GET",
      url: req.url || "/",
      body,
      headers: req.headers,
    });

    res.statusCode = appRes.status;
    for (const [name, value] of Object.entries(appRes.headers)) {
      res.setHeader(name, value);
    }
    res.end(appRes.body);
  } catch (error) {
    console.error("Errore proxy Pasto:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(env.PORT, env.HOST, () => {
  console.log(`Pasto proxy in ascolto su http://${env.HOST}:${env.PORT}`);
});

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return undefined;

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
