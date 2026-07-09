import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isFcmAdminConfigured } from '@/lib/fcm-admin';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify database connectivity with a lightweight query
    let dbStatus: 'connected' | 'error' = 'connected';
    let dbLatencyMs: number | null = null;
    let dbError: string | null = null;

    try {
      const start = performance.now();
      await db.$queryRaw`SELECT 1 as ok`;
      dbLatencyMs = Math.round(performance.now() - start);
    } catch (dbErr: any) {
      dbStatus = 'error';
      dbError = dbErr?.message || 'Unknown database error';
    }

    return NextResponse.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'FacilityPro',
      version: process.env.npm_package_version || '0.2.0',
      environment: env.nodeEnv,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
      fcm: {
        adminConfigured: isFcmAdminConfigured(),
        clientConfigured: !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      },
    });
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}