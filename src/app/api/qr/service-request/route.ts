import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipmentId, qrId, tenantId, customerName, customerPhone, customerEmail, description } = body;

    if (!equipmentId || !description || !description.trim()) {
      return NextResponse.json(
        { error: 'Equipment ID and description are required' },
        { status: 400 }
      );
    }

    // Verify equipment exists
    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId },
      select: {
        id: true,
        tenantId: true,
        customerId: true,
        name: true,
        category: true,
        location: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Generate a complaint number
    const count = await db.complaint.count({ where: { tenantId: equipment.tenantId } });
    const complaintNumber = `CMP-${String(count + 1).padStart(4, '0')}`;

    // Create the complaint
    const complaint = await db.complaint.create({
      data: {
        tenantId: equipment.tenantId,
        customerId: equipment.customerId || 'anonymous',
        equipmentId: equipment.id,
        title: `QR Service Request: ${equipment.name}`,
        description: description.trim(),
        priority: 'medium',
        status: 'NEW',
        source: 'qr_scan',
        category: equipment.category,
        resolutionNotes: customerName
          ? `Submitted via QR scan by: ${customerName}${customerPhone ? ` (${customerPhone})` : ''}${customerEmail ? ` - ${customerEmail}` : ''}`
          : 'Submitted via QR scan (anonymous)',
      },
    });

    // Create timeline entry
    await db.complaintTimeline.create({
      data: {
        complaintId: complaint.id,
        tenantId: equipment.tenantId,
        action: 'created',
        description: `Service request submitted via QR scan for equipment: ${equipment.name}`,
        performedByName: customerName || 'Anonymous (QR Scan)',
        performedByRole: 'customer',
      },
    });

    return NextResponse.json({
      success: true,
      id: complaint.id,
      complaintNumber,
      message: 'Service request submitted successfully',
    });
  } catch (error) {
    console.error('QR service request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
