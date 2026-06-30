import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const type = searchParams.get('type') || ''; // inventory, labour, service

    if (q.length < 2) return NextResponse.json({ results: [] });

    const escaped = q.toLowerCase().replace(/'/g, "''");

    // Search inventory items
    let items: any[] = [];
    try {
      items = await db.$queryRawUnsafe<any[]>(`
        SELECT
          i.id,
          i.name,
          i.sku,
          i.category,
          i.description,
          i.unit,
          i.quantity as "stockAvailable",
          i."unitCost" as "unitPrice",
          i.supplier,
          'inventory' as "itemType"
        FROM "InventoryItem" i
        WHERE i.tenantId = '${tenantId}'
          AND i.isActive = 1
          AND (
            LOWER(i.name) LIKE '%${escaped}%'
            OR LOWER(i.sku) LIKE '%${escaped}%'
            OR LOWER(i.category) LIKE '%${escaped}%'
            OR LOWER(i.description) LIKE '%${escaped}%'
            OR LOWER(i.supplier) LIKE '%${escaped}%'
          )
          ${type && type !== 'inventory' ? "AND 1=0" : ''}
        ORDER BY i.name ASC
        LIMIT ${limit}
      `);
    } catch { /* inventory table might not exist */ }

    // If less than 3 results, fall back to historical quotation items
    if (items.length < 3) {
      try {
        const fallback = await db.$queryRawUnsafe<any[]>(`
          SELECT DISTINCT
            json_extract(q.items, '$[' || idx || '].title') as title,
            json_extract(q.items, '$[' || idx || '].description') as description,
            json_extract(q.items, '$[' || idx || '].unit') as unit,
            json_extract(q.items, '$[' || idx || '].rate') as rate,
            json_extract(q.items, '$[' || idx || '].category') as category,
            json_extract(q.items, '$[' || idx || '].warranty') as warranty,
            'history' as "itemType",
            COUNT(*) as "useCount"
          FROM Quotation q,
               json_each(json_array_length(q.items)) as arr,
               (SELECT value FROM json_each(json_array_length(q.items))) as idx
          WHERE q.tenantId = '${tenantId}'
            AND q.items IS NOT NULL
            AND LOWER(json_extract(q.items, '$[' || idx || '].title')) LIKE '%${escaped}%'
          GROUP BY title
          ORDER BY "useCount" DESC
          LIMIT ${limit - items.length}
        `);
        items = [...items, ...fallback];
      } catch { /* fallback query failed, ignore */ }
    }

    return NextResponse.json({
      results: items.map(i => ({
        id: i.id || undefined,
        name: i.name || i.title || '',
        sku: i.sku || null,
        category: i.category || null,
        description: i.description || null,
        unit: i.unit || 'Nos',
        unitPrice: Number(i.unitPrice || i.rate || 0),
        stockAvailable: i.stockAvailable != null ? Number(i.stockAvailable) : null,
        supplier: i.supplier || null,
        itemType: i.itemType || 'inventory',
        useCount: i.useCount ? Number(i.useCount) : 0,
      })),
    });
  } catch (error) {
    console.error('Smart inventory search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}