import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'whatsapp' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '20');
    const rating = req.nextUrl.searchParams.get('rating') || '';
    const startDate = req.nextUrl.searchParams.get('startDate') || '';
    const endDate = req.nextUrl.searchParams.get('endDate') || '';
    const source = req.nextUrl.searchParams.get('source') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerFeedbackWhereInput = { tenantId };

    if (rating) {
      const ratingNum = parseInt(rating);
      where.rating = ratingNum;
    }
    if (startDate) where.createdAt = { ...((where.createdAt as object) || {}), gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...((where.createdAt as object) || {}), lte: new Date(endDate) };
    if (source) where.source = source;

    const [items, total, avgRating] = await Promise.all([
      db.customerFeedback.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, companyName: true } },
          complaint: { select: { id: true, title: true, category: true } },
          workOrder: { select: { id: true, title: true, status: true } },
        },
      }),
      db.customerFeedback.count({ where }),
      db.customerFeedback.aggregate({
        where,
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    // Rating distribution
    const distribution = await db.customerFeedback.groupBy({
      by: ['rating'],
      where: { tenantId },
      _count: { id: true },
    });

    const data = items.map((f) => ({
      id: f.id,
      tenantId: f.tenantId,
      customerId: f.customerId,
      customerName: f.customer?.name || null,
      customerPhone: f.customer?.phone || null,
      customerCompany: f.customer?.companyName || null,
      complaintId: f.complaintId,
      complaintTitle: f.complaint?.title || null,
      complaintCategory: f.complaint?.category || null,
      workOrderId: f.workOrderId,
      workOrderTitle: f.workOrder?.title || null,
      workOrderStatus: f.workOrder?.status || null,
      rating: f.rating,
      comment: f.comment,
      source: f.source,
      createdAt: f.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      averageRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 100) / 100 : 0,
      totalReviews: avgRating._count.id,
      ratingDistribution: distribution.map((d) => ({
        rating: d.rating,
        count: d._count.id,
      })),
    });
  } catch (error) {
    console.error('WhatsApp feedback list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}