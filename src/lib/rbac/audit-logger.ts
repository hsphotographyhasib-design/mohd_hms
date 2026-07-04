/**
 * Enterprise Audit Logger for Complaint Access
 *
 * Logs every complaint access (view, modify, delete) to the AuditLog table.
 * Uses fire-and-forget pattern to avoid blocking the main request.
 */

import { db } from '@/lib/db';
import type { ComplaintAuditEntry } from './types';

/**
 * Extract client IP address from request headers.
 */
export function extractIpAddress(request: Request): string {
  // Try common proxy headers first
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Extract User-Agent from request headers.
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Extract device type from User-Agent string.
 */
export function extractDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Log a complaint access event to the database.
 * This runs asynchronously and does NOT block the response.
 */
export function logComplaintAccess(
  entry: ComplaintAuditEntry & { tenantId: string }
): void {
  // Fire-and-forget — do not await
  db.auditLog
    .create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entity: 'Complaint',
        entityId: entry.complaintId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        device: extractDeviceType(entry.userAgent || ''),
      },
    })
    .catch((err) => {
      // Never let audit logging crash the main request
      console.error('[RBAC Audit] Failed to log:', err.message);
    });
}

/**
 * Log a denied complaint access attempt.
 * This is important for security monitoring.
 */
export function logComplaintAccessDenied(
  params: {
    userId: string;
    tenantId: string;
    role: string;
    complaintId: string;
    request?: Request;
    reason?: string;
  }
): void {
  logComplaintAccess({
    userId: params.userId,
    tenantId: params.tenantId,
    role: params.role,
    complaintId: params.complaintId,
    action: `ACCESS_DENIED${params.reason ? `: ${params.reason}` : ''}`,
    result: 'DENIED',
    ipAddress: params.request ? extractIpAddress(params.request) : undefined,
    userAgent: params.request ? extractUserAgent(params.request) : undefined,
    details: params.reason ? { reason: params.reason } : undefined,
  });
}

/**
 * Log a successful complaint access.
 */
export function logComplaintAccessAllowed(
  params: {
    userId: string;
    tenantId: string;
    role: string;
    complaintId?: string;
    request?: Request;
    action?: string;
  }
): void {
  logComplaintAccess({
    userId: params.userId,
    tenantId: params.tenantId,
    role: params.role,
    complaintId: params.complaintId,
    action: params.action || 'VIEW',
    result: 'ALLOWED',
    ipAddress: params.request ? extractIpAddress(params.request) : undefined,
    userAgent: params.request ? extractUserAgent(params.request) : undefined,
  });
}