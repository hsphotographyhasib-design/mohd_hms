import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { getStorageProvider } from '@/core/uploads/storage-provider';

export const dynamic = 'force-dynamic';

// ── Valid asset types ───────────────────────────────────────────────────────────

const VALID_TYPES = [
  'primary_logo',
  'compact_logo',
  'dark_logo',
  'light_logo',
  'favicon',
  'icon_192',
  'icon_512',
  'apple_touch_icon',
  'notification_icon',
  'login_logo',
  'splash_logo',
  'pdf_header_logo',
  'email_header_logo',
] as const;

/** Cache-Control value: public, 1 hour */
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

// ── Static fallback mapping (when no DB asset exists) ───────────────────────────
// These are the default files in /public that the login page uses

const STATIC_FALLBACKS: Record<string, string> = {
  primary_logo: '/logo.png',
  compact_logo: '/logo.png',
  dark_logo: '/logo.png',
  light_logo: '/logo.png',
  favicon: '/favicon.ico',
  icon_192: '/icon-192x192.png',
  icon_512: '/icon-512x512.png',
  apple_touch_icon: '/apple-touch-icon.png',
  login_logo: '/logo.png',
  splash_logo: '/logo.png',
  pdf_header_logo: '/logo.png',
  email_header_logo: '/logo.png',
  notification_icon: '/icon-192x192.png',
};

// ── GET: Serve a branding asset file by type (NO AUTH — public) ─────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  // Validate the type parameter
  if (!VALID_TYPES.includes(type as any)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    // Find the tenant ID from the request.
    // The serve endpoint is unauthenticated, so we rely on a tenant header
    // or query parameter. This is needed for multi-tenant environments where
    // the login page loads branding before auth.
    // Priority: X-Tenant-Id header > tenant query param > default tenant
    const tenantId = request.headers.get('x-tenant-id')
      || request.nextUrl.searchParams.get('tenant')
      || '';

    if (!tenantId) {
      // No tenant context — redirect to static fallback
      const fallback = STATIC_FALLBACKS[type] || '/logo.png';
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    // Look up the active asset for this type and tenant
    const asset = await db.brandingAsset.findFirst({
      where: { tenantId, type, isActive: true },
    });

    if (!asset) {
      // No custom asset — redirect to static fallback
      const fallback = STATIC_FALLBACKS[type] || '/logo.png';
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    // Read file from storage
    const provider = getStorageProvider();
    const exists = await provider.fileExists(asset.url);

    if (!exists) {
      // File missing from storage — redirect to static fallback
      const fallback = STATIC_FALLBACKS[type] || '/logo.png';
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    const fileBuffer = await provider.readFile(asset.url);

    // Determine content type from the stored MIME type
    const contentType = asset.mimeType || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': CACHE_CONTROL,
        'X-Asset-Version': String(asset.version),
        'X-Asset-Id': asset.id,
        'X-Asset-Type': asset.type,
      },
    });
  } catch (error) {
    console.error(`[Branding Serve ${type}] Error:`, error);
    // On any error, redirect to static fallback so the UI never breaks
    const fallback = STATIC_FALLBACKS[type] || '/logo.png';
    return NextResponse.redirect(new URL(fallback, request.url));
  }
}