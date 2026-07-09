import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/core/database/db';
import {
  OTP_TTL_MINUTES,
  OTP_MAX_RESENDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  auditAuth,
  checkResetRateLimit,
  cleanupExpiredOtps,
  generateOtp,
  hashOtp,
  getRequestMeta,
} from '@/core/auth/password-reset';
import { ensureTableSync } from '@/core/database/db-sync';
import { renderOtpEmail, sendEmail } from '@/core/email/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const meta = getRequestMeta(req.headers);
  let email = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ ok: false, message: 'Email is required.' }, { status: 400 });
  }

  await ensureTableSync('PasswordResetOtp');
  await cleanupExpiredOtps();

  // Find the user
  const user = await withRetry(
    () =>
      db.user.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          tenantId: true,
          isActive: true,
        },
      }),
    { label: 'resend-reset-otp-findUser' }
  );

  if (!user || !user.isActive) {
    // Don't reveal existence
    return NextResponse.json({
      ok: true,
      message: 'If an account exists for this email, a new verification code has been sent.',
    });
  }

  // Find latest OTP record for this user
  const latestOtp = await withRetry(
    () =>
      db.passwordResetOtp.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          resendCount: true,
          maxResends: true,
          createdAt: true,
          status: true,
        },
      }),
    { label: 'resend-reset-otp-findLatest' }
  );

  // Check max resends
  if (latestOtp && latestOtp.resendCount >= latestOtp.maxResends) {
    await auditAuth({
      event: 'otp_resend_blocked',
      success: false,
      tenantId: user.tenantId,
      userId: user.id,
      email,
      meta,
      details: { resendCount: latestOtp.resendCount, maxResends: latestOtp.maxResends },
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'max_resends',
        message: 'You have reached the maximum number of verification code requests. Please try again later or contact support.',
      },
      { status: 429 }
    );
  }

  // Check cooldown
  if (latestOtp) {
    const elapsed = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed);
      return NextResponse.json(
        {
          ok: false,
          code: 'cooldown',
          message: `Please wait ${waitSeconds} second${waitSeconds !== 1 ? 's' : ''} before requesting a new code.`,
          retryAfter: waitSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(waitSeconds) } }
      );
    }
  }

  // Rate limit check
  const rate = await checkResetRateLimit({
    email,
    userId: user.id,
    ipAddress: meta.ipAddress,
  });
  if (rate.blocked) {
    await auditAuth({
      event: 'rate_limited',
      success: false,
      tenantId: user.tenantId,
      userId: user.id,
      email,
      meta,
    });
    return NextResponse.json(
      { ok: false, message: 'Too many reset requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Invalidate previous active OTPs
  try {
    await db.passwordResetOtp.updateMany({
      where: { userId: user.id, status: 'active' },
      data: { status: 'expired' },
    });
  } catch {
    // Non-critical
  }

  // Generate new OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const newResendCount = (latestOtp?.resendCount ?? 0) + 1;

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
            resendCount: newResendCount,
            maxAttempts: OTP_MAX_ATTEMPTS,
            maxResends: OTP_MAX_RESENDS,
            ipAddress: meta.ipAddress,
            device: meta.device,
            browser: meta.browser,
            userAgent: meta.userAgent,
            status: 'active',
          },
        }),
      { label: 'resend-reset-otp-create' }
    );
  } catch (err) {
    console.error('[resend-reset-otp] create error', err);
    return NextResponse.json({
      ok: true,
      message: 'If an account exists for this email, a new verification code has been sent.',
    });
  }

  // Send OTP email
  await auditAuth({
    event: 'otp_generated',
    tenantId: user.tenantId,
    userId: user.id,
    email,
    meta,
    details: { resendCount: newResendCount },
  });

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
    details: { provider: result.provider, providerId: result.id, error: result.error, isResend: true },
  });

  return NextResponse.json({
    ok: true,
    message: 'A new verification code has been sent to your email.',
    expiresIn: OTP_TTL_MINUTES * 60,
    resendCount: newResendCount,
    maxResends: OTP_MAX_RESENDS,
  });
}