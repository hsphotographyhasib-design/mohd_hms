import crypto from 'node:crypto';
import { db } from '@/lib/db';

// ============ CONSTANTS ============

export const RESET_TOKEN_TTL_MINUTES = 15;
export const OTP_TTL_MINUTES = 10;
export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_RESENDS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const RESET_REQUESTS_PER_HOUR = 5;
export const RESET_TOKEN_TTL_SECONDS = 10 * 60; // 10 min for the reset-token after OTP verified

// ============ RESET TOKEN SIGNING ============

/**
 * HMAC key derived from JWT secret to sign the reset token payload.
 * This prevents token forgery — an attacker cannot craft a valid
 * { oid, uid, exp } payload without knowing the secret.
 */
function getSigningKey(): Buffer {
  // Reuse the same secret resolution as auth.ts
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_PRIVATE_KEY ||
    '';
  // If no explicit secret, derive from DATABASE_URL for deterministic behavior
  if (secret.length >= 16) return Buffer.from(secret);
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'fallback-key-do-not-use';
  return crypto.createHash('sha256').update('reset-otp-hmac:' + dbUrl).digest();
}

export interface ResetTokenPayload {
  oid: string; // OTP record ID
  uid: string; // User ID
  exp: number; // Expiration timestamp (ms)
}

/**
 * Create an HMAC-signed reset token.
 * Format: base64url( JSON(payload) ) + '.' + base64url( HMAC-SHA256 )
 */
export function signResetToken(payload: ResetTokenPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, 'utf8');
  const sig = crypto.createHmac('sha256', getSigningKey()).update(data).digest();
  return data.toString('base64url') + '.' + sig.toString('base64url');
}

/**
 * Verify and decode an HMAC-signed reset token.
 * Returns null if the token is invalid, tampered, or expired.
 */
export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const dataB64 = token.slice(0, dotIdx);
    const sigB64 = token.slice(dotIdx + 1);
    const data = Buffer.from(dataB64, 'base64url');
    const sig = Buffer.from(sigB64, 'base64url');

    // Verify HMAC
    const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(data).digest();
    if (!crypto.timingSafeEqual(sig, expectedSig)) return null;

    // Parse payload
    const payload: ResetTokenPayload = JSON.parse(data.toString('utf8'));
    if (!payload.oid || !payload.uid || !payload.exp) return null;

    // Check expiration
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

// Common weak passwords (never allow)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'abc123', 'letmein', 'welcome', 'monkey',
  'master', 'dragon', 'login', 'princess', 'football', 'shadow',
  'sunshine', 'trustno1', 'iloveyou', '1q2w3e4r', 'admin', 'pass',
  'passw0rd', 'p@ssw0rd', 'changeme', '1234567', '12345678910',
  '000000', '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999',
]);

/* ------------------------------------------------------------------ */
/*  Token generation & hashing (legacy link-based reset)                */
/* ------------------------------------------------------------------ */

/** Cryptographically secure 32-byte token (URL-safe). */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 hash of a token (we only ever store the hash). */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/* ------------------------------------------------------------------ */
/*  OTP generation & hashing                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt for uniform distribution across 0–999999.
 */
export function generateOtp(): string {
  const otp = crypto.randomInt(0, 1_000_000);
  return otp.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hash an OTP code with SHA-256. Never store plaintext OTPs.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify an OTP code against its stored hash.
 */
export function verifyOtp(otp: string, otpHash: string): boolean {
  return constantTimeEqual(hashOtp(otp), otpHash);
}

/* ------------------------------------------------------------------ */
/*  Password strength validation                                       */
/* ------------------------------------------------------------------ */

export interface PasswordCheck {
  ok: boolean;
  errors: string[];
  score: number;       // 0-5 for UI meter
  strength: 'weak' | 'fair' | 'strong' | 'very-strong';
}

export interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];
  let passed = 0;

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      errors.push(rule.label);
    } else {
      passed++;
    }
  }

  // Check for common/weak passwords
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    errors.push('This password is too common. Choose a more unique password.');
    passed = Math.max(0, passed - 2);
  }

  // Check for sequential/repeated characters
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Avoid repeated characters (e.g., aaaa).');
  }
  if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Avoid sequential patterns (e.g., 123, abc).');
  }

  const score = Math.min(passed, 5);

  let strength: PasswordCheck['strength'] = 'weak';
  if (score >= 5) strength = 'very-strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'fair';

  return {
    ok: errors.length === 0,
    errors,
    score,
    strength,
  };
}

/* ------------------------------------------------------------------ */
/*  Request metadata extraction                                        */
/* ------------------------------------------------------------------ */

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
}

export function getRequestMeta(headers: Headers): RequestMeta {
  const xff = headers.get('x-forwarded-for') || '';
  const ipAddress =
    xff.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    null;
  const userAgent = headers.get('user-agent');

  let device: string | null = null;
  let browser: string | null = null;
  if (userAgent) {
    if (/mobile/i.test(userAgent)) device = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) device = 'tablet';
    else device = 'desktop';

    if (/edg\//i.test(userAgent)) browser = 'Edge';
    else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
    else if (/firefox/i.test(userAgent)) browser = 'Firefox';
    else browser = 'Other';
  }
  return { ipAddress, userAgent, device, browser };
}

/* ------------------------------------------------------------------ */
/*  Audit logging                                                       */
/* ------------------------------------------------------------------ */

export type AuthEvent =
  | 'password_reset_requested'
  | 'reset_email_sent'
  | 'reset_email_failed'
  | 'otp_generated'
  | 'otp_sent'
  | 'otp_send_failed'
  | 'otp_verified'
  | 'otp_failed'
  | 'otp_expired'
  | 'otp_locked'
  | 'otp_resend_blocked'
  | 'token_verified'
  | 'token_invalid'
  | 'token_expired'
  | 'token_already_used'
  | 'password_changed'
  | 'reset_failed'
  | 'rate_limited'
  | 'oauth_only_account'
  | 'sessions_revoked';

export async function auditAuth(opts: {
  event: AuthEvent;
  success?: boolean;
  tenantId?: string | null;
  userId?: string | null;
  email?: string | null;
  meta: RequestMeta;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.authAuditLog.create({
      data: {
        event: opts.event,
        success: opts.success ?? true,
        tenantId: opts.tenantId ?? null,
        userId: opts.userId ?? null,
        email: opts.email ?? null,
        ipAddress: opts.meta.ipAddress,
        userAgent: opts.meta.userAgent,
        device: opts.meta.device,
        browser: opts.meta.browser,
        metadata: opts.details ? JSON.stringify(opts.details) : null,
      },
    });
  } catch (err) {
    // Audit must never break the user-facing flow.
    console.error('[auditAuth] failed', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Rate limiting                                                       */
/*    Counts recent password_reset_requested events in the last hour,  */
/*    by user OR by IP.                                                 */
/* ------------------------------------------------------------------ */

const RATE_WINDOW_MS = 60 * 60 * 1000;

export interface RateCheck {
  blocked: boolean;
  remaining: number;
}

export async function checkResetRateLimit(opts: {
  email?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
}): Promise<RateCheck> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const orClauses: Array<Record<string, unknown>> = [];
  if (opts.userId) orClauses.push({ userId: opts.userId });
  if (opts.email) orClauses.push({ email: opts.email.toLowerCase() });
  if (opts.ipAddress) orClauses.push({ ipAddress: opts.ipAddress });
  if (orClauses.length === 0) return { blocked: false, remaining: RESET_REQUESTS_PER_HOUR };

  const count = await db.authAuditLog.count({
    where: {
      event: 'password_reset_requested',
      createdAt: { gte: since },
      OR: orClauses,
    },
  });
  const remaining = Math.max(0, RESET_REQUESTS_PER_HOUR - count);
  return { blocked: count >= RESET_REQUESTS_PER_HOUR, remaining };
}

/* ------------------------------------------------------------------ */
/*  OAuth-only account detection                                       */
/* ------------------------------------------------------------------ */

export type AccountAuthKind = 'password' | 'whatsapp' | 'google' | 'unknown';

export function classifyAccount(user: { passwordHash: string | null; phone?: string | null; email?: string | null }): AccountAuthKind {
  if (user.passwordHash && user.passwordHash.length > 0) return 'password';
  if (user.phone && (!user.email || user.email.length === 0 || user.email.startsWith('wa_'))) {
    return 'whatsapp';
  }
  if (user.email && user.email.length > 0) return 'google';
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/*  OTP cleanup — expire old OTPs                                      */
/* ------------------------------------------------------------------ */

export async function cleanupExpiredOtps(): Promise<void> {
  try {
    await db.passwordResetOtp.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
  } catch (err) {
    console.error('[cleanupExpiredOtps] failed', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Email masking for display                                          */
/* ------------------------------------------------------------------ */

export function maskEmail(email: string): string {
  return email.replace(/(^.)(.*)(@.*$)/, (_, a, b, c) => a + '\u2022'.repeat(Math.max(b.length, 1)) + c);
}