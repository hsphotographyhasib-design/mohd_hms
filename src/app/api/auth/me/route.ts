import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      { label: 'auth-me-findUser' }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
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
      departmentName: user.department?.name,
      isActive: user.isActive,
      isOnline: user.isOnline,
      profileCompleted: user.profileCompleted,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}
