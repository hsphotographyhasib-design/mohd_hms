import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function logAudit(tenantId: string, userId: string, action: string, entityId: string, details: string) {
  db.auditLog.create({
    data: { tenantId, userId, action, entity: 'StockMovement', entityId, details },
  }).catch(() => {});
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
    let newQty = previousQty;

    // Calculate new item quantity based on movement type
    switch (type) {
      case 'stock_in':
      case 'return':
        newQty = previousQty + quantity;
        break;
      case 'stock_out':
      case 'damage':
        newQty = Math.max(0, previousQty - quantity);
        break;
      case 'adjustment':
        // For adjustment, quantity is the new total
        newQty = quantity;
        break;
      case 'transfer':
        // Transfer doesn't change total item qty, only warehouse stock
        break;
    }

    // Update item quantity (except for transfer which only moves between warehouses)
    if (type !== 'transfer') {
      await db.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQty },
      });
    }

    // Update warehouse stock
    if (warehouseId) {
      const parsedExpiry = expiryDate ? new Date(expiryDate) : undefined;

      const existingStock = await db.warehouseStock.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });

      if (type === 'stock_in' || type === 'return') {
        if (existingStock) {
          await db.warehouseStock.update({
            where: { id: existingStock.id },
            data: { quantity: existingStock.quantity + quantity },
          });
        } else {
          await db.warehouseStock.create({
            data: {
              tenantId,
              warehouseId,
              itemId,
              quantity,
              batchNo: batchNo || null,
              lotNumber: lotNumber || null,
              expiryDate: parsedExpiry,
              costMethod: 'fifo',
            },
          });
        }
      } else if (type === 'stock_out' || type === 'damage') {
        if (existingStock) {
          await db.warehouseStock.update({
            where: { id: existingStock.id },
            data: {
              quantity: Math.max(0, existingStock.quantity - quantity),
              ...(type === 'damage' ? { damaged: existingStock.damaged + quantity } : {}),
            },
          });
        } else {
          // No stock exists — create with 0 and record damage
          await db.warehouseStock.create({
            data: {
              tenantId,
              warehouseId,
              itemId,
              quantity: 0,
              damaged: type === 'damage' ? quantity : 0,
              batchNo: batchNo || null,
              lotNumber: lotNumber || null,
              expiryDate: parsedExpiry,
            },
          });
        }
      } else if (type === 'adjustment' && warehouseId) {
        if (existingStock) {
          await db.warehouseStock.update({
            where: { id: existingStock.id },
            data: { quantity: Math.max(0, newQty) },
          });
        } else {
          await db.warehouseStock.create({
            data: {
              tenantId,
              warehouseId,
              itemId,
              quantity: Math.max(0, newQty),
              batchNo: batchNo || null,
              lotNumber: lotNumber || null,
              expiryDate: parsedExpiry,
            },
          });
        }
      }
    }

    // Handle transfer: decrement from source, increment at destination
    if (type === 'transfer' && fromWarehouseId && warehouseId) {
      const fromStock = await db.warehouseStock.findUnique({
        where: { warehouseId_itemId: { warehouseId: fromWarehouseId, itemId } },
      });
      const toStock = await db.warehouseStock.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });

      if (fromStock) {
        await db.warehouseStock.update({
          where: { id: fromStock.id },
          data: { quantity: Math.max(0, fromStock.quantity - quantity) },
        });
      }

      if (toStock) {
        await db.warehouseStock.update({
          where: { id: toStock.id },
          data: { quantity: toStock.quantity + quantity },
        });
      } else {
        await db.warehouseStock.create({
          data: { tenantId, warehouseId, itemId, quantity },
        });
      }
    }

    // Create stock movement record
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : undefined;
    const movement = await db.stockMovement.create({
      data: {
        tenantId,
        itemId,
        warehouseId: warehouseId || null,
        type,
        quantity,
        previousQty,
        newQty: type === 'adjustment' ? newQty : newQty,
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