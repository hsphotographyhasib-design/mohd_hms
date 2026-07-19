import { NextResponse } from 'next/server';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/auth/seed-admin
 * Creates a default super_admin if none exists.
 * Blocked in production via middleware.
 * In development, requires a valid super_admin token OR no existing super_admin.
 */
export async function POST(request: Request) {
  // In dev, still require auth unless there are zero super_admins
  const { db, withRetry } = await import('@/core/database/db');
  try {
    const existing = await withRetry(() => db.user.findFirst({ where: { role: 'super_admin' } }), { label: 'seed-check' });
    if (existing) {
      // Super admin already exists — require authentication to prevent abuse
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return NextResponse.json({ error: 'Authentication required — admin already exists' }, { status: 401 });
      }
      const payload = verifyToken(token);
      if (!payload || (payload as any).role !== 'super_admin') {
        return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
      }
      return NextResponse.json({ ok: true, message: 'Admin already exists', user: { id: existing.id, email: existing.email, name: existing.name } });
    }
  } catch {
    // DB error — fall through to create
  }

  if (BACKEND_URL) {
    try {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mohd.com';
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || ('seed_' + Math.random().toString(36).slice(2, 10));
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'System Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'super_admin',
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        return NextResponse.json({ ok: true, message: 'Admin already exists' });
      }
      const result: Record<string, unknown> = { ok: true, message: 'Admin created', user: data.user };
      if (!process.env.SEED_ADMIN_PASSWORD) {
        result.generatedPassword = adminPassword;
        result.warning = 'Save this password — it will not be shown again';
      }
      return NextResponse.json(result, { status: res.status });
    } catch (error) {
      return NextResponse.json({ error: 'Backend unavailable. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.' }, { status: 502 });
    }
  }

  // Local dev
  try {
    const { hashPassword } = await import('@/core/auth/auth-lib');
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mohd.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || ('seed_' + Math.random().toString(36).slice(2, 10));

    let tenant = await withRetry(() => db.tenant.findFirst({}), { label: 'seed-tenant' });
    if (!tenant) {
      tenant = await withRetry(() => db.tenant.create({
        data: { name: 'Default Organization', domain: 'default.mohdhms.com', plan: 'professional', maxUsers: 50 },
      }), { label: 'seed-tenant' });
    }

    const passwordHash = await hashPassword(adminPassword);
    const user = await withRetry(() => db.user.create({
      data: { tenantId: tenant.id, email: adminEmail, passwordHash, name: 'System Admin', role: 'super_admin', authProvider: 'email', isActive: true, profileCompleted: true },
    }), { label: 'seed-admin' });

    const result: Record<string, unknown> = { ok: true, message: 'Admin created', user: { id: user.id, email: user.email } };
    if (!process.env.SEED_ADMIN_PASSWORD) {
      result.generatedPassword = adminPassword;
      result.warning = 'Save this password — it will not be shown again';
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Seed failed' }, { status: 500 });
  }
}