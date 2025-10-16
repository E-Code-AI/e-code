/**
 * Logger utility for consistent logging across services
 */

type LogArguments = [message: string, ...details: unknown[]];

export interface Logger {
  info: (...args: LogArguments) => void;
  warn: (...args: LogArguments) => void;
  error: (...args: LogArguments) => void;
  debug: (...args: LogArguments) => void;
}

type ConsoleMethod = 'log' | 'warn' | 'error';

const buildMessage = (service: string, level: string, message: string): string => {
  return `[${new Date().toISOString()}] [${service}] ${level}: ${message}`;
};

const emitLog = (method: ConsoleMethod, formatted: string, details: unknown[]): void => {
  if (details.length === 0) {
    console[method](formatted);
    return;
  }

  console[method](formatted, ...details);
};

export function createLogger(service: string): Logger {
  return {
    info: (message: string, ...details: unknown[]) => {
      emitLog('log', buildMessage(service, 'INFO', message), details);
    },
    warn: (message: string, ...details: unknown[]) => {
      emitLog('warn', buildMessage(service, 'WARN', message), details);
    },
    error: (message: string, ...details: unknown[]) => {
      emitLog('error', buildMessage(service, 'ERROR', message), details);
    },
    debug: (message: string, ...details: unknown[]) => {
      if (!process.env.DEBUG) {
        return;
      }

      emitLog('log', buildMessage(service, 'DEBUG', message), details);
    }
  };
}

