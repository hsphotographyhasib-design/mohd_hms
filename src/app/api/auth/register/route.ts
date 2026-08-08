import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const body = await request.json();
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
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
  const { db, withRetry, getDbFriendlyMessage } = await import('@/core/database/db');
  const { hashPassword, generateToken } = await import('@/core/auth/auth-lib');

  let name: string; let email: string; let password: string;
  try {
    const body = await request.json();
    name = body.name; email = body.email; password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
  }

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  try {
    let tenant = await withRetry(() => db.tenant.findFirst({ where: { domain: 'default.mohdhms.com' } }), { label: 'register-findTenant' });
    if (!tenant) {
      tenant = await withRetry(() => db.tenant.create({ data: { name: 'Default Organization', domain: 'default.mohdhms.com', plan: 'professional', maxUsers: 50 } }), { label: 'register-createTenant' });
    }

    const existing = await withRetry(() => db.user.findFirst({ where: { tenantId: tenant.id, email } }), { label: 'register-checkEmail' });
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const user = await withRetry(() => db.user.create({
      data: { tenantId: tenant.id, email, passwordHash, name, role: 'customer', authProvider: 'email', profileCompleted: false },
      include: { tenant: { select: { id: true, name: true, domain: true } } },
    }), { label: 'register-createUser' });

    const token = generateToken({ userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email });

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, tenantName: user.tenant?.name, tenantDomain: user.tenant?.domain, profileCompleted: user.profileCompleted },
    });
  } catch (error) {
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}