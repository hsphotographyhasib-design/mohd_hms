import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function generateQrId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QR-GEN-';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET — Fetch current QR code info for an equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tenantId = payload.tenantId as string;

    const equipment = await db.equipment.findFirst({
      where: { id, tenantId },
      include: {
        qrCodeRecord: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Fetch recent scan logs (last 20)
    const recentScans = await db.scanLog.findMany({
      where: { equipmentId: id, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        qrId: true,
        scannedByName: true,
        device: true,
        browser: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      id: equipment.id,
      name: equipment.name,
      assetNumber: equipment.assetNumber,
      qrId: equipment.qrId,
      qrCode: equipment.qrCode,
      scanCount: equipment.scanCount,
      lastScannedAt: equipment.lastScannedAt,
      qrCodeRecord: equipment.qrCodeRecord
        ? {
            id: equipment.qrCodeRecord.id,
            qrId: equipment.qrCodeRecord.qrId,
            qrUrl: equipment.qrCodeRecord.qrUrl,
            isActive: equipment.qrCodeRecord.isActive,
            generatedAt: equipment.qrCodeRecord.generatedAt,
            lastRegeneratedAt: equipment.qrCodeRecord.lastRegeneratedAt,
            version: equipment.qrCodeRecord.version,
          }
        : null,
      recentScans,
    });
  } catch (error) {
    console.error('[Equipment QR GET Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Regenerate QR code for this equipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tenantId = payload.tenantId as string;

    // Verify equipment exists and belongs to tenant
    const equipment = await db.equipment.findFirst({
      where: { id, tenantId },
      include: { qrCodeRecord: true },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Generate new unique qrId
    let newQrId = generateQrId();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await db.equipmentQrCode.findUnique({ where: { qrId: newQrId } });
      if (!existing) {
        isUnique = true;
      } else {
        newQrId = generateQrId();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique QR code. Please try again.' },
        { status: 500 }
      );
    }

    const tenantDomain = (await db.tenant.findUnique({
      where: { id: tenantId },
      select: { domain: true },
    }))?.domain || 'app.example.com';

    const newQrUrl = `https://${tenantDomain}/equipment/${newQrId}`;

    // Use transaction to deactivate old QR, create new one, and update equipment
    const result = await db.$transaction(async (tx) => {
      // Deactivate old QR code record if exists
      if (equipment.qrCodeRecord) {
        await tx.equipmentQrCode.update({
          where: { id: equipment.qrCodeRecord.id },
          data: { isActive: false },
        });
      }

      // Create new QR code record
      const newQrRecord = await tx.equipmentQrCode.create({
        data: {
          tenantId,
          equipmentId: equipment.id,
          qrId: newQrId,
          qrUrl: newQrUrl,
          isActive: true,
          lastRegeneratedAt: new Date(),
          version: equipment.qrCodeRecord ? equipment.qrCodeRecord.version + 1 : 1,
        },
      });

      // Update equipment
      const updatedEquipment = await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          qrId: newQrId,
          qrCode: newQrUrl,
        },
        select: { id: true, qrId: true, qrCode: true },
      });

      return { newQrRecord, updatedEquipment };
    });

    return NextResponse.json({
      success: true,
      message: 'QR code regenerated successfully',
      data: {
        equipmentId: result.updatedEquipment.id,
        qrId: result.newQrRecord.qrId,
        qrUrl: result.newQrRecord.qrUrl,
        version: result.newQrRecord.version,
        regeneratedAt: result.newQrRecord.lastRegeneratedAt,
      },
    });
  } catch (error) {
    console.error('[Equipment QR POST Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}