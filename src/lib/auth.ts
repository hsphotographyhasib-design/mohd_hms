import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * JWT Secret resolution — NEVER throws at module level.
 *
 * Scans well-known names first, then all env vars (including mohd_hms_ prefixed)
 * for any value that looks like a JWT secret (16+ chars, not a URL/JSON).
 * Falls back to a placeholder so the server can start.
 */
const _resolvedSecret = (() => {
  // 1. Well-known names
  const candidates = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'JWT_PRIVATE_KEY',
  ];
  for (const name of candidates) {
    const val = process.env[name];
    if (val && val.length >= 16) {
      console.log(`[AUTH] Found JWT secret in env: ${name}`);
      return { value: val, insecure: false };
    }
  }

  // 2. Scan ALL env vars for mohd_hms_ prefixed secrets (Vercel convention)
  const sortedKeys = Object.keys(process.env).sort();
  for (const key of sortedKeys) {
    const val = process.env[key];
    if (!val || val.length < 16) continue;
    // Match common secret naming patterns (case-insensitive)
    const k = key.toLowerCase();
    if (
      k.includes('jwt') ||
      k.includes('secret') ||
      k.includes('token_key') ||
      k.includes('signing')
    ) {
      // Skip obviously non-secret values
      if (val.startsWith('postgres://') || val.startsWith('http') || val.startsWith('{')) continue;
      console.log(`[AUTH] Found JWT secret in env (scan): ${key}`);
      return { value: val, insecure: false };
    }
  }

  // 3. Fallback placeholder — server starts but auth ops fail gracefully
  console.warn(
    '[AUTH] WARNING: No JWT secret found in any environment variable. ' +
    'Auth token operations will fail until a proper secret is configured.'
  );
  return { value: '__insecure_jwt_placeholder_set_jwt_secret__', insecure: true };
})();

const JWT_SECRET = _resolvedSecret.value;
const _jwtInsecure = _resolvedSecret.insecure;
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: object): string {
  if (_jwtInsecure) {
    console.error('[AUTH] generateToken called but JWT_SECRET is not configured. Refusing to sign token.');
    return '';
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  if (_jwtInsecure) {
    console.error('[AUTH] verifyToken called but JWT_SECRET is not configured. Refusing to verify token.');
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
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
  return crypto.randomBytes(16).toString('hex');
}

const TEMP_TOKEN_EXPIRES_IN = '30m';

export function generateTempToken(payload: object): string {
  if (_jwtInsecure) {
    console.error('[AUTH] generateTempToken called but JWT_SECRET is not configured. Refusing to sign token.');
    return '';
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyTempToken(token: string): jwt.JwtPayload | null {
  if (_jwtInsecure) {
    console.error('[AUTH] verifyTempToken called but JWT_SECRET is not configured. Refusing to verify token.');
    return null;
  }
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