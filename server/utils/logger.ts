/**
 * Logger utility for consistent logging across services
 */

export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

export function createLogger(service: string): Logger {
  const prefix = `[${service}]`;

  return {
    info: (message: string) => {
      console.log(`[${new Date().toISOString()}] ${prefix} INFO: ${message}`);
    },
    warn: (message: string) => {
      console.warn(`[${new Date().toISOString()}] ${prefix} WARN: ${message}`);
    },
    error: (message: string) => {
      console.error(`[${new Date().toISOString()}] ${prefix} ERROR: ${message}`);
    },
    debug: (message: string) => {
      if (process.env.DEBUG) {
        console.log(`[${new Date().toISOString()}] ${prefix} DEBUG: ${message}`);
      }
    }
  };
}