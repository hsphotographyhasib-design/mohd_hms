import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Use findFirst with retry — email is unique per tenant but we
    // don't know the tenantId here, so findFirst is appropriate.
    const user = await withRetry(
      () =>
        db.user.findFirst({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            role: true,
            tenantId: true,
            employeeNumber: true,
            departmentId: true,
            profileCompleted: true,
            isActive: true,
            passwordHash: true,
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

    // Update last login (best-effort, non-blocking)
    withRetry(
      () =>
        db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date().toISOString(), isOnline: true },
        }),
      { label: 'login-updateLastLogin' }
    ).catch(() => {});

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
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain,
        employeeNumber: user.employeeNumber,
        departmentId: user.departmentId,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500 }
    );
  }
}