// ============ Brevo Email Provider ============
// Sends emails via Brevo (formerly Sendinblue) HTTP API v3

import type { SendEmailParams, SendEmailResult, EmailProvider, EmailAttachment } from './types';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getApiKey(): string | null {
  return process.env.BREVO_API_KEY || null;
}

function getSenderName(): string {
  return process.env.BREVO_SENDER_NAME || 'MOHD.HMS ENTERPRISE';
}

function getSenderEmail(): string {
  return process.env.BREVO_SENDER_EMAIL || 'noreply@mohdhms.com';
}

function attachmentToBrevo(att: EmailAttachment) {
  const content = typeof att.content === 'string' ? att.content : att.content.toString('base64');
  return {
    name: att.filename,
    content,
    ...(att.contentType ? { contentType: att.contentType } : {}),
  };
}

export async function sendViaBrevo(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      provider: 'brevo' as EmailProvider,
      error: 'BREVO_API_KEY not configured',
    };
  }

  try {
    const body: Record<string, unknown> = {
      sender: { name: getSenderName(), email: getSenderEmail() },
      to: [{ email: params.to, name: params.to.split('@')[0] }],
      subject: params.subject,
      htmlContent: params.html,
      ...(params.text ? { textContent: params.text } : {}),
      ...(params.replyTo ? { replyTo: { email: params.replyTo } } : {}),
      ...(params.tags?.length ? { tags: params.tags } : {}),
      ...(params.attachments?.length
        ? { attachment: params.attachments.map(attachmentToBrevo) }
        : {}),
      ...(params.cc?.length ? { cc: params.cc.map((e) => ({ email: e })) } : {}),
      ...(params.bcc?.length ? { bcc: params.bcc.map((e) => ({ email: e })) } : {}),
    };

    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        ok: false,
        provider: 'brevo' as EmailProvider,
        error: `Brevo ${res.status}: ${errBody}`,
      };
    }

    const data = (await res.json()) as { messageId?: string };
    return {
      ok: true,
      provider: 'brevo' as EmailProvider,
      messageId: data.messageId,
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'brevo' as EmailProvider,
      error: err instanceof Error ? err.message : 'Unknown Brevo error',
    };
  }
}

export function isBrevoConfigured(): boolean {
  return !!getApiKey();
}