import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Constants ──────────────────────────────────────────────────────────

const VALID_ROLES = [
  'super_admin', 'admin', 'manager', 'supervisor',
  'technician', 'finance', 'hr', 'user', 'customer', 'vendor', 'guest',
] as const;

type ValidRole = (typeof VALID_ROLES)[number];

/** Roles that each admin tier is allowed to assign */
const ROLE_ASSIGN_MATRIX: Record<string, readonly ValidRole[]> = {
  super_admin: VALID_ROLES,
  admin: ['customer', 'technician', 'hr', 'finance'],
};

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────
router.route('/:id/role').patch(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const callerId = req.user!.userId as string;
    const callerRole = (req.user!.role as string).toLowerCase();
    const callerName = (req.user!.name as string) || (req.user!.email as string) || 'Unknown';
    const { id: targetUserId } = req.params;
    const { role: newRole, reason } = req.body;

    // ── 1. Authorisation: only super_admin or admin ──────────────────────
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      res.status(403).json({
        error: 'Insufficient permissions',
        detail: 'Only users with super_admin or admin role can change user roles.',
        requiredRole: 'super_admin or admin',
        yourRole: callerRole,
      });
      return;
    }

    // ── 2. Prevent self-role-change ───────────────────────────────────────
    if (callerId === targetUserId) {
      res.status(400).json({
        error: 'Cannot change your own role',
        detail: 'Self-role-modification is not allowed. Ask another admin to change your role.',
      });
      return;
    }

    // ── 3. Validate request body ──────────────────────────────────────────
    if (newRole === undefined || newRole === null || typeof newRole !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid field',
        detail: 'The request body must contain a "role" field with a string value.',
        validRoles: [...VALID_ROLES],
      });
      return;
    }

    const normalisedRole = newRole.toLowerCase().trim() as ValidRole;

    if (!VALID_ROLES.includes(normalisedRole)) {
      res.status(400).json({
        error: 'Invalid role',
        detail: `"${newRole}" is not a recognised role.`,
        validRoles: [...VALID_ROLES],
      });
      return;
    }

    // ── 4. Role-transition matrix check ───────────────────────────────────
    const allowedRoles = ROLE_ASSIGN_MATRIX[callerRole];
    if (!allowedRoles || !allowedRoles.includes(normalisedRole)) {
      res.status(403).json({
        error: 'Role assignment not permitted',
        detail: `Users with the "${callerRole}" role can only assign the following roles: ${allowedRoles?.join(', ') || 'none'}.`,
        requestedRole: normalisedRole,
        permittedRoles: allowedRoles ? [...allowedRoles] : [],
      });
      return;
    }

    // ── 5. Look up the target user ───────────────────────────────────────
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, tenantId: true, isActive: true },
    });

    if (!targetUser) {
      res.status(404).json({
        error: 'Target user not found',
        detail: `No user exists with id "${targetUserId}".`,
      });
      return;
    }

    // Ensure the target user belongs to the same tenant
    const target = targetUser as Record<string, unknown>;
    if (target.tenantId !== tenantId) {
      res.status(403).json({
        error: 'Cross-tenant operation denied',
        detail: 'You can only manage users within your own tenant.',
      });
      return;
    }

    const previousRole = target.role as string;

    // No-op if role hasn't changed
    if (previousRole === normalisedRole) {
      res.status(200).json({
        success: true,
        message: `Role is already set to ${normalisedRole.replace(/_/g, ' ')}. No change needed.`,
        user: { id: target.id, name: target.name, email: target.email, role: previousRole },
        previousRole,
        newRole: normalisedRole,
        changedBy: { id: callerId, role: callerRole, name: callerName },
      });
      return;
    }

    // ── 6. Update the user's role ─────────────────────────────────────────
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { role: normalisedRole },
    });

    // ── 7. Create audit log entry (matches Prisma AuditLog schema) ───────
    await db.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        userId: callerId,
        action: 'role_change',
        entity: 'User',
        entityId: targetUserId,
        oldValue: JSON.stringify({ role: previousRole }),
        newValue: JSON.stringify({ role: normalisedRole }),
        details: JSON.stringify({
          targetUserName: target.name,
          targetUserEmail: target.email,
          changedByName: callerName,
          changedByRole: callerRole,
          reason: reason || null,
        }),
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        device: 'api',
      },
    } as any).catch((err: Error) => {
      console.error('[Role Change Audit] Failed to log:', err.message);
    });

    // ── 8. Return the updated user with transition info ───────────────────
    const u = updatedUser as Record<string, unknown>;
    res.json({
      success: true,
      user: { id: u.id, name: u.name, email: u.email, role: u.role },
      previousRole,
      newRole: normalisedRole,
      changedBy: { id: callerId, role: callerRole, name: callerName },
      message: `Role changed from ${previousRole.replace(/_/g, ' ')} to ${normalisedRole.replace(/_/g, ' ')}.`,
    });
  } catch (error) {
    console.error('[UserManagement] Role update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      detail: (error as any)?.message || String(error),
    });
  }
});

export default router;
