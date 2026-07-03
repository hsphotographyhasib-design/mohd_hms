import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import {
  OTP_MAX_ATTEMPTS,
  RESET_TOKEN_TTL_SECONDS,
  auditAuth,
  cleanupExpiredOtps,
  getRequestMeta,
  signResetToken,
  verifyOtp,
} from '@/lib/password-reset';
import { ensureTableSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const meta = getRequestMeta(req.headers);
  let email = '';
  let otp = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    otp = typeof body?.otp === 'string' ? body.otp.replace(/\D/g, '') : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  if (!email || !otp || otp.length !== 6) {
    return NextResponse.json(
      { ok: false, message: 'Please enter a valid 6-digit verification code.' },
      { status: 400 }
    );
  }

  await ensureTableSync('PasswordResetOtp');
  await cleanupExpiredOtps();

  // Find active OTP for this email
  const record = await withRetry(
    () =>
      db.passwordResetOtp.findFirst({
        where: {
          email,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          tenantId: true,
          otpHash: true,
          expiresAt: true,
          attempts: true,
          maxAttempts: true,
          user: {
            select: { id: true, email: true, name: true, isActive: true },
          },
        },
      }),
    { label: 'verify-reset-otp-find' }
  );

  if (!record || !record.user) {
    await auditAuth({ event: 'otp_failed', success: false, email, meta, details: { reason: 'not_found' } });
    return NextResponse.json(
      { ok: false, code: 'invalid', message: 'Invalid or expired verification code.' },
      { status: 400 }
    );
  }

  // Check if user is active
  if (!record.user.isActive) {
    await auditAuth({
      event: 'otp_failed',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email,
      meta,
      details: { reason: 'inactive_user' },
    });
    return NextResponse.json(
      { ok: false, code: 'invalid', message: 'Invalid or expired verification code.' },
      { status: 400 }
    );
  }

  // Check expiration
  if (record.expiresAt.getTime() < Date.now()) {
    await db.passwordResetOtp.update({
      where: { id: record.id },
      data: { status: 'expired' },
    }).catch(() => {});
    await auditAuth({
      event: 'otp_expired',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email,
      meta,
    });
    return NextResponse.json(
      { ok: false, code: 'expired', message: 'This verification code has expired. Please request a new one.' },
      { status: 400 }
    );
  }

  // Verify OTP — use atomic update to prevent race conditions
  const otpValid = verifyOtp(otp, record.otpHash);

  if (otpValid) {
    // Atomically mark as verified, incrementing attempts
    const updated = await db.passwordResetOtp.updateMany({
      where: {
        id: record.id,
        status: 'active',
      },
      data: { status: 'verified', attempts: { increment: 1 } },
    }).catch(() => ({ count: 0 }));

    if (updated.count === 0) {
      // Record was already consumed or locked by a concurrent request
      await auditAuth({ event: 'otp_failed', success: false, email, meta, details: { reason: 'already_consumed' } });
      return NextResponse.json(
        { ok: false, code: 'invalid', message: 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    await auditAuth({
      event: 'otp_verified',
      tenantId: record.tenantId,
      userId: record.userId,
      email,
      meta,
    });

    // Return an HMAC-signed token for the password reset page
    const resetToken = signResetToken({
      oid: record.id,
      uid: record.userId,
      exp: Date.now() + RESET_TOKEN_TTL_SECONDS * 1000,
    });

    return NextResponse.json({
      ok: true,
      message: 'Verification successful.',
      resetToken,
    });
  }

  // OTP incorrect — atomically increment attempts and check if locked
  const newAttempts = record.attempts + 1;
  await db.passwordResetOtp.update({
    where: { id: record.id },
    data: { attempts: newAttempts, ...(newAttempts >= record.maxAttempts ? { status: 'locked' } : {}) },
  }).catch(() => {});

  await auditAuth({
    event: 'otp_failed',
    success: false,
    tenantId: record.tenantId,
    userId: record.userId,
    email,
    meta,
    details: { attempt: newAttempts, max: record.maxAttempts },
  });

  if (newAttempts >= record.maxAttempts) {
    await auditAuth({
      event: 'otp_locked',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email,
      meta,
      details: { attempts: newAttempts },
    });
    return NextResponse.json(
      { ok: false, code: 'locked', message: 'Too many failed attempts. Please request a new verification code.' },
      { status: 429 }
    );
  }

  const remaining = record.maxAttempts - newAttempts;
  return NextResponse.json(
    {
      ok: false,
      code: 'invalid',
      message: `Incorrect verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      remainingAttempts: remaining,
    },
    { status: 400 }
  );
}