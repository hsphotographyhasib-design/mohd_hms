import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const query = request.nextUrl.searchParams.get('q') || '';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const q = query.toLowerCase();

    // Search all quotation items across tenant
    const quotations = await db.quotation.findMany({
      where: { tenantId },
      select: { items: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    // Parse and collect unique items
    const itemMap = new Map<string, {
      title: string;
      description?: string;
      unit: string;
      rate: number;
      category?: string;
      warranty?: string;
      count: number;
    }>();

    for (const quot of quotations) {
      if (!quot.items) continue;
      try {
        const parsed: Array<{
          title?: string;
          description?: string;
          unit?: string;
          rate?: number;
          category?: string;
          warranty?: string;
        }> = typeof quot.items === 'string' ? JSON.parse(quot.items) : quot.items;

        for (const item of parsed) {
          if (!item.title || !item.title.trim()) continue;
          const key = item.title.trim().toLowerCase();
          if (itemMap.has(key)) {
            const existing = itemMap.get(key)!;
            existing.count++;
            // Keep the most recent non-empty values
            if (item.description) existing.description = item.description;
            if (item.category) existing.category = item.category;
            if (item.warranty) existing.warranty = item.warranty;
          } else {
            itemMap.set(key, {
              title: item.title.trim(),
              description: item.description || undefined,
              unit: item.unit || 'pcs',
              rate: item.rate || 0,
              category: item.category,
              warranty: item.warranty,
              count: 1,
            });
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Filter by query and sort by frequency then alphabetically
    const filtered = Array.from(itemMap.values())
      .filter((item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      )
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, limit);

    return NextResponse.json({ suggestions: filtered });
  } catch (error) {
    console.error('Item suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}