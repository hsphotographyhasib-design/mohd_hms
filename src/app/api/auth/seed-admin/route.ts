import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/auth/seed-admin
 * Creates a default super_admin if none exists.
 * Should be called once after fresh Supabase setup.
 * In production, proxies to Render backend.
 */
export async function POST() {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'System Admin',
          email: 'admin@mohd.com',
          password: 'admin123',
          role: 'super_admin',
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@mohd.com', password: 'admin123' }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) return NextResponse.json({ ok: true, message: 'Admin already exists', user: loginData.user });
        return NextResponse.json({ ok: true, message: 'Admin exists but login check failed', data });
      }
      return NextResponse.json({ ok: true, message: 'Admin created', user: data.user }, { status: res.status });
    } catch (error) {
      return NextResponse.json({ error: 'Backend unavailable. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.' }, { status: 502 });
    }
  }

  // Local dev
  try {
    const { db, withRetry } = await import('@/lib/db');
    const { hashPassword } = await import('@/lib/auth');

    let tenant = await withRetry(() => db.tenant.findFirst({}), { label: 'seed-tenant' });
    if (!tenant) {
      tenant = await withRetry(() => db.tenant.create({
        data: { name: 'Default Organization', domain: 'default.facilitypro.com', plan: 'professional', maxUsers: 50 },
      }), { label: 'seed-tenant' });
    }

    const existing = await withRetry(() => db.user.findFirst({ where: { role: 'super_admin' } }), { label: 'seed-checkAdmin' });
    if (existing) {
      return NextResponse.json({ ok: true, message: 'Admin already exists', user: { id: existing.id, email: existing.email, name: existing.name } });
    }

    const passwordHash = await hashPassword('admin123');
    const user = await withRetry(() => db.user.create({
      data: { tenantId: tenant.id, email: 'admin@mohd.com', passwordHash, name: 'System Admin', role: 'super_admin', authProvider: 'email', isActive: true, profileCompleted: true },
    }), { label: 'seed-admin' });

    return NextResponse.json({ ok: true, message: 'Admin created', user: { id: user.id, email: user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Seed failed' }, { status: 500 });
  }
}