import { Router, Request, Response } from 'express';
import { db } from '@/lib/db.js';
import { requireAuth } from '@/middleware/auth.js';
import { generateAssetNumber } from '@/lib/auth.js';

const router = Router();

// ─── GET / — List Equipment ─────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const status = (req.query.status as string) || '';
    const customerId = (req.query.customerId as string) || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { assetNumber: { contains: search } },
        { location: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      db.equipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          _count: { select: { complaints: true, workOrders: true } },
        },
      }),
      db.equipment.count({ where }),
    ]);

    const data = (items as any[]).map((eq: any) => ({
      id: eq.id,
      tenantId: eq.tenantId,
      customerId: eq.customerId,
      customerName: eq.customer?.name,
      name: eq.name,
      category: eq.category,
      assetNumber: eq.assetNumber,
      qrCode: eq.qrCode,
      qrId: eq.qrId,
      brand: eq.brand,
      model: eq.model,
      serialNumber: eq.serialNumber,
      location: eq.location,
      building: eq.building,
      room: eq.room,
      installDate: eq.installDate?.toISOString?.() || null,
      warrantyExpiry: eq.warrantyExpiry?.toISOString?.() || null,
      warrantyInfo: eq.warrantyInfo,
      status: eq.status,
      condition: eq.condition,
      photos: eq.photos,
      documents: eq.documents,
      specifications: eq.specifications,
      notes: eq.notes,
      createdAt: eq.createdAt?.toISOString?.() || eq.createdAt,
      updatedAt: eq.updatedAt?.toISOString?.() || eq.updatedAt,
      _count: eq._count,
    }));

    res.json({
      data,
      total: total as number,
      page,
      pageSize,
      totalPages: Math.ceil((total as number) / pageSize),
    });
  } catch (error) {
    console.error('Equipment list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create Equipment ──────────────────────────────────────────────
router.route('/').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const {
      name, category, customerId, brand, model, serialNumber, location,
      installDate, warrantyExpiry, status, photos, documents, specifications, notes,
    } = req.body;

    if (!name || !category) {
      res.status(400).json({ error: 'Name and category are required' });
      return;
    }

    const assetNumber = generateAssetNumber(category);
    const qrCode = `QR-${assetNumber}`;
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
    const qrId = `QR-${category.substring(0, 3).toUpperCase()}-${ts}${rand}`;

    const equipment = await db.equipment.create({
      data: {
        tenantId,
        name,
        category,
        customerId: customerId || null,
        assetNumber,
        qrCode,
        qrId,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        location: location || null,
        building: req.body.building || null,
        room: req.body.room || null,
        installDate: installDate ? new Date(installDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        warrantyInfo: req.body.warrantyInfo || null,
        status: status || 'active',
        condition: req.body.condition || 'good',
        photos: photos ? JSON.stringify(photos) : null,
        documents: documents ? JSON.stringify(documents) : null,
        specifications: specifications ? JSON.stringify(specifications) : null,
        notes: notes || null,
      },
      include: {
        customer: { select: { name: true } },
      },
    } as any);

    // Create QR code record (best-effort)
    db.equipmentQrCode.create({
      data: { tenantId, equipmentId: (equipment as any).id, qrId, qrUrl: `/equipment/${qrId}` },
    }).catch(() => {});

    const eq = equipment as any;
    res.status(201).json({
      id: eq.id,
      tenantId: eq.tenantId,
      customerId: eq.customerId,
      customerName: eq.customer?.name,
      name: eq.name,
      category: eq.category,
      assetNumber: eq.assetNumber,
      qrCode: eq.qrCode,
      qrId: eq.qrId,
      brand: eq.brand,
      model: eq.model,
      serialNumber: eq.serialNumber,
      location: eq.location,
      building: eq.building,
      room: eq.room,
      installDate: eq.installDate?.toISOString?.() || null,
      warrantyExpiry: eq.warrantyExpiry?.toISOString?.() || null,
      warrantyInfo: eq.warrantyInfo,
      status: eq.status,
      condition: eq.condition,
      photos: eq.photos,
      documents: eq.documents,
      specifications: eq.specifications,
      notes: eq.notes,
      createdAt: eq.createdAt?.toISOString?.() || eq.createdAt,
      updatedAt: eq.updatedAt?.toISOString?.() || eq.updatedAt,
    });
  } catch (error) {
    console.error('Equipment create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;