import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrId: string }> }
) {
  try {
    const { qrId } = await params;

    // Find the equipment by qrId (the short QR ID like QR-GEN-NFYH3RZAA)
    const equipment = await db.equipment.findFirst({
      where: {
        OR: [
          { qrId: qrId },
          { qrCode: qrId },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            logo: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        _count: {
          select: { complaints: true, workOrders: true },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Increment scan count
    await db.equipment.update({
      where: { id: equipment.id },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    });

    // Fetch maintenance history (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const complaints = await db.complaint.findMany({
      where: {
        equipmentId: equipment.id,
        createdAt: { gte: oneYearAgo },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workOrders = await db.workOrder.findMany({
      where: {
        equipmentId: equipment.id,
        createdAt: { gte: oneYearAgo },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        completedAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build maintenance history
    const maintenanceHistory = [
      ...complaints.map((c) => ({
        id: c.id,
        type: 'complaint' as const,
        title: c.title,
        description: c.description,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        completedAt: c.completedAt?.toISOString() ?? null,
        assignedToName: c.assignedTo?.name ?? null,
        complaintNumber: c.id.slice(-6).toUpperCase(),
        priority: c.priority,
      })),
      ...workOrders.map((wo) => ({
        id: wo.id,
        type: (wo.type === 'preventive' ? 'pm' : 'work_order') as const,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        createdAt: wo.createdAt.toISOString(),
        completedAt: wo.completedAt?.toISOString() ?? null,
        assignedToName: wo.assignedTo?.name ?? null,
        workOrderNumber: wo.id.slice(-6).toUpperCase(),
        priority: wo.priority,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      equipment: {
        id: equipment.id,
        name: equipment.name,
        category: equipment.category,
        assetNumber: equipment.assetNumber,
        qrCode: equipment.qrCode,
        qrId: equipment.qrId || '',
        brand: equipment.brand,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        location: equipment.location,
        building: equipment.building,
        room: equipment.room,
        installDate: equipment.installDate?.toISOString() ?? null,
        warrantyExpiry: equipment.warrantyExpiry?.toISOString() ?? null,
        warrantyInfo: equipment.warrantyInfo,
        status: equipment.status,
        condition: equipment.condition,
        photos: equipment.photos,
        specifications: equipment.specifications,
        notes: equipment.notes,
        scanCount: equipment.scanCount + 1, // Already incremented
        lastScannedAt: new Date().toISOString(),
        createdAt: equipment.createdAt.toISOString(),
      },
      tenant: equipment.tenant,
      customer: equipment.customer,
      maintenanceHistory,
    });
  } catch (error) {
    console.error('QR lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
