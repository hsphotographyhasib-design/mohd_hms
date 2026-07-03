import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

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

    // Verify item belongs to tenant
    const item = await db.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const [movements, total] = await Promise.all([
      db.inventoryMovement.findMany({
        where: { inventoryItemId: id, tenantId },
        include: {
          performedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.inventoryMovement.count({
        where: { inventoryItemId: id, tenantId },
      }),
    ]);

    return NextResponse.json({
      data: movements.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        inventoryItemId: m.inventoryItemId,
        itemName: item.name,
        itemSku: item.sku,
        type: m.type,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        reason: m.reason,
        referenceId: m.referenceId,
        referenceType: m.referenceType,
        performedByName: m.performedBy?.name || null,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Inventory movements list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
