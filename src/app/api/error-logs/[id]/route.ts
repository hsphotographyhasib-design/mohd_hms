import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'error-logs' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const item = await db.errorLog.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Error log not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: item.id,
      errorRef: item.errorRef,
      category: item.category,
      message: item.message,
      stack: item.stackTrace,
      statusCode: item.httpStatus,
      errorCode: item.errorCode,
      errorType: item.errorType,
      userMessage: item.userMessage,
      module: item.module,
      apiEndpoint: item.apiEndpoint,
      method: item.httpMethod,
      userId: item.userId,
      userName: item.userName,
      userRole: item.userRole,
      duration: item.duration,
      ip: item.ip,
      userAgent: item.browser,
      device: item.device,
      pageUrl: item.pageUrl,
      createdAt: item.createdAt.toISOString(),
      requestBody: item.requestBody,
      responseBody: item.responseBody,
    });
  } catch (error) {
    console.error('[ErrorLogs] Detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error log' },
      { status: 500 },
    );
  }
}