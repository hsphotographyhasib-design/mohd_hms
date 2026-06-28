import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function logAudit(tenantId: string, userId: string, action: string, entityId: string, oldValue: string | null, newValue: string | null) {
  db.auditLog.create({
    data: { tenantId, userId, action, entity: 'InventoryItem', entityId, oldValue, newValue },
  }).catch(() => {});
}

// ─── GET: Single item with relations ───────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const item = await db.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true, code: true, color: true, icon: true } },
        subcategory: { select: { id: true, name: true, code: true } },
        suppliers: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true, code: true, type: true } } },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      warrantyExpiry: item.warrantyExpiry?.toISOString() || null,
    });
  } catch (error) {
    console.error('Inventory get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update item ──────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

    // Build update data from body — only include provided fields
    const data: Prisma.InventoryItemUpdateInput = {};

    const scalarFields: (keyof Prisma.InventoryItemCreateInput)[] = [
      'name', 'sku', 'barcode', 'shortName', 'itemType', 'description', 'shortDescription',
      'brand', 'manufacturer', 'model', 'partNumber', 'serialNumber', 'unit', 'unitWeight',
      'dimensions', 'purchaseCost', 'averageCost', 'standardCost', 'lastPurchaseCost',
      'sellingPrice', 'dealerPrice', 'contractorPrice', 'customerPrice', 'vipPrice',
      'internalCost', 'labourCost', 'installationCost', 'serviceCost', 'transportationCost',
      'mobilizationCost', 'equipmentRental', 'emergencyCallOut', 'afterHoursCharge',
      'weekendCharge', 'publicHolidayCharge', 'currency', 'quantity', 'minStock',
      'maxStock', 'reorderLevel', 'safetyStock', 'photos', 'attachments',
      'technicalDatasheet', 'msds', 'warranty', 'countryOfOrigin', 'hsCode',
      'tags', 'status', 'remarks', 'hourlyRate', 'dailyRate', 'overtimeRate',
      'weekendRate', 'publicHolidayRate', 'dailyRentalRate', 'monthlyRentalRate',
      'estimatedHours', 'requiredSkills', 'sop',
    ] as (keyof Prisma.InventoryItemCreateInput)[];

    for (const field of scalarFields) {
      if (body[field] !== undefined) {
        (data as Record<string, unknown>)[field] = body[field];
      }
    }

    // Date field
    if (body.warrantyExpiry !== undefined) {
      data.warrantyExpiry = body.warrantyExpiry ? new Date(body.warrantyExpiry) : null;
    }

    // Relation fields
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.subcategoryId !== undefined) data.subcategoryId = body.subcategoryId || null;
    if (body.approvalStatus !== undefined) data.approvalStatus = body.approvalStatus;
    if (body.approvedBy !== undefined) {
      data.approvedBy = body.approvedBy || null;
      data.approvedAt = body.approvedBy ? new Date() : null;
    }

    const updated = await db.inventoryItem.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, code: true, color: true } },
        subcategory: { select: { id: true, name: true, code: true } },
      },
    });

    // Audit log — capture changed fields
    const changedFields: string[] = [];
    for (const key of Object.keys(body)) {
      const oldVal = (existing as Record<string, unknown>)[key];
      const newVal = body[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
      }
    }
    if (changedFields.length > 0) {
      logAudit(tenantId, userId, 'update', id, JSON.stringify(Object.fromEntries(changedFields.map(f => [f, (existing as Record<string, unknown>)[f]]))), JSON.stringify(Object.fromEntries(changedFields.map(f => [f, body[f]]))));
    }

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      warrantyExpiry: updated.warrantyExpiry?.toISOString() || null,
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate value: SKU or barcode already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Soft delete (set isActive=false, status='archived') ──────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const { id } = await params;

    const existing = await db.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

    const oldStatus = existing.status;
    await db.inventoryItem.update({
      where: { id },
      data: { isActive: false, status: 'archived' },
    });

    logAudit(tenantId, userId, 'soft_delete', id, JSON.stringify({ status: oldStatus, isActive: true }), JSON.stringify({ status: 'archived', isActive: false }));

    return NextResponse.json({ message: 'Inventory item archived successfully' });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}