import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateOtpCode } from '@/lib/auth';
import { normalizePhone, normalizeDialCode, hashOtp, getFriendlyPhoneError } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, dialCode } = body;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ── 1. Normalize phone number (server-side, never trust client) ──
    const normalized = normalizePhone(phoneNumber, dialCode);

    if (!normalized.valid) {
      console.warn('[WhatsApp OTP] Validation failed:', { raw: phoneNumber, dialCode, error: normalized.error });
      return NextResponse.json(
        { error: getFriendlyPhoneError(normalized.error || 'Invalid phone number.') },
        { status: 400 },
      );
    }

    const fullPhone = normalized.e164; // e.g. "+6737137462"

    console.log('[WhatsApp OTP] Normalized phone:', {
      raw: phoneNumber,
      dialCode,
      normalized: fullPhone,
      ip: ipAddress,
    });

    // ── 2. Find tenant ──
    let tenant = await withRetry(
      () => db.tenant.findUnique({ where: { domain: 'mohdhms.com' } }),
      { label: 'sendOtp-findTenant' },
    );
    if (!tenant) {
      tenant = await withRetry(() => db.tenant.findFirst(), { label: 'sendOtp-findFirstTenant' });
    }
    if (!tenant) {
      return NextResponse.json(
        { error: 'Service is not configured. Please contact support.' },
        { status: 500 },
      );
    }

    // ── 3. Rate limit: max 3 OTPs per phone per hour ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtpCount = await withRetry(
      () =>
        db.otpCode.count({
          where: {
            phoneNumber: fullPhone,
            tenantId: tenant.id,
            createdAt: { gte: oneHourAgo },
          },
        }),
      { label: 'sendOtp-rateLimit' },
    );

    if (recentOtpCount >= 3) {
      return NextResponse.json(
        { error: 'Too many verification codes sent. Please try again in an hour.', retryAfter: 3600 },
        { status: 429 },
      );
    }

    // ── 4. Generate 6-digit OTP ──
    const otpPlain = generateOtpCode();
    const otpHash = await hashOtp(otpPlain);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ── 5. Store OTP (hashed) in database ──
    const otpRecord = await withRetry(
      () =>
        db.otpCode.create({
          data: {
            tenantId: tenant.id,
            phoneNumber: fullPhone,
            code: otpHash, // Store HASH, not plaintext
            purpose: 'login',
            expiresAt,
            ipAddress,
            userAgent,
          },
        }),
      { label: 'sendOtp-createOtp' },
    );

    // Log OTP for development only
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] ${fullPhone}: ${otpPlain} (id: ${otpRecord.id})`);
    }

    // ── 6. Send via WhatsApp Meta Business API (best-effort) ──
    try {
      const whatsappConfig = await withRetry(
        () => db.whatsAppConfig.findUnique({ where: { tenantId: tenant.id } }),
        { label: 'sendOtp-getWhatsappConfig', maxRetries: 1 },
      );

      if (
        whatsappConfig?.isEnabled &&
        whatsappConfig.metaAccessToken &&
        whatsappConfig.metaPhoneNumberId
      ) {
        console.log('[WhatsApp OTP] Sending via Meta API to:', fullPhone);

        const metaResponse = await fetch(
          `https://graph.facebook.com/v19.0/${whatsappConfig.metaPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${whatsappConfig.metaAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: fullPhone,
              type: 'template',
              template: {
                name: 'otp_verification',
                language: { code: 'en' },
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: otpPlain }],
                  },
                ],
              },
            }),
          },
        );

        if (!metaResponse.ok) {
          const metaBody = await metaResponse.text();
          console.error('[WhatsApp OTP] Meta API error:', metaResponse.status, metaBody);
          // OTP still stored — dev mode / manual entry fallback
        } else {
          console.log('[WhatsApp OTP] Meta API success for:', fullPhone);
        }
      } else {
        console.log('[WhatsApp OTP] WhatsApp not configured — OTP stored for dev entry');
      }
    } catch (whatsappError) {
      console.error('[WhatsApp OTP] Meta API exception (OTP still stored):', whatsappError);
    }

    // ── 7. Audit log (non-critical) ──
    withRetry(async () => {
      const systemUser = await db.user.findFirst({
        where: { tenantId: tenant.id, role: 'super_admin' },
        select: { id: true },
      });
      if (systemUser) {
        await db.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: systemUser.id,
            action: 'otp_sent',
            entity: 'OtpCode',
            entityId: otpRecord.id,
            newValue: JSON.stringify({ phoneNumber: fullPhone }),
            ipAddress,
            userAgent,
            device: 'api',
          },
        });
      }
    }, { label: 'sendOtp-auditLog' }).catch(() => {});

    return NextResponse.json({ success: true, expiresIn: 300 });
  } catch (error) {
    console.error('[WhatsApp OTP] Send error:', error);
    return NextResponse.json(
      { error: 'Unable to send the verification code at the moment. Please try again in a few minutes.' },
      { status: 500 },
    );
  }
}