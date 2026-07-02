import { NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/lib/db';
export const dynamic = 'force-dynamic';

/**
 * One-click database setup endpoint.
 * Pushes the Prisma schema to the PostgreSQL database.
 *
 * USAGE: Visit /api/setup/init-db on your deployment after first deploy.
 * This creates all tables if they don't exist.
 */
export async function POST() {
  const results: { table: string; status: string; error?: string }[] = [];
  const startTime = performance.now();

  // --- Step 1: Check which tables exist ---
  let existingTables: string[] = [];
  try {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    existingTables = rows.map(r => r.tablename);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot read database schema: ${getDbFriendlyMessage(error)}`,
        hint: 'Check that your DATABASE_URL or POSTGRES_URL points to a valid PostgreSQL database.',
      },
      { status: 500 }
    );
  }

  // Tables from Prisma schema (all lowercase as PostgreSQL stores them)
  const requiredTables = [
    'tenant', 'user', 'department', 'customer', 'equipment',
    'equipmentdocument', 'equipmentimage', 'qrlabel',
    'complaint', 'complainttimeline', 'workorder',
    'workorderchecklist', 'workorderpart', 'invoice',
    'invoiceitem', 'quotation', 'quotationitem',
    'inventoryitem', 'inventorytransaction', 'warehouse',
    'category', 'subcategory', 'supplier', 'pricebook', 'pricebookentry',
    'pmschedule', 'pmmaintenancerecord', 'notification',
    'session', 'systemsetting',
    // CMS tables
    'cmssetting', 'cmsblog', 'cmsblogcategory', 'cmstestimonial',
    'cmsfaq', 'cmsactivity', 'cmsservice', 'cmsservicefaq',
    'cmscareer', 'cmscareerapplication', 'cmsannouncement',
    'cmspopup', 'cmsseo', 'cmsmedia',
  ];

  const missingTables = requiredTables.filter(t => !existingTables.includes(t));
  const hasAnyTable = existingTables.some(t => requiredTables.map(r => r.toLowerCase()).includes(t.toLowerCase()));

  // --- Step 2: If tables already exist, report status ---
  if (missingTables.length === 0 && hasAnyTable) {
    return NextResponse.json({
      success: true,
      message: 'All required tables already exist. Database is ready.',
      existingTables: existingTables.filter(t => requiredTables.map(r => r.toLowerCase()).includes(t.toLowerCase())),
      totalTables: existingTables.length,
      durationMs: Math.round(performance.now() - startTime),
    });
  }

  // --- Step 3: Try to push schema using Prisma CLI ---
  try {
    const { execSync } = await import('child_process');
    const output = execSync('npx prisma db push --accept-data-loss --skip-generate 2>&1', {
      encoding: 'utf-8',
      timeout: 60000,
      env: {
        ...process.env,
        // Ensure we're using the postgres URL
        DATABASE_URL: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database schema pushed successfully.',
      missingTables,
      prismaOutput: output.trim().slice(-500),
      durationMs: Math.round(performance.now() - startTime),
    });
  } catch (cliError: unknown) {
    const errMsg = cliError instanceof Error ? cliError.message : String(cliError);
    const stderrMsg = (cliError as { stderr?: string })?.stderr || '';

    // CLI might not be available on Vercel — provide manual instructions
    return NextResponse.json({
      success: false,
      message: 'Could not auto-push schema. Tables need to be created manually.',
      hint: 'Run this command locally with your Postgres DATABASE_URL:',
      command: 'DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npx prisma db push',
      existingTables,
      missingTables,
      cliError: errMsg.slice(0, 500),
      cliStderr: stderrMsg.slice(0, 500),
      durationMs: Math.round(performance.now() - startTime),
    });
  }
}

export async function GET() {
  // Quick status check — doesn't modify anything
  try {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const requiredTables = [
      'tenant', 'user', 'department', 'customer', 'equipment',
      'complaint', 'workorder', 'invoice', 'quotation',
      'inventoryitem', 'pmschedule', 'notification',
    ];
    const existing = rows.map(r => r.tablename);
    const missing = requiredTables.filter(t => !existing.includes(t));

    return NextResponse.json({
      ready: missing.length === 0 && existing.length > 0,
      totalTables: existing.length,
      existingTables: existing,
      missingRequiredTables: missing,
    });
  } catch (error) {
    return NextResponse.json({
      ready: false,
      error: getDbFriendlyMessage(error),
    }, { status: 500 });
  }
}