import fs from 'fs';
import path from 'path';
import winston, {
  format,
  transports,
  Logger as WinstonLogger,
  LoggerOptions,
} from 'winston';

const { combine, timestamp, printf, colorize, json, errors, splat, metadata } =
  format;

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogMeta {
  [key: string]: unknown;
}

export interface LoggerStream {
  write: (message: string) => void;
}

export interface Logger extends WinstonLogger {
  stream: LoggerStream;
}

const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
const LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  json()
);

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp(),
  errors({ stack: true }),
  splat(),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  printf((info) => {
    const { timestamp: ts, level, message, stack, metadata: meta } = info as any;
    const base = `undefined [undefined]: undefined`;
    const metaKeys = meta && Object.keys(meta).length > 0 ? meta : null;
    return metaKeys ? `undefined undefined` : base;
  })
);

const loggerOptions: LoggerOptions = {
  level: LOG_LEVEL,
  exitOnError: false,
  transports: [
    new transports.Console({
      level: LOG_LEVEL,
      handleExceptions: true,
      format: consoleFormat,
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      handleExceptions: true,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: fileFormat,
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      level: LOG_LEVEL,
      handleExceptions: true,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
      format: fileFormat,
    }),
  ],
};

if (!IS_PROD) {
  loggerOptions.transports?.push(
    new transports.File({
      filename: path.join(LOG_DIR, 'debug.log'),
      level: 'debug',
      handleExceptions: true,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: fileFormat,
    })
  );
}

const baseLogger: Logger = winston.createLogger(loggerOptions) as Logger;

baseLogger.stream = {
  write: (message: string): void => {
    baseLogger.http(message.trim());
  },
};

export const logger: Logger = baseLogger;

export const logInfo = (message: string, meta?: LogMeta): void => {
  if (meta) {
    logger.info(message, meta);
  } else {
    logger.info(message);
  }
};

export const logError = (error: Error | string, meta?: LogMeta): void => {
  if (error instanceof Error) {
    const baseMeta: LogMeta = { ...(meta || {}), name: error.name };
    logger.error(error.message, { ...baseMeta, stack: error.stack });
  } else {
    if (meta) {
      logger.error(error, meta);
    } else {
      logger.error(error);
    }
  }
};

export const logWarn = (message: string, meta?: LogMeta): void => {
  if (meta) {
    logger.warn(message, meta);
  } else {
    logger.warn(message);
  }
};

export const logDebug = (message: string, meta?: LogMeta): void => {
  if (meta) {
    logger.debug(message, meta);
  } else {
    logger.debug(message);
  }
};

export const logHttp = (message: string, meta?: LogMeta): void => {
  if (meta) {
    logger.http(message, meta);
  } else {
    logger.http(message);
  }
};

export const createChildLogger = (context: string, defaultMeta?: LogMeta): Logger => {
  const child = logger.child({
    context,
    ...(defaultMeta || {}),
  }) as Logger;

  child.stream = logger.stream;

  return child;
};

export default logger;