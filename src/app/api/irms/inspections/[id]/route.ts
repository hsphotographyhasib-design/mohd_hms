import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: Single inspection with full details ────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, userId, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            inspection: { select: { id: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            inspectionType: true,
            checklistItems: {
              select: {
                id: true,
                question: true,
                category: true,
                itemType: true,
                isRequired: true,
                sortOrder: true,
                helpText: true,
                options: true,
                minScore: true,
                maxScore: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Tenant isolation check
    if (inspection.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Technician scoping: only own inspections
    if (role === 'technician' && inspection.assignedToId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Serialize dates
    const serialized = {
      ...inspection,
      scheduledDate: inspection.scheduledDate?.toISOString() ?? null,
      startedAt: inspection.startedAt?.toISOString() ?? null,
      completedAt: inspection.completedAt?.toISOString() ?? null,
      dueDate: inspection.dueDate?.toISOString() ?? null,
      createdAt: inspection.createdAt.toISOString(),
      updatedAt: inspection.updatedAt.toISOString(),
      results: inspection.results.map((r: Record<string, unknown>) => ({
        ...r,
        createdAt: (r.createdAt as Date).toISOString(),
        updatedAt: (r.updatedAt as Date).toISOString(),
      })),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Inspection get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update inspection ──────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.inspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }
    if (existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status: newStatus, assignedToId, ...fields } = body;

    // Determine required permission based on what's being updated
    let requiredAction = 'update';
    if (newStatus === 'completed') {
      requiredAction = 'complete';
    }
    if (assignedToId !== undefined && assignedToId !== existing.assignedToId) {
      if (!canPerformAction(role as UserRole, 'inspection', 'assign')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!canPerformAction(role as UserRole, 'inspection', requiredAction)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate status transitions
    if (newStatus) {
      const validTransitions: Record<string, string[]> = {
        scheduled: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'failed', 'cancelled'],
        completed: [],
        failed: [],
        cancelled: [],
        overdue: ['in_progress', 'cancelled'],
      };
      const allowed = validTransitions[existing.status];
      if (!allowed || !allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition: ${existing.status} → ${newStatus}` },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...fields };

    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === 'in_progress' && !existing.startedAt) {
        updateData.startedAt = new Date();
      }
      if (newStatus === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId || null;
      // Resolve assignedToName if not provided
      if (assignedToId && !body.assignedToName) {
        try {
          const user = await db.user.findUnique({
            where: { id: assignedToId },
            select: { name: true },
          });
          updateData.assignedToName = user?.name || null;
        } catch {
          // Non-critical
        }
      } else if (body.assignedToName) {
        updateData.assignedToName = body.assignedToName;
      }
    }

    // Handle scheduledDate as Date
    if (fields.scheduledDate) {
      updateData.scheduledDate = new Date(fields.scheduledDate);
    }

    const updated = await db.inspection.update({
      where: { id },
      data: updateData,
    });

    const serialized = {
      ...updated,
      scheduledDate: updated.scheduledDate?.toISOString() ?? null,
      startedAt: updated.startedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Inspection update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Delete inspection ───────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.inspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }
    if (existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Prevent deletion of in-progress inspections
    if (existing.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot delete an inspection that is in progress' },
        { status: 400 },
      );
    }

    await db.inspection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inspection delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}