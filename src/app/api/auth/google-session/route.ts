import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/core/auth/nextauth';
import { db } from '@/core/database/db';
import { generateToken } from '@/core/auth/auth-lib';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No active Google session' }, { status: 401 });
    }

    const email = session.user.email;

    // Find user in our DB
    const user = await db.user.findFirst({
      where: {
        email,
        tenant: { domain: 'default.facilitypro.com' },
      },
      include: { tenant: { select: { id: true, name: true, domain: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date().toISOString(), isOnline: true },
    });

    // Generate our custom JWT
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
    console.error('Google session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}