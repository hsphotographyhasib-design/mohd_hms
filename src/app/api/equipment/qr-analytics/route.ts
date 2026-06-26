import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'last_7_days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'last_30_days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'last_90_days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'last_6_months':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case 'last_year':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const equipmentId = request.nextUrl.searchParams.get('equipmentId');
    const period = request.nextUrl.searchParams.get('period') || 'last_30_days';

    const periodStart = getPeriodStart(period);

    // Build where clause
    const scanWhere: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: periodStart },
    };
    if (equipmentId) {
      scanWhere.equipmentId = equipmentId;
    }

    // Fetch total scans, unique scanners, and device breakdown in parallel
    const [totalScans, scanLogs] = await Promise.all([
      db.scanLog.count({ where: scanWhere }),
      db.scanLog.findMany({
        where: scanWhere,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          equipment: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Compute unique scanners by IP
    const uniqueIps = new Set(scanLogs.map((s) => s.ipAddress).filter(Boolean));
    const uniqueScanners = uniqueIps.size;

    // Device breakdown
    const deviceBreakdown: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    for (const log of scanLogs) {
      const d = log.device || 'desktop';
      if (d in deviceBreakdown) {
        deviceBreakdown[d]++;
      }
    }

    // Top equipment by scan count
    const topEquipmentScans = await db.scanLog.groupBy({
      by: ['equipmentId'],
      where: scanWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topEquipmentIds = topEquipmentScans.map((e) => e.equipmentId);
    const equipmentMap = new Map<string, string>();
    if (topEquipmentIds.length > 0) {
      const equipmentList = await db.equipment.findMany({
        where: { id: { in: topEquipmentIds } },
        select: { id: true, name: true },
      });
      for (const eq of equipmentList) {
        equipmentMap.set(eq.id, eq.name);
      }
    }

    const topEquipment = topEquipmentScans.map((e) => ({
      name: equipmentMap.get(e.equipmentId) || 'Unknown',
      scanCount: e._count.id,
    }));

    // Recent scans (last 20)
    const recentScans = scanLogs.slice(0, 20).map((log) => ({
      id: log.id,
      equipmentName: log.equipment?.name || 'Unknown',
      scannedByName: log.scannedByName || 'Anonymous',
      device: log.device || 'unknown',
      createdAt: log.createdAt.toISOString(),
    }));

    // Daily trend
    const dailyTrend = await db.$queryRawUnsafe<Array<{ date: string; scans: number }>>(
      `
      SELECT DATE(createdAt) as date, COUNT(*) as scans
      FROM ScanLog
      WHERE tenantId = ? AND createdAt >= ?
      ${equipmentId ? 'AND equipmentId = ?' : ''}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
      `,
      ...(equipmentId ? [tenantId, periodStart.toISOString(), equipmentId] : [tenantId, periodStart.toISOString()])
    );

    return NextResponse.json({
      totalScans,
      uniqueScanners,
      topEquipment,
      recentScans,
      dailyTrend: dailyTrend.map((d) => ({
        date: d.date,
        scans: d.scans,
      })),
      deviceBreakdown,
    });
  } catch (error) {
    console.error('[QR Analytics Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}