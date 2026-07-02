import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findDatabaseUrl } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

/**
 * Database diagnostic endpoint.
 * Returns detailed connection info and runs test queries.
 *
 * USAGE: Visit /api/debug/db-test on your deployment to diagnose DB issues.
 * No authentication required — intended for debugging only.
 */
export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown',
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'n/a',
  };

  // --- Step 1: Check database URL detection ---
  const dbUrlInfo = findDatabaseUrl();
  result.dbUrl = {
    found: !!dbUrlInfo.url,
    source: dbUrlInfo.source || 'none',
    isSQLite: dbUrlInfo.isSQLite,
    urlPrefix: dbUrlInfo.url ? dbUrlInfo.url.split('://')[0] + '://' : 'none',
    urlMasked: dbUrlInfo.url
      ? dbUrlInfo.url.replace(/(\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')
      : 'none',
  };

  // --- Step 2: Check which env vars look like DB URLs ---
  const dbLikeEnvVars: Record<string, string> = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && val.length > 10) {
      if (
        val.startsWith('postgres://') ||
        val.startsWith('postgresql://') ||
        val.startsWith('file:')
      ) {
        dbLikeEnvVars[key] = val.replace(/(\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
      }
    }
  }
  result.dbEnvVars = dbLikeEnvVars;

  // --- Step 3: Try a simple raw query ---
  const startTime = performance.now();
  try {
    const testResult = await db.$queryRaw<{ one: number }[]>`SELECT 1 AS one`;
    const latency = Math.round(performance.now() - startTime);

    result.queryTest = {
      success: true,
      latencyMs: latency,
      result: testResult,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);

    result.queryTest = {
      success: false,
      latencyMs: latency,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as { code?: string })?.code || 'none',
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 10) : undefined,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
    };
  }

  // --- Step 4: Try to count tenants (tests schema existence) ---
  try {
    const count = await db.tenant.count();
    result.schemaTest = {
      success: true,
      tenantCount: count,
      message: count > 0 ? 'Schema exists and has data' : 'Schema exists but no tenants found',
    };
  } catch (error) {
    result.schemaTest = {
      success: false,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as { code?: string })?.code || 'none',
      hint: error instanceof Error && error.message.includes('does not exist')
        ? 'DATABASE TABLES ARE MISSING. Run: npx prisma db push'
        : 'Check the error message above for details',
    };
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}