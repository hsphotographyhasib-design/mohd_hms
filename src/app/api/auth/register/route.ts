import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Find or create default tenant for new registrations
    let tenant = await db.tenant.findFirst({ where: { domain: 'default.facilitypro.com' } });
    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          name: 'Default Organization',
          domain: 'default.facilitypro.com',
          plan: 'professional',
          maxUsers: 50,
        },
      });
    }

    const existing = await db.user.findFirst({ where: { tenantId: tenant.id, email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: role || 'technician',
        profileCompleted: false,
      },
      include: { tenant: { select: { id: true, name: true, domain: true } } },
    });

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}