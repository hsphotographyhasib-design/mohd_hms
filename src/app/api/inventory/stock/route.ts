import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Tx = Prisma.TransactionClient;

function logAudit(tenantId: string, userId: string, action: string, entityId: string, details: string) {
  db.auditLog.create({
    data: { tenantId, userId, action, entity: 'StockMovement', entityId, details },
  }).catch(() => {});
}

// Atomically increments the item's total quantity and returns the new value.
async function incrementItemQuantity(tx: Tx, itemId: string, delta: number): Promise<number> {
  const updated = await tx.inventoryItem.update({
    where: { id: itemId },
    data: { quantity: { increment: delta } },
  });
  return updated.quantity;
}

// Atomically decrements the item's total quantity, flooring at zero, and returns the new value.
async function decrementItemQuantityFloored(tx: Tx, itemId: string, tenantId: string, delta: number): Promise<number> {
  const decremented = await tx.inventoryItem.updateMany({
    where: { id: itemId, tenantId, quantity: { gte: delta } },
    data: { quantity: { decrement: delta } },
  });
  if (decremented.count > 0) {
    const updated = await tx.inventoryItem.findFirstOrThrow({ where: { id: itemId, tenantId } });
    return updated.quantity;
  }
  await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: 0 } });
  return 0;
}

// Atomically increments a warehouse's stock for an item (creating the row if needed).
async function incrementWarehouseStock(
  tx: Tx,
  tenantId: string,
  warehouseId: string,
  itemId: string,
  delta: number,
  createExtra: Partial<Prisma.WarehouseStockCreateInput> = {}
): Promise<void> {
  await tx.warehouseStock.upsert({
    where: { warehouseId_itemId: { warehouseId, itemId } },
    update: { quantity: { increment: delta } },
    create: { tenantId, warehouseId, itemId, quantity: delta, ...createExtra },
  });
}

// Atomically decrements a warehouse's stock for an item, flooring at zero.
async function decrementWarehouseStockFloored(
  tx: Tx,
  tenantId: string,
  warehouseId: string,
  itemId: string,
  delta: number,
  damagedDelta = 0
): Promise<void> {
  const decremented = await tx.warehouseStock.updateMany({
    where: { warehouseId, itemId, quantity: { gte: delta } },
    data: { quantity: { decrement: delta } },
  });
  if (decremented.count === 0) {
    const existing = await tx.warehouseStock.findUnique({ where: { warehouseId_itemId: { warehouseId, itemId } } });
    if (existing) {
      await tx.warehouseStock.update({ where: { id: existing.id }, data: { quantity: 0 } });
    } else {
      await tx.warehouseStock.create({ data: { tenantId, warehouseId, itemId, quantity: 0 } });
    }
  }
  if (damagedDelta > 0) {
    await tx.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { damaged: { increment: damagedDelta } },
    });
  }
}

// ─── POST: Record stock movement ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();

    const { itemId, warehouseId, type, quantity, reason, referenceNo, referenceType, fromWarehouseId, batchNo, lotNumber, expiryDate, unitCost, notes } = body;

    if (!itemId || !type || quantity === undefined || quantity <= 0) {
      return NextResponse.json({ error: 'itemId, type, and positive quantity are required' }, { status: 400 });
    }

    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'transfer', 'return', 'damage'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid movement type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Verify item exists
    const item = await db.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    // For types requiring a warehouse, verify it
    if (type !== 'adjustment' || warehouseId) {
      if (warehouseId) {
        const wh = await db.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
        if (!wh) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
      }
    }

    // For transfer, verify from warehouse
    if (type === 'transfer') {
      if (!fromWarehouseId) return NextResponse.json({ error: 'fromWarehouseId is required for transfers' }, { status: 400 });
      if (fromWarehouseId === warehouseId) return NextResponse.json({ error: 'Source and destination warehouses must be different' }, { status: 400 });
      const fromWh = await db.warehouse.findFirst({ where: { id: fromWarehouseId, tenantId } });
      if (!fromWh) return NextResponse.json({ error: 'Source warehouse not found' }, { status: 404 });
    }

    const previousQty = item.quantity;

    // Atomic: all stock writes in a single transaction. Item/warehouse quantities are
    // updated via atomic increment/decrement (a single `SET qty = qty +/- N` statement)
    // rather than read-then-write-absolute-value, so concurrent movements on the same
    // item/warehouse can't silently clobber each other.
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : undefined;
    const movement = await db.$transaction(async (tx) => {
      let newQty = previousQty;

      switch (type) {
        case 'stock_in':
        case 'return':
          newQty = await incrementItemQuantity(tx, itemId, quantity);
          break;
        case 'stock_out':
        case 'damage':
          newQty = await decrementItemQuantityFloored(tx, itemId, tenantId, quantity);
          break;
        case 'adjustment':
          // For adjustment, quantity is the new total (absolute set — inherent to the
          // operation), floored at zero so a negative payload can't corrupt stock.
          newQty = Math.max(0, quantity);
          await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQty } });
          break;
        case 'transfer':
          // Transfer doesn't change total item qty, only warehouse stock.
          break;
      }

      // Update warehouse stock
      if (warehouseId) {
        const createExtra = {
          batchNo: batchNo || null,
          lotNumber: lotNumber || null,
          expiryDate: parsedExpiryDate,
          ...(type === 'stock_in' || type === 'return' ? { costMethod: 'fifo' } : {}),
        };

        if (type === 'stock_in' || type === 'return') {
          await incrementWarehouseStock(tx, tenantId, warehouseId, itemId, quantity, createExtra);
        } else if (type === 'stock_out' || type === 'damage') {
          await decrementWarehouseStockFloored(tx, tenantId, warehouseId, itemId, quantity, type === 'damage' ? quantity : 0);
        } else if (type === 'adjustment') {
          await tx.warehouseStock.upsert({
            where: { warehouseId_itemId: { warehouseId, itemId } },
            update: { quantity: Math.max(0, newQty) },
            create: { tenantId, warehouseId, itemId, quantity: Math.max(0, newQty), ...createExtra },
          });
        }
      }

      // Handle transfer: decrement from source, increment at destination
      if (type === 'transfer' && fromWarehouseId && warehouseId) {
        await decrementWarehouseStockFloored(tx, tenantId, fromWarehouseId, itemId, quantity);
        await incrementWarehouseStock(tx, tenantId, warehouseId, itemId, quantity);
      }

      // Create stock movement record
      return tx.stockMovement.create({
        data: {
          tenantId,
          itemId,
          warehouseId: warehouseId || null,
          type,
          quantity,
          previousQty,
          newQty,
          reason: reason || null,
          referenceNo: referenceNo || null,
          referenceType: referenceType || null,
          fromWarehouseId: fromWarehouseId || null,
          batchNo: batchNo || null,
          lotNumber: lotNumber || null,
          expiryDate: parsedExpiryDate,
          unitCost: unitCost || 0,
          notes: notes || null,
          performedBy: userId,
        },
        include: {
          item: { select: { id: true, name: true, itemCode: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });
    });

    logAudit(tenantId, userId, `stock_${type}`, itemId, JSON.stringify({ type, quantity, warehouseId, fromWarehouseId, referenceNo }));

    return NextResponse.json({ ...movement, createdAt: movement.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Stock movement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── GET: List stock movements with pagination and filters ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const sp = request.nextUrl.searchParams;

    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('pageSize') || '20');
    const itemId = sp.get('itemId') || '';
    const warehouseId = sp.get('warehouseId') || '';
    const type = sp.get('type') || '';
    const dateFrom = sp.get('dateFrom') || '';
    const dateTo = sp.get('dateTo') || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };

    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;

    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo);
      where.createdAt = createdAt;
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, itemCode: true, unit: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      db.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: movements.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Stock movements list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
