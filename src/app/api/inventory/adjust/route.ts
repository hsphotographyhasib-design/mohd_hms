import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();
    const { itemId, type, quantity, reason, referenceId, referenceType } = body;

    if (!itemId || !type || !quantity) {
      return NextResponse.json(
        { error: 'itemId, type, and quantity are required' },
        { status: 400 }
      );
    }

    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'reserved', 'reserved_released', 'work_order_used'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
    }

    const item = await db.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const abs = Math.abs(quantity);

    // Update the item quantity atomically (increment/decrement translate to a single
    // `SET quantity = quantity +/- N` statement, so concurrent movements can't clobber
    // each other the way a read-then-write-absolute-value would) and log the movement
    // in the same transaction.
    const movement = await db.$transaction(async (tx) => {
      let previousQuantity: number;
      let newQuantity: number;

      switch (type) {
        case 'stock_in':
        case 'reserved_released': {
          const updated = await tx.inventoryItem.update({
            where: { id: itemId },
            data: { quantity: { increment: abs } },
          });
          newQuantity = updated.quantity;
          previousQuantity = newQuantity - abs;
          break;
        }
        case 'stock_out':
        case 'work_order_used': {
          const decremented = await tx.inventoryItem.updateMany({
            where: { id: itemId, tenantId, quantity: { gte: abs } },
            data: { quantity: { decrement: abs } },
          });
          if (decremented.count > 0) {
            const updated = await tx.inventoryItem.findFirstOrThrow({ where: { id: itemId, tenantId } });
            newQuantity = updated.quantity;
            previousQuantity = newQuantity + abs;
          } else {
            // Not enough stock left to cover the full amount — clamp to zero.
            const current = await tx.inventoryItem.findFirstOrThrow({ where: { id: itemId, tenantId } });
            previousQuantity = current.quantity;
            newQuantity = 0;
            await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: 0 } });
          }
          break;
        }
        case 'adjustment': {
          previousQuantity = item.quantity;
          newQuantity = quantity; // absolute value for adjustments
          await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQuantity } });
          break;
        }
        default: {
          // 'reserved' — doesn't change actual qty, just logs intent
          previousQuantity = item.quantity;
          newQuantity = item.quantity;
          break;
        }
      }

      return tx.inventoryMovement.create({
        data: {
          tenantId,
          inventoryItemId: itemId,
          type,
          quantity: abs,
          previousQuantity,
          newQuantity,
          reason: reason || null,
          referenceId: referenceId || null,
          referenceType: referenceType || null,
          performedById: userId,
        },
        include: {
          performedBy: { select: { name: true } },
        },
      });
    });

    return NextResponse.json({
      id: movement.id,
      tenantId: movement.tenantId,
      inventoryItemId: movement.inventoryItemId,
      type: movement.type,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      reason: movement.reason,
      referenceId: movement.referenceId,
      referenceType: movement.referenceType,
      performedByName: movement.performedBy?.name || null,
      createdAt: movement.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Stock adjust error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
