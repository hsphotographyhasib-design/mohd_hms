import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find or create a default tenant
    let tenant = await withRetry(
      () => db.tenant.findFirst({ where: { domain: 'default.facilitypro.com' } }),
      { label: 'setup-findTenant' }
    );

    if (!tenant) {
      tenant = await withRetry(
        () =>
          db.tenant.create({
            data: {
              name: 'Default Organization',
              domain: 'default.facilitypro.com',
              plan: 'enterprise',
              maxUsers: 999,
            },
          }),
        { label: 'setup-createTenant' }
      );
    }

    // Check if super_admin already exists for this tenant
    const existingAdmin = await withRetry(
      () =>
        db.user.findFirst({
          where: { tenantId: tenant!.id, role: 'super_admin' },
        }),
      { label: 'setup-checkAdmin' }
    );

    if (existingAdmin) {
      return NextResponse.json(
        {
          error: 'A super_admin already exists for this tenant',
          existingEmail: existingAdmin.email,
        },
        { status: 409 }
      );
    }

    // Check if email is already taken
    const existingEmail = await withRetry(
      () => db.user.findFirst({ where: { tenantId: tenant!.id, email } }),
      { label: 'setup-checkEmail' }
    );

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered', existingRole: existingEmail.role },
        { status: 409 }
      );
    }

    // Create super_admin user
    const passwordHash = await hashPassword(password);
    const user = await withRetry(
      () =>
        db.user.create({
          data: {
            tenantId: tenant!.id,
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name.trim(),
            role: 'super_admin',
            isActive: true,
            profileCompleted: true,
          },
          include: {
            tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'setup-createSuperAdmin' }
    );

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain,
      },
    });
  } catch (error) {
    console.error('[create-super-admin] error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500 }
    );
  }
}