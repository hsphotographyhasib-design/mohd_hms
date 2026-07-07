import { Router, Request, Response } from 'express';
import { db } from '@/lib/db.js';
import { requireAuth } from '@/middleware/auth.js';
import { generateCustomerNumber } from '@/lib/auth.js';

const router = Router();

// ─── GET / — List Customers ─────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
        { customerNumber: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { equipment: true, complaints: true, invoices: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    const data = (items as any[]).map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      companyName: c.companyName,
      customerNumber: c.customerNumber,
      photo: c.photo,
      paymentTerms: c.paymentTerms,
      pic: c.pic,
      country: c.country,
      district: c.district,
      taxRate: c.taxRate,
      isActive: c.isActive,
      createdAt: c.createdAt?.toISOString?.() || c.createdAt,
      updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
      _count: c._count,
    }));

    res.json({
      data,
      total: total as number,
      page,
      pageSize,
      totalPages: Math.ceil((total as number) / pageSize),
    });
  } catch (error) {
    console.error('Customers list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create Customer ───────────────────────────────────────────────
router.route('/').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, email, phone, address, companyName, photo, gpsLocation } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required' });
      return;
    }

    const customerNumber = generateCustomerNumber();

    const customer = await db.customer.create({
      data: {
        tenantId,
        name,
        email: email || null,
        phone,
        address: address || null,
        companyName: companyName || null,
        customerNumber,
        photo: photo || null,
        gpsLocation: gpsLocation || null,
      },
    });

    const c = customer as any;
    res.status(201).json({
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      companyName: c.companyName,
      customerNumber: c.customerNumber,
      isActive: c.isActive,
      createdAt: c.createdAt?.toISOString?.() || c.createdAt,
      updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
    });
  } catch (error) {
    console.error('Customer create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;