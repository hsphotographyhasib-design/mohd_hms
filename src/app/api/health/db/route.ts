import { NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Database health monitor.
 *
 * Checks:
 *  1. Database availability (simple SELECT 1)
 *  2. Connection latency (round-trip time for SELECT 1)
 *  3. Query engine status (Prisma $queryRaw)
 *
 * Returns structured status for admin dashboard consumption.
 */
export async function GET() {
  const startTime = performance.now();
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let latencyMs: number | null = null;
  let error: string | null = null;
  let engineInfo: string | null = null;

  try {
    // Test 1: Basic connectivity via Prisma queryRaw
    const result = await withRetry(
      () => db.$queryRaw<{ one: number }[]>`SELECT 1 AS one`,
      { label: 'health-check', maxRetries: 2 }
    );

    latencyMs = Math.round(performance.now() - startTime);

    if (!result || result.length === 0) {
      status = 'degraded';
      error = 'Query returned no results';
    } else {
      engineInfo = 'PostgreSQL (PrismaPg adapter)';
    }

    // Test 2: Read a lightweight table (Tenant) to verify full read path
    const tenantStart = performance.now();
    const tenantCount = await withRetry(
      () => db.tenant.count(),
      { label: 'health-tenantCount', maxRetries: 1 }
    );
    const tenantLatency = Math.round(performance.now() - tenantStart);

    // If latency is high, mark as degraded
    if (latencyMs > 5000 || tenantLatency > 3000) {
      status = 'degraded';
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      database: {
        available: true,
        latencyMs,
        engine: engineInfo,
      },
      quickChecks: {
        tenantCountLatencyMs: tenantLatency,
        tenantCount,
      },
      pool: {
        adapter: 'PrismaPg',
        maxConnections: 10,
        idleTimeoutSeconds: 20,
        connectTimeoutSeconds: 10,
      },
      error: error ?? undefined,
    });
  } catch (err) {
    latencyMs = Math.round(performance.now() - startTime);
    status = 'unhealthy';
    error = err instanceof Error ? err.message : String(err);

    console.error('[DB Health Check FAILED]', error);

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        database: {
          available: false,
          latencyMs,
          engine: null,
        },
        error,
      },
      { status: 503 }
    );
  }
}