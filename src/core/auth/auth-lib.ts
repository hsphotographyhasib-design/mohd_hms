import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * JWT Secret resolution — NEVER throws at module level.
 *
 * Priority:
 *   1. Well-known env var names (JWT_SECRET, NEXTAUTH_SECRET, etc.)
 *   2. Scan all env vars for keys containing jwt/secret/signing (Vercel mohd_hms_ convention)
 *   3. Derive a deterministic secret from the database URL (SHA-256)
 *   4. Last resort: random bytes (tokens invalidate on server restart)
 */
function findDatabaseUrl(): string | null {
  const candidates = ['DATABASE_URL', 'PRISMA_DATABASE_URL', 'POSTGRES_URL'];
  for (const name of candidates) {
    const val = process.env[name];
    if (val && (val.startsWith('postgres://') || val.startsWith('postgresql://') || val.startsWith('file:'))) return val;
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (val && typeof val === 'string' && (val.startsWith('postgres://') || val.startsWith('postgresql://') || val.startsWith('file:'))) {
      return val;
    }
  }
  return null;
}

const _resolvedSecret = (() => {
  // 1. Well-known names
  const candidates = ['JWT_SECRET', 'NEXTAUTH_SECRET', 'JWT_PRIVATE_KEY'];
  for (const name of candidates) {
    const val = process.env[name];
    if (val && val.length >= 16) {
      console.log(`[AUTH] Found JWT secret in env: ${name}`);
      return { value: val, source: `env:${name}` };
    }
  }

  // 2. Scan ALL env vars for secret-like keys (Vercel mohd_hms_ convention)
  const sortedKeys = Object.keys(process.env).sort();
  for (const key of sortedKeys) {
    const val = process.env[key];
    if (!val || val.length < 16) continue;
    const k = key.toLowerCase();
    if (k.includes('jwt') || k.includes('secret') || k.includes('token_key') || k.includes('signing')) {
      if (val.startsWith('postgres://') || val.startsWith('http') || val.startsWith('{')) continue;
      console.log(`[AUTH] Found JWT secret in env (scan): ${key}`);
      return { value: val, source: `scan:${key}` };
    }
  }

  // 3. Derive a deterministic secret from the database URL (SHA-256)
  //    Same DB = same secret = tokens survive server restarts
  const dbUrl = findDatabaseUrl();
  if (dbUrl) {
    // Use a fixed prefix so the hash can never collide with a plaintext secret
    const derived = createHash('sha256')
      .update(`mohd-hms-jwt-derived:${dbUrl}`)
      .digest('hex');
    console.log('[AUTH] Derived JWT secret from database URL (deterministic, tokens survive restarts)');
    return { value: derived, source: 'derived:db-url' };
  }

  // 4. Absolute last resort: random bytes — tokens invalidate on every server restart
  console.warn(
    '[AUTH] WARNING: No JWT secret found and no database URL. Using random secret. ' +
    'Tokens will invalidate on server restart.'
  );
  return { value: randomBytes(32).toString('hex'), source: 'random-fallback' };
})();

const JWT_SECRET = _resolvedSecret.value;
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: object, expiresIn?: string | number): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn ?? JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Alias used by session routes */
export const generateSessionToken = generateToken;

/** JWT claims issued by this app (see login/session routes). */
export interface AppJwtPayload extends jwt.JwtPayload {
  userId?: string;
  tenantId?: string;
  role?: string;
  email?: string;
}

export function verifyToken(token: string): AppJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AppJwtPayload;
  } catch {
    return null;
  }
}

export function generateAssetNumber(category: string): string {
  const prefix: Record<string, string> = {
    HVAC: 'HVC',
    Electrical: 'ELC',
    Plumbing: 'PLB',
    Generator: 'GEN',
    Mechanical: 'MEC',
    FireProtection: 'FIR',
  };
  const p = prefix[category] || 'EQP';
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${p}-${ts}${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `INV/SMSB/01/${y}/${seq}`;
}

export function generatePONumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `PO-${y}${m}-${seq}`;
}

export function generateCustomerNumber(): string {
  const seq = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `CUST-${seq}`;
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// ============ WhatsApp OTP & Refresh Token Helpers ============

export function generateOtpCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export function generateRefreshToken(): string {
  return randomBytes(16).toString('hex');
}

const TEMP_TOKEN_EXPIRES_IN = '30m';

export function generateTempToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyTempToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Verify authentication from a Next.js request.
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and returns the decoded payload wrapped in an object.
 *
 * Usage:
 *   const auth = await verifyAuth(request);
 *   if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   // auth.user.id, auth.user.role, auth.user.tenantId, etc.
 */
export async function verifyAuth(request: NextRequest): Promise<{ user: jwt.JwtPayload } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return { user: payload };
}