import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { auditAuth, getRequestMeta, hashResetToken } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/reset-password/verify?token=...
 * Lightweight check used by the reset page on mount — does NOT consume the
 * token, only validates it. Friendly responses, no leaks.
 */
export async function GET(req: NextRequest) {
  const meta = getRequestMeta(req.headers);
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
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
          user: { select: { email: true, isActive: true } },
        },
      }),
    { label: 'reset-verify-find' }
  );

  if (!record) {
    await auditAuth({ event: 'token_invalid', success: false, email: null, meta });
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }

  if (record.usedAt) {
    await auditAuth({
      event: 'token_already_used',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email: record.user?.email ?? null,
      meta,
    });
    return NextResponse.json({ ok: false, reason: 'used' }, { status: 400 });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await auditAuth({
      event: 'token_expired',
      success: false,
      tenantId: record.tenantId,
      userId: record.userId,
      email: record.user?.email ?? null,
      meta,
    });
    return NextResponse.json({ ok: false, reason: 'expired' }, { status: 400 });
  }

  if (record.user && record.user.isActive === false) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }

  await auditAuth({
    event: 'token_verified',
    tenantId: record.tenantId,
    userId: record.userId,
    email: record.user?.email ?? null,
    meta,
  });

  return NextResponse.json({
    ok: true,
    email: record.user?.email
      ? record.user.email.replace(/(^.)(.*)(@.*$)/, (_, a, b, c) => a + '•'.repeat(Math.max(b.length, 1)) + c)
      : null,
  });
}
