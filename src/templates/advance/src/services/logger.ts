import { env } from "@/utils/env";
import { inspect } from "node:util";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMethod = (message: string, meta?: unknown) => void;

interface LoggerConfig {
  isProduction: boolean;
  logLevel: LogLevel;
  enableColors: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.blue,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
};

const LOG_LEVEL_EMOJIS: Record<LogLevel, string> = {
  debug: "🐛",
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
};

class Logger {
  private config: LoggerConfig;
  private context: string;

  constructor(context: string = "App", config?: Partial<LoggerConfig>) {
    this.context = context;
    this.config = {
      isProduction: env.NODE_ENV === "production",
      logLevel: env.LOG_LEVEL as LogLevel,
      enableColors: !this.isProduction,
      ...config,
    };
  }

  private get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    const contextStr = this.context ? `[${this.context}]` : "";

    if (this.isProduction) {
      const logObject: Record<string, unknown> = {
        timestamp,
        level: levelUpper,
        context: this.context,
        message,
      };

      if (meta) {
        logObject.meta = this.safeStringify(meta);
      }

      return JSON.stringify(logObject);
    }

    // Development formatting
    const color = this.config.enableColors ? LOG_LEVEL_COLORS[level] : "";
    const reset = this.config.enableColors ? COLORS.reset : "";
    const dim = this.config.enableColors ? COLORS.dim : "";
    const emoji = LOG_LEVEL_EMOJIS[level];

    let formattedMessage = `${dim}${timestamp}${reset} ${color}${levelUpper}${reset} ${emoji} ${color}${contextStr}${reset} ${message}`;

    if (meta) {
      formattedMessage += `\n${this.prettyPrint(meta)}`;
    }

    return formattedMessage;
  }

  // ...existing code...
  private safeStringify(obj: unknown): string {
    try {
      const serialized = JSON.stringify(obj);

      return serialized;
    } catch (error) {
      return `[Error stringifying: ${String(error)}]`;
    }
  }
  // ...existing code...

  private prettyPrint(obj: unknown): string {
    if (typeof obj === "string") return obj;

    const options = {
      colors: this.config.enableColors,
      depth: 5,
      maxArrayLength: 10,
      compact: false,
      breakLength: 80,
    };

    return inspect(obj, options);
  }

  protected logInternal(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    const logMethod: LogMethod =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "debug"
            ? console.debug
            : console.log;

    logMethod(formattedMessage);
  }

  public debug(message: string, meta?: unknown): void {
    this.logInternal("debug", message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.logInternal("info", message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.logInternal("warn", message, meta);
  }

  public error(message: string, meta?: unknown): void {
    this.logInternal("error", message, meta);
  }

  // Alias for console.log compatibility
  public log(message: string, meta?: unknown): void {
    this.info(message, meta);
  }

  public child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext, this.config);
  }
}

// Create default logger instance
export const logger = new Logger();

// For direct usage without importing the class
export const createLogger = (context: string) => new Logger(context);

// Usage examples:
// import { logger, createLogger } from './services/logger';
//
// // Basic usage
// logger.info('Server started');
// logger.error('Database connection failed', { error: err });
//
// // With context
// const dbLogger = createLogger('Database');
// dbLogger.info('Connected to database');
//
// // Child logger with extended context
// const userServiceLogger = dbLogger.child('UserService');
// userServiceLogger.debug('Fetching user', { userId: 123 });

// In production, you can control log level via environment variable:
// LOG_LEVEL=debug node app.js
// Available levels: debug, info, warn, error
