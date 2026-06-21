import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateCustomerNumber } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = { tenantId };
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

    const data = items.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      companyName: c.companyName,
      customerNumber: c.customerNumber,
      photo: c.photo,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      _count: c._count,
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
