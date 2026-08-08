import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

/** GET /api/admin/users — List all users (admin only) */
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'user-management' });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';

    // Build where clause safely
    const where: any = { tenantId: auth.tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          googleId: true,
          role: true,
          employeeNumber: true,
          isActive: true,
          isOnline: true,
          lastLogin: true,
          profileCompleted: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[AdminUsers GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/admin/users — Update user role (admin only) */
export async function PATCH(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'user-management' });
    if (auth.error) return auth.error;

    const { userId, role, isActive, name, phone } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const validRoles = ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'user', 'customer'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    if (auth.role !== 'super_admin' && role === 'super_admin') {
      return NextResponse.json({ error: 'Only super_admin can assign super_admin role' }, { status: 403 });
    }

    if (userId === auth.userId && role && role !== auth.role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (name && typeof name === 'string' && name.trim().length > 0) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone === '' ? null : String(phone);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId, tenantId: auth.tenantId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('[AdminUsers PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}