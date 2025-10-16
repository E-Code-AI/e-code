/**
 * Logger utility for consistent logging across services
 */

export interface Logger {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
  debug: (message: string, details?: unknown) => void;
}

function formatDetails(details?: unknown): string {
  if (details === undefined) return "";
  if (details instanceof Error) {
    const stack = details.stack ?? details.message;
    return `\n${stack}`;
  }

  try {
    return `\n${JSON.stringify(details, null, 2)}`;
  } catch {
    return `\n${String(details)}`;
  }
}

export function createLogger(service: string): Logger {
  const prefix = `[${service}]`;

  return {
    info: (message: string, details?: unknown) => {
      console.log(
        `[${new Date().toISOString()}] ${prefix} INFO: ${message}${formatDetails(details)}`
      );
    },
    warn: (message: string, details?: unknown) => {
      console.warn(
        `[${new Date().toISOString()}] ${prefix} WARN: ${message}${formatDetails(details)}`
      );
    },
    error: (message: string, details?: unknown) => {
      console.error(
        `[${new Date().toISOString()}] ${prefix} ERROR: ${message}${formatDetails(details)}`
      );
    },
    debug: (message: string, details?: unknown) => {
      if (process.env.DEBUG) {
        console.log(
          `[${new Date().toISOString()}] ${prefix} DEBUG: ${message}${formatDetails(details)}`
        );
      }
    }
  };
}