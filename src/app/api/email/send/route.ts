import { NextRequest, NextResponse } from 'next/server';
import { sendEmail as emailServiceSend } from '@/lib/email-service';
import * as templates from '@/lib/email-service/templates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email/send
 * Body: { to, subject?, template, templateData, cc?, bcc?, attachments?, scheduledFor?, module?, metadata? }
 *
 * Send an email using a named template or raw HTML.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, template, templateData, html, text: plainText, cc, bcc, attachments, scheduledFor, module, metadata, replyTo, tags } = body;

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Recipient email (to) is required' }, { status: 400 });
    }

    // Determine email content: template or raw
    let finalSubject = subject || '';
    let finalHtml = html || '';
    let finalText = plainText || '';
    let templateName: string | undefined;

    if (template && templates[template as keyof typeof templates]) {
      const tplFn = templates[template as keyof typeof templates] as (data: Record<string, unknown>) => { subject: string; html: string; text: string; templateName: string };
      const result = tplFn(templateData || {});
      finalSubject = finalSubject || result.subject;
      finalHtml = finalHtml || result.html;
      finalText = finalText || result.text;
      templateName = result.templateName;
    }

    if (!finalHtml) {
      return NextResponse.json({ error: 'Either html or template must be provided' }, { status: 400 });
    }

    const result = await emailServiceSend({
      to,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
      templateName,
      module: module || templateName ? undefined : 'general',
      attachments,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      metadata,
      replyTo,
      tags,
    });

    return NextResponse.json({ ok: result.ok, messageId: result.messageId, logId: result.logId, error: result.error });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}