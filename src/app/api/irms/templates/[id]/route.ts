import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: Single template with checklist items ───────────────────────────────
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

    const { role, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const template = await db.inspectionTemplate.findUnique({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { inspections: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const serialized = {
      ...template,
      checklistItems: template.checklistItems.map((item: Record<string, unknown>) => ({
        ...item,
        createdAt: (item.createdAt as Date).toISOString(),
        updatedAt: (item.updatedAt as Date).toISOString(),
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      usageCount: (template._count as Record<string, number>).inspections,
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Template get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update template ────────────────────────────────────────────────────
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

    if (!canPerformAction(role as UserRole, 'inspection', 'manage_templates')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.inspectionTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, category, inspectionType, isActive, checklistItems } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category || null;
    if (inspectionType !== undefined) updateData.inspectionType = inspectionType;
    if (isActive !== undefined) updateData.isActive = isActive;

    // If checklist items are provided, replace them all in a transaction
    if (Array.isArray(checklistItems)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.$transaction(async (tx: any) => {
        // Update template
        await tx.inspectionTemplate.update({
          where: { id },
          data: updateData,
        });

        // Delete existing items
        await tx.inspectionChecklistItem.deleteMany({
          where: { templateId: id },
        });

        // Create new items
        if (checklistItems.length > 0) {
          const items = checklistItems.map(
            (item: Record<string, unknown>, index: number) => ({
              tenantId,
              templateId: id,
              question: (item.question as string).trim(),
              category: item.category || null,
              itemType: item.type || 'pass_fail',
              isRequired: item.required !== false,
              sortOrder: item.sortOrder ?? index,
              helpText: item.helpText || null,
              options: item.options ? JSON.stringify(item.options) : null,
              minScore: item.minScore ?? null,
              maxScore: item.maxScore ?? null,
            }),
          );

          await tx.inspectionChecklistItem.createMany({
            data: items,
          });
        }
      });
    } else {
      await db.inspectionTemplate.update({
        where: { id },
        data: updateData,
      });
    }

    // Fetch and return updated template with items
    const updated = await db.inspectionTemplate.findUnique({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { inspections: true },
        },
      },
    });

    const serialized = {
      ...updated,
      checklistItems: updated.checklistItems.map((item: Record<string, unknown>) => ({
        ...item,
        createdAt: (item.createdAt as Date).toISOString(),
        updatedAt: (item.updatedAt as Date).toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      usageCount: (updated._count as Record<string, number>).inspections,
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Delete template and cascade checklist items ─────────────────────
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

    if (!canPerformAction(role as UserRole, 'inspection', 'manage_templates')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.inspectionTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if template is in use
    const usageCount = await db.inspection.count({
      where: { templateId: id },
    });
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete template: ${usageCount} inspection(s) reference this template` },
        { status: 400 },
      );
    }

    // Cascade delete: checklist items are deleted via onDelete: Cascade
    await db.inspectionTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}