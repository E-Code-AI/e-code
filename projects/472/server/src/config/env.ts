import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Server
  PORT: z
    .string()
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num) || num <= 0) {
        throw new Error("PORT must be a positive number");
      }
      return num;
    })
    .default("4000")
    .transform((val) => Number(val)),
  HOST: z.string().default("0.0.0.0"),

  // CORS / Origins
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    ),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT / Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000")
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num) || num <= 0) {
        throw new Error("RATE_LIMIT_WINDOW_MS must be a positive number");
      }
      return num;
    }),
  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num) || num <= 0) {
        throw new Error("RATE_LIMIT_MAX must be a positive number");
      }
      return num;
    }),

  // Logging
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),

  // Third-party APIs (examples)
  SENDGRID_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema>;

let cachedConfig: Readonly<Env> | null = null;

const loadEnv = (): Readonly<Env> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.errors
      .map((err) => `undefined: undefined`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:\n" + formatted);
    process.exit(1);
  }

  cachedConfig = Object.freeze(parsed.data);
  return cachedConfig;
};

export const env = loadEnv();