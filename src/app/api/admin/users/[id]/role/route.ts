import { NextRequest, NextResponse } from 'next/server';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/:id/role
 *
 * Enterprise User Role Update Endpoint.
 *
 * Architecture:
 *   - Production (BACKEND_URL set): Proxies to Express backend on Render.
 *     The Express backend handles auth verification, RBAC, Supabase queries,
 *     and audit logging. This ensures the same JWT secret is used for
 *     token verification (since login also goes through Express in prod).
 *
 *   - Local Dev (no BACKEND_URL): Uses Prisma/SQLite directly.
 *     Full 13-step pipeline with auth, RBAC, DB update, audit log, notification.
 */
export const PATCH = withErrorLogging(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

  // ── Production: Proxy to Express backend ─────────────────────────────
  if (BACKEND_URL) {
    try {
      const { id } = await params;
      const body = await request.json();
      const authHeader = request.headers.get('authorization') || '';

      const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
          'X-Real-IP': request.headers.get('x-real-ip') || '',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('[Role Change API] Proxy error:', error);
      return NextResponse.json(
        { error: 'Backend service unavailable. Please try again.' },
        { status: 502 }
      );
    }
  }

  // ── Local Dev: Handle with Prisma/SQLite ─────────────────────────────
  // Dynamic imports to avoid bundling Prisma in production proxy path
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
      changedBy: {
        id: callerId,
        role: callerRole,
        name: (payload.name as string) || 'Unknown',
      },
      message: `Role changed from ${previousRole.replace(/_/g, ' ')} to ${normalizedNewRole.replace(/_/g, ' ')}.`,
    });
  } catch (error) {
    console.error('[Role Change API] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) || 'Unable to update user role. Please try again.' },
      { status: 500 }
    );
  }
});
