import { buildApp } from "./app.js";
import { loadEnv } from "./env.js";

const env = loadEnv();

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Pasto backend in ascolto su http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
