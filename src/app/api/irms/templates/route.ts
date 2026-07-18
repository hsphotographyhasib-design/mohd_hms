import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: List templates ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
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

    const category = request.nextUrl.searchParams.get('category') || '';

    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;

    const templates = await db.inspectionTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { checklistItems: true, inspections: true },
        },
      },
    });

    const mapped = templates.map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      inspectionType: t.inspectionType,
      isActive: t.isActive,
      createdById: t.createdById,
      createdByName: t.createdByName,
      checklistItemCount: (t._count as Record<string, number>).checklistItems,
      usageCount: (t._count as Record<string, number>).inspections,
      createdAt: (t.createdAt as Date).toISOString(),
      updatedAt: (t.updatedAt as Date).toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create template ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
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

    if (!canPerformAction(role as UserRole, 'inspection', 'manage_templates')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      inspectionType,
      checklistItems,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!Array.isArray(checklistItems) || checklistItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one checklist item is required' },
        { status: 400 },
      );
    }

    // Resolve creator name
    let creatorName: string | undefined;
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      creatorName = user?.name || undefined;
    } catch {
      // Non-critical
    }

    // Create template with checklist items in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = await db.$transaction(async (tx: any) => {
      const createdTemplate = await tx.inspectionTemplate.create({
        data: {
          tenantId,
          name: name.trim(),
          description: description?.trim() || null,
          category: category || null,
          inspectionType: inspectionType || 'routine',
          createdById: userId,
          createdByName: creatorName,
        },
      });

      const items = checklistItems.map(
        (item: Record<string, unknown>, index: number) => ({
          tenantId,
          templateId: createdTemplate.id,
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

      return createdTemplate;
    });

    // Fetch the created template with items for response
    const templateWithItems = await db.inspectionTemplate.findUnique({
      where: { id: (template as Record<string, unknown>).id as string },
      include: {
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(templateWithItems, { status: 201 });
  } catch (error) {
    console.error('Template create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}