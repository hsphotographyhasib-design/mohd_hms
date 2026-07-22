import { NextRequest, NextResponse } from 'next/server';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * GET /api/auth/refresh-session
 *
 * Silent role-refresh endpoint.
 *
 * When an admin changes a user's role, the JWT still contains the old role.
 * This endpoint reads the LATEST user data from the DB and, if the role has
 * changed, issues a new JWT with the updated claims.
 *
 * Called periodically (every 60 s) by the App Shell and on 401 recovery.
 */
export const GET = withErrorLogging(async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ──────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/auth/refresh-session`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Refresh-session proxy error:', error);
      return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
    }
  }

  // ── Local dev: Prisma / SQLite ─────────────────────────────────────
  const { db, withRetry, getDbFriendlyMessage, getErrorHeaders } =
    await import('@/core/database/db');
  const { verifyToken, generateToken } = await import('@/core/auth/auth-lib');

  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = payload.userId as string;

  const user = await withRetry(
    () =>
      db.user.findUnique({
        where: { id: userId },
        include: {
          tenant: { select: { id: true, name: true, domain: true } },
          department: { select: { id: true, name: true } },
        },
      }),
    { label: 'refresh-session-findUser' }
  );

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jwtRole = (payload.role || '').toLowerCase();
  const dbRole = user.role.toLowerCase();
  const roleChanged = jwtRole !== dbRole;

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatar: user.avatar,
    role: dbRole,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name,
    tenantDomain: user.tenant?.domain,
    employeeNumber: user.employeeNumber,
    departmentId: user.departmentId,
    departmentName: user.department?.name,
    isActive: user.isActive,
    isOnline: user.isOnline,
    profileCompleted: user.profileCompleted,
    lastLogin: user.lastLogin,
  };

  // If the role stored in the JWT differs from the DB, issue a new token.
  if (roleChanged) {
    const newToken = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: dbRole,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      ...userData,
      roleChanged: true,
      token: newToken,
      previousRole: jwtRole,
    });
  }

  return NextResponse.json({
    ...userData,
    roleChanged: false,
  });
});
