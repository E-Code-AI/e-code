/**
 * Structured Logging System
 * Fortune 500-grade centralized logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private userId?: string;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    this.sessionId = 'session_' + now + '_' + random;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, { ...context, error });
  }

  critical(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.CRITICAL, message, { ...context, error });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      const method = level >= LogLevel.ERROR ? 'error' : level >= LogLevel.WARN ? 'warn' : 'log';
      console[method]('[' + LogLevel[level] + '] ' + message, context);
    }

    if (level >= LogLevel.ERROR && process.env.NODE_ENV === 'production') {
      this.sendToBackend(entry);
    }
  }

  private async sendToBackend(entry: LogEntry) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (e) {}
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();
export default logger;
