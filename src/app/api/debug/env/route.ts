import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envInfo = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 20) || 'NOT_SET',
    DATABASE_AUTH_TOKEN_set: !!process.env.DATABASE_AUTH_TOKEN,
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    all_env_keys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('TOKEN') && !k.includes('KEY') && !k.includes('PASSWORD')),
  };

  // Try DB connection
  let dbStatus = 'not attempted';
  let dbError: string | null = null;
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1 as ok`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'failed';
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ envInfo, dbStatus, dbError });
}