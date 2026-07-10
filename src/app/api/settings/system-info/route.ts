import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { db } from '@/core/database/db';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/**
 * Mirror the same detection logic as src/core/database/db.ts
 * to ensure the reported type matches the actual DB in use.
 */
function isUsingSupabase(): boolean {
  if (process.env.USE_SUPABASE === 'true') return true;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV === 'production') return true;
  return false;
}

/** Mask a Supabase project URL for display (only show project ref) */
function maskSupabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // https://xxxxx.supabase.co → https://xxxxx.supabase.co
    // Show the project ref but mask part of it for security
    const ref = parsed.hostname.replace('.supabase.co', '');
    if (ref.length > 6) {
      const visible = ref.slice(0, 3) + '•••' + ref.slice(-3);
      return `https://${visible}.supabase.co`;
    }
    return url;
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  // Auth check + RBAC
  const auth = verifyRouteAuth(request, { feature: 'settings' });
  if (auth.error) return auth.error;

  const role = auth.role;
  // Only super_admin can access settings (feature check already gates this)
  const isFullAccess = true;

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

  // Database connectivity check — uses same detection as db.ts
  const useSupabase = isUsingSupabase();
  let dbStatus: 'Connected' | 'Disconnected' = 'Disconnected';
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const start = performance.now();
    if (useSupabase) {
      // Supabase REST — lightweight count query
      await db.user.count();
    } else {
      // Prisma / SQLite — raw SQL ping
      await db.$queryRaw`SELECT 1 as ok`;
    }
    dbLatencyMs = Math.round(performance.now() - start);
    dbStatus = 'Connected';
  } catch (err: any) {
    dbStatus = 'Disconnected';
    dbError = err?.message || 'Database unreachable';
  }

  // Real record counts — only for super_admin and admin roles
  let recordCounts: Record<string, number> | null = null;
  if (isFullAccess && dbStatus === 'Connected') {
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

  // Last backup — only meaningful for local SQLite
  let lastBackup: string | null = null;
  if (!useSupabase && dbStatus === 'Connected') {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      let dbPath = join(process.cwd(), 'db', 'dev.db');
      if (dbUrl.startsWith('file:')) {
        const parsed = dbUrl.replace(/^file:/, '');
        dbPath = parsed.startsWith('/') ? parsed : join(process.cwd(), parsed);
      }
      const stats = statSync(dbPath);
      lastBackup = stats.mtime.toISOString();
    } catch {
      // Can't determine last backup time
    }
  }

  // Build database type label
  const dbType = useSupabase ? 'Supabase (PostgreSQL)' : 'SQLite';
  const supabaseUrl = useSupabase && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? maskSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    : undefined;

  return NextResponse.json({
    version,
    environment,
    database: {
      status: dbStatus,
      type: dbType,
      latencyMs: dbLatencyMs,
      error: dbError,
      ...(supabaseUrl && { supabaseUrl }),
    },
    lastBackup,
    recordCounts: isFullAccess ? recordCounts : null,
    responseTime: Date.now() - startTime,
  });
}