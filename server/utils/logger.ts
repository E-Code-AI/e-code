/**
 * Shared logger built on Pino.
 * Keeps the existing createLogger(service) API while removing Winston from
 * the hot path and preserving lightweight transport compatibility.
 */

import pino, { type LoggerOptions } from 'pino';
import { logAggregator } from '../monitoring/log-aggregator';
import { config } from '../config/environment';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogArguments = [message: string, ...details: unknown[]];

export interface Logger {
  info: (...args: LogArguments) => void;
  warn: (...args: LogArguments) => void;
  error: (...args: LogArguments) => void;
  debug: (...args: LogArguments) => void;
}

type TransportLike = {
  log?: (entry: Record<string, unknown>, callback: () => void) => void;
};

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'creditCard',
  'credit_card',
  'ssn',
  'socialSecurityNumber',
  'private_key',
  'privateKey',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
];

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /sk-[A-Za-z0-9]{24,}/g,
  /sk_live_[A-Za-z0-9]+/g,
  /sk_test_[A-Za-z0-9]+/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 10) return '[DEPTH_LIMIT]';

  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const keyLower = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((field) => keyLower.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(nested, depth + 1);
      }
    }
    return sanitized;
  }

  return value;
}

const isProduction = process.env.NODE_ENV === 'production';
const transportSubscribers = new Set<TransportLike>();

const pinoOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'ecode-platform',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
    log(object) {
      return sanitizeValue(object) as Record<string, unknown>;
    },
  },
  hooks: {
    logMethod(args, method, level) {
      if (typeof args[0] === 'string') {
        args[0] = sanitizeValue(args[0]) as string;
      }
      if (args.length > 1) {
        for (let index = 1; index < args.length; index += 1) {
          args[index] = sanitizeValue(args[index]);
        }
      }
      method.apply(this, args as Parameters<typeof method>);
      const payload = buildTransportEntry(level, args);
      notifyTransports(payload);
    },
  },
};

const destination = pino.destination(1);
const rootLogger = pino(pinoOptions, destination);

function buildTransportEntry(level: number, args: unknown[]): Record<string, unknown> {
  const message = typeof args[0] === 'string' ? String(args[0]) : '';
  const detailArgs =
    typeof args[0] === 'string'
      ? args.slice(1)
      : args.length > 0
        ? args
        : [];
  const context =
    typeof args[0] === 'string' && args[1] && typeof args[1] === 'object' && !Array.isArray(args[1])
      ? (sanitizeValue(args[1]) as Record<string, unknown>)
      : {};

  return {
    level: rootLogger.levels.labels[level] || 'info',
    message,
    timestamp: new Date().toISOString(),
    ...context,
    details: sanitizeValue(detailArgs),
  };
}

function notifyTransports(entry: Record<string, unknown>) {
  for (const subscriber of transportSubscribers) {
    try {
      subscriber.log?.(entry, () => {});
    } catch {
      // Ignore transport-side failures to keep request paths hot.
    }
  }
}

function recordAggregatedLog(service: string, level: LogLevel, message: string, details: unknown[]) {
  if (!config.monitoring.logAggregationEnabled) return;

  try {
    logAggregator.record({
      level,
      message,
      service,
      timestamp: Date.now(),
      details: sanitizeValue(details) as unknown[],
    });
  } catch (error) {
    rootLogger.error({ service, err: sanitizeValue(error) }, 'Failed to record aggregated log');
  }
}

function emit(level: LogLevel, service: string, message: string, details: unknown[]) {
  const sanitizedDetails = sanitizeValue(details) as unknown[];
  const payload: Record<string, unknown> = { service };

  if (sanitizedDetails.length === 1 && sanitizedDetails[0] && typeof sanitizedDetails[0] === 'object' && !Array.isArray(sanitizedDetails[0])) {
    Object.assign(payload, sanitizedDetails[0] as Record<string, unknown>);
  } else if (sanitizedDetails.length > 0) {
    payload.details = sanitizedDetails;
  }

  rootLogger[level](payload, sanitizeValue(message) as string);
  recordAggregatedLog(service, level, message, details);
}

function patchConsoleForProduction() {
  if (!isProduction) return;

  const consoleLogger = rootLogger.child({ service: 'console' });
  console.log = (...args: unknown[]) => {
    consoleLogger.info({ details: sanitizeValue(args) }, 'console.log');
  };
  console.info = (...args: unknown[]) => {
    consoleLogger.info({ details: sanitizeValue(args) }, 'console.info');
  };
  console.warn = (...args: unknown[]) => {
    consoleLogger.warn({ details: sanitizeValue(args) }, 'console.warn');
  };
  console.error = (...args: unknown[]) => {
    consoleLogger.error({ details: sanitizeValue(args) }, 'console.error');
  };
  console.debug = (...args: unknown[]) => {
    consoleLogger.debug({ details: sanitizeValue(args) }, 'console.debug');
  };
}

patchConsoleForProduction();

export function createLogger(service: string): Logger {
  return {
    info: (message: string, ...details: unknown[]) => emit('info', service, message, details),
    warn: (message: string, ...details: unknown[]) => emit('warn', service, message, details),
    error: (message: string, ...details: unknown[]) => emit('error', service, message, details),
    debug: (message: string, ...details: unknown[]) => {
      if (process.env.DEBUG || rootLogger.level === 'debug') {
        emit('debug', service, message, details);
      }
    },
  };
}

export const logger = createLogger('server');

export const winstonLogger = {
  add(transport: TransportLike) {
    transportSubscribers.add(transport);
  },
  remove(transport: TransportLike) {
    transportSubscribers.delete(transport);
  },
  info(message: string, meta?: Record<string, unknown>) {
    rootLogger.info(sanitizeValue(meta || {}) as Record<string, unknown>, sanitizeValue(message) as string);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    rootLogger.warn(sanitizeValue(meta || {}) as Record<string, unknown>, sanitizeValue(message) as string);
  },
  error(message: string, meta?: Record<string, unknown>) {
    rootLogger.error(sanitizeValue(meta || {}) as Record<string, unknown>, sanitizeValue(message) as string);
  },
  debug(message: string, meta?: Record<string, unknown>) {
    rootLogger.debug(sanitizeValue(meta || {}) as Record<string, unknown>, sanitizeValue(message) as string);
  },
  get level() {
    return rootLogger.level;
  },
  on(event: string, callback: () => void) {
    if (event === 'finish') {
      destination.on('finish', callback);
    }
  },
  end() {
    destination.end();
  },
};

export async function closeLogger(): Promise<void> {
  return new Promise((resolve) => {
    destination.on('finish', resolve);
    destination.end();
  });
}

export { rootLogger };
