import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "test" | "production";

interface AppConfig {
  env: NodeEnv;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
  port: number;
  host: string;
  baseUrl: string;
}

interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  ssl: boolean;
}

interface JwtConfig {
  accessTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
}

interface SecurityConfig {
  corsOrigin: string | RegExp | (string | RegExp)[];
  corsCredentials: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

interface LoggerConfig {
  level: "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";
  prettyPrint: boolean;
}

export interface EnvConfig {
  app: AppConfig;
  db: DatabaseConfig;
  jwt: JwtConfig;
  security: SecurityConfig;
  logger: LoggerConfig;
}

const required = (value: string | undefined, name: string): string => {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: undefined`);
  }
  return value;
};

const parseNumber = (
  value: string | undefined,
  name: string,
  defaultValue?: number
): number => {
  if (value === undefined || value === "") {
    if (defaultValue === undefined) {
      throw new Error(`Missing required numeric environment variable: undefined`);
    }
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for undefined: "undefined"`);
  }
  return parsed;
};

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean
): boolean => {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const normalized = value.toLowerCase().trim();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return defaultValue;
};

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  const env = (value || "development").toLowerCase().trim();
  if (env === "development" || env === "test" || env === "production") {
    return env;
  }
  throw new Error(
    `Invalid NODE_ENV value: "undefined". Expected "development", "test", or "production".`
  );
};

const parseCorsOrigin = (
  value: string | undefined,
  defaultValue: string | RegExp | (string | RegExp)[]
): string | RegExp | (string | RegExp)[] => {
  if (!value) return defaultValue;

  if (value === "*") return "*";

  const parts = value.split(",").map((v) => v.trim()).filter(Boolean);
  if (parts.length === 0) return defaultValue;

  return parts.map((origin) => {
    if (origin.startsWith("/") && origin.endsWith("/")) {
      const pattern = origin.slice(1, -1);
      return new RegExp(pattern);
    }
    return origin;
  });
};

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);

const app: AppConfig = {
  env: nodeEnv,
  isDev: nodeEnv === "development",
  isProd: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: parseNumber(process.env.PORT, "PORT", 4000),
  host: process.env.HOST || "0.0.0.0",
  baseUrl: process.env.BASE_URL || "http://localhost:4000",
};

const db: DatabaseConfig = {
  url: required(process.env.DATABASE_URL, "DATABASE_URL"),
  poolMin: parseNumber(process.env.DB_POOL_MIN, "DB_POOL_MIN", 2),
  poolMax: parseNumber(process.env.DB_POOL_MAX, "DB_POOL_MAX", 10),
  ssl: parseBoolean(process.env.DB_SSL, app.isProd),
};

const jwt: JwtConfig = {
  accessTokenSecret: required(
    process.env.JWT_ACCESS_TOKEN_SECRET,
    "JWT_ACCESS_TOKEN_SECRET"
  ),
  accessTokenExpiresIn:
    process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenSecret: required(
    process.env.JWT_REFRESH_TOKEN_SECRET,
    "JWT_REFRESH_TOKEN_SECRET"
  ),
  refreshTokenExpiresIn:
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
};

const security: SecurityConfig = {
  corsOrigin: parseCorsOrigin(
    process.env.CORS_ORIGIN,
    app.isProd ? [] : "*"
  ),
  corsCredentials: parseBoolean(
    process.env.CORS_CREDENTIALS,
    true
  ),
  rateLimitWindowMs: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    "RATE_LIMIT_WINDOW_MS",
    15 * 60 * 1000
  ),
  rateLimitMax: parseNumber(
    process.env.RATE_LIMIT_MAX,
    "RATE_LIMIT_MAX",
    100
  ),
};

const logger: LoggerConfig = {
  level:
    (process.env.LOG_LEVEL as LoggerConfig["level"]) ||
    (app.isProd ? "info" : "debug"),
  prettyPrint: parseBoolean(
    process.env.LOG_PRETTY_PRINT,
    !app.isProd
  ),
};

export const env: EnvConfig = {
  app,
  db,
  jwt,
  security,
  logger,
};

export default env;