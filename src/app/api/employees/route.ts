import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const role = request.nextUrl.searchParams.get('role') || '';
    const departmentId = request.nextUrl.searchParams.get('departmentId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeNumber: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    const data = items.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      name: u.name,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      employeeNumber: u.employeeNumber,
      departmentId: u.departmentId,
      departmentName: u.department?.name,
      isActive: u.isActive,
      isOnline: u.isOnline,
      lastLogin: u.lastLogin?.toISOString(),
      profileCompleted: u.profileCompleted,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Employees list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: only admin, hr, and super_admin can manage employees
    const role = payload.role as string;
    if (!['super_admin', 'admin', 'hr'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { email, name, phone, role: employeeRole, employeeNumber, departmentId, password } = body;

    if (!email || !name || !employeeRole) {
      return NextResponse.json({ error: 'Email, name, and role are required' }, { status: 400 });
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const employee = await db.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: employeeRole,
        employeeNumber: employeeNumber || null,
        profileCompleted: true,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

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
      profileCompleted: employee.profileCompleted,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Employee create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
