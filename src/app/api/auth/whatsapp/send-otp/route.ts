import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOtpCode, generateCustomerNumber } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, countryCode } = body;

    // Validate inputs
    if (!phoneNumber || !countryCode) {
      return NextResponse.json(
        { error: 'Phone number and country code are required' },
        { status: 400 }
      );
    }

    // Validate phone format (digits only, 6-15 digits)
    if (!/^\d{6,15}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be 6-15 digits.' },
        { status: 400 }
      );
    }

    // Validate country code format
    if (!/^\+\d{1,4}$/.test(countryCode)) {
      return NextResponse.json(
        { error: 'Invalid country code format. Must start with + followed by 1-4 digits.' },
        { status: 400 }
      );
    }

    const fullPhone = `${countryCode}${phoneNumber}`;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find tenant (domain 'mohdhms.com' or fallback to first tenant)
    let tenant = await db.tenant.findUnique({ where: { domain: 'mohdhms.com' } });
    if (!tenant) {
      tenant = await db.tenant.findFirst();
    }
    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant configured' },
        { status: 500 }
      );
    }

    // Rate limit: max 3 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtpCount = await db.otpCode.count({
      where: {
        phoneNumber: fullPhone,
        tenantId: tenant.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentOtpCount >= 3) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.', retryAfter: 3600 },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP code
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await db.otpCode.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: fullPhone,
        code,
        purpose: 'login',
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Log OTP for development
    console.log(`[DEV OTP] ${fullPhone}: ${code}`);

    // Attempt to send via WhatsApp Meta Business API
    try {
      const whatsappConfig = await db.whatsAppConfig.findUnique({
        where: { tenantId: tenant.id },
      });

      if (
        whatsappConfig?.isEnabled &&
        whatsappConfig.metaAccessToken &&
        whatsappConfig.metaPhoneNumberId
      ) {
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
                    parameters: [{ type: 'text', text: code }],
                  },
                ],
              },
            }),
          }
        );

        if (!metaResponse.ok) {
          console.error(
            `[WhatsApp] Failed to send OTP via Meta API: ${metaResponse.status}`,
            await metaResponse.text()
          );
          // OTP still stored — dev mode fallback
        }
      }
    } catch (whatsappError) {
      console.error('[WhatsApp] Meta API error (OTP still stored):', whatsappError);
      // Dev mode: OTP already stored, log is above
    }

    // Create audit log entry
    // We need a system user for audit. Use a placeholder.
    try {
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
            newValue: JSON.stringify({ phoneNumber: fullPhone }),
            ipAddress,
            userAgent,
            device: 'api',
          },
        });
      }
    } catch {
      // Audit log creation is non-critical
    }

    return NextResponse.json({ success: true, expiresIn: 300 });
  } catch (error) {
    console.error('Send OTP error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}