import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

function generateQrId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QR-GEN-';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { equipmentIds } = body as { equipmentIds?: string[] };

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return NextResponse.json(
        { error: 'equipmentIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (equipmentIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 equipment IDs per request' },
        { status: 400 }
      );
    }

    // Verify all equipment exist and belong to tenant
    const equipmentList = await db.equipment.findMany({
      where: {
        id: { in: equipmentIds },
        tenantId,
      },
      include: { qrCodeRecord: true },
    });

    if (equipmentList.length === 0) {
      return NextResponse.json({ error: 'No valid equipment found' }, { status: 404 });
    }

    const foundIds = new Set(equipmentList.map((e) => e.id));
    const invalidIds = equipmentIds.filter((id) => !foundIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some equipment IDs not found or not accessible', invalidIds },
        { status: 400 }
      );
    }

    // Get tenant domain for URL generation
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { domain: true },
    });
    const tenantDomain = tenant?.domain || 'app.example.com';

    // Collect all existing qrIds to avoid collisions
    const existingQrIds = new Set(
      (await db.equipmentQrCode.findMany({
        select: { qrId: true },
      })).map((r) => r.qrId)
    );

    // Generate unique qrIds for each equipment
    function getUniqueQrId(): string {
      let qrId = generateQrId();
      let attempts = 0;
      while (existingQrIds.has(qrId) && attempts < 20) {
        qrId = generateQrId();
        attempts++;
      }
      existingQrIds.add(qrId);
      return qrId;
    }

    const results: Array<{
      equipmentId: string;
      qrId: string;
      qrUrl: string;
      assetNumber: string;
    }> = [];

    // Process each equipment inside a single transaction to avoid partial state
    await db.$transaction(async (tx) => {
      for (const equipment of equipmentList) {
        const newQrId = getUniqueQrId();
        const newQrUrl = `https://${tenantDomain}/equipment/${newQrId}`;

        // Deactivate old QR record if exists
        if (equipment.qrCodeRecord) {
          await tx.equipmentQrCode.update({
            where: { id: equipment.qrCodeRecord.id },
            data: { isActive: false },
          });
        }

        const newVersion = equipment.qrCodeRecord ? equipment.qrCodeRecord.version + 1 : 1;

        // Create new QR code record
        await tx.equipmentQrCode.create({
          data: {
            tenantId,
            equipmentId: equipment.id,
            qrId: newQrId,
            qrUrl: newQrUrl,
            isActive: true,
            lastRegeneratedAt: new Date(),
            version: newVersion,
          },
        });

        // Update equipment
        await tx.equipment.update({
          where: { id: equipment.id },
          data: {
            qrId: newQrId,
            qrCode: newQrUrl,
          },
        });

        results.push({
          equipmentId: equipment.id,
          qrId: newQrId,
          qrUrl: newQrUrl,
          assetNumber: equipment.assetNumber,
        });
      }
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('[Bulk QR Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}