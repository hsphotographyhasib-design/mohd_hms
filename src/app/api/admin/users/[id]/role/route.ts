import { NextRequest, NextResponse } from 'next/server';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/:id/role
 *
 * Enterprise User Role Update Endpoint.
 *
 * Uses Prisma/SQLite directly (same as all other operational APIs).
 * This ensures the role change is immediately visible to the technicians
 * list, complaint assignment, and all other role-gated features.
 *
 * Previously, this endpoint proxied to the Express backend in production,
 * which wrote to a DIFFERENT database (Supabase). This caused the
 * "role changed but system doesn't recognize" bug — technicians module
 * and complaint assignment read from Prisma/SQLite and never saw the change.
 */
export const PATCH = withErrorLogging(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { db, withRetry, getDbFriendlyMessage } = await import('@/core/database/db');
  const { verifyToken } = await import('@/core/auth/auth-lib');
  const { canTransitionRole } = await import('@/core/permissions/rbac/permissions-matrix');

  try {
    // ── 1. Authentication ───────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.replace('Bearer ', ''));
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const callerId = payload.userId as string;
    const callerRole = (payload.role as string).toLowerCase();
    const tenantId = payload.tenantId as string;
    const { id: targetUserId } = await params;

    // ── 2. Self-change prevention ────────────────────────────────────
    if (targetUserId === callerId) {
      return NextResponse.json(
        { error: 'You cannot change your own role. Ask another administrator.' },
        { status: 403 }
      );
    }

    // ── 3. Request body validation ──────────────────────────────────
    const VALID_ROLES = [
      'super_admin', 'admin', 'manager', 'supervisor',
      'technician', 'finance', 'hr', 'user', 'customer', 'vendor', 'guest',
    ] as const;

    let body: { role?: string; reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { role: newRole, reason } = body;

    if (!newRole || typeof newRole !== 'string') {
      return NextResponse.json({ error: 'Missing required field: role' }, { status: 400 });
    }

    const normalizedNewRole = newRole.toLowerCase().trim();

    if (!VALID_ROLES.includes(normalizedNewRole as any)) {
      return NextResponse.json(
        { error: `Invalid role "${newRole}". Valid roles: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 4. Permission matrix check ──────────────────────────────────
    const transitionCheck = canTransitionRole(callerRole, normalizedNewRole, '');
    if (!transitionCheck.allowed) {
      return NextResponse.json({ error: transitionCheck.reason }, { status: 403 });
    }

    // ── 5. Find target user ─────────────────────────────────────────
    const targetUser = await withRetry(
      () =>
        db.user.findUnique({
          where: { id: targetUserId },
          select: {
            id: true, tenantId: true, name: true, email: true,
            role: true, isActive: true, authProvider: true,
          },
        }),
      { label: 'roleChange-findUser' }
    );

    if (!targetUser || targetUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousRole = targetUser.role;

    // ── 6. Additional permission checks with current role context ──
    const fullTransitionCheck = canTransitionRole(callerRole, normalizedNewRole, previousRole);
    if (!fullTransitionCheck.allowed) {
      return NextResponse.json({ error: fullTransitionCheck.reason }, { status: 403 });
    }

    // ── 7. No-op check ──────────────────────────────────────────────
    if (normalizedNewRole === previousRole) {
      return NextResponse.json(
        { error: `User already has the role "${normalizedNewRole.replace(/_/g, ' ')}". No change needed.` },
        { status: 400 }
      );
    }

    // ── 8. Protect last super_admin ─────────────────────────────────
    if (previousRole === 'super_admin' && normalizedNewRole !== 'super_admin') {
      const superAdminCount = await withRetry(
        () => db.user.count({ where: { tenantId, role: 'super_admin', isActive: true } }),
        { label: 'roleChange-superAdminCount' }
      );
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining Super Admin. Promote another user first.' },
          { status: 400 }
        );
      }
    }

    // ── 9. Extract request metadata ─────────────────────────────────
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ── 10. Update user role ────────────────────────────────────────
    const updatedUser = await withRetry(
      () =>
        db.user.update({
          where: { id: targetUserId },
          data: { role: normalizedNewRole, updatedAt: new Date() },
          select: {
            id: true, name: true, email: true, role: true, isActive: true,
            avatar: true, employeeNumber: true, profileCompleted: true,
            lastLogin: true, createdAt: true,
            department: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'roleChange-update' }
    );

    // ── 10b. Revoke all active sessions for the target user ─────────
    //      This ensures the target user's stale JWT (which still
    //      contains the old role) will be detected by the client-side
    //      refresh-session mechanism, which will then fetch a new JWT
    //      with the updated role from /api/auth/refresh-session.
    let sessionsRevoked = 0;
    try {
      const revokeResult = await withRetry(
        () =>
          db.loginSession.updateMany({
            where: {
              userId: targetUserId,
              tenantId,
              isRevoked: false,
              expiresAt: { gt: new Date() },
            },
            data: { isRevoked: true },
          }),
        { label: 'roleChange-revokeSessions' }
      );
      sessionsRevoked = revokeResult.count;
    } catch (err) {
      console.error('[Role Change] Failed to revoke sessions:', err);
    }

    // ── 11. Create audit log ────────────────────────────────────────
    withRetry(
      () =>
        db.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            userId: callerId,
            action: 'role_change',
            entity: 'User',
            entityId: targetUserId,
            oldValue: JSON.stringify({ role: previousRole }),
            newValue: JSON.stringify({ role: normalizedNewRole }),
            details: JSON.stringify({
              previousRole,
              newRole: normalizedNewRole,
              changedBy: callerRole,
              changedByName: (payload.name as string) || 'Unknown',
              targetUserName: targetUser.name,
              targetUserEmail: targetUser.email,
              reason: reason || null,
              sessionsRevoked,
              permissionRefresh: true,
              sessionRefresh: true,
            }),
            ipAddress,
            userAgent,
            device: 'api',
          },
        }),
      { label: 'roleChange-audit' }
    ).catch((err: Error) => {
      console.error('[Role Change Audit] Failed to log:', err.message);
    });

    // ── 12. Send in-app notification to target user ─────────────────
    withRetry(
      () =>
        db.notificationLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            userId: targetUserId,
            type: 'role_change',
            title: 'Role Updated',
            message: `Your account role has been updated from ${previousRole.replace(/_/g, ' ')} to ${normalizedNewRole.replace(/_/g, ' ')} by ${(payload.name as string) || 'an administrator'}.`,
            data: JSON.stringify({
              previousRole,
              newRole: normalizedNewRole,
              changedBy: callerId,
              changedByName: (payload.name as string) || 'Unknown',
              changedByRole: callerRole,
            }),
            isRead: false,
          },
        }),
      { label: 'roleChange-notification' }
    ).catch((err: Error) => {
      console.error('[Role Change Notification] Failed:', err.message);
    });

    // ── 13. Response ────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      user: updatedUser,
      previousRole,
      newRole: normalizedNewRole,
      sessionsRevoked,
      changedBy: {
        id: callerId,
        role: callerRole,
        name: (payload.name as string) || 'Unknown',
      },
      message: `Role changed from ${previousRole.replace(/_/g, ' ')} to ${normalizedNewRole.replace(/_/g, ' ')}. ${sessionsRevoked > 0 ? `${sessionsRevoked} active session(s) revoked — the user will receive updated permissions on their next action.` : ''}`,
    });
  } catch (error) {
    console.error('[Role Change API] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) || 'Unable to update user role. Please try again.' },
      { status: 500 }
    );
  }
});
