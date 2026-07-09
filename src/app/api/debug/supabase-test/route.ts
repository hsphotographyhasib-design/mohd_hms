import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabaseDb } = await import('@/core/database/supabase-db');
    const users = await supabaseDb.user.findMany({
      where: { tenantId: 'tenant_default_001' },
      take: 3,
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ source: 'supabase-direct', count: users.length, users });
  } catch (error: any) {
    return NextResponse.json({ source: 'supabase-direct', error: error.message, stack: error.stack?.slice(0, 300) }, { status: 500 });
  }
}
