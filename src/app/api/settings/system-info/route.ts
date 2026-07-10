import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/core/auth/auth-lib';
import { db } from '@/core/database/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  // Real version from package.json
  let version = '0.2.0';
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    version = pkg.version || '0.2.0';
  } catch {
    // fallback
  }

  // Real environment
  const environment = process.env.NODE_ENV || 'development';

  // Database connectivity check
  let dbStatus: 'Connected' | 'Disconnected' = 'Disconnected';
  let dbLatencyMs: number | null = null;
  let dbType = 'sqlite';
  let dbError: string | null = null;
  let isSupabase = process.env.USE_SUPABASE === 'true';
  dbType = isSupabase ? 'supabase' : 'sqlite';

  try {
    const start = performance.now();
    if (isSupabase) {
      await db.user.count();
    } else {
      await db.$queryRaw`SELECT 1 as ok`;
    }
    dbLatencyMs = Math.round(performance.now() - start);
    dbStatus = 'Connected';
  } catch (err: any) {
    dbStatus = 'Disconnected';
    dbError = err?.message || 'Database unreachable';
  }

  // Real record counts (only if DB is connected)
  let recordCounts: Record<string, number> | null = null;
  if (dbStatus === 'Connected') {
    try {
      const [customers, equipment, complaints, workOrders, invoices, employees, pmSchedules, inventoryItems] =
        await Promise.allSettled([
          db.customer.count({ where: { isActive: true } }),
          db.equipment.count(),
          db.complaint.count(),
          db.workOrder.count(),
          db.invoice.count(),
          db.user.count({ where: { isActive: true } }),
          db.pmSchedule.count(),
          db.inventoryItem.count(),
        ]);

      const val = (r: PromiseSettledResult<number>) =>
        r.status === 'fulfilled' ? r.value : 0;

      recordCounts = {
        customers: val(customers),
        equipment: val(equipment),
        complaints: val(complaints),
        workOrders: val(workOrders),
        invoices: val(invoices),
        employees: val(employees),
        pmSchedules: val(pmSchedules),
        inventoryItems: val(inventoryItems),
      };
    } catch {
      // Silently fail — record counts are supplementary
    }
  }

  // Last backup — check for SQLite DB file modification time (local dev)
  let lastBackup: string | null = null;
  if (!isSupabase && dbStatus === 'Connected') {
    try {
      // Derive file path from DATABASE_URL (e.g. "file:/app/db/custom.db" → "/app/db/custom.db")
      const dbUrl = process.env.DATABASE_URL || '';
      let dbPath = join(process.cwd(), 'db', 'dev.db');
      if (dbUrl.startsWith('file:')) {
        const parsed = dbUrl.replace(/^file:/, '');
        // Handle both absolute and relative paths
        dbPath = parsed.startsWith('/') ? parsed : join(process.cwd(), parsed);
      }
      const { statSync } = await import('fs');
      const stats = statSync(dbPath);
      lastBackup = stats.mtime.toISOString();
    } catch {
      // Can't determine last backup time
    }
  }

  return NextResponse.json({
    version,
    environment,
    database: {
      status: dbStatus,
      type: dbType,
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    recordCounts,
    lastBackup,
    responseTime: Date.now() - startTime,
  });
}