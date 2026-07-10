import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'whatsapp' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    // Only admin/super_admin can view WhatsApp config (contains secrets)
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    let config = await db.whatsAppConfig.findUnique({ where: { tenantId } });

    if (!config) {
      config = await db.whatsAppConfig.create({
        data: {
          tenantId,
          provider: 'openwa',
          isEnabled: false,
          openwaStatus: 'disconnected',
          welcomeMessage:
            'Welcome to {{company_name}}! How can we help you today?\n\n1️⃣ New Complaint\n2️⃣ Service Request\n3️⃣ Complaint Status\n4️⃣ My Equipment\n5️⃣ Work Order Status\n6️⃣ Invoices\n7️⃣ Emergency Service\n8️⃣ Speak to Customer Support',
          defaultPriority: 'medium',
          autoReplyEnabled: true,
        },
      });
    }

    // Redact sensitive fields — never return API keys or secrets to the client
    const redact = (val: string | null) => val ? '***configured***' : null;

    return NextResponse.json({
      id: config.id,
      tenantId: config.tenantId,
      provider: config.provider,
      isEnabled: config.isEnabled,
      phoneNumber: config.phoneNumber,
      businessName: config.businessName,
      openwaBaseUrl: config.openwaBaseUrl,
      openwaSession: config.openwaSession,
      openwaApiKey: redact(config.openwaApiKey as string | null),
      openwaQrCode: config.openwaQrCode,
      openwaStatus: config.openwaStatus,
      metaAccessToken: redact(config.metaAccessToken as string | null),
      metaPhoneNumberId: config.metaPhoneNumberId,
      metaVerifyToken: redact(config.metaVerifyToken as string | null),
      metaWebhookSecret: redact(config.metaWebhookSecret as string | null),
      metaBusinessAccountId: config.metaBusinessAccountId,
      twilioAccountSid: redact(config.twilioAccountSid as string | null),
      twilioAuthToken: redact(config.twilioAuthToken as string | null),
      twilioPhoneNumber: config.twilioPhoneNumber,
      autoReplyEnabled: config.autoReplyEnabled,
      welcomeMessage: config.welcomeMessage,
      emergencyNumbers: config.emergencyNumbers,
      defaultPriority: config.defaultPriority,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'whatsapp' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    // Only admin/super_admin can modify WhatsApp config
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const body = await req.json();

    const existing = await db.whatsAppConfig.findUnique({ where: { tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Config not found. Please initialize first.' }, { status: 404 });
    }

    const updatable = [
      'provider',
      'isEnabled',
      'phoneNumber',
      'businessName',
      'openwaBaseUrl',
      'openwaSession',
      'openwaApiKey',
      'openwaQrCode',
      'openwaStatus',
      'metaAccessToken',
      'metaPhoneNumberId',
      'metaVerifyToken',
      'metaWebhookSecret',
      'metaBusinessAccountId',
      'twilioAccountSid',
      'twilioAuthToken',
      'twilioPhoneNumber',
      'autoReplyEnabled',
      'welcomeMessage',
      'emergencyNumbers',
      'defaultPriority',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    const config = await db.whatsAppConfig.update({
      where: { tenantId },
      data,
    });

    const redact = (val: string | null) => val ? '***configured***' : null;

    return NextResponse.json({
      id: config.id,
      tenantId: config.tenantId,
      provider: config.provider,
      isEnabled: config.isEnabled,
      phoneNumber: config.phoneNumber,
      businessName: config.businessName,
      openwaBaseUrl: config.openwaBaseUrl,
      openwaSession: config.openwaSession,
      openwaApiKey: redact(config.openwaApiKey as string | null),
      openwaQrCode: config.openwaQrCode,
      openwaStatus: config.openwaStatus,
      metaAccessToken: redact(config.metaAccessToken as string | null),
      metaPhoneNumberId: config.metaPhoneNumberId,
      metaVerifyToken: redact(config.metaVerifyToken as string | null),
      metaWebhookSecret: redact(config.metaWebhookSecret as string | null),
      metaBusinessAccountId: config.metaBusinessAccountId,
      twilioAccountSid: redact(config.twilioAccountSid as string | null),
      twilioAuthToken: redact(config.twilioAuthToken as string | null),
      twilioPhoneNumber: config.twilioPhoneNumber,
      autoReplyEnabled: config.autoReplyEnabled,
      welcomeMessage: config.welcomeMessage,
      emergencyNumbers: config.emergencyNumbers,
      defaultPriority: config.defaultPriority,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}