// Shared helpers for quotation API routes
import { db } from '@/lib/db';

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

export async function generateQuotationNo(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return 'QTN/UNKN/00/0001';

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const tenantCode = tenant.name.substring(0, 4).toUpperCase();

  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await db.quotation.count({
    where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } },
  });

  const sequential = String(count + 1).padStart(4, '0');
  return `QTN/${tenantCode}/${month}/${sequential}`;
}

export async function addNewQuotationFields(
  quotationId: string,
  fields: {
    quotationNo?: string;
    referenceNo?: string | null;
    projectName?: string | null;
    site?: string | null;
    preparedBy?: string | null;
    terms?: string[] | null;
    currency?: string | null;
    taxRate?: number;
    discount?: number;
    shipping?: number;
    sentAt?: null;
    acceptedAt?: null;
  },
): Promise<void> {
  await db.quotation.update({
    where: { id: quotationId },
    data: {
      quotationNo: fields.quotationNo,
      referenceNo: fields.referenceNo ?? null,
      projectName: fields.projectName ?? null,
      site: fields.site ?? null,
      preparedBy: fields.preparedBy ?? null,
      terms: fields.terms ? JSON.stringify(fields.terms) : null,
      currency: fields.currency || 'BND',
      taxRate: fields.taxRate ?? 0,
      discount: fields.discount ?? 0,
      shipping: fields.shipping ?? 0,
    },
  });
}