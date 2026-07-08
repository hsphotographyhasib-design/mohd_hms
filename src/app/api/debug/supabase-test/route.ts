import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getSupabaseAdmin();

  // Try Tenant with full error info
  const { data, error, status, statusText } = await sb
    .from('Tenant')
    .select('*', { count: 'exact', head: true });

  // Try a simple count without head
  const r2 = await sb
    .from('tenant')
    .select('*', { count: 'exact' });

  // Try listing tables via information_schema
  const r3 = await sb
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public');

  return NextResponse.json({
    tenant: { data, error, status, statusText, errorNull: error === null, errorType: typeof error },
    tenantLower: { data: r2.data, error: r2.error, count: r2.count },
    tables: r3.data,
    clientUrl: sb.url,
  });
}