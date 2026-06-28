import crypto from 'crypto';
import { db } from '@/lib/db';

export const RESET_TOKEN_TTL_MINUTES = 15;
export const RESET_REQUESTS_PER_HOUR = 5;

/* ------------------------------------------------------------------ */
/*  Token generation & hashing                                         */
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
/*  Password strength validation                                       */
/* ------------------------------------------------------------------ */

export interface PasswordCheck {
  ok: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];
  if (typeof password !== 'string' || password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/\d/.test(password)) errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
  return { ok: errors.length === 0, errors };
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
    else if (/chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
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
  | 'token_verified'
  | 'token_invalid'
  | 'token_expired'
  | 'token_already_used'
  | 'password_changed'
  | 'reset_failed'
  | 'rate_limited'
  | 'oauth_only_account';

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
/*    Counts recent password_reset_requested events (and rate_limited   */
/*    triggers) in the last hour, by user OR by IP.                     */
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
/*    A user has no passwordHash AND has WhatsApp/Google linkage.       */
/*    We rely on passwordHash being null + heuristics on the user row.  */
/* ------------------------------------------------------------------ */

export type AccountAuthKind = 'password' | 'whatsapp' | 'google' | 'unknown';

export function classifyAccount(user: { passwordHash: string | null; phone?: string | null; email?: string | null }): AccountAuthKind {
  if (user.passwordHash && user.passwordHash.length > 0) return 'password';
  // No password — distinguish providers.
  // WhatsApp accounts always have a phone number and either no email or an empty one.
  if (user.phone && (!user.email || user.email.length === 0 || user.email.startsWith('wa_'))) {
    return 'whatsapp';
  }
  // Otherwise assume social/google-only.
  if (user.email && user.email.length > 0) return 'google';
  return 'unknown';
}
