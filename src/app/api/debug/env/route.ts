import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Debug endpoints require super_admin authentication
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload || (payload as any).role !== 'super_admin') {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

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