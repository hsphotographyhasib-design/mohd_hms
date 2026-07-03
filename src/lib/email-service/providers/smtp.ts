// ============ SMTP Provider (Bravo Email / Nodemailer) ============
// Sends emails via SMTP using credentials from environment variables.
// Environment: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
//              SMTP_FROM, SMTP_FROM_NAME, SMTP_SECURE

import nodemailer from 'nodemailer';
import type { SendEmailParams, SendEmailResult, EmailProvider } from '../types';

let _transporter: nodemailer.Transporter | null = null;
let _configChecked = false;
let _isConfigured = false;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  const fromAddr = process.env.SMTP_FROM;
  const fromName = process.env.SMTP_FROM_NAME || 'MOHD.HMS ENTERPRISE';
  const secure = process.env.SMTP_SECURE === 'true';

  return { host, port, user, pass, fromAddr, fromName, secure };
}

export function isSmtpConfigured(): boolean {
  if (!_configChecked) {
    const { host, user, pass, fromAddr } = getSmtpConfig();
    _isConfigured = !!(host && user && pass && fromAddr);
    _configChecked = true;
  }
  return _isConfigured;
}

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    const { host, port, user, pass, secure } = getSmtpConfig();
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
  return _transporter;
}

function getFromAddress(): string {
  const { fromAddr, fromName } = getSmtpConfig();
  return `${fromName} <${fromAddr}>`;
}

export async function sendViaSmtp(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: params.to,
      cc: params.cc?.join(', '),
      bcc: params.bcc?.join(', '),
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? Buffer.from(a.content, 'base64') : a.content,
        contentType: a.contentType,
      })),
    });

    return {
      ok: true,
      provider: 'smtp-relay' as EmailProvider,
      messageId: info.messageId || undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SMTP send failed';
    return {
      ok: false,
      provider: 'smtp-relay' as EmailProvider,
      error: msg,
    };
  }
}