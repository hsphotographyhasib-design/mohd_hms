// ============ Template Registry ============
// All email templates for every module.
// Each template returns { subject, html, text, templateName, module }

import { renderEmailShell, esc, BRAND } from './base';
import type { EmailModule, TemplateVariable } from '../types';

interface TemplateResult {
  subject: string;
  html: string;
  text: string;
  templateName: string;
  module: EmailModule;
  variables: TemplateVariable[];
}

// ============ AUTH TEMPLATES ============

export function welcomeEmail(opts: { name: string; email: string; loginUrl: string; portalUrl?: string }) {
  const t: TemplateResult = {
    templateName: 'Welcome Email',
    module: 'auth',
    variables: [{ name: 'name', description: 'User name', required: true }, { name: 'loginUrl', description: 'Login URL', required: true }],
    subject: `Welcome to ${BRAND}`,
    html: '', text: '',
  };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Welcome to ${BRAND}, ${esc(opts.name)}!</h1>
    <p style="margin:0 0 14px 0;">Your account has been successfully created.</p>
    <p style="margin:0 0 14px 0;">You can now access the Smart Facility Maintenance Management System and manage all your maintenance operations from one place.</p>
    <p style="margin:0 0 22px 0;">Click the button below to log in to your account.</p>
    ${opts.portalUrl ? `<p style="margin:0 0 8px 0;">Customer Portal: <a href="${esc(opts.portalUrl)}" style="color:#16A34A;">${esc(opts.portalUrl)}</a></p>` : ''}
    <p style="margin:0 0 14px 0;color:#6B7280;">If you have any questions, contact our support team.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.loginUrl, ctaText: 'Log In to Your Account' });
  t.text = `Welcome to ${BRAND}, ${opts.name}!\n\nYour account has been created.\nLogin: ${opts.loginUrl}\n${opts.portalUrl ? `Customer Portal: ${opts.portalUrl}\n` : ''}\n\nThank you,\n${BRAND} Team`;
  t.subject = `Welcome to ${BRAND}`;
  return t;
}

export function emailVerification(opts: { name: string; verificationUrl: string; expiryMinutes?: number }) {
  const mins = opts.expiryMinutes || 24 * 60;
  const t: TemplateResult = {
    templateName: 'Email Verification',
    module: 'auth',
    variables: [{ name: 'name', description: 'User name', required: true }, { name: 'verificationUrl', description: 'Verification URL', required: true }],
    subject: `Verify Your ${BRAND} Email`,
    html: '', text: '',
  };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Verify Your Email Address</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">Please verify your email address to activate your account.</p>
    <p style="margin:0 0 14px 0;">Click the button below to verify your email. This link will expire in ${mins} minutes.</p>
    <p style="margin:0 0 22px 0;color:#6B7280;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.verificationUrl, ctaText: 'Verify Email Address' });
  t.text = `Hello ${opts.name},\n\nPlease verify your email: ${opts.verificationUrl}\nExpires in ${mins} minutes.\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function forgotPassword(opts: { name: string; resetUrl: string }) {
  const t: TemplateResult = {
    templateName: 'Forgot Password',
    module: 'auth',
    variables: [{ name: 'name', description: 'User name', required: true }, { name: 'resetUrl', description: 'Password reset URL', required: true }],
    subject: `Reset Your ${BRAND} Password`,
    html: '', text: '',
  };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Reset Your Password</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">We received a request to reset your password. Click the button below to create a new password.</p>
    <p style="margin:0 0 6px 0;color:#6B7280;">This link expires in <strong>15 minutes</strong>.</p>
    <p style="margin:0 0 22px 0;color:#6B7280;">If you didn't request this, you can safely ignore this email.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.resetUrl, ctaText: 'Reset Password' });
  t.text = `Hello ${opts.name},\n\nReset your password: ${opts.resetUrl}\nExpires in 15 minutes.\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function passwordChanged(opts: { name: string; ip?: string; when?: string }) {
  const when = opts.when || new Date().toUTCString();
  const t: TemplateResult = {
    templateName: 'Password Changed',
    module: 'auth',
    variables: [{ name: 'name', description: 'User name', required: true }],
    subject: `Your ${BRAND} Password Was Changed`,
    html: '', text: '',
  };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Password Changed Successfully</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">Your password has been changed successfully.</p>
    <p style="margin:0 0 14px 0;color:#6B7280;">When: ${esc(when)}${opts.ip ? `<br/>IP Address: ${esc(opts.ip)}` : ''}</p>
    <p style="margin:0 0 14px 0;">If you did not perform this action, please contact support immediately.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Hello ${opts.name},\n\nYour password was changed.\nWhen: ${when}${opts.ip ? `\nIP: ${opts.ip}` : ''}\n\nIf you didn't do this, contact support.\n\nThank you,\n${BRAND} Team`;
  return t;
}

// ============ COMPLAINT TEMPLATES ============

function complaintStatusEmail(opts: { ticketNo: string; status: string; customerName: string; description?: string; assigneeName?: string; notes?: string; viewUrl?: string }) {
  const t: TemplateResult = {
    templateName: `Complaint ${opts.status}`,
    module: 'complaints',
    variables: [{ name: 'ticketNo', description: 'Ticket number', required: true }, { name: 'status', description: 'New status', required: true }, { name: 'customerName', description: 'Customer name', required: true }],
    subject: `[${opts.ticketNo}] Complaint ${opts.status}`,
    html: '', text: '',
  };
  const statusColors: Record<string, string> = { NEW: '#3B82F6', ASSIGNED: '#F59E0B', ACCEPTED: '#8B5CF6', 'IN_PROGRESS': '#16A34A', COMPLETED: '#10B981', CLOSED: '#6B7280', REWORK_REQUIRED: '#EF4444' };
  const color = statusColors[opts.status] || '#16A34A';
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Complaint Update</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Ticket</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.ticketNo)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Status</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;"><span style="display:inline-block;background:${color};color:#fff;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;">${esc(opts.status.replace(/_/g, ' '))}</span></td></tr>
      ${opts.assigneeName ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Assigned To</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.assigneeName)}</td></tr>` : ''}
    </table>
    ${opts.description ? `<p style="margin:0 0 14px 0;">${esc(opts.description)}</p>` : ''}
    ${opts.notes ? `<div style="margin:0 0 14px 0;padding:12px 16px;background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">${esc(opts.notes)}</div>` : ''}
    <p style="margin:0 0 14px 0;color:#6B7280;">You will receive further updates as your complaint progresses.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Complaint' });
  t.text = `Complaint Update\n\nTicket: ${opts.ticketNo}\nStatus: ${opts.status.replace(/_/g, ' ')}\n${opts.assigneeName ? `Assigned To: ${opts.assigneeName}\n` : ''}${opts.notes ? `Notes: ${opts.notes}\n` : ''}${opts.viewUrl ? `View: ${opts.viewUrl}\n` : ''}\nThank you,\n${BRAND} Team`;
  return t;
}

export const complaintCreated = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Created' });
export const complaintAssigned = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Assigned', notes: `A technician has been assigned to your complaint and will contact you shortly.` });
export const complaintAccepted = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Accepted', notes: `The technician has accepted the work order and is preparing to address the issue.` });
export const complaintTechOnWay = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Technician On The Way', notes: `Our technician is on the way to your location. Please ensure someone is available for access.` });
export const complaintWorkStarted = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Work Started', notes: `Work has begun on your complaint. Our technician is actively resolving the issue.` });
export const complaintWorkInProgress = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Work In Progress' });
export const complaintCompleted = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Completed', notes: `The work has been completed. Please review and confirm if the issue is resolved.` });
export const complaintConfirmationRequested = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Client Confirmation Requested', notes: `Please confirm that the issue has been resolved to your satisfaction.` });
export const complaintClosed = (o: Parameters<typeof complaintStatusEmail>[0]) => complaintStatusEmail({ ...o, status: 'Closed', notes: `Your complaint has been closed. Thank you for using ${BRAND}. If the issue persists, please submit a new complaint.` });

// ============ WORK ORDER TEMPLATES ============

function workOrderStatusEmail(opts: { woNumber: string; status: string; description?: string; assigneeName?: string; customerName?: string; notes?: string; viewUrl?: string }) {
  const t: TemplateResult = {
    templateName: `Work Order ${opts.status}`,
    module: 'work-orders',
    variables: [{ name: 'woNumber', description: 'Work order number', required: true }, { name: 'status', description: 'Status', required: true }],
    subject: `[${opts.woNumber}] Work Order ${opts.status}`,
    html: '', text: '',
  };
  const statusColors: Record<string, string> = { CREATED: '#3B82F6', ASSIGNED: '#F59E0B', ACCEPTED: '#8B5CF6', STARTED: '#16A34A', PAUSED: '#F97316', COMPLETED: '#10B981', CANCELLED: '#EF4444', CLOSED: '#6B7280' };
  const color = statusColors[opts.status] || '#16A34A';
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Work Order Update</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Work Order</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.woNumber)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Status</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;"><span style="display:inline-block;background:${color};color:#fff;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;">${esc(opts.status)}</span></td></tr>
      ${opts.assigneeName ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Assigned To</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.assigneeName)}</td></tr>` : ''}
      ${opts.customerName ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Customer</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.customerName)}</td></tr>` : ''}
    </table>
    ${opts.description ? `<p style="margin:0 0 14px 0;">${esc(opts.description)}</p>` : ''}
    ${opts.notes ? `<div style="margin:0 0 14px 0;padding:12px 16px;background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">${esc(opts.notes)}</div>` : ''}
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Work Order' });
  t.text = `Work Order Update\n\nWO#: ${opts.woNumber}\nStatus: ${opts.status}\n${opts.assigneeName ? `Assigned To: ${opts.assigneeName}\n` : ''}${opts.notes ? `Notes: ${opts.notes}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

export const woCreated = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Created' });
export const woAssigned = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Assigned' });
export const woAccepted = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Accepted' });
export const woStarted = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Started' });
export const woPaused = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Paused' });
export const woCompleted = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Completed' });
export const woCancelled = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Cancelled' });
export const woClosed = (o: Parameters<typeof workOrderStatusEmail>[0]) => workOrderStatusEmail({ ...o, status: 'Closed' });

// ============ QUOTATION TEMPLATES ============

export function quotationCreated(opts: { quoteNumber: string; customerName: string; amount?: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Quotation Created', module: 'quotations', variables: [{ name: 'quoteNumber', description: 'Quotation number', required: true }], subject: `[${opts.quoteNumber}] Quotation Created`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Quotation Created</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">A new quotation has been created for your review.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Quotation #</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.quoteNumber)}</td></tr>
      ${opts.amount ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Estimated Amount</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:600;font-size:14px;">${esc(opts.amount)}</td></tr>` : ''}
    </table>
    <p style="margin:0 0 14px 0;color:#6B7280;">The quotation is currently pending internal approval. You will be notified once it is ready for review.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Quotation' });
  t.text = `Quotation Created\n\nQuotation #: ${opts.quoteNumber}\n${opts.amount ? `Amount: ${opts.amount}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

export function quotationSent(opts: { quoteNumber: string; customerName: string; amount?: string; expiryDate?: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Quotation Sent', module: 'quotations', variables: [{ name: 'quoteNumber', description: 'Quotation number', required: true }], subject: `[${opts.quoteNumber}] Your Quotation is Ready`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Your Quotation is Ready</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">Your quotation is ready for review. Please find the details below.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Quotation #</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.quoteNumber)}</td></tr>
      ${opts.amount ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Total Amount</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:700;font-size:16px;color:#16A34A;">${esc(opts.amount)}</td></tr>` : ''}
      ${opts.expiryDate ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Valid Until</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.expiryDate)}</td></tr>` : ''}
    </table>
    <p style="margin:0 0 14px 0;">The quotation PDF is attached to this email for your reference.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Quotation' });
  t.text = `Your Quotation is Ready\n\nQuotation #: ${opts.quoteNumber}\n${opts.amount ? `Amount: ${opts.amount}\n` : ''}${opts.expiryDate ? `Valid Until: ${opts.expiryDate}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

export function quotationAccepted(opts: { quoteNumber: string; customerName: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Quotation Accepted', module: 'quotations', variables: [{ name: 'quoteNumber', description: 'Quotation number', required: true }], subject: `[${opts.quoteNumber}] Quotation Accepted`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Quotation Accepted</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">Great news! Your quotation <strong>${esc(opts.quoteNumber)}</strong> has been accepted.</p>
    <p style="margin:0 0 14px 0;">A work order will be created based on the accepted quotation. You will receive updates as the work progresses.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Details' });
  t.text = `Quotation ${opts.quoteNumber} has been accepted.\n\nA work order will be created.\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function quotationRejected(opts: { quoteNumber: string; customerName: string; reason?: string }) {
  const t: TemplateResult = { templateName: 'Quotation Rejected', module: 'quotations', variables: [{ name: 'quoteNumber', description: 'Quotation number', required: true }], subject: `[${opts.quoteNumber}] Quotation Rejected`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Quotation Rejected</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">The quotation <strong>${esc(opts.quoteNumber)}</strong> has been rejected.</p>
    ${opts.reason ? `<div style="margin:0 0 14px 0;padding:12px 16px;background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">Reason: ${esc(opts.reason)}</div>` : ''}
    <p style="margin:0 0 14px 0;">If you would like to discuss this further, please contact us.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Quotation ${opts.quoteNumber} rejected.\n${opts.reason ? `Reason: ${opts.reason}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

export function quotationExpiring(opts: { quoteNumber: string; customerName: string; expiryDate: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Quotation Expiring', module: 'quotations', variables: [{ name: 'quoteNumber', description: 'Quotation number', required: true }], subject: `[${opts.quoteNumber}] Quotation Expiring Soon`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Quotation Expiring Soon</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">Your quotation <strong>${esc(opts.quoteNumber)}</strong> will expire on <strong>${esc(opts.expiryDate)}</strong>.</p>
    <p style="margin:0 0 14px 0;">Please review and accept the quotation before it expires to avoid any delays.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'Review Quotation' });
  t.text = `Quotation ${opts.quoteNumber} expires on ${opts.expiryDate}.\n\nPlease review and accept.\n\nThank you,\n${BRAND} Team`;
  return t;
}

// ============ INVOICE TEMPLATES ============

export function invoiceSent(opts: { invoiceNumber: string; customerName: string; amount: string; dueDate: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Invoice Sent', module: 'invoices', variables: [{ name: 'invoiceNumber', description: 'Invoice number', required: true }, { name: 'amount', description: 'Invoice amount', required: true }], subject: `[${opts.invoiceNumber}] Invoice ${opts.amount}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Invoice</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">A new invoice has been generated for you.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Invoice #</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.invoiceNumber)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Total Amount</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:700;font-size:18px;color:#16A34A;">${esc(opts.amount)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Due Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.dueDate)}</td></tr>
    </table>
    <p style="margin:0 0 14px 0;">The invoice PDF is attached to this email. Please process the payment before the due date.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'View Invoice' });
  t.text = `Invoice\n\nInvoice #: ${opts.invoiceNumber}\nAmount: ${opts.amount}\nDue Date: ${opts.dueDate}\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function invoiceOverdue(opts: { invoiceNumber: string; customerName: string; amount: string; dueDate: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Invoice Overdue Reminder', module: 'invoices', variables: [{ name: 'invoiceNumber', description: 'Invoice number', required: true }], subject: `URGENT: [${opts.invoiceNumber}] Overdue Invoice`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#DC2626;">Overdue Invoice Reminder</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">The following invoice is <strong style="color:#DC2626;">overdue</strong>:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:2px solid #FCA5A5;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#FEF2F2;font-size:13px;color:#6B7280;">Invoice #</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.invoiceNumber)}</td></tr>
      <tr><td style="padding:12px 16px;background:#FEF2F2;font-size:13px;color:#6B7280;border-top:1px solid #FCA5A5;">Outstanding Amount</td><td style="padding:12px 16px;border-top:1px solid #FCA5A5;font-weight:700;font-size:18px;color:#DC2626;">${esc(opts.amount)}</td></tr>
      <tr><td style="padding:12px 16px;background:#FEF2F2;font-size:13px;color:#6B7280;border-top:1px solid #FCA5A5;">Was Due</td><td style="padding:12px 16px;border-top:1px solid #FCA5A5;font-size:14px;">${esc(opts.dueDate)}</td></tr>
    </table>
    <p style="margin:0 0 14px 0;">Please arrange payment at your earliest convenience to avoid any service interruptions.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.viewUrl, ctaText: 'Pay Now' });
  t.text = `OVERDUE INVOICE\n\nInvoice #: ${opts.invoiceNumber}\nAmount: ${opts.amount}\nDue: ${opts.dueDate}\n\nPlease pay immediately.\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function paymentReceived(opts: { invoiceNumber: string; customerName: string; amount: string; paymentDate: string; viewUrl?: string }) {
  const t: TemplateResult = { templateName: 'Payment Received', module: 'invoices', variables: [{ name: 'invoiceNumber', description: 'Invoice number', required: true }], subject: `[${opts.invoiceNumber}] Payment Received`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Payment Received</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">We have received your payment. Thank you!</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Invoice #</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.invoiceNumber)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Amount Paid</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:700;font-size:16px;color:#16A34A;">${esc(opts.amount)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Payment Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.paymentDate)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;">Thank you for your business!<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Payment Received\n\nInvoice: ${opts.invoiceNumber}\nAmount: ${opts.amount}\nDate: ${opts.paymentDate}\n\nThank you!\n${BRAND} Team`;
  return t;
}

// ============ PM TEMPLATES ============

export function pmUpcoming(opts: { scheduleId: string; equipmentName: string; scheduledDate: string; location?: string; assigneeName?: string }) {
  const t: TemplateResult = { templateName: 'PM Upcoming Reminder', module: 'pm', variables: [{ name: 'equipmentName', description: 'Equipment name', required: true }], subject: `PM Reminder: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Upcoming Maintenance Reminder</h1>
    <p style="margin:0 0 14px 0;">This is a reminder for an upcoming preventive maintenance schedule.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Scheduled Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.scheduledDate)}</td></tr>
      ${opts.location ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Location</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.location)}</td></tr>` : ''}
      ${opts.assigneeName ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Assigned To</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.assigneeName)}</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `PM Reminder\n\nEquipment: ${opts.equipmentName}\nDate: ${opts.scheduledDate}\n${opts.location ? `Location: ${opts.location}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

export function pmCompleted(opts: { scheduleId: string; equipmentName: string; completedDate: string; notes?: string }) {
  const t: TemplateResult = { templateName: 'PM Completed', module: 'pm', variables: [{ name: 'equipmentName', description: 'Equipment name', required: true }], subject: `PM Completed: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Maintenance Completed</h1>
    <p style="margin:0 0 14px 0;">Preventive maintenance has been completed.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Completed</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.completedDate)}</td></tr>
    </table>
    ${opts.notes ? `<div style="margin:0 0 14px 0;padding:12px 16px;background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">${esc(opts.notes)}</div>` : ''}
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `PM Completed\n\nEquipment: ${opts.equipmentName}\nDate: ${opts.completedDate}\n${opts.notes ? `Notes: ${opts.notes}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

// ============ EQUIPMENT TEMPLATES ============

export function equipmentWarrantyExpiring(opts: { equipmentName: string; serialNumber?: string; expiryDate: string; location?: string }) {
  const t: TemplateResult = { templateName: 'Equipment Warranty Expiring', module: 'equipment', variables: [{ name: 'equipmentName', description: 'Equipment name', required: true }], subject: `Warranty Expiring: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#F59E0B;">Equipment Warranty Expiring</h1>
    <p style="margin:0 0 14px 0;">The warranty for the following equipment is expiring soon.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      ${opts.serialNumber ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Serial Number</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.serialNumber)}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Warranty Expiry</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:600;font-size:14px;color:#F59E0B;">${esc(opts.expiryDate)}</td></tr>
      ${opts.location ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Location</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.location)}</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Warranty Expiring\n\nEquipment: ${opts.equipmentName}\nExpiry: ${opts.expiryDate}\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function equipmentInspectionDue(opts: { equipmentName: string; inspectionType: string; dueDate: string; location?: string }) {
  const t: TemplateResult = { templateName: 'Equipment Inspection Due', module: 'equipment', variables: [{ name: 'equipmentName', description: 'Equipment name', required: true }], subject: `Inspection Due: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Equipment Inspection Due</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Inspection Type</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.inspectionType)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Due Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:600;font-size:14px;">${esc(opts.dueDate)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Inspection Due: ${opts.equipmentName}\nType: ${opts.inspectionType}\nDue: ${opts.dueDate}\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function equipmentQrGenerated(opts: { equipmentName: string; assetNumber: string; qrId: string }) {
  const t: TemplateResult = { templateName: 'QR Tag Generated', module: 'equipment', variables: [{ name: 'equipmentName', description: 'Equipment name', required: true }], subject: `QR Tag Generated: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">QR Tag Generated</h1>
    <p style="margin:0 0 14px 0;">A QR tag has been generated for the following equipment.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Asset Number</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.assetNumber)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">QR ID</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-family:monospace;font-size:14px;">${esc(opts.qrId)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `QR Tag Generated\n\nEquipment: ${opts.equipmentName}\nAsset: ${opts.assetNumber}\nQR ID: ${opts.qrId}\n\nThank you,\n${BRAND} Team`;
  return t;
}

// ============ INVENTORY TEMPLATES ============

export function lowStockAlert(opts: { itemName: string; currentStock: number; minStock: number; unit?: string }) {
  const t: TemplateResult = { templateName: 'Low Stock Alert', module: 'inventory', variables: [{ name: 'itemName', description: 'Item name', required: true }], subject: `Low Stock Alert: ${opts.itemName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#F59E0B;">Low Stock Alert</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:2px solid #FCD34D;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#FFFBEB;font-size:13px;color:#6B7280;">Item</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.itemName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#FFFBEB;font-size:13px;color:#6B7280;border-top:1px solid #FCD34D;">Current Stock</td><td style="padding:12px 16px;border-top:1px solid #FCD34D;font-weight:700;font-size:16px;color:#F59E0B;">${opts.currentStock} ${opts.unit || 'units'}</td></tr>
      <tr><td style="padding:12px 16px;background:#FFFBEB;font-size:13px;color:#6B7280;border-top:1px solid #FCD34D;">Minimum Stock</td><td style="padding:12px 16px;border-top:1px solid #FCD34D;font-size:14px;">${opts.minStock} ${opts.unit || 'units'}</td></tr>
    </table>
    <p style="margin:0 0 14px 0;">Please create a purchase request to replenish stock.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `LOW STOCK ALERT\n\nItem: ${opts.itemName}\nCurrent: ${opts.currentStock} ${opts.unit || 'units'}\nMinimum: ${opts.minStock} ${opts.unit || 'units'}\n\nPlease reorder.\n\nThank you,\n${BRAND} Team`;
  return t;
}

export function outOfStockAlert(opts: { itemName: string }) {
  const t: TemplateResult = { templateName: 'Out of Stock Alert', module: 'inventory', variables: [{ name: 'itemName', description: 'Item name', required: true }], subject: `OUT OF STOCK: ${opts.itemName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#DC2626;">Out of Stock Alert</h1>
    <p style="margin:0 0 14px 0;">The following item is now <strong>out of stock</strong>:</p>
    <div style="margin:0 0 20px 0;padding:16px;background:#FEF2F2;border-left:4px solid #DC2626;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-weight:600;font-size:16px;color:#111827;">${esc(opts.itemName)}</p>
    </div>
    <p style="margin:0 0 14px 0;">Immediate action required. Please create an urgent purchase request.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `OUT OF STOCK: ${opts.itemName}\n\nImmediate action required.\n\nThank you,\n${BRAND} Team`;
  return t;
}

// ============ FINANCE TEMPLATES ============

export function paymentConfirmation(opts: { customerName: string; amount: string; paymentDate: string; invoiceNumber?: string; method?: string }) {
  const t: TemplateResult = { templateName: 'Payment Confirmation', module: 'finance', variables: [{ name: 'amount', description: 'Payment amount', required: true }], subject: `Payment Confirmation - ${opts.amount}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Payment Confirmation</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.customerName)},</p>
    <p style="margin:0 0 14px 0;">We confirm receipt of your payment.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Amount</td><td style="padding:12px 16px;font-weight:700;font-size:16px;color:#16A34A;">${esc(opts.amount)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.paymentDate)}</td></tr>
      ${opts.invoiceNumber ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Invoice #</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.invoiceNumber)}</td></tr>` : ''}
      ${opts.method ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Method</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.method)}</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 0 0;">Thank you for your business!<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Payment Confirmation\n\nAmount: ${opts.amount}\nDate: ${opts.paymentDate}\n${opts.invoiceNumber ? `Invoice: ${opts.invoiceNumber}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}

// ============ HR TEMPLATES ============

export function employeeInvitation(opts: { name: string; email: string; role: string; setupUrl: string }) {
  const t: TemplateResult = { templateName: 'Employee Invitation', module: 'hr', variables: [{ name: 'name', description: 'Employee name', required: true }], subject: `You're Invited to Join ${BRAND}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Welcome to the Team!</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">You have been invited to join <strong>${BRAND}</strong> as a <strong>${esc(opts.role)}</strong>.</p>
    <p style="margin:0 0 14px 0;">Click the button below to set up your account and get started.</p>
    <p style="margin:0 0 14px 0;color:#6B7280;">This invitation link expires in 7 days.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} HR Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body, ctaUrl: opts.setupUrl, ctaText: 'Set Up Your Account' });
  t.text = `Hello ${opts.name},\n\nYou're invited to join ${BRAND} as ${opts.role}.\nSetup: ${opts.setupUrl}\n\nThank you,\n${BRAND} HR Team`;
  return t;
}

export function leaveApproval(opts: { name: string; leaveType: string; startDate: string; endDate: string; approved: boolean; reason?: string }) {
  const t: TemplateResult = { templateName: opts.approved ? 'Leave Approved' : 'Leave Rejected', module: 'hr', variables: [{ name: 'name', description: 'Employee name', required: true }], subject: `Leave ${opts.approved ? 'Approved' : 'Rejected'}: ${opts.leaveType}`, html: '', text: '' };
  const color = opts.approved ? '#16A34A' : '#DC2626';
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:${color};">Leave ${opts.approved ? 'Approved' : 'Rejected'}</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">Your ${esc(opts.leaveType)} leave request has been <strong>${opts.approved ? 'approved' : 'rejected'}</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Leave Type</td><td style="padding:12px 16px;font-size:14px;">${esc(opts.leaveType)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Dates</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.startDate)} — ${esc(opts.endDate)}</td></tr>
    </table>
    ${opts.reason ? `<p style="margin:0 0 14px 0;">${esc(opts.reason)}</p>` : ''}
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} HR Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Leave ${opts.approved ? 'Approved' : 'Rejected'}\n\nType: ${opts.leaveType}\nDates: ${opts.startDate} - ${opts.endDate}\n${opts.reason ? `Reason: ${opts.reason}\n` : ''}Thank you,\n${BRAND} HR Team`;
  return t;
}

export function payrollNotification(opts: { name: string; payPeriod: string; amount?: string; payDate: string }) {
  const t: TemplateResult = { templateName: 'Payroll Notification', module: 'hr', variables: [{ name: 'name', description: 'Employee name', required: true }], subject: `Payroll Processed: ${opts.payPeriod}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Payroll Notification</h1>
    <p style="margin:0 0 14px 0;">Hello ${esc(opts.name)},</p>
    <p style="margin:0 0 14px 0;">Your salary for <strong>${esc(opts.payPeriod)}</strong> has been processed.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Pay Period</td><td style="padding:12px 16px;font-size:14px;">${esc(opts.payPeriod)}</td></tr>
      ${opts.amount ? `<tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Net Pay</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-weight:700;font-size:16px;color:#16A34A;">${esc(opts.amount)}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Pay Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.payDate)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} HR Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `Payroll Notification\n\nPeriod: ${opts.payPeriod}\n${opts.amount ? `Net Pay: ${opts.amount}\n` : ''}Pay Date: ${opts.payDate}\n\nThank you,\n${BRAND} HR Team`;
  return t;
}

// ============ INSPECTION TEMPLATES ============

export function inspectionReport(opts: { reportType: string; equipmentName: string; location: string; date: string; inspectorName: string; summary?: string }) {
  const t: TemplateResult = { templateName: `Inspection Report - ${opts.reportType}`, module: 'inspection', variables: [{ name: 'reportType', description: 'Inspection type', required: true }], subject: `${opts.reportType} Report: ${opts.equipmentName}`, html: '', text: '' };
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">${esc(opts.reportType)} Report</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;">Equipment</td><td style="padding:12px 16px;font-weight:600;font-size:14px;">${esc(opts.equipmentName)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Location</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.location)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Date</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.date)}</td></tr>
      <tr><td style="padding:12px 16px;background:#F9FAFB;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;">Inspector</td><td style="padding:12px 16px;border-top:1px solid #E5E7EB;font-size:14px;">${esc(opts.inspectorName)}</td></tr>
    </table>
    ${opts.summary ? `<div style="margin:0 0 14px 0;padding:12px 16px;background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">${esc(opts.summary)}</div>` : ''}
    <p style="margin:0 0 14px 0;">The full inspection report is attached to this email.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND} Team</p>
  `;
  t.html = renderEmailShell({ title: t.subject, bodyHtml: body });
  t.text = `${opts.reportType} Report\n\nEquipment: ${opts.equipmentName}\nLocation: ${opts.location}\nDate: ${opts.date}\nInspector: ${opts.inspectorName}\n${opts.summary ? `\n${opts.summary}\n` : ''}Thank you,\n${BRAND} Team`;
  return t;
}