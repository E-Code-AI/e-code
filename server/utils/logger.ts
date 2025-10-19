// @ts-nocheck
/**
 * Logger utility for consistent logging across services
 */

import { logAggregator } from '../monitoring/log-aggregator';
import { config } from '../config/environment';

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

const recordAggregatedLog = (service: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, details: unknown[]) => {
  if (!config.monitoring.logAggregationEnabled) return;

  try {
    logAggregator.record({
      level,
      message,
      service,
      timestamp: Date.now(),
      details,
    });
  } catch (error) {
    console.error('[logger] Failed to record aggregated log', error);
  }
};

export function createLogger(service: string): Logger {
  return {
    info: (message: string, ...details: unknown[]) => {
      emitLog('log', buildMessage(service, 'INFO', message), details);
      recordAggregatedLog(service, 'info', message, details);
    },
    warn: (message: string, ...details: unknown[]) => {
      emitLog('warn', buildMessage(service, 'WARN', message), details);
      recordAggregatedLog(service, 'warn', message, details);
    },
    error: (message: string, ...details: unknown[]) => {
      emitLog('error', buildMessage(service, 'ERROR', message), details);
      recordAggregatedLog(service, 'error', message, details);
    },
    debug: (message: string, ...details: unknown[]) => {
      if (!process.env.DEBUG) {
        return;
      }

      emitLog('log', buildMessage(service, 'DEBUG', message), details);
      recordAggregatedLog(service, 'debug', message, details);
    }
  };
}
