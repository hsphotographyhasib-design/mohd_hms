import { NextResponse } from 'next/server';
import { findDatabaseUrl } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

/**
 * Database diagnostic endpoint.
 * Returns detailed connection info and runs test queries.
 *
 * USAGE: Visit /api/debug/db-test on your deployment to diagnose DB issues.
 * No authentication required — intended for debugging only.
 *
 * IMPORTANT: This endpoint does NOT import `db` from '@/lib/db' to avoid
 * triggering PrismaClient initialization. Instead, it creates a minimal
 * test connection directly.
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
    urlPrefix: dbUrlInfo.url ? dbUrlInfo.url.split('://')[0] + '://' : 'none',
    urlMasked: dbUrlInfo.url
      ? dbUrlInfo.url.replace(/(\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')
      : 'none',
    urlHasSsl: dbUrlInfo.url ? (dbUrlInfo.url.includes('sslmode=') || dbUrlInfo.url.includes('ssl=')) : false,
  };

  // --- Step 2: List ALL env vars (names only, for debugging) ---
  const allEnvKeys = Object.keys(process.env).sort();
  result.allEnvKeys = allEnvKeys;
  result.envCount = allEnvKeys.length;

  // --- Step 3: Check which env vars look like DB URLs ---
  const dbLikeEnvVars: Record<string, string> = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && val.length > 10) {
      if (
        val.startsWith('postgres://') ||
        val.startsWith('postgresql://')
      ) {
        dbLikeEnvVars[key] = val.replace(/(\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
      }
    }
  }
  result.dbEnvVars = dbLikeEnvVars;
  result.dbEnvVarCount = Object.keys(dbLikeEnvVars).length;

  // --- Step 4: Check for env vars with DB-related names but no URL value ---
  const dbNamedEnvVars: string[] = [];
  const dbPatterns = ['DATABASE', 'POSTGRES', 'DB_', 'PRISMA', 'NEON', 'VERCEL_DB', 'CONN', 'SQL'];
  for (const key of allEnvKeys) {
    const k = key.toUpperCase();
    if (dbPatterns.some(p => k.includes(p))) {
      dbNamedEnvVars.push(key);
    }
  }
  result.dbNamedEnvVars = dbNamedEnvVars;

  // --- Step 5: Try a minimal connection test ---
  // We need to import db dynamically to test the actual connection
  let queryError: unknown = null;
  const startTime = performance.now();
  try {
    // Dynamic import to avoid issues with module-level initialization
    const { db } = await import('@/lib/db');
    const testResult = await db.$queryRaw<{ one: number }[]>`SELECT 1 AS one`;
    const latency = Math.round(performance.now() - startTime);

    result.queryTest = {
      success: true,
      latencyMs: latency,
      result: testResult,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    queryError = error;

    result.queryTest = {
      success: false,
      latencyMs: latency,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as { code?: string })?.code || 'none',
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 10) : undefined,
      // Log ALL enumerable properties to catch non-standard error fields
      errorAllKeys: error && typeof error === 'object' ? Object.keys(error as object) : [],
      errorAllProps: error && typeof error === 'object'
        ? Object.fromEntries(
            Object.entries(error as object).filter(([k]) => k !== 'stack').slice(0, 20)
          )
        : {},
    };
  }

  // --- Step 6: If query failed, try schema test with raw error ---
  if (queryError) {
    try {
      const { db } = await import('@/lib/db');
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
  } else {
    // Query succeeded, test schema
    try {
      const { db } = await import('@/lib/db');
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
      };
    }
  }

  // --- Step 7: Package info ---
  try {
    const pkg = await import('../../../../../package.json', { with: { type: 'json' } });
    result.dependencies = {
      prisma: pkg.default?.dependencies?.prisma || pkg.default?.devDependencies?.prisma || 'unknown',
      '@prisma/client': pkg.default?.dependencies?.['@prisma/client'] || 'unknown',
      '@prisma/adapter-pg': pkg.default?.dependencies?.['@prisma/adapter-pg'] || 'unknown',
      '@prisma/adapter-libsql': pkg.default?.dependencies?.['@prisma/adapter-libsql'] || 'unknown',
    };
  } catch {
    // ignore
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}