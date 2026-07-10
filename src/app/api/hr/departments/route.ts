import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { sanitizeInput } from '@/core/auth/auth-lib';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { getDbFriendlyMessage } from '@/core/database/db';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const departments = await db.department.findMany({
      where: { tenantId },
      include: {
        head: { select: { name: true } },
        _count: { select: { hrEmployees: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      headId: d.headId,
      headName: d.head?.name || null,
      employeeCount: d._count.hrEmployees + d._count.users,
      isActive: d.isActive,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    // Also return a flat list of users for the head assignment dropdown
    const users = await db.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data, users });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const body = await request.json();
    const name = sanitizeInput(body.name || '');

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const department = await db.department.create({
      data: {
        tenantId: tenantId,
        name,
        description: sanitizeInput(body.description || ''),
        headId: body.headId || null,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({
      id: department.id,
      name: department.name,
    }, { status: 201 });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}