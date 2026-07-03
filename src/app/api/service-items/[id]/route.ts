import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    const item = await db.serviceItem.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        materials: { orderBy: { sortOrder: 'asc' } },
        equipment: { orderBy: { sortOrder: 'asc' } },
        checklists: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Service item not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      tenantId: item.tenantId,
      serviceCode: item.serviceCode,
      name: item.name,
      shortName: item.shortName,
      description: item.description,
      categoryId: item.categoryId,
      category: item.category,
      subcategory: item.subcategory,
      department: item.department,
      unitOfMeasure: item.unitOfMeasure,
      pricingModel: item.pricingModel,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      currency: item.currency,
      profitMargin: item.profitMargin,
      standardDuration: item.standardDuration,
      labourHours: item.labourHours,
      techniciansRequired: item.techniciansRequired,
      skillLevel: item.skillLevel,
      technicianGrade: item.technicianGrade,
      overtimeEligible: item.overtimeEligible,
      weekendRate: item.weekendRate,
      holidayRate: item.holidayRate,
      isActive: item.isActive,
      qrCode: item.qrCode,
      barcode: item.barcode,
      serviceInstructions: item.serviceInstructions,
      safetyNotes: item.safetyNotes,
      materials: item.materials,
      equipment: item.equipment,
      checklists: item.checklists,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Service item get error:', error);
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

    const existing = await db.serviceItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service item not found' }, { status: 404 });

    // Handle replace-all for materials/equipment/checklists
    const { materials, equipment, checklists, ...fields } = body;

    // Delete existing related records if arrays provided
    if (materials !== undefined) await db.serviceItemMaterial.deleteMany({ where: { serviceItemId: id } });
    if (equipment !== undefined) await db.serviceItemEquipment.deleteMany({ where: { serviceItemId: id } });
    if (checklists !== undefined) await db.serviceChecklistItem.deleteMany({ where: { serviceItemId: id } });

    const updated = await db.serviceItem.update({
      where: { id },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.shortName !== undefined && { shortName: fields.shortName || null }),
        ...(fields.description !== undefined && { description: fields.description || null }),
        ...(fields.categoryId !== undefined && { categoryId: fields.categoryId || null }),
        ...(fields.subcategory !== undefined && { subcategory: fields.subcategory || null }),
        ...(fields.department !== undefined && { department: fields.department || null }),
        ...(fields.unitOfMeasure !== undefined && { unitOfMeasure: fields.unitOfMeasure }),
        ...(fields.pricingModel !== undefined && { pricingModel: fields.pricingModel }),
        ...(fields.costPrice !== undefined && { costPrice: fields.costPrice }),
        ...(fields.sellingPrice !== undefined && { sellingPrice: fields.sellingPrice }),
        ...(fields.discount !== undefined && { discount: fields.discount }),
        ...(fields.taxRate !== undefined && { taxRate: fields.taxRate }),
        ...(fields.currency !== undefined && { currency: fields.currency }),
        ...(fields.standardDuration !== undefined && { standardDuration: fields.standardDuration || null }),
        ...(fields.labourHours !== undefined && { labourHours: fields.labourHours }),
        ...(fields.techniciansRequired !== undefined && { techniciansRequired: fields.techniciansRequired }),
        ...(fields.skillLevel !== undefined && { skillLevel: fields.skillLevel || null }),
        ...(fields.technicianGrade !== undefined && { technicianGrade: fields.technicianGrade || null }),
        ...(fields.overtimeEligible !== undefined && { overtimeEligible: fields.overtimeEligible }),
        ...(fields.weekendRate !== undefined && { weekendRate: fields.weekendRate || null }),
        ...(fields.holidayRate !== undefined && { holidayRate: fields.holidayRate || null }),
        ...(fields.serviceInstructions !== undefined && {
          serviceInstructions: fields.serviceInstructions ? JSON.stringify(fields.serviceInstructions) : null,
        }),
        ...(fields.safetyNotes !== undefined && { safetyNotes: fields.safetyNotes || null }),
        ...(fields.isActive !== undefined && { isActive: fields.isActive }),
        ...(materials && {
          materials: {
            create: materials.map((m: { materialName: string; quantity?: number; unit?: string; estimatedConsumption?: number; isMandatory?: boolean; sortOrder?: number }, idx: number) => ({
              materialName: m.materialName,
              quantity: m.quantity || 1,
              unit: m.unit || 'pcs',
              estimatedConsumption: m.estimatedConsumption || null,
              isMandatory: m.isMandatory !== false,
              sortOrder: m.sortOrder ?? idx,
            })),
          },
        }),
        ...(equipment && {
          equipment: {
            create: equipment.map((e: { equipmentName: string; quantity?: number; isMandatory?: boolean; calibrationRequired?: boolean; sortOrder?: number }, idx: number) => ({
              equipmentName: e.equipmentName,
              quantity: e.quantity || 1,
              isMandatory: e.isMandatory !== false,
              calibrationRequired: e.calibrationRequired || false,
              sortOrder: e.sortOrder ?? idx,
            })),
          },
        }),
        ...(checklists && {
          checklists: {
            create: checklists.map((c: { task: string; description?: string; sortOrder?: number }, idx: number) => ({
              task: c.task,
              description: c.description || null,
              sortOrder: c.sortOrder ?? idx,
            })),
          },
        }),
      },
      include: {
        category: { select: { id: true, name: true } },
        materials: { orderBy: { sortOrder: 'asc' } },
        equipment: { orderBy: { sortOrder: 'asc' } },
        checklists: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      serviceCode: updated.serviceCode,
      name: updated.name,
      shortName: updated.shortName,
      description: updated.description,
      categoryId: updated.categoryId,
      categoryName: updated.category?.name || null,
      subcategory: updated.subcategory,
      department: updated.department,
      unitOfMeasure: updated.unitOfMeasure,
      pricingModel: updated.pricingModel,
      costPrice: updated.costPrice,
      sellingPrice: updated.sellingPrice,
      discount: updated.discount,
      taxRate: updated.taxRate,
      currency: updated.currency,
      standardDuration: updated.standardDuration,
      labourHours: updated.labourHours,
      techniciansRequired: updated.techniciansRequired,
      skillLevel: updated.skillLevel,
      isActive: updated.isActive,
      materials: updated.materials,
      equipment: updated.equipment,
      checklists: updated.checklists,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Service item update error:', error);
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

    const existing = await db.serviceItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service item not found' }, { status: 404 });

    await db.serviceItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Service item deleted successfully' });
  } catch (error) {
    console.error('Service item delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}