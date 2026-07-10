import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { sendViaProvider, getActiveProvider } from '@/core/email/service/providers';
import { isBrevoConfigured, isSmtpConfigured } from '@/core/email/service/providers';
import { MAX_RETRIES } from '@/core/email/service/types';
import * as templates from '@/core/email/service/templates';

export const dynamic = 'force-dynamic';

const COMPOSE_ROLES = ['super_admin', 'admin', 'supervisor', 'manager', 'finance'] as const;
const FINANCE_ONLY_MODULES = ['invoice', 'finance'] as const;

type ComposeRole = (typeof COMPOSE_ROLES)[number];

function hasComposeAccess(role: string): { allowed: boolean; isFinanceOnly: boolean } {
  if (!COMPOSE_ROLES.includes(role as ComposeRole)) {
    return { allowed: false, isFinanceOnly: false };
  }
  return { allowed: true, isFinanceOnly: role === 'finance' };
}

/**
 * POST /api/email/compose
 * Compose and send or schedule an email with full RBAC, template support, and attachment tracking.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'email' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const userRole = role as string;

    // RBAC check
    const { allowed, isFinanceOnly } = hasComposeAccess(userRole);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: you do not have permission to compose emails' }, { status: 403 });
    }

    const body = await req.json();
    const {
      to,
      toName,
      cc,
      bcc,
      subject,
      bodyHtml,
      bodyText,
      replyTo,
      priority,
      category,
      templateId,
      templateData,
      scheduledFor,
      attachments,
      module,
      metadata,
      customerId,
    } = body;

    // Validate required fields
    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Recipient email (to) is required' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!bodyHtml || typeof bodyHtml !== 'string') {
      // If no raw bodyHtml, we need a template
      if (!templateId) {
        return NextResponse.json({ error: 'Either bodyHtml or templateId is required' }, { status: 400 });
      }
    }

    // Finance role: only invoice/finance modules
    if (isFinanceOnly && module) {
      const moduleLower = (module as string).toLowerCase();
      const isFinanceModule = FINANCE_ONLY_MODULES.some((m) => moduleLower.startsWith(m));
      if (!isFinanceModule) {
        return NextResponse.json(
          { error: 'Finance users can only compose emails for invoice or finance modules' },
          { status: 403 }
        );
      }
    }

    // Determine sender info from env
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@mohdhms.com';
    const senderName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'MOHD.HMS ENTERPRISE';

    // Resolve template if templateId provided
    let finalHtml = bodyHtml || '';
    let finalSubject = subject;
    let resolvedTemplateName: string | null = null;

    if (templateId && templates[templateId as keyof typeof templates]) {
      const tplFn = templates[templateId as keyof typeof templates] as (
        data: Record<string, unknown>
      ) => { subject: string; html: string; text: string; templateName: string };
      try {
        const result = tplFn(templateData || {});
        finalHtml = finalHtml || result.html;
        finalSubject = finalSubject || result.subject;
        resolvedTemplateName = result.templateName;
      } catch (err) {
        console.error(`[Email Compose] Template render error for ${templateId}:`, err);
        return NextResponse.json({ error: `Failed to render template: ${templateId}` }, { status: 400 });
      }
    }

    if (!finalHtml) {
      return NextResponse.json({ error: 'Could not resolve email body content' }, { status: 400 });
    }

    // Determine status: scheduled or queued
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const isScheduled = scheduledDate && scheduledDate > new Date();
    const status = isScheduled ? 'scheduled' : 'queued';

    // Build metadata with attachment info
    let enrichedMetadata = metadata ? JSON.stringify(metadata) : null;
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attachInfo = attachments.map((a: { filename?: string; contentType?: string; size?: number }) => ({
        filename: a.filename || 'unnamed',
        contentType: a.contentType || 'application/octet-stream',
        size: a.size,
      }));
      const metaObj = metadata ? { ...metadata, attachments: attachInfo } : { attachments: attachInfo };
      enrichedMetadata = JSON.stringify(metaObj);
    }

    // Create the EmailLog record
    const emailLog = await db.emailLog.create({
      data: {
        tenantId,
        recipient: to,
        recipientName: toName || null,
        cc: cc ? JSON.stringify(Array.isArray(cc) ? cc : [cc]) : null,
        bcc: bcc ? JSON.stringify(Array.isArray(bcc) ? bcc : [bcc]) : null,
        sender: senderEmail,
        senderName,
        subject: finalSubject,
        bodyHtml: finalHtml,
        bodyText: bodyText || null,
        replyTo: replyTo || null,
        priority: priority || 'normal',
        category: category || null,
        templateId: templateId || null,
        templateName: resolvedTemplateName,
        module: module || 'manual',
        status,
        provider: getActiveProvider(),
        maxRetries: MAX_RETRIES,
        scheduledFor: isScheduled ? scheduledDate : null,
        createdById: user.id as string,
        customerId: customerId || null,
        attachmentCount: attachments?.length || 0,
        metadata: enrichedMetadata,
        nextRetryAt: isScheduled ? null : new Date(),
      },
    });

    // If not scheduled, attempt to send immediately via provider
    if (!isScheduled) {
      try {
        const sendParams = {
          to,
          cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
          bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
          subject: finalSubject,
          html: finalHtml,
          text: bodyText || undefined,
          replyTo: replyTo || undefined,
          metadata: enrichedMetadata ? JSON.parse(enrichedMetadata) : undefined,
        };

        const result = await sendViaProvider(sendParams);

        if (result.ok) {
          await db.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: 'delivered',
              providerMessageId: result.messageId || null,
              sentAt: new Date(),
              deliveredAt: new Date(),
            },
          });
          return NextResponse.json({ success: true, emailId: emailLog.id, status: 'queued' });
        }

        // Send failed — keep as queued, store error
        await db.emailLog.update({
          where: { id: emailLog.id },
          data: {
            errorMessage: result.error,
            errorCode: 'SEND_FAILED',
            metadata: JSON.stringify({
              ...(enrichedMetadata ? JSON.parse(enrichedMetadata) : {}),
              htmlBody: finalHtml,
              textBody: bodyText,
            }),
          },
        });
        return NextResponse.json({ success: true, emailId: emailLog.id, status: 'queued' });
      } catch (sendErr) {
        console.error('[Email Compose] Send error:', sendErr);
        // Keep as queued — retry processor will pick it up
        await db.emailLog.update({
          where: { id: emailLog.id },
          data: {
            errorMessage: sendErr instanceof Error ? sendErr.message : 'Unknown send error',
            errorCode: 'SEND_EXCEPTION',
            metadata: JSON.stringify({
              ...(enrichedMetadata ? JSON.parse(enrichedMetadata) : {}),
              htmlBody: finalHtml,
              textBody: bodyText,
            }),
          },
        });
        return NextResponse.json({ success: true, emailId: emailLog.id, status: 'queued' });
      }
    }

    // Scheduled email — just return
    return NextResponse.json({ success: true, emailId: emailLog.id, status: 'scheduled' });
  } catch (err) {
    console.error('[Email Compose] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to compose email' }, { status: 500 });
  }
}