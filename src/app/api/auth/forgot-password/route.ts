import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  auditAuth,
  checkResetRateLimit,
  classifyAccount,
  generateOtp,
  hashOtp,
  cleanupExpiredOtps,
  getRequestMeta,
  maskEmail,
} from '@/lib/password-reset';
import { ensureTableSync } from '@/lib/db-sync';
import { renderOtpEmail, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const GENERIC_OK = {
  ok: true,
  message: 'If an account exists for this email, a verification code has been sent.',
};

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
    return NextResponse.json(GENERIC_OK);
  }

  // Ensure DB table exists
  await ensureTableSync('PasswordResetOtp');
  await cleanupExpiredOtps();

  // Look up the user
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
    { label: 'forgot-password-otp-findUser' }
  );

  // Rate limit by email + IP
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
      { ok: false, message: 'Too many reset requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Always log the attempt
  await auditAuth({
    event: 'password_reset_requested',
    tenantId: user?.tenantId ?? null,
    userId: user?.id ?? null,
    email,
    meta,
  });

  // Don't reveal existence
  if (!user || !user.isActive) {
    return NextResponse.json(GENERIC_OK);
  }

  // OAuth-only accounts can't reset
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

  // Invalidate any previous active OTPs for this user
  try {
    await db.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      data: { status: 'expired' },
    });
  } catch {
    // Non-critical
  }

  // Generate OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  try {
    await withRetry(
      () =>
        db.passwordResetOtp.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            email,
            otpHash,
            expiresAt,
            maxAttempts: OTP_MAX_ATTEMPTS,
            maxResends: OTP_MAX_RESENDS,
            ipAddress: meta.ipAddress,
            device: meta.device,
            browser: meta.browser,
            userAgent: meta.userAgent,
            status: 'active',
          },
        }),
      { label: 'forgot-password-otp-create' }
    );
  } catch (err) {
    console.error('[forgot-password-otp] create error', err);
    // Still return generic success to avoid leaking info
    return NextResponse.json(GENERIC_OK);
  }

  // Send OTP email
  const tpl = renderOtpEmail({
    otp,
    userName: user.name,
    expiresMinutes: OTP_TTL_MINUTES,
  });

  const result = await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await auditAuth({
    event: result.ok ? 'otp_sent' : 'otp_send_failed',
    success: result.ok,
    tenantId: user.tenantId,
    userId: user.id,
    email,
    meta,
    details: { provider: result.provider, providerId: result.id, error: result.error },
  });

  // Return masked email for the verify page
  const masked = maskEmail(email);

  return NextResponse.json({
    ok: true,
    message: 'If an account exists for this email, a verification code has been sent.',
    email: masked,
    expiresIn: OTP_TTL_MINUTES * 60,
  });
}