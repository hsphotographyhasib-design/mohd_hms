import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = Object.keys(process.env).sort();
  const relevant = keys.filter(k => 
    k.includes('SUPABASE') || k.includes('USE_') || k.includes('DATABASE') || 
    k.includes('BACKEND') || k.includes('NODE_ENV') || k.includes('JWT')
  );
  return NextResponse.json({
    allRelevantKeys: relevant,
    USE_SUPABASE: process.env.USE_SUPABASE,
    USE_SUPABASE_type: typeof process.env.USE_SUPABASE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50),
    SUPABASE_SERVICE_ROLE_KEY_len: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    SUPABASE_SERVICE_ROLE_KEY_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
    DATABASE_URL: process.env.DATABASE_URL?.substring(0, 40),
    NODE_ENV: process.env.NODE_ENV,
  });
}
