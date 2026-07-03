import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const status = request.nextUrl.searchParams.get('status') || '';
    const grade = request.nextUrl.searchParams.get('grade') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const where: Prisma.LabourRateWhereInput = { tenantId };
    if (status) where.status = status;
    if (grade) where.technicianGrade = grade;

    const [rates, total] = await Promise.all([
      db.labourRate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.labourRate.count({ where }),
    ]);

    return NextResponse.json({ data: rates, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error('Labour rates list error:', error);
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
    const { labourCode, technicianGrade, skillLevel, hourlyCost, hourlyCharge, overtimeRate, weekendRate, holidayRate, effectiveDate, status } = body;

    if (!technicianGrade || !skillLevel) {
      return NextResponse.json({ error: 'Grade and skill level are required' }, { status: 400 });
    }

    const rate = await db.labourRate.create({
      data: {
        tenantId,
        labourCode: labourCode || null,
        technicianGrade,
        skillLevel,
        hourlyCost: hourlyCost || 0,
        hourlyCharge: hourlyCharge || 0,
        overtimeRate: overtimeRate || null,
        weekendRate: weekendRate || null,
        holidayRate: holidayRate || null,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        status: status || 'active',
      },
    });

    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    console.error('Labour rate create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}