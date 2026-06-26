import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const employee = await db.user.findFirst({
      where: { id, tenantId },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: employee.id,
      tenantId: employee.tenantId,
      email: employee.email,
      name: employee.name,
      phone: employee.phone,
      avatar: employee.avatar,
      role: employee.role,
      employeeNumber: employee.employeeNumber,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name,
      isActive: employee.isActive,
      isOnline: employee.isOnline,
      lastLogin: employee.lastLogin?.toISOString(),
      gpsLocation: employee.gpsLocation,
      profileCompleted: employee.profileCompleted,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Employee get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.avatar !== undefined) updateData.avatar = body.avatar || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.employeeNumber !== undefined) updateData.employeeNumber = body.employeeNumber || null;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.gpsLocation !== undefined) updateData.gpsLocation = body.gpsLocation || null;
    if (body.password) updateData.passwordHash = await hashPassword(body.password);

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      avatar: updated.avatar,
      role: updated.role,
      employeeNumber: updated.employeeNumber,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name,
      isActive: updated.isActive,
      isOnline: updated.isOnline,
      lastLogin: updated.lastLogin?.toISOString(),
      profileCompleted: updated.profileCompleted,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Employee update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    await db.user.delete({ where: { id } });
    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Employee delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
