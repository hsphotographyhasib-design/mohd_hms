/**
 * Returns the SQL schema for Supabase setup and checks table status.
 *
 * GET: Returns the SQL + which tables exist/missing (counts)
 * POST: Checks if tables are ready (counts)
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'Tenant', 'User', 'Customer', 'Complaint', 'Equipment',
  'WorkOrder', 'Notification', 'AuditLog',
  'Department', 'Invoice', 'Quotation', 'PmSchedule',
];

interface TableCheckResult {
  sql?: string;
  instruction?: string;
  tables: {
    existing: number;
    missing: number;
    total: number;
    missingTables?: string[];
  };
}

async function checkTables(): Promise<TableCheckResult['tables']> {
  const sb = getSupabaseAdmin();
  const existingTables: string[] = [];
  const missingTables: string[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      // Use .select('id').limit(1) instead of head:true
      // head:true returns 204 for missing tables (false positive!)
      const { error, status } = await sb.from(table).select('id').limit(1);
      if (!error && status !== 404) existingTables.push(table);
      else missingTables.push(table);
    } catch {
      missingTables.push(table);
    }
  }

  return {
    existing: existingTables.length,
    missing: missingTables.length,
    total: REQUIRED_TABLES.length,
    missingTables,
  };
}

export async function GET() {
  try {
    const sqlPath = resolve(process.cwd(), 'supabase-schema.sql');
    let sql: string;
    try {
      sql = readFileSync(sqlPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'supabase-schema.sql not found' }, { status: 400 });
    }

    const tables = await checkTables();

    return NextResponse.json({
      sql,
      tables,
      instruction: tables.missing > 0
        ? 'Copy the SQL and paste it into: Supabase Dashboard → SQL Editor → New Query → Run'
        : 'All required tables exist!',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const tables = await checkTables();

    return NextResponse.json({
      ready: tables.missing === 0,
      ...tables,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}