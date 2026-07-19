import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

// Helper to authenticate and authorize
async function authenticateRequest(
  request: NextRequest
): Promise<{ payload: Record<string, unknown>; ipAddress: string; userAgent: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
  }

  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userRole = payload.role as string;
  if (!['admin', 'super_admin'].includes(userRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { payload: payload as Record<string, unknown>, ipAddress, userAgent };
}

// ============ GET: Single user details ============

export const GET = withErrorLogging(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;

    const { payload } = authResult;
    const { id } = await params;

    const user = await withRetry(
      () =>
        db.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            employeeNumber: true,
            departmentId: true,
            isActive: true,
            isOnline: true,
            lastLogin: true,
            authProvider: true,
            gpsLocation: true,
            profileCompleted: true,
            tenantId: true,
            createdAt: true,
            updatedAt: true,
            tenant: {
              select: { id: true, name: true, domain: true },
            },
            department: {
              select: { id: true, name: true },
            },
            LoginSession: {
              select: {
                id: true,
                deviceName: true,
                deviceType: true,
                browser: true,
                os: true,
                ipAddress: true,
                lastActivity: true,
                isRevoked: true,
                createdAt: true,
              },
              orderBy: { lastActivity: 'desc' },
              take: 10,
            },
            Device: {
              select: {
                id: true,
                name: true,
                type: true,
                browser: true,
                os: true,
                lastSeen: true,
                isTrusted: true,
                createdAt: true,
              },
              orderBy: { lastSeen: 'desc' },
              take: 10,
            },
            AuditLog: {
              select: {
                id: true,
                action: true,
                entity: true,
                details: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        }),
      { label: 'getUser-details' }
    );

    if (!user || user.tenantId !== (payload.tenantId as string)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map PascalCase relation keys to camelCase for the frontend
    const response = {
      ...user,
      loginSessions: user.LoginSession,
      devices: user.Device,
      auditLogs: user.AuditLog,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { LoginSession, Device, AuditLog, ...rest } = response;
    void rest;

    return NextResponse.json({ user: response });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
});

// ============ PUT: Update user ============

export const PUT = withErrorLogging(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;

    const { payload, ipAddress, userAgent } = authResult;
    const callerId = payload.userId as string;
    const callerRole = payload.role as string;
    const tenantId = payload.tenantId as string;
    const { id } = await params;

    // Prevent self-role-change
    if (id === callerId) {
      return NextResponse.json(
        { error: 'Cannot change your own role. Ask another super admin to change it.' },
        { status: 400 }
      );
    }

    // Find existing user by primary key
    const existingUser = await withRetry(
      () =>
        db.user.findUnique({
          where: { id },
          select: { id: true, tenantId: true, name: true, email: true, phone: true, role: true, isActive: true },
        }),
      { label: 'updateUser-find' }
    );

    if (!existingUser || existingUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone, role, isActive } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    // Track previous role for audit and response
    const previousRole = existingUser.role;
    const isRoleChange = role !== undefined && role !== previousRole;

    if (role !== undefined) {
      // Only admin or super_admin can change roles
      if (!['admin', 'super_admin'].includes(callerRole)) {
        return NextResponse.json(
          { error: 'Only admins can change user roles' },
          { status: 403 }
        );
      }

      const validRoles = ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'user', 'customer', 'vendor', 'guest'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: `Invalid role "${role}". Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
      }

      // Only super_admin can assign super_admin role
      if (role === 'super_admin' && callerRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only super_admin can assign the super_admin role' },
          { status: 403 }
        );
      }

      // Non-super_admin cannot modify super_admin users
      if (existingUser.role === 'super_admin' && callerRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only super_admin can modify other super_admin accounts' },
          { status: 403 }
        );
      }

      // Safeguard: prevent removing the last super_admin
      if (previousRole === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await withRetry(
          () => db.user.count({ where: { tenantId, role: 'super_admin', isActive: true } }),
          { label: 'updateUser-superAdminCount' }
        );
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot demote the last remaining super admin. Assign another super admin first.' },
            { status: 400 }
          );
        }
      }

      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle email change (need to check uniqueness) - indexed: tenantId+email
    if (email !== undefined && email !== existingUser.email) {
      const emailExists = await withRetry(
        () =>
          db.user.findFirst({
            where: {
              email,
              tenantId,
              id: { not: id },
            },
          }),
        { label: 'updateUser-checkEmail' }
      );
      if (emailExists) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
      }
      updateData.email = email;
    }

    const oldValue = JSON.stringify({
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      role: existingUser.role,
      isActive: existingUser.isActive,
    });

    // Update user
    const updatedUser = await withRetry(
      () =>
        db.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            profileCompleted: true,
            lastLogin: true,
            createdAt: true,
            avatar: true,
            employeeNumber: true,
            department: { select: { id: true, name: true } },
          },
        }),
      { label: 'updateUser-update' }
    );

    const newValue = JSON.stringify({
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    });

    // Audit log (non-critical) — use role-specific action for role changes
    const auditAction = isRoleChange ? 'change_role' : 'update_user';
    const auditDetails = isRoleChange
      ? JSON.stringify({ previousRole, newRole: role, changedBy: callerRole })
      : undefined;

    withRetry(
      () =>
        db.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            userId: callerId,
            action: auditAction,
            entity: 'User',
            entityId: id,
            oldValue,
            newValue,
            details: auditDetails,
            ipAddress,
            userAgent,
            device: 'api',
          },
        }),
      { label: 'updateUser-audit' }
    ).catch(() => {});

    // Return previousRole so the frontend can show a transition message
    return NextResponse.json({
      user: updatedUser,
      ...(isRoleChange ? { previousRole } : {}),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
});

// ============ DELETE: Soft delete user ============

export const DELETE = withErrorLogging(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const tokenPayload = verifyToken(authHeader.replace('Bearer ', ''));
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only super_admin can soft-delete users
    if (tokenPayload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super_admin can deactivate users' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Cannot deactivate yourself
    if (id === tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Find user by primary key
    const user = await withRetry(
      () =>
        db.user.findUnique({
          where: { id },
          select: { id: true, tenantId: true, name: true, email: true, role: true, isActive: true },
        }),
      { label: 'deleteUser-find' }
    );

    if (!user || user.tenantId !== (tokenPayload.tenantId as string)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Safeguard: prevent deleting the last super_admin
    if (user.role === 'super_admin') {
      const superAdminCount = await withRetry(
        () => db.user.count({ where: { tenantId: tokenPayload.tenantId as string, role: 'super_admin', isActive: true } }),
        { label: 'deleteUser-superAdminCount' }
      );
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last remaining super admin.' },
          { status: 400 }
        );
      }
    }

    // Soft delete: set isActive = false
    const updatedUser = await withRetry(
      () =>
        db.user.update({
          where: { id },
          data: { isActive: false, isOnline: false },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        }),
      { label: 'deleteUser-update' }
    );

    // Revoke all sessions
    await withRetry(
      () =>
        db.loginSession.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        }),
      { label: 'deleteUser-revokeSessions' }
    );

    // Audit log (non-critical)
    withRetry(
      () =>
        db.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: tokenPayload.tenantId as string,
            userId: tokenPayload.userId as string,
            action: 'deactivate_user',
            entity: 'User',
            entityId: id,
            oldValue: JSON.stringify({ isActive: user.isActive, role: user.role }),
            newValue: JSON.stringify({ isActive: false }),
            ipAddress,
            userAgent,
            device: 'api',
          },
        }),
      { label: 'deleteUser-audit' }
    ).catch(() => {});

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
});