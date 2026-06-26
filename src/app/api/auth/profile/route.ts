import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = payload.userId as string;
    const body = await request.json();
    const { name, phone, address } = body;

    // Build update data dynamically
    const updateData: Record<string, string> = { profileCompleted: 'true' };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    // address is not a direct field on User; store it as gpsLocation or ignore
    // Since User model doesn't have address field, we skip it

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        profileCompleted: true,
      },
      include: {
        tenant: { select: { id: true, name: true, domain: true } },
        department: { select: { id: true, name: true } },
      },
    });

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
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
