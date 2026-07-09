import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';

/**
 * POST /api/error-logs
 *
 * Accepts error reports from the frontend error boundary, API interceptor,
 * or useErrorHandler hook. Stores them in the error_logs table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      category = 'frontend',
      message,
      stackTrace,
      statusCode,
      pageUrl,
      browser,
      device,
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const truncatedMessage = message.substring(0, 2000);
    const truncatedStack = typeof stackTrace === 'string' ? stackTrace.substring(0, 10000) : null;

    await db.errorLog.create({
      data: {
        category,
        message: truncatedMessage,
        stackTrace: truncatedStack,
        statusCode: typeof statusCode === 'number' ? statusCode : null,
        pageUrl: typeof pageUrl === 'string' ? pageUrl.substring(0, 500) : null,
        browser: typeof browser === 'string' ? browser.substring(0, 200) : null,
        device: typeof device === 'string' ? device.substring(0, 200) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}