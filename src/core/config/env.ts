/**
 * Centralized Environment Variable Configuration
 *
 * All server-side code MUST import from this file instead of reading
 * process.env directly. This provides:
 *   - Single source of truth for all configuration
 *   - Runtime validation with clear error messages
 *   - Production safety warnings
 *   - Consistent defaults
 */

import path from 'path';

// ─── Helpers ────────────────────────────────────────────────────

function required(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Set it in your .env file or deployment environment.`
    );
  }
  return val.trim();
}

function str(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return ['true', '1', 'yes'].includes(raw.toLowerCase());
}

// ─── Parsed Environment ────────────────────────────────────────

export const env = {
  // ── Application ──────────────────────────────────────────────
  /** 'development' | 'production' | 'test' — set automatically by Next.js */
  nodeEnv: str('NODE_ENV', 'development'),
  /** Public URL of the application (used for webhooks, QR codes, email links) */
  appUrl: str('APP_URL', 'http://localhost:3000'),
  /** Convenience flags */
  get isDev() { return this.nodeEnv !== 'production'; },
  get isProd() { return this.nodeEnv === 'production'; },

  // ── Database ─────────────────────────────────────────────────
  /** Prisma connection string. REQUIRED — app will not start without it. */
  databaseUrl: required('DATABASE_URL'),

  // ── Authentication ───────────────────────────────────────────
  /** Secret key for signing JWT tokens. CHANGE IN PRODUCTION! */
  jwtSecret: str('JWT_SECRET', 'cmms-enterprise-secret-key-2024'),
  /** JWT token expiration (e.g. '7d', '24h', '1h'). */
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),

  // ── File Storage ─────────────────────────────────────────────
  /** Root directory for uploaded files. Relative to CWD if not absolute. */
  get storageRoot(): string {
    const raw = str('STORAGE_ROOT', '');
    if (raw && path.isAbsolute(raw)) return raw;
    if (raw) return path.resolve(process.cwd(), raw);
    return path.join(process.cwd(), 'storage');
  },
  /** Maximum upload file size in bytes (default: 100 MB). */
  maxFileSize: num('MAX_FILE_SIZE', 100 * 1024 * 1024),

  // ── WhatsApp Service ─────────────────────────────────────────
  /** Enable WhatsApp integration (requires Chrome + Xvfb — VPS only). */
  whatsappEnabled: bool('WHATSAPP_ENABLED', false),
  /** Port for the WhatsApp mini-service. */
  whatsappPort: num('WHATSAPP_PORT', 3001),
  /** Path to Chrome/Chromium binary. */
  chromePath: str('CHROME_PATH', ''),

  // ── Logging ──────────────────────────────────────────────────
  /** Log level: 'error' | 'warn' | 'info' | 'debug' */
  logLevel: str('LOG_LEVEL', 'info'),
} as const;

export type Env = typeof env;

// ─── Startup Validation Warnings ───────────────────────────────
// These run once when the module is first imported (server-side only).

if (env.isProd) {
  if (env.jwtSecret === 'cmms-enterprise-secret-key-2024') {
    console.warn(
      '\x1b[33m⚠️  [env] WARNING: Using default JWT_SECRET in production!\x1b[0m\n' +
      '   Set a secure random string: openssl rand -hex 32\n'
    );
  }

  if (env.appUrl === 'http://localhost:3000') {
    console.warn(
      '\x1b[33m⚠️  [env] WARNING: APP_URL is set to localhost in production.\x1b[0m\n' +
      '   Set it to your public domain: APP_URL=https://your-domain.com\n'
    );
  }

  if (env.maxFileSize <= 0) {
    console.warn(
      '\x1b[33m⚠️  [env] WARNING: MAX_FILE_SIZE is invalid, falling back to 100MB.\x1b[0m'
    );
  }
}