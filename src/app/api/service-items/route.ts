import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const pricingModel = request.nextUrl.searchParams.get('pricingModel') || '';
    const skip = (page - 1) * pageSize;

    // ServiceItem model is not in prisma/schema.prisma (runtime-only table)
    const where: Record<string, any> = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { serviceCode: { contains: search } },
        { shortName: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category) where.categoryId = category;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (pricingModel) where.pricingModel = pricingModel;

    const [items, total] = await Promise.all([
      db.serviceItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      db.serviceItem.count({ where }),
    ]);

    const data = items.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      serviceCode: item.serviceCode,
      name: item.name,
      shortName: item.shortName,
      description: item.description,
      categoryId: item.categoryId,
      categoryName: item.category?.name || null,
      subcategory: item.subcategory,
      department: item.department,
      unitOfMeasure: item.unitOfMeasure,
      pricingModel: item.pricingModel,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      currency: item.currency,
      standardDuration: item.standardDuration,
      labourHours: item.labourHours,
      techniciansRequired: item.techniciansRequired,
      skillLevel: item.skillLevel,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Service items list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const body = await request.json();
    const {
      name, shortName, description, categoryId, subcategory, department,
      unitOfMeasure, pricingModel, costPrice, sellingPrice, discount, taxRate,
      currency, standardDuration, labourHours, techniciansRequired, skillLevel,
      technicianGrade, overtimeEligible, weekendRate, holidayRate,
      serviceInstructions, safetyNotes, materials, equipment, checklists,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Auto-generate serviceCode
    const lastService = await db.serviceItem.findFirst({
      where: { tenantId },
      orderBy: { serviceCode: 'desc' },
      select: { serviceCode: true },
    });

    let nextNum = 1;
    if (lastService?.serviceCode) {
      const match = lastService.serviceCode.match(/SVC\/HMS\/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const serviceCode = `SVC/HMS/${String(nextNum).padStart(3, '0')}`;

    const item = await db.serviceItem.create({
      data: {
        tenantId,
        serviceCode,
        name,
        shortName: shortName || null,
        description: description || null,
        categoryId: categoryId || null,
        subcategory: subcategory || null,
        department: department || null,
        unitOfMeasure: unitOfMeasure || 'job',
        pricingModel: pricingModel || 'fixed',
        costPrice: costPrice || 0,
        sellingPrice: sellingPrice || 0,
        discount: discount || 0,
        taxRate: taxRate || 0,
        currency: currency || 'BND',
        standardDuration: standardDuration || null,
        labourHours: labourHours || 0,
        techniciansRequired: techniciansRequired || 1,
        skillLevel: skillLevel || null,
        technicianGrade: technicianGrade || null,
        overtimeEligible: overtimeEligible || false,
        weekendRate: weekendRate || null,
        holidayRate: holidayRate || null,
        serviceInstructions: serviceInstructions ? JSON.stringify(serviceInstructions) : null,
        safetyNotes: safetyNotes || null,
        materials: materials ? {
          create: materials.map((m: { materialName: string; quantity?: number; unit?: string; estimatedConsumption?: number; isMandatory?: boolean; sortOrder?: number }, idx: number) => ({
            materialName: m.materialName,
            quantity: m.quantity || 1,
            unit: m.unit || 'pcs',
            estimatedConsumption: m.estimatedConsumption || null,
            isMandatory: m.isMandatory !== false,
            sortOrder: m.sortOrder ?? idx,
          })),
        } : undefined,
        equipment: equipment ? {
          create: equipment.map((e: { equipmentName: string; quantity?: number; isMandatory?: boolean; calibrationRequired?: boolean; sortOrder?: number }, idx: number) => ({
            equipmentName: e.equipmentName,
            quantity: e.quantity || 1,
            isMandatory: e.isMandatory !== false,
            calibrationRequired: e.calibrationRequired || false,
            sortOrder: e.sortOrder ?? idx,
          })),
        } : undefined,
        checklists: checklists ? {
          create: checklists.map((c: { task: string; description?: string; sortOrder?: number }, idx: number) => ({
            task: c.task,
            description: c.description || null,
            sortOrder: c.sortOrder ?? idx,
          })),
        } : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        materials: true,
        equipment: true,
        checklists: true,
      },
    });

    return NextResponse.json({
      id: item.id,
      tenantId: item.tenantId,
      serviceCode: item.serviceCode,
      name: item.name,
      shortName: item.shortName,
      description: item.description,
      categoryId: item.categoryId,
      categoryName: item.category?.name || null,
      subcategory: item.subcategory,
      department: item.department,
      unitOfMeasure: item.unitOfMeasure,
      pricingModel: item.pricingModel,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      currency: item.currency,
      standardDuration: item.standardDuration,
      labourHours: item.labourHours,
      techniciansRequired: item.techniciansRequired,
      skillLevel: item.skillLevel,
      isActive: item.isActive,
      materials: item.materials,
      equipment: item.equipment,
      checklists: item.checklists,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Service item create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}