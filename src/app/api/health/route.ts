import { NextResponse } from 'next/server';
import { env } from '@/core/config/env-lib';
import { isFcmAdminConfigured } from '@/core/firebase/fcm-admin';
import { db } from '@/core/database/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify database connectivity with a lightweight query
    // Use User table count (works with both Prisma and Supabase REST)
    let dbStatus: 'connected' | 'error' = 'connected';
    let dbLatencyMs: number | null = null;
    let dbError: string | null = null;
    const isSupabase = process.env.USE_SUPABASE === 'true';

    try {
      const start = performance.now();
      if (isSupabase) {
        // For Supabase: use a simple table count query (lightweight, reliable)
        await db.user.count();
      } else {
        // For Prisma/SQLite: use raw SQL
        await db.$queryRaw`SELECT 1 as ok`;
      }
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
        type: isSupabase ? 'supabase' : 'sqlite',
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
        supabaseUrl: isSupabase ? (process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set') : undefined,
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