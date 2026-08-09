import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { hashPassword } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

/** Technician/supervisor roles — single source of truth for technician resolution */
const TECH_ROLES = ['technician', 'supervisor'] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const role = searchParams.get('role') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const skip = (page - 1) * pageSize;

    // When fetching technicians for assignment, allow broader role access
    // (supervisors, managers need to load technician dropdowns)
    const isTechnicianFilter = role === 'technician';
    const auth = verifyRouteAuth(request, {
      feature: isTechnicianFilter ? 'technicians' : 'employees',
    });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
      isActive: true, // ALWAYS filter active users only
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeNumber: { contains: search } },
      ];
    }

    // Standardize technician role filter to match /api/technicians
    if (isTechnicianFilter) {
      where.role = { in: [...TECH_ROLES] };
    } else if (role) {
      where.role = role;
    }

    if (departmentId) where.departmentId = departmentId;

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, tenantId: true, email: true, name: true, phone: true,
          avatar: true, role: true, employeeNumber: true, departmentId: true,
          isActive: true, isOnline: true, lastLogin: true, profileCompleted: true,
          createdAt: true, updatedAt: true,
          department: { select: { id: true, name: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    const data = items.map((u: any) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      name: u.name,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      employeeNumber: u.employeeNumber,
      departmentId: u.departmentId,
      departmentName: u.department?.name ?? null,
      isActive: u.isActive,
      isOnline: u.isOnline,
      lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : null,
      profileCompleted: u.profileCompleted,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
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
    const auth = verifyRouteAuth(request, { feature: 'employees' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
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
      select: {
        id: true, tenantId: true, email: true, name: true, phone: true,
        avatar: true, role: true, employeeNumber: true, departmentId: true,
        isActive: true, isOnline: true, profileCompleted: true,
        createdAt: true, updatedAt: true,
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
      departmentName: employee.department?.name ?? null,
      isActive: employee.isActive,
      isOnline: employee.isOnline,
      profileCompleted: employee.profileCompleted,
      createdAt: employee.createdAt ? new Date(employee.createdAt).toISOString() : null,
      updatedAt: employee.updatedAt ? new Date(employee.updatedAt).toISOString() : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Employee create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
