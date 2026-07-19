import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

// ── Branding config keys ────────────────────────────────────────────────────────

const BRANDING_CONFIG_KEYS = [
  'brand_name',
  'brand_short_name',
  'brand_tagline',
  'brand_address',
  'brand_phone',
  'brand_email',
  'brand_website',
  'brand_tax_number',
  'brand_reg_number',
  'brand_primary_color',
  'brand_accent_color',
  'brand_theme_color',
  'brand_bg_color',
] as const;

type BrandingConfigKey = (typeof BRANDING_CONFIG_KEYS)[number];

/** Check if a key is a valid branding config key */
function isValidBrandingKey(key: string): key is BrandingConfigKey {
  return (BRANDING_CONFIG_KEYS as readonly string[]).includes(key);
}

// ── GET: Full branding configuration ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Missing authentication token' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload?.tenantId || !payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid or incomplete token' }, { status: 401 });
    }
    const { tenantId } = payload;

    // Fetch all active branding assets in parallel
    const [assets, settings] = await Promise.all([
      db.brandingAsset.findMany({
        where: { tenantId, isActive: true },
        orderBy: { type: 'asc' },
      }),
      db.cmsSetting.findMany({
        where: { tenantId, key: { in: [...BRANDING_CONFIG_KEYS] } },
      }),
    ]);

    // Build config object from settings
    const config: Record<string, string> = {};
    for (const setting of settings) {
      config[setting.key] = setting.value;
    }

    // Map assets for response
    const mappedAssets = assets.map((a: any) => ({
      id: a.id,
      type: a.type,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      width: a.width,
      height: a.height,
      version: a.version,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    }));

    // Determine if there's a primary logo asset
    const primaryLogo = mappedAssets.find((a) => a.type === 'primary_logo');

    return NextResponse.json({
      config,
      assets: mappedAssets,
      defaultLogo: primaryLogo ? undefined : '/logo.png',
    });
  } catch (error) {
    console.error('[Branding GET] Error:', error);
    // Return fallback so the UI never breaks
    return NextResponse.json({
      config: {},
      assets: [],
      defaultLogo: '/logo.png',
    });
  }
}

// ── PUT: Update branding configuration ──────────────────────────────────────────

async function handlePut(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Missing authentication token' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload?.tenantId || !payload?.userId || !payload?.role) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Invalid or incomplete token' }, { status: 401 });
  }
  if (payload.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden', message: 'Only super_admin can update branding configuration' }, { status: 403 });
  }

  const { tenantId } = payload;
  const body = await request.json();

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Bad Request', message: 'Request body must be an object with branding keys' }, { status: 400 });
  }

  // Filter to valid branding keys only
  const entries = Object.entries(body).filter(([key]) => isValidBrandingKey(key));

  if (entries.length === 0) {
    return NextResponse.json({ error: 'Bad Request', message: 'No valid branding keys provided' }, { status: 400 });
  }

  // Upsert each setting
  const results = await Promise.all(
    entries.map(([key, value]) =>
      db.cmsSetting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value: String(value), category: 'branding' },
        create: {
          tenantId,
          key,
          value: String(value),
          category: 'branding',
        },
      })
    )
  );

  // Build response config
  const config: Record<string, string> = {};
  for (const r of results) {
    config[r.key] = r.value;
  }

  return NextResponse.json({ config, updated: results.length });
}

export const PUT = withErrorLogging(handlePut, { module: 'branding', category: 'api' });