const PREFIX = '[provider-ui]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  spId?: string;
  page?: string;
  action?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: `${PREFIX} ${message}`,
    ...context,
  };
  return entry;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (!shouldLog('debug')) return;
    console.debug(formatEntry('debug', message, context));
  },

  info(message: string, context?: LogContext) {
    if (!shouldLog('info')) return;
    console.info(formatEntry('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    if (!shouldLog('warn')) return;
    console.warn(formatEntry('warn', message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    if (!shouldLog('error')) return;
    const entry = formatEntry('error', message, context);
    if (error instanceof Error) {
      console.error(entry, { errorName: error.name, errorMessage: error.message, stack: error.stack });
    } else {
      console.error(entry, error);
    }
  },

  /** Convenience: log a user action */
  action(action: string, context?: LogContext) {
    this.info(action, { ...context, action });
  },

  /** Log with full args pass-through (backward-compatible) */
  log: (...args: unknown[]) => console.log(PREFIX, ...args),
};
