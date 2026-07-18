import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: List inspections with pagination, filtering, and search ────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, userId, tenantId } = ctx;

    // Block customer role entirely
    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('pageSize') || '20');
    const status = sp.get('status') || '';
    const priority = sp.get('priority') || '';
    const type = sp.get('type') || '';
    const assignedToId = sp.get('assignedToId') || '';
    const equipmentId = sp.get('equipmentId') || '';
    const search = sp.get('search') || '';
    const view = sp.get('view') || '';
    const month = sp.get('month') || '';
    const fromDate = sp.get('fromDate') || '';
    const toDate = sp.get('toDate') || '';
    const skip = (page - 1) * pageSize;

    // Build WHERE clause
    const where: Record<string, unknown> = { tenantId };

    // Role-based scoping
    if (role === 'technician') {
      where.assignedToId = userId;
    }
    // supervisors, managers, admins, super_admins see all in tenant

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.inspectionType = type;
    if (assignedToId) where.assignedToId = assignedToId;
    if (equipmentId) where.equipmentId = equipmentId;

    if (search) {
      (where as Record<string, unknown>).OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { equipmentName: { contains: search } },
        { assignedToName: { contains: search } },
      ];
    }

    // Calendar view: filter by month
    if (view === 'calendar' && month) {
      const [yearStr, monthStr] = month.split('-');
      const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);
      where.scheduledDate = { gte: startDate, lte: endDate };
    }

    // Date range filter
    if (fromDate && !view) {
      if (!where.scheduledDate) where.scheduledDate = {};
      (where.scheduledDate as Record<string, unknown>).gte = new Date(fromDate);
    }
    if (toDate && !view) {
      if (!where.scheduledDate) where.scheduledDate = {};
      (where.scheduledDate as Record<string, unknown>).lte = new Date(toDate);
    }

    const [items, total] = await Promise.all([
      db.inspection.findMany({
        where,
        skip: view === 'calendar' ? 0 : skip,
        take: view === 'calendar' ? 1000 : pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          inspectionType: true,
          status: true,
          priority: true,
          result: true,
          equipmentName: true,
          assignedToName: true,
          scheduledDate: true,
          createdAt: true,
        },
      }),
      db.inspection.count({ where }),
    ]);

    const mapped = items.map((item) => ({
      id: item.id,
      title: item.title,
      equipmentName: item.equipmentName,
      assignedToName: item.assignedToName,
      scheduledDate: item.scheduledDate?.toISOString?.() ?? null,
      status: item.status,
      priority: item.priority,
      result: item.result,
      type: item.inspectionType,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageSize: view === 'calendar' ? 1000 : pageSize,
      totalPages: Math.ceil(total / (view === 'calendar' ? 1000 : pageSize)),
    });
  } catch (error) {
    console.error('Inspections list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create a new inspection ────────────────────────────────────────────
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

    if (!canPerformAction(role as UserRole, 'inspection', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      inspectionType,
      priority,
      equipmentId,
      equipmentName,
      assignedToId,
      assignedToName,
      templateId,
      scheduledDate,
      location,
      building,
      floor,
      room,
      complaintId,
      workOrderId,
      pmScheduleId,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Resolve creator name from DB
    let creatorName: string | undefined;
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      creatorName = user?.name || undefined;
    } catch {
      // Non-critical — skip
    }

    const inspection = await db.inspection.create({
      data: {
        tenantId,
        title: title.trim(),
        description: description?.trim() || null,
        inspectionType: inspectionType || 'routine',
        priority: priority || 'medium',
        status: 'scheduled',
        equipmentId: equipmentId || null,
        equipmentName: equipmentName || null,
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        templateId: templateId || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        location: location || null,
        building: building || null,
        floor: floor || null,
        room: room || null,
        complaintId: complaintId || null,
        workOrderId: workOrderId || null,
        pmScheduleId: pmScheduleId || null,
        createdBy: userId,
        creatorName,
        maxScore: 100,
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error('Inspection create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}