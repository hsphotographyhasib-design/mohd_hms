import { NextRequest, NextResponse } from 'next/server';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export const POST = withErrorLogging(async function POST(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const body = await request.json();
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please try again.' },
        { status: 502 }
      );
    }
  }

  // ── Local dev: use Prisma/SQLite ───────────────────────────────────────
  try {
    const { db, withRetry, getDbFriendlyMessage, getErrorHeaders } = await import('@/core/database/db');
    const { verifyPassword, generateToken } = await import('@/core/auth/auth-lib');

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await withRetry(
      () =>
        db.user.findFirst({
          where: { email },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, isActive: true, passwordHash: true,
            tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'login-findUser' }
    );

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    withRetry(
      () => db.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), isOnline: true, authProvider: 'email' } }),
      { label: 'login-updateLastLogin' }
    ).catch(() => {});

    const normalizedRole = (user.role as string).toLowerCase() as typeof user.role;

    const token = generateToken({ userId: user.id, tenantId: user.tenantId, role: normalizedRole, email: user.email });

    return NextResponse.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar,
        role: normalizedRole, tenantId: user.tenantId, tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain, employeeNumber: user.employeeNumber,
        departmentId: user.departmentId, profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    const { getDbFriendlyMessage: gfm, getErrorHeaders: geh } = await import('@/core/database/db');
    return NextResponse.json({ error: gfm(error) }, { status: 500, headers: geh(error) });
  }
});