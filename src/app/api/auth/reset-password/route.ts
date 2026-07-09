import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/core/database/db';
import { hashPassword } from '@/core/auth/auth-lib';
import {
  auditAuth,
  validatePassword,
  getRequestMeta,
  verifyResetToken,
} from '@/core/auth/password-reset';
import { renderPasswordChangedEmail, sendEmail } from '@/core/email/email';
import { ensureTableSync } from '@/core/database/db-sync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Body: { resetToken: string, password: string, confirmPassword: string }
 *
 * The resetToken is a base64url-encoded JSON payload from verify-reset-otp
 * containing { oid: otpRecordId, uid: userId, exp: timestamp }.
 *
 * Consumes the OTP record, updates the user's password, invalidates
 * all existing login sessions, sends confirmation email, audits.
 */
export async function POST(req: NextRequest) {
  const meta = getRequestMeta(req.headers);

  let resetToken = '';
  let password = '';
  let confirmPassword = '';
  try {
    const body = await req.json();
    resetToken = typeof body?.resetToken === 'string' ? body.resetToken : '';
    password = typeof body?.password === 'string' ? body.password : '';
    confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  if (!resetToken) {
    return NextResponse.json({ ok: false, message: 'Invalid session. Please start the password reset process again.' }, { status: 400 });
  }

  // Verify HMAC signature and decode payload
  const payload = verifyResetToken(resetToken);
  if (!payload) {
    return NextResponse.json({ ok: false, code: 'expired', message: 'Your session has expired or is invalid. Please request a new verification code.' }, { status: 400 });
  }

  // Validate passwords
  if (password !== confirmPassword) {
    return NextResponse.json({ ok: false, code: 'mismatch', message: 'Passwords do not match.' }, { status: 400 });
  }

  const check = validatePassword(password);
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, code: 'weak', message: 'Password does not meet requirements.', errors: check.errors },
      { status: 400 }
    );
  }

  await ensureTableSync('PasswordResetOtp');

  // Verify the OTP record is in 'verified' status
  const otpRecord = await withRetry(
    () =>
      db.passwordResetOtp.findUnique({
        where: { id: payload.oid },
        select: {
          id: true,
          userId: true,
          tenantId: true,
          status: true,
          email: true,
          user: {
            select: { id: true, email: true, name: true, isActive: true },
          },
        },
      }),
    { label: 'reset-password-findOtp' }
  );

  if (!otpRecord || !otpRecord.user) {
    await auditAuth({ event: 'reset_failed', success: false, meta, details: { reason: 'otp_not_found' } });
    return NextResponse.json({ ok: false, message: 'Invalid session. Please start the password reset process again.' }, { status: 400 });
  }

  // Defense in depth: verify userId matches
  if (payload.uid !== otpRecord.userId) {
    await auditAuth({ event: 'reset_failed', success: false, meta, details: { reason: 'uid_mismatch' } });
    return NextResponse.json({ ok: false, message: 'Invalid session. Please start the password reset process again.' }, { status: 400 });
  }

  if (otpRecord.status !== 'verified') {
    await auditAuth({
      event: 'reset_failed',
      success: false,
      tenantId: otpRecord.tenantId,
      userId: otpRecord.userId,
      email: otpRecord.email,
      meta,
      details: { reason: 'otp_not_verified', status: otpRecord.status },
    });
    return NextResponse.json({ ok: false, message: 'Invalid session. Please verify your code again.' }, { status: 400 });
  }

  if (!otpRecord.user.isActive) {
    return NextResponse.json({ ok: false, message: 'This account has been deactivated.' }, { status: 403 });
  }

  // Hash new password and commit transaction
  const newHash = await hashPassword(password);

  try {
    await withRetry(
      () =>
        db.$transaction([
          // Mark OTP as used
          db.passwordResetOtp.update({
            where: { id: otpRecord.id },
            data: { status: 'used', usedAt: new Date() },
          }),
          // Invalidate all other OTPs for this user
          db.passwordResetOtp.updateMany({
            where: {
              userId: otpRecord.userId,
              status: { in: ['active', 'verified'] },
            },
            data: { status: 'expired' },
          }),
          // Update user password
          db.user.update({
            where: { id: otpRecord.userId },
            data: { passwordHash: newHash, updatedAt: new Date() },
          }),
          // Revoke all active login sessions
          db.loginSession.updateMany({
            where: { userId: otpRecord.userId, isRevoked: false },
            data: { isRevoked: true },
          }),
        ]),
      { label: 'reset-password-commit' }
    );
  } catch (err) {
    console.error('[reset-password] commit error', err);
    await auditAuth({
      event: 'reset_failed',
      success: false,
      tenantId: otpRecord.tenantId,
      userId: otpRecord.userId,
      email: otpRecord.email,
      meta,
    });
    return NextResponse.json(
      { ok: false, message: "We couldn't reset your password. Please try again." },
      { status: 500 }
    );
  }

  await auditAuth({
    event: 'password_changed',
    tenantId: otpRecord.tenantId,
    userId: otpRecord.userId,
    email: otpRecord.email,
    meta,
  });

  await auditAuth({
    event: 'sessions_revoked',
    tenantId: otpRecord.tenantId,
    userId: otpRecord.userId,
    email: otpRecord.email,
    meta,
  });

  // Send confirmation email (best-effort)
  try {
    const tpl = renderPasswordChangedEmail({
      userName: otpRecord.user.name,
      ip: meta.ipAddress,
    });
    await sendEmail({
      to: otpRecord.user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  } catch (err) {
    console.error('[reset-password] confirmation email failed', err);
  }

  return NextResponse.json({ ok: true, message: 'Password updated successfully.' });
}