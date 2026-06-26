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

    const equipment = await db.equipment.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true } },
        _count: { select: { complaints: true, workOrders: true, pmSchedules: true } },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: equipment.id,
      tenantId: equipment.tenantId,
      customerId: equipment.customerId,
      customerName: equipment.customer?.name,
      name: equipment.name,
      category: equipment.category,
      assetNumber: equipment.assetNumber,
      qrCode: equipment.qrCode,
      qrId: equipment.qrId,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      location: equipment.location,
      building: equipment.building,
      room: equipment.room,
      installDate: equipment.installDate?.toISOString(),
      warrantyExpiry: equipment.warrantyExpiry?.toISOString(),
      warrantyInfo: equipment.warrantyInfo,
      status: equipment.status,
      condition: equipment.condition,
      scanCount: equipment.scanCount,
      lastScannedAt: equipment.lastScannedAt?.toISOString(),
      photos: equipment.photos,
      documents: equipment.documents,
      specifications: equipment.specifications,
      notes: equipment.notes,
      createdAt: equipment.createdAt.toISOString(),
      updatedAt: equipment.updatedAt.toISOString(),
      _count: equipment._count,
    });
  } catch (error) {
    console.error('Equipment get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();

    const existing = await db.equipment.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

    const updated = await db.equipment.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.category && { category: body.category }),
        ...(body.customerId !== undefined && { customerId: body.customerId || null }),
        ...(body.brand !== undefined && { brand: body.brand || null }),
        ...(body.model !== undefined && { model: body.model || null }),
        ...(body.serialNumber !== undefined && { serialNumber: body.serialNumber || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.installDate !== undefined && { installDate: body.installDate ? new Date(body.installDate) : null }),
        ...(body.warrantyExpiry !== undefined && { warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null }),
        ...(body.status && { status: body.status }),
        ...(body.photos !== undefined && { photos: body.photos || null }),
        ...(body.documents !== undefined && { documents: body.documents || null }),
        ...(body.specifications !== undefined && { specifications: body.specifications ? JSON.stringify(body.specifications) : null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
      },
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer?.name,
      name: updated.name,
      category: updated.category,
      assetNumber: updated.assetNumber,
      qrCode: updated.qrCode,
      brand: updated.brand,
      model: updated.model,
      serialNumber: updated.serialNumber,
      location: updated.location,
      installDate: updated.installDate?.toISOString(),
      warrantyExpiry: updated.warrantyExpiry?.toISOString(),
      status: updated.status,
      photos: updated.photos,
      documents: updated.documents,
      specifications: updated.specifications,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Equipment update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await db.equipment.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

    await db.equipment.delete({ where: { id } });
    return NextResponse.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    console.error('Equipment delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
