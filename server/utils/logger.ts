export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export function createLogger(name: string): Logger {
  const timestamp = () => new Date().toISOString();
  
  return {
    info(message: string, ...args: any[]): void {
      console.log(`[${timestamp()}] [${name}] INFO: ${message}`, ...args);
    },
    
    error(message: string, ...args: any[]): void {
      console.error(`[${timestamp()}] [${name}] ERROR: ${message}`, ...args);
    },
    
    warn(message: string, ...args: any[]): void {
      console.warn(`[${timestamp()}] [${name}] WARN: ${message}`, ...args);
    },
    
    debug(message: string, ...args: any[]): void {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${timestamp()}] [${name}] DEBUG: ${message}`, ...args);
      }
    }
  };
}