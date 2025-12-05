import fs from "fs";
import path from "path";
import { createLogger, format, transports, Logger } from "winston";

const {
  combine,
  timestamp,
  printf,
  colorize,
  json,
  splat,
  errors,
  metadata,
} = format;

type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

interface LoggerConfig {
  level: LogLevel;
  env: string;
  logDir: string;
  enableConsole: boolean;
  enableFile: boolean;
}

const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";

const config: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || (isProduction ? "info" : "debug"),
  env,
  logDir: process.env.LOG_DIR || path.resolve(process.cwd(), "logs"),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== "false",
  enableFile: process.env.LOG_ENABLE_FILE === "true" || isProduction,
};

if (config.enableFile) {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  splat(),
  errors({ stack: true }),
  metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
  printf((info) => {
    const { timestamp: ts, level, message, stack, metadata: meta } = info as any;
    const base = `undefined [undefined]`;
    const context = meta && Object.keys(meta).length ? ` undefined` : "";
    if (stack) {
      return `undefined undefinedundefined\nundefined`;
    }
    return `undefined undefinedundefined`;
  })
);

const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  splat(),
  errors({ stack: true }),
  metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
  json()
);

const loggerTransports: transports.StreamTransportInstance[] = [];

if (config.enableConsole) {
  loggerTransports.push(
    new transports.Console({
      level: config.level,
      handleExceptions: true,
      format: consoleFormat,
    })
  );
}

if (config.enableFile) {
  loggerTransports.push(
    new transports.File({
      filename: path.join(config.logDir, "app.log"),
      level: config.level,
      handleExceptions: true,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: fileFormat,
    })
  );

  loggerTransports.push(
    new transports.File({
      filename: path.join(config.logDir, "error.log"),
      level: "error",
      handleExceptions: true,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: fileFormat,
    })
  );
}

const baseLogger: Logger = createLogger({
  level: config.level,
  transports: loggerTransports,
  exitOnError: false,
});

export interface StructuredLogMeta {
  [key: string]: unknown;
}

export interface StructuredLogger {
  error(message: string, meta?: StructuredLogMeta | Error): void;
  warn(message: string, meta?: StructuredLogMeta): void;
  info(message: string, meta?: StructuredLogMeta): void;
  http(message: string, meta?: StructuredLogMeta): void;
  verbose(message: string, meta?: StructuredLogMeta): void;
  debug(message: string, meta?: StructuredLogMeta): void;
  silly(message: string, meta?: StructuredLogMeta): void;
  child(bindings: StructuredLogMeta): StructuredLogger;
}

const normalizeMeta = (
  message: string,
  metaOrError?: StructuredLogMeta | Error
): { message: string; meta?: StructuredLogMeta } => {
  if (!metaOrError) {
    return { message };
  }

  if (metaOrError instanceof Error) {
    const errorMeta: StructuredLogMeta = {
      errorName: metaOrError.name,
      errorMessage: metaOrError.message,
      errorStack: metaOrError.stack,
    };
    return { message, meta: errorMeta };
  }

  return { message, meta: metaOrError };
};

const wrapLogger = (loggerInstance: Logger): StructuredLogger => {
  const logWithLevel =
    (level: LogLevel) =>
    (message: string, metaOrError?: StructuredLogMeta | Error): void => {
      const { message: msg, meta } = normalizeMeta(message, metaOrError);
      if (meta) {
        loggerInstance.log(level, msg, meta);
      } else {
        loggerInstance.log(level, msg);
      }
    };

  return {
    error: logWithLevel("error"),
    warn: logWithLevel("warn"),
    info: logWithLevel("info"),
    http: logWithLevel("http"),
    verbose: logWithLevel("verbose"),
    debug: logWithLevel("debug"),
    silly: logWithLevel("silly"),
    child(bindings: StructuredLogMeta): StructuredLogger {
      const childLogger = baseLogger.child(bindings);
      return wrapLogger(childLogger);
    },
  };
};

export const logger: StructuredLogger = wrapLogger(baseLogger);

export const createModuleLogger = (moduleName: string): StructuredLogger => {
  return logger.child({ module: moduleName });
};

export default logger;