import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken, generateCustomerNumber } from '@/core/auth/auth-lib';
import { ensureTableSync } from '@/core/database/db-sync';
import { buildAuthContext } from '@/core/permissions/rbac';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Customer');

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, tenantId: tid, customerId: authCustomerId } = ctx;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const skip = (page - 1) * pageSize;

    // RBAC: Role-based scoping for customers
    let where: Prisma.CustomerWhereInput = { tenantId: tid };
    if (role === 'customer') {
      // Customers can only see their own linked profile
      if (authCustomerId) {
        where = { tenantId: tid, id: authCustomerId };
      } else {
        where = { tenantId: tid, id: '__NEVER_MATCH__' } as Prisma.CustomerWhereInput;
      }
    } else if (!['super_admin', 'admin', 'manager', 'supervisor', 'finance'].includes(role)) {
      // technician, hr, vendor, guest cannot see customer list
      where = { tenantId: tid, id: '__NEVER_MATCH__' } as Prisma.CustomerWhereInput;
    }
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
          _count: { select: { Equipment: true, Complaint: true, Invoice: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    const data = items.map((c: any) => ({
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
      createdAt: c.createdAt ? (typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString()) : null,
      updatedAt: c.updatedAt ? (typeof c.updatedAt === 'string' ? c.updatedAt : c.updatedAt.toISOString()) : null,
      _count: c._count ? {
        equipment: c._count.Equipment ?? 0,
        complaints: c._count.Complaint ?? 0,
        invoices: c._count.Invoice ?? 0,
      } : { equipment: 0, complaints: 0, invoices: 0 },
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Customers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Customer');

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { name, email, phone, address, companyName, photo, gpsLocation } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
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

    return NextResponse.json({
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      companyName: customer.companyName,
      customerNumber: customer.customerNumber,
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Customer create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
