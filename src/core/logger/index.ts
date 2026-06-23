import { env } from '@/core/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 99,
};

function resolveLevel(): LogLevel {
  const raw = (env.logLevel || 'debug').toLowerCase() as LogLevel;
  return LEVEL_PRIORITY[raw] !== undefined ? raw : 'debug';
}

const currentLevel = resolveLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, args: unknown[]): string {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const rest = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  return `${prefix} ${rest}`;
}

export const logger = {
  debug(...args: unknown[]) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', args));
  },
  info(...args: unknown[]) {
    if (shouldLog('info')) console.info(formatMessage('info', args));
  },
  warn(...args: unknown[]) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', args));
  },
  error(...args: unknown[]) {
    if (shouldLog('error')) console.error(formatMessage('error', args));
  },
  child(_label: string) {
    // Returns the same logger for now; can be extended with prefix support
    return logger;
  },
};