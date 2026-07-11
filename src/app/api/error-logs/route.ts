import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/error-logs — Log an error
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const id = body.id || crypto.randomUUID();

    // Truncate long strings
    const truncate = (val: unknown, max: number) =>
      typeof val === 'string' ? val.substring(0, max) : val;

    await db.errorLog.create({
      data: {
        id,
        errorRef: truncate(body.errorRef, 50),
        userId: body.userId || null,
        userName: truncate(body.userName, 200) || null,
        userRole: truncate(body.userRole, 50) || null,
        tenantId: body.tenantId || null,
        category: truncate(body.category, 50) || 'unknown',
        errorType: truncate(body.errorType, 100) || null,
        errorCode: truncate(body.errorCode, 50) || null,
        message: truncate(body.message, 2000) || 'Unknown error',
        userMessage: truncate(body.userMessage, 500) || null,
        module: truncate(body.module, 100) || null,
        apiEndpoint: truncate(body.apiEndpoint, 500) || null,
        httpMethod: truncate(body.httpMethod, 10) || null,
        httpStatus: typeof body.httpStatus === 'number' ? body.httpStatus : null,
        duration: typeof body.duration === 'number' ? body.duration : null,
        requestBody: truncate(body.requestBody, 5000) || null,
        responseBody: truncate(body.responseBody, 5000) || null,
        headers: truncate(body.headers, 5000) || null,
        stackTrace: truncate(body.stackTrace, 10000) || null,
        browser: truncate(body.browser, 200) || null,
        device: truncate(body.device, 200) || null,
        ip:
          body.ip ||
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('x-real-ip') ||
          null,
        pageUrl: truncate(body.pageUrl, 500) || null,
      },
    });

    return NextResponse.json({ ok: true, errorRef: body.errorRef });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// GET /api/error-logs — List error history (super_admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'error-logs' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '50', 10)),
    );
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.ErrorLogWhereInput = { tenantId };

    if (category) where.category = category;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { message: { contains: search } },
        { module: { contains: search } },
        { apiEndpoint: { contains: search } },
        { errorRef: { contains: search } },
        { errorCode: { contains: search } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate)
        (where.createdAt as Prisma.DateTimeNullableFilter).gte = new Date(
          startDate,
        );
      if (endDate)
        (where.createdAt as Prisma.DateTimeNullableFilter).lte = new Date(
          endDate,
        );
    }

    const [items, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        select: {
          id: true,
          errorRef: true,
          userId: true,
          userName: true,
          userRole: true,
          category: true,
          errorType: true,
          errorCode: true,
          message: true,
          userMessage: true,
          module: true,
          apiEndpoint: true,
          httpMethod: true,
          httpStatus: true,
          duration: true,
          browser: true,
          device: true,
          pageUrl: true,
          createdAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.errorLog.count({ where }),
    ]);

    // Format dates and map field names to match frontend expectations
    const data = items.map((item) => ({
      id: item.id,
      errorRef: item.errorRef,
      category: item.category,
      message: item.message,
      stack: item.stackTrace,
      statusCode: item.httpStatus,
      errorCode: item.errorCode,
      module: item.module,
      apiEndpoint: item.apiEndpoint,
      method: item.httpMethod,
      userId: item.userId,
      userName: item.userName,
      userRole: item.userRole,
      duration: item.duration,
      ip: null,
      userAgent: item.browser,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[ErrorLogs] List error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 },
    );
  }
}