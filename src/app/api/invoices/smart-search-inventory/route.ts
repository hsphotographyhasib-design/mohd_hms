import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type') || '';

    if (q.length < 2) return NextResponse.json({ results: [] });

    // Search inventory items using Prisma (database-agnostic)
    let items: any[] = [];
    if (!type || type === 'inventory') {
      const invItems = await db.inventoryItem.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { category: { contains: q } },
            { description: { contains: q } },
            { supplier: { contains: q } },
          ],
        },
        select: {
          id: true, name: true, sku: true, category: true,
          description: true, unit: true, quantity: true,
          unitCost: true, supplier: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
      });
      items = invItems.map(i => ({
        id: i.id,
        itemCode: i.sku || undefined,
        name: i.name,
        sellingPrice: Number(i.unitCost || 0),
        unit: i.unit,
        category: i.category,
        description: i.description,
        stockAvailable: i.quantity,
        supplier: i.supplier,
        itemType: 'inventory' as const,
        useCount: 0,
      }));
    }

    // If less than 3 results, search historical invoice items
    if (items.length < 3) {
      try {
        const invoices = await db.invoice.findMany({
          where: {
            tenantId,
            items: { not: null },
          },
          select: { items: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        });

        // Parse JSON items and find matches
        const itemMap = new Map<string, any>();
        const qLow = q.toLowerCase();
        for (const inv of invoices) {
          if (!inv.items) continue;
          let parsed: any[];
          try { parsed = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items; } catch { continue; }
          if (!Array.isArray(parsed)) continue;
          for (const item of parsed) {
            const title = (item.title || '').toLowerCase();
            if (title.includes(qLow)) {
              const key = item.title || '';
              const existing = itemMap.get(key);
              if (existing) {
                existing.useCount++;
              } else {
                itemMap.set(key, {
                  title: item.title,
                  description: item.description || null,
                  unit: item.unit || 'Nos',
                  rate: Number(item.rate || 0),
                  category: item.category || null,
                  itemType: 'history' as const,
                  useCount: 1,
                });
              }
            }
          }
        }

        const fallback = Array.from(itemMap.values())
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, limit - items.length);

        items = [...items, ...fallback];
      } catch { /* fallback failed, ignore */ }
    }

    return NextResponse.json({ results: items });
  } catch (error) {
    console.error('Smart inventory search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}