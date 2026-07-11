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

    // Map DB field names to frontend-expected names
    const raw = item as Record<string, unknown>;
    return NextResponse.json({
      id: raw.id,
      errorRef: raw.errorRef,
      category: raw.category,
      message: raw.message,
      stack: raw.stackTrace,
      statusCode: raw.httpStatus,
      errorCode: raw.errorCode,
      errorType: raw.errorType,
      userMessage: raw.userMessage,
      module: raw.module,
      apiEndpoint: raw.apiEndpoint,
      method: raw.httpMethod,
      userId: raw.userId,
      userName: raw.userName,
      userRole: raw.userRole,
      duration: raw.duration,
      ip: raw.ip,
      userAgent: raw.browser,
      device: raw.device,
      pageUrl: raw.pageUrl,
      createdAt: raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : raw.createdAt,
      requestBody: raw.requestBody,
      responseBody: raw.responseBody,
    });
  } catch (error) {
    console.error('[ErrorLogs] Detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error log' },
      { status: 500 },
    );
  }
}