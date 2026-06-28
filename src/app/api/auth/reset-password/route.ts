import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import {
  auditAuth,
  getRequestMeta,
  hashResetToken,
  validatePassword,
} from '@/lib/password-reset';
import { renderPasswordChangedEmail, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string, confirmPassword: string }
 *
 * Consumes the token (single-use), updates the user's password, invalidates
 * all existing login sessions, sends confirmation email, audits.
 */
export async function POST(req: NextRequest) {
  const meta = getRequestMeta(req.headers);

  let token = '';
  let password = '';
  let confirmPassword = '';
  try {
    const body = await req.json();
    token = typeof body?.token === 'string' ? body.token : '';
    password = typeof body?.password === 'string' ? body.password : '';
    confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ ok: false, code: 'invalid_link', message: 'Invalid reset link.' }, { status: 400 });
  }
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

  const tokenHash = hashResetToken(token);
  const record = await withRetry(
    () =>
      db.passwordResetToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          expiresAt: true,
          usedAt: true,
          userId: true,
          tenantId: true,
          user: { select: { id: true, email: true, name: true, isActive: true } },
        },
      }),
    { label: 'reset-find' }
  );

  if (!record || !record.user) {
    await auditAuth({ event: 'token_invalid', success: false, meta });
    return NextResponse.json({ ok: false, code: 'invalid_link', message: 'Invalid reset link.' }, { status: 400 });
  }
  if (record.usedAt) {
    await auditAuth({
      event: 'token_already_used',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email: record.user.email,
      meta,
    });
    return NextResponse.json({ ok: false, code: 'invalid_link', message: 'Invalid reset link.' }, { status: 400 });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await auditAuth({
      event: 'token_expired',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email: record.user.email,
      meta,
    });
    return NextResponse.json({ ok: false, code: 'expired', message: 'Link expired.' }, { status: 400 });
  }
  if (record.user.isActive === false) {
    return NextResponse.json({ ok: false, code: 'invalid_link', message: 'Invalid reset link.' }, { status: 400 });
  }

  // Hash new password, then in a single transaction:
  //  - mark token used
  //  - invalidate other unused tokens for this user
  //  - update user password
  //  - revoke all login sessions
  const newHash = await hashPassword(password);

  try {
    await withRetry(
      () =>
        db.$transaction([
          db.passwordResetToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
          }),
          db.passwordResetToken.updateMany({
            where: {
              userId: record.userId,
              usedAt: null,
              id: { not: record.id },
            },
            data: { usedAt: new Date() },
          }),
          db.user.update({
            where: { id: record.userId },
            data: { passwordHash: newHash, updatedAt: new Date() },
          }),
          db.loginSession.updateMany({
            where: { userId: record.userId, isRevoked: false },
            data: { isRevoked: true },
          }),
        ]),
      { label: 'reset-commit' }
    );
  } catch (err) {
    console.error('[reset-password] commit error', err);
    await auditAuth({
      event: 'reset_failed',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email: record.user.email,
      meta,
    });
    return NextResponse.json(
      { ok: false, message: 'We couldn\'t reset your password. Please try again.' },
      { status: 500 }
    );
  }

  await auditAuth({
    event: 'password_changed',
    tenantId: record.tenantId,
    userId: record.userId,
    email: record.user.email,
    meta,
  });

  // Send confirmation email (best-effort, non-blocking failure).
  try {
    const tpl = renderPasswordChangedEmail({
      userName: record.user.name,
      ip: meta.ipAddress,
    });
    await sendEmail({
      to: record.user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  } catch (err) {
    console.error('[reset-password] confirmation email failed', err);
  }

  return NextResponse.json({ ok: true, message: 'Password updated successfully.' });
}
