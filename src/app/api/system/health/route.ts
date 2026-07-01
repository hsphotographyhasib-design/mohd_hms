import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startTime = Date.now();

  const [dbCheck, prismaCheck, emailCheck, storageCheck, jwtCheck, whatsappCheck, apiCountCheck] = await Promise.allSettled([
    checkDatabase(),
    checkPrisma(),
    checkEmailService(),
    checkStorage(),
    checkJwtSecret(),
    checkWhatsApp(),
    checkApiRoutes(),
  ]);

  function resolve(settled: PromiseSettledResult<any>) {
    return settled.status === 'fulfilled' ? settled.value : { status: 'down', responseTime: 0, message: 'Check failed to execute' };
  }

  return NextResponse.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'unknown',
    auditVersion: '2026-06-18',
    checks: {
      database: resolve(dbCheck),
      prisma: resolve(prismaCheck),
      authentication: {
        status: 'healthy',
        responseTime: 0,
        message: `Authenticated as ${payload.role}`,
        user: payload.email || payload.name || 'unknown',
      },
      email: resolve(emailCheck),
      storage: resolve(storageCheck),
      jwt: resolve(jwtCheck),
      whatsapp: resolve(whatsappCheck),
      apiRoutes: resolve(apiCountCheck),
    },
  });
}

async function checkDatabase() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1 as ok`;
    return { status: 'healthy' as const, responseTime: Date.now() - start, message: 'Database connection successful' };
  } catch (error) {
    return { status: 'down' as const, responseTime: Date.now() - start, message: error instanceof Error ? error.message : 'Database unreachable' };
  }
}

async function checkPrisma() {
  const start = Date.now();
  try {
    const count = await db.tenant.count();
    return { status: 'healthy' as const, responseTime: Date.now() - start, message: `Prisma ORM active (${count} tenant${count !== 1 ? 's' : ''})` };
  } catch (error) {
    return { status: 'down' as const, responseTime: Date.now() - start, message: error instanceof Error ? error.message : 'Prisma query failed' };
  }
}

async function checkEmailService() {
  const start = Date.now();
  try {
    const configured = !!process.env.BREVO_API_KEY;
    return {
      status: (configured ? 'healthy' : 'degraded') as const,
      responseTime: Date.now() - start,
      message: configured ? 'Brevo API configured' : 'Brevo API key not set',
    };
  } catch {
    return { status: 'down' as const, responseTime: Date.now() - start, message: 'Email check failed' };
  }
}

async function checkStorage() {
  const start = Date.now();
  try {
    const { access } = await import('fs/promises');
    const { join } = await import('path');
    const dir = join(process.cwd(), 'public', 'uploads');
    try {
      await access(dir);
      return { status: 'healthy' as const, responseTime: Date.now() - start, message: 'Upload directory accessible' };
    } catch {
      return { status: 'degraded' as const, responseTime: Date.now() - start, message: 'Upload directory not found' };
    }
  } catch {
    return { status: 'degraded' as const, responseTime: 0, message: 'Storage check unavailable' };
  }
}

async function checkJwtSecret() {
  const start = Date.now();
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length > 0) {
    return { status: 'healthy' as const, responseTime: Date.now() - start, message: `JWT secret configured (${secret.length} chars)` };
  }
  if (process.env.NODE_ENV === 'production') {
    return { status: 'down' as const, responseTime: Date.now() - start, message: 'CRITICAL: JWT_SECRET not set in production' };
  }
  return { status: 'degraded' as const, responseTime: Date.now() - start, message: 'Using dev-only fallback (not for production)' };
}

async function checkWhatsApp() {
  const start = Date.now();
  const configured = !!process.env.WHATSAPP_TOKEN || !!process.env.WHATSAPP_ACCESS_TOKEN;
  if (configured) {
    return { status: 'healthy' as const, responseTime: Date.now() - start, message: 'WhatsApp service configured' };
  }
  return { status: 'degraded' as const, responseTime: Date.now() - start, message: 'WhatsApp credentials not configured' };
}

async function checkApiRoutes() {
  const start = Date.now();
  try {
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const apiDir = join(process.cwd(), 'src', 'app', 'api');

    async function countRoutes(dir: string, depth = 0): Promise<number> {
      if (depth > 6) return 0;
      let count = 0;
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (entry.name.startsWith('_') || entry.name === 'debug') continue;
        if (entry.isFile() && entry.name === 'route.ts') count++;
        if (entry.isDirectory()) count += await countRoutes(join(dir, entry.name), depth + 1);
      }
      return count;
    }

    const total = await countRoutes(apiDir);
    return { status: 'healthy' as const, responseTime: Date.now() - start, message: `${total} API routes registered` };
  } catch {
    return { status: 'degraded' as const, responseTime: Date.now() - start, message: 'Could not count API routes' };
  }
}