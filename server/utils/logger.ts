/**
 * Logger utility with Winston for production-grade logging
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import { logAggregator } from '../monitoring/log-aggregator';
import { config } from '../config/environment';

type LogArguments = [message: string, ...details: unknown[]];

export interface Logger {
  info: (...args: LogArguments) => void;
  warn: (...args: LogArguments) => void;
  error: (...args: LogArguments) => void;
  debug: (...args: LogArguments) => void;
}

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'ecode-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      )
    }),
  ]
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  winstonLogger.add(new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  }));

  // Combined log file
  winstonLogger.add(new winston.transports.DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  }));
}

// Add performance monitoring
if (process.env.NODE_ENV === 'production' && process.env.LOG_PERFORMANCE === 'true') {
  winstonLogger.add(new winston.transports.DailyRotateFile({
    filename: 'logs/performance-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: '20m',
    maxFiles: '7d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

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
    winstonLogger.error('Failed to record aggregated log', error);
  }
};

export function createLogger(service: string): Logger {
  return {
    info: (message: string, ...details: unknown[]) => {
      winstonLogger.info(message, { service, details });
      recordAggregatedLog(service, 'info', message, details);
    },
    warn: (message: string, ...details: unknown[]) => {
      winstonLogger.warn(message, { service, details });
      recordAggregatedLog(service, 'warn', message, details);
    },
    error: (message: string, ...details: unknown[]) => {
      winstonLogger.error(message, { service, details });
      recordAggregatedLog(service, 'error', message, details);
    },
    debug: (message: string, ...details: unknown[]) => {
      if (process.env.DEBUG || winstonLogger.level === 'debug') {
        winstonLogger.debug(message, { service, details });
        recordAggregatedLog(service, 'debug', message, details);
      }
    }
  };
}

// Export the base Winston logger for direct use if needed
export { winstonLogger };

// Graceful shutdown for logger
export async function closeLogger(): Promise<void> {
  return new Promise((resolve) => {
    winstonLogger.on('finish', resolve);
    winstonLogger.end();
  });
}
