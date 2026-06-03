import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("127.0.0.1"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  OFF_USER_AGENT: z.string().default("eat/0.1 (contact@example.com)"),
  LLM_PROVIDER: z.string().default("stub"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Env invalide:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
