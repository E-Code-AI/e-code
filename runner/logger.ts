/**
 * Simple logger for the Runner service.
 * Uses the same interface as the main platform's Winston logger
 * so runner/ files can be moved around without changing imports.
 */

export function createLogger(name: string) {
  const prefix = `[Runner:${name}]`;
  return {
    info: (msg: string, ...args: unknown[]) =>
      console.log(new Date().toISOString(), prefix, msg, ...args),
    warn: (msg: string, ...args: unknown[]) =>
      console.warn(new Date().toISOString(), prefix, 'WARN', msg, ...args),
    error: (msg: string, ...args: unknown[]) =>
      console.error(new Date().toISOString(), prefix, 'ERROR', msg, ...args),
    debug: (msg: string, ...args: unknown[]) => {
      if (process.env.RUNNER_DEBUG === 'true') {
        console.debug(new Date().toISOString(), prefix, 'DEBUG', msg, ...args);
      }
    },
  };
}
