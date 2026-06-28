import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import {
  RESET_TOKEN_TTL_MINUTES,
  auditAuth,
  checkResetRateLimit,
  classifyAccount,
  generateResetToken,
  getRequestMeta,
  hashResetToken,
} from '@/lib/password-reset';
import { renderResetEmail, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const GENERIC_OK = {
  ok: true,
  message:
    'If an account exists with this email, a password reset link has been sent.',
};

function appBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  // Fall back to request origin (works in serverless/dev).
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const meta = getRequestMeta(req.headers);
  let emailRaw = '';
  try {
    const body = await req.json();
    emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail) {
    // Always respond with the same generic message — never reveal validation
    // outcomes that leak existence info. But we DO short-circuit for clearly
    // malformed input to avoid wasted DB hits.
    return NextResponse.json(GENERIC_OK);
  }

  // Look up the user (any tenant — email is unique per tenant, we pick the
  // most recently created match if multiple exist).
  const user = await withRetry(
    () =>
      db.user.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          tenantId: true,
          isActive: true,
          passwordHash: true,
        },
      }),
    { label: 'forgot-password-findUser' }
  );

  // Rate-limit BEFORE doing any work, by email + IP.
  const rate = await checkResetRateLimit({
    email,
    userId: user?.id ?? null,
    ipAddress: meta.ipAddress,
  });
  if (rate.blocked) {
    await auditAuth({
      event: 'rate_limited',
      success: false,
      tenantId: user?.tenantId ?? null,
      userId: user?.id ?? null,
      email,
      meta,
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          'Too many reset requests. Please try again later.',
      },
      { status: 429 }
    );
  }

  // Always log the request attempt (even for unknown emails) so the rate
  // limit applies to enumeration attempts.
  await auditAuth({
    event: 'password_reset_requested',
    tenantId: user?.tenantId ?? null,
    userId: user?.id ?? null,
    email,
    meta,
  });

  if (!user || !user.isActive) {
    // Don't reveal existence.
    return NextResponse.json(GENERIC_OK);
  }

  // OAuth-only accounts can't reset a password.
  const kind = classifyAccount(user);
  if (kind === 'whatsapp' || kind === 'google') {
    await auditAuth({
      event: 'oauth_only_account',
      success: false,
      tenantId: user.tenantId,
      userId: user.id,
      email,
      meta,
      details: { provider: kind },
    });
    return NextResponse.json({
      ok: false,
      code: 'oauth_only',
      provider: kind,
      message:
        kind === 'whatsapp'
          ? 'This account uses WhatsApp Login.\nPlease continue with WhatsApp to access your account.'
          : 'This account uses Google Sign-In.\nPlease continue with Google to access your account.',
    });
  }

  // Generate token, store hash, send email.
  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  try {
    await withRetry(
      () =>
        db.passwordResetToken.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            tokenHash,
            expiresAt,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
        }),
      { label: 'forgot-password-createToken' }
    );
  } catch (err) {
    console.error('[forgot-password] createToken error', err);
    return NextResponse.json(GENERIC_OK);
  }

  const resetUrl = `${appBaseUrl(req)}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const tpl = renderResetEmail({ resetUrl, userName: user.name });
  const result = await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await auditAuth({
    event: result.ok ? 'reset_email_sent' : 'reset_email_failed',
    success: result.ok,
    tenantId: user.tenantId,
    userId: user.id,
    email,
    meta,
    details: { provider: result.provider, providerId: result.id, error: result.error },
  });

  return NextResponse.json(GENERIC_OK);
}
