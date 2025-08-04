export function createLogger(service: string) {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[${new Date().toISOString()}] [${service}] INFO: ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${new Date().toISOString()}] [${service}] WARN: ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${new Date().toISOString()}] [${service}] ERROR: ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.DEBUG) {
        console.debug(`[${new Date().toISOString()}] [${service}] DEBUG: ${message}`, ...args);
      }
    }
  };
}