import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("127.0.0.1"),
  CORS_ORIGIN: z.string().default("*"),
  LLM_PROVIDER: z.enum(["stub", "anthropic"]).default("stub"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OFF_USER_AGENT: z.string().default("Pasto/0.1 (contact@example.com)"),
  DEFAULT_USER_ID: z.string().default("default-user"),
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
