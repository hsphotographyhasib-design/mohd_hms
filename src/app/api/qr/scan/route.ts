import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrId } = body;

    if (!qrId) {
      return NextResponse.json({ error: 'qrId is required' }, { status: 400 });
    }

    // Find equipment by qrId
    const equipment = await db.equipment.findFirst({
      where: {
        OR: [
          { qrId },
          { qrCodeRecord: { qrId } },
        ],
      },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || null;
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const referer = request.headers.get('referer') || null;

    // Simple device detection
    let device: string | null = null;
    let browser: string | null = null;
    if (userAgent) {
      if (/mobile|android|iphone|ipod|ipad/i.test(userAgent)) device = 'mobile';
      else if (/tablet|ipad/i.test(userAgent)) device = 'tablet';
      else device = 'desktop';

      if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) browser = 'Chrome';
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
      else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
      else if (/Edge|Edg/i.test(userAgent)) browser = 'Edge';
      else browser = 'Other';
    }

    // Log the scan
    await db.scanLog.create({
      data: {
        tenantId: equipment.tenantId,
        equipmentId: equipment.id,
        qrId,
        scannedByName: 'Anonymous',
        ipAddress: ip,
        userAgent,
        device,
        browser,
        referer,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scan log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
