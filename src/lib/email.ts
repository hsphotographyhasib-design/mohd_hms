/**
 * Lightweight email helper — LEGACY COMPATIBILITY LAYER.
 *
 * Kept for backward compatibility with existing password-reset flows.
 * New code should import from '@/lib/email-service' directly.
 *
 * Delegates to the centralized EmailService for proper logging,
 * queue, retry, and tenant resolution.
 */

import { sendEmail as sendViaService } from '@/lib/email-service';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  module?: string;
  templateName?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: 'resend' | 'smtp-relay' | 'console' | 'brevo';
  id?: string;
  error?: string;
  logId?: string;
}

/**
 * Send an email using the centralized EmailService.
 * This provides proper DB logging, queue, retry, and tenant resolution.
 */
export async function sendEmail(p: SendEmailParams, opts?: { tenantId?: string }): Promise<SendEmailResult> {
  const result = await sendViaService(
    {
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
      module: (p.module as 'auth' | 'complaints' | 'work-orders' | 'invoices' | 'quotations' | 'pm' | 'equipment' | 'inventory' | 'finance' | 'hr' | 'inspection' | 'general') || 'auth',
      templateName: p.templateName || 'Legacy Email',
    },
    { tenantId: opts?.tenantId },
  );

  return {
    ok: result.ok,
    provider: result.provider as SendEmailResult['provider'],
    id: result.messageId,
    error: result.error,
    logId: result.logId,
  };
}

/* ------------------------------------------------------------------ */
/*  Email templates (legacy — kept for backward compat)                */
/* ------------------------------------------------------------------ */

const BRAND = 'MOHD.HMS ENTERPRISE';
const BRAND_GREEN = '#059669';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:${BRAND_GREEN};color:#ffffff;text-align:center;line-height:48px;font-weight:700;font-size:18px;">M</div>
        <div style="font-size:14px;color:#6b7280;margin-top:12px;">${BRAND}</div>
      </td></tr>
      <tr><td style="padding:8px 32px 32px 32px;color:#111827;font-size:15px;line-height:1.55;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
        &copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderResetEmail(opts: { resetUrl: string; userName?: string | null }) {
  const subject = `Reset Your ${BRAND} Password`;
  const greeting = opts.userName ? `Hello ${escapeHtml(opts.userName)},` : 'Hello,';
  const html = shell(
    subject,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Reset your password</h1>
    <p style="margin:0 0 14px 0;">${greeting}</p>
    <p style="margin:0 0 14px 0;">We received a request to reset your password.</p>
    <p style="margin:0 0 22px 0;">Click the button below to create a new password.</p>
    <p style="margin:0 0 22px 0;">
      <a href="${escapeHtml(opts.resetUrl)}"
         style="display:inline-block;background:${BRAND_GREEN};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">
        Reset Password
      </a>
    </p>
    <p style="margin:0 0 6px 0;color:#6b7280;">This link expires in 15 minutes.</p>
    <p style="margin:0 0 22px 0;color:#6b7280;">If you didn&rsquo;t request this, you can safely ignore this email.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Or paste this URL into your browser:</p>
    <p style="margin:6px 0 0 0;color:#374151;font-size:13px;word-break:break-all;">${escapeHtml(opts.resetUrl)}</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND}</p>
    `
  );
  const text = `${greeting}

We received a request to reset your password.

Reset link (expires in 15 minutes):
${opts.resetUrl}

If you didn't request this, you can safely ignore this email.

Thank you,
${BRAND}`;
  return { subject, html, text };
}

export function renderWelcomeEmail(opts: { name: string; email: string; loginUrl: string; portalUrl?: string }) {
  const subject = `Welcome to ${BRAND}`;
  const greeting = opts.name ? `Hello ${escapeHtml(opts.name)},` : 'Hello,';
  const html = shell(
    subject,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Welcome to ${BRAND}, ${escapeHtml(opts.name)}!</h1>
    <p style="margin:0 0 14px 0;">Your account has been successfully created.</p>
    <p style="margin:0 0 14px 0;">You can now access the Smart Facility Maintenance Management System and manage all your maintenance operations from one place.</p>
    <p style="margin:0 0 22px 0;">Click the button below to log in to your account.</p>
    ${opts.portalUrl ? `<p style="margin:0 0 8px 0;">Customer Portal: <a href="${escapeHtml(opts.portalUrl)}" style="color:#059669;">${escapeHtml(opts.portalUrl)}</a></p>` : ''}
    <p style="margin:0 0 14px 0;color:#6B280;">If you have any questions, contact our support team.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
    `
  );
  const text = `${greeting}

Welcome to ${BRAND}!

Your account has been successfully created.

Login: ${opts.loginUrl}
${opts.portalUrl ? `Customer Portal: ${opts.portalUrl}` : ''}

If you have any questions, contact our support team.

Thank you,
${BRAND}`;
  return { subject, html, text };
}

export function renderPasswordChangedEmail(opts: { userName?: string | null; ip?: string | null; when?: Date }) {
  const subject = `Your ${BRAND} password was changed`;
  const greeting = opts.userName ? `Hello ${escapeHtml(opts.userName)},` : 'Hello,';
  const when = (opts.when ?? new Date()).toUTCString();
  const html = shell(
    subject,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Password changed</h1>
    <p style="margin:0 0 14px 0;">${greeting}</p>
    <p style="margin:0 0 14px 0;">Your password has been changed successfully.</p>
    <p style="margin:0 0 14px 0;color:#6b7280;">When: ${escapeHtml(when)}${opts.ip ? `<br/>IP address: ${escapeHtml(opts.ip)}` : ''}</p>
    <p style="margin:0 0 14px 0;">If you did not perform this action, contact support immediately.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND}</p>
    `
  );
  const text = `${greeting}

Your password has been changed successfully.

When: ${when}${opts.ip ? `
IP address: ${opts.ip}` : ''}

If you did not perform this action, contact support immediately.

Thank you,
${BRAND}`;
  return { subject, html, text };
}
