// Shared helpers for invoice API routes
import { db } from '@/core/database/db';

export interface LineItem {
  title?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  description?: string;
  unitPrice?: number;
  [key: string]: unknown;
}

export function computeTotals(
  items: LineItem[],
  taxRate = 0,
  discount = 0,
  shipping = 0,
) {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount + shipping;
  return { subtotal, tax, discount, shipping, total };
}

export async function generateInvoiceNo(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return 'INV/UNKN/00/0001';

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const tenantCode = tenant.name.substring(0, 4).toUpperCase();

  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await db.invoice.count({
    where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } },
  });

  const sequential = String(count + 1).padStart(4, '0');
  return `INV/${tenantCode}/${month}/${sequential}`;
}

/** Valid invoice status transitions */
export const INVOICE_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEW', 'CANCELLED'],
  REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['SENT', 'DRAFT', 'CANCELLED'],
  SENT: ['VIEWED', 'CANCELLED'],
  VIEWED: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'CANCELLED'],
  PAID: ['CLOSED'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  REJECTED: ['DRAFT'],
  CANCELLED: [],
  CLOSED: [],
};