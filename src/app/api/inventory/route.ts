import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ─── Helper: generate next itemCode ───────────────────────────────────────────
async function generateItemCode(tenantId: string): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `ITM/HMS/${ym}/`;

  const lastItem = await db.inventoryItem.findFirst({
    where: {
      tenantId,
      itemCode: { startsWith: prefix },
    },
    orderBy: { itemCode: 'desc' },
    select: { itemCode: true },
  });

  let seq = 1;
  if (lastItem?.itemCode) {
    const lastSeq = parseInt(lastItem.itemCode.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

// ─── Helper: fire-and-forget audit log ────────────────────────────────────────
function logAudit(tenantId: string, userId: string, action: string, entityId: string, oldValue: string | null, newValue: string | null) {
  db.auditLog.create({
    data: { tenantId, userId, action, entity: 'InventoryItem', entityId, oldValue, newValue },
  }).catch(() => {});
}

// ─── GET: List items with pagination, search, filters ─────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const sp = request.nextUrl.searchParams;

    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('pageSize') || '20');
    const search = sp.get('search') || '';
    const itemType = sp.get('itemType') || '';
    const categoryId = sp.get('categoryId') || '';
    const subcategoryId = sp.get('subcategoryId') || '';
    const status = sp.get('status') || '';
    const lowStock = sp.get('lowStock') === 'true';
    const sortBy = sp.get('sortBy') || 'createdAt';
    const sortOrder = sp.get('sortOrder') || 'desc';
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryItemWhereInput = { tenantId, isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (itemType) where.itemType = itemType;
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (status) where.status = status;
    if (lowStock) {
      where.quantity = { lte: 999999 };
    }

    const orderBy: Prisma.InventoryItemOrderByWithRelationInput = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'itemCode', 'quantity', 'unitCost', 'purchaseCost', 'sellingPrice', 'status'];
    const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    (orderBy as Record<string, string>)[field] = sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          category: { select: { id: true, name: true, code: true, color: true } },
          subcategory: { select: { id: true, name: true, code: true } },
        },
      }),
      db.inventoryItem.count({ where }),
    ]);

    // Filter low stock in application layer for precision
    const filtered = lowStock ? items.filter((item) => item.quantity <= item.minStock) : items;

    const data = filtered.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      itemCode: item.itemCode,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      shortName: item.shortName,
      itemType: item.itemType,
      categoryId: item.categoryId,
      category: item.category,
      subcategoryId: item.subcategoryId,
      subcategory: item.subcategory,
      description: item.description,
      shortDescription: item.shortDescription,
      brand: item.brand,
      manufacturer: item.manufacturer,
      model: item.model,
      partNumber: item.partNumber,
      unit: item.unit,
      quantity: item.quantity,
      minStock: item.minStock,
      maxStock: item.maxStock,
      reorderLevel: item.reorderLevel,
      safetyStock: item.safetyStock,
      purchaseCost: item.purchaseCost,
      averageCost: item.averageCost,
      standardCost: item.standardCost,
      sellingPrice: item.sellingPrice,
      unitCost: item.unitCost,
      supplier: item.supplier,
      location: item.location,
      photos: item.photos,
      status: item.status,
      approvalStatus: item.approvalStatus,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total: lowStock ? filtered.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((lowStock ? filtered.length : total) / pageSize),
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create item ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const itemCode = await generateItemCode(tenantId);

    const {
      name, sku, barcode, shortName, itemType, categoryId, subcategoryId,
      description, shortDescription, brand, manufacturer, model, partNumber,
      serialNumber, unit, unitWeight, dimensions,
      purchaseCost, averageCost, standardCost, lastPurchaseCost,
      sellingPrice, dealerPrice, contractorPrice, customerPrice, vipPrice,
      internalCost, labourCost, installationCost, serviceCost,
      transportationCost, mobilizationCost, equipmentRental,
      emergencyCallOut, afterHoursCharge, weekendCharge, publicHolidayCharge,
      currency, quantity, minStock, maxStock, reorderLevel, safetyStock,
      photos, attachments, technicalDatasheet, msds,
      warranty, warrantyExpiry, countryOfOrigin, hsCode,
      tags, status, remarks,
      hourlyRate, dailyRate, overtimeRate, weekendRate, publicHolidayRate,
      dailyRentalRate, monthlyRentalRate,
      estimatedHours, requiredSkills, sop,
      suppliers,
    } = body;

    // Parse date strings
    let parsedWarrantyExpiry: Date | undefined;
    if (warrantyExpiry) {
      parsedWarrantyExpiry = new Date(warrantyExpiry);
    }

    const item = await db.inventoryItem.create({
      data: {
        tenantId,
        itemCode,
        name,
        sku: sku || null,
        barcode: barcode || null,
        shortName: shortName || null,
        itemType: itemType || 'inventory',
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        description: description || null,
        shortDescription: shortDescription || null,
        brand: brand || null,
        manufacturer: manufacturer || null,
        model: model || null,
        partNumber: partNumber || null,
        serialNumber: serialNumber || null,
        unit: unit || 'pcs',
        unitWeight: unitWeight || null,
        dimensions: dimensions || null,
        purchaseCost: purchaseCost || 0,
        averageCost: averageCost || 0,
        standardCost: standardCost || 0,
        lastPurchaseCost: lastPurchaseCost || 0,
        sellingPrice: sellingPrice || 0,
        dealerPrice: dealerPrice || 0,
        contractorPrice: contractorPrice || 0,
        customerPrice: customerPrice || 0,
        vipPrice: vipPrice || 0,
        internalCost: internalCost || 0,
        labourCost: labourCost || 0,
        installationCost: installationCost || 0,
        serviceCost: serviceCost || 0,
        transportationCost: transportationCost || 0,
        mobilizationCost: mobilizationCost || 0,
        equipmentRental: equipmentRental || 0,
        emergencyCallOut: emergencyCallOut || 0,
        afterHoursCharge: afterHoursCharge || 0,
        weekendCharge: weekendCharge || 0,
        publicHolidayCharge: publicHolidayCharge || 0,
        currency: currency || 'BND',
        quantity: quantity || 0,
        minStock: minStock || 0,
        maxStock: maxStock || null,
        reorderLevel: reorderLevel || 0,
        safetyStock: safetyStock || 0,
        photos: photos || null,
        attachments: attachments || null,
        technicalDatasheet: technicalDatasheet || null,
        msds: msds || null,
        warranty: warranty || null,
        warrantyExpiry: parsedWarrantyExpiry,
        countryOfOrigin: countryOfOrigin || null,
        hsCode: hsCode || null,
        tags: tags || null,
        status: status || 'draft',
        remarks: remarks || null,
        hourlyRate: hourlyRate || null,
        dailyRate: dailyRate || null,
        overtimeRate: overtimeRate || null,
        weekendRate: weekendRate || null,
        publicHolidayRate: publicHolidayRate || null,
        dailyRentalRate: dailyRentalRate || null,
        monthlyRentalRate: monthlyRentalRate || null,
        estimatedHours: estimatedHours || null,
        requiredSkills: requiredSkills || null,
        sop: sop || null,
      },
      include: {
        category: { select: { id: true, name: true, code: true, color: true } },
        subcategory: { select: { id: true, name: true, code: true } },
      },
    });

    // Create suppliers if provided
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      await db.itemSupplier.createMany({
        data: suppliers.map((s: Record<string, unknown>) => ({
          tenantId,
          itemId: item.id,
          supplierName: s.supplierName as string,
          supplierCode: (s.supplierCode as string) || null,
          contactPerson: (s.contactPerson as string) || null,
          phone: (s.phone as string) || null,
          email: (s.email as string) || null,
          address: (s.address as string) || null,
          leadTimeDays: (s.leadTimeDays as number) || 0,
          purchasePrice: (s.purchasePrice as number) || 0,
          moq: (s.moq as number) || 1,
          warranty: (s.warranty as string) || null,
          paymentTerms: (s.paymentTerms as string) || null,
          rating: (s.rating as number) || null,
          isPrimary: (s.isPrimary as boolean) || false,
        })),
      });
    }

    // Fire-and-forget audit log
    logAudit(tenantId, userId, 'create', item.id, null, JSON.stringify({ name: item.name, itemCode: item.itemCode }));

    return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Inventory create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate value: SKU or barcode already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Batch update items ───────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0 || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'ids (array) and updates (object) are required' }, { status: 400 });
    }

    const result = await db.inventoryItem.updateMany({
      where: { id: { in: ids }, tenantId },
      data: updates,
    });

    // Audit log for each
    for (const id of ids) {
      logAudit(tenantId, userId, 'batch_update', id, null, JSON.stringify(updates));
    }

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Inventory batch update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}