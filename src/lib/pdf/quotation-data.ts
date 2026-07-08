import { db } from '@/lib/db';
import { format } from 'date-fns';
import { numberToCurrencyWords } from '@/lib/number-to-words';
import { DEFAULT_QUOTATION_TERMS } from '@/lib/company';
import type { PrintableDocumentData, PrintableLineItem } from './types';

function fmtDate(d?: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy') : '—';
}

function parseItems(itemsJson: string): PrintableLineItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>) => ({
      title: String(item.title || item.description || 'Item'),
      description: item.title ? (item.description ? String(item.description) : undefined) : undefined,
      unit: item.unit ? String(item.unit) : 'Nos',
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate ?? item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
    }));
  } catch {
    return [];
  }
}

function parseTerms(termsJson: string | null): string[] {
  if (!termsJson) return DEFAULT_QUOTATION_TERMS;
  try {
    const parsed = JSON.parse(termsJson);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* fall through */ }
  return DEFAULT_QUOTATION_TERMS;
}

export async function buildQuotationPrintData(tenantId: string, quotationId: string): Promise<PrintableDocumentData | null> {
  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, tenantId },
    include: {
      customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
      preparedByUser: { select: { name: true } },
    },
  });
  if (!quotation) return null;

  const currency = quotation.currency || 'BND';
  const isAccepted = quotation.status === 'ACCEPTED' || quotation.status === 'CONVERTED_INVOICE';

  return {
    docType: 'QUOTATION',
    docNumber: quotation.quotationNo || quotation.id,
    statusBadge: isAccepted ? { label: 'ACCEPTED', tone: 'paid' } : null,
    meta: [
      { label: 'Quotation Date', value: fmtDate(quotation.createdAt) },
      { label: 'Valid Until', value: fmtDate(quotation.validUntil) },
      ...(quotation.referenceNo ? [{ label: 'Reference', value: quotation.referenceNo }] : []),
      { label: 'Currency', value: `${currency} - ${currency === 'BND' ? 'Brunei Dollar' : currency}` },
      { label: 'Prepared By', value: quotation.preparedByUser?.name || '—' },
    ],
    billTo: {
      name: quotation.customer.companyName || quotation.customer.name,
      addressLines: quotation.customer.address ? [quotation.customer.address] : [],
      phone: quotation.customer.phone || undefined,
      email: quotation.customer.email || undefined,
      contact: quotation.customer.pic || undefined,
      contactLabel: quotation.customer.pic ? '(PIC)' : undefined,
    },
    shipTo: {
      name: quotation.site || quotation.customer.companyName || quotation.customer.name,
      addressLines: quotation.site
        ? [quotation.site]
        : quotation.customer.address
          ? [quotation.customer.address]
          : [],
      phone: quotation.customer.phone || undefined,
      contact: quotation.customer.pic || undefined,
    },
    thirdCard: {
      title: 'PROJECT INFORMATION',
      rows: [
        { label: 'Project Name', value: quotation.projectName || '—' },
        { label: 'Site', value: quotation.site || '—' },
        { label: 'Status', value: quotation.status, highlight: isAccepted },
      ],
    },
    items: parseItems(quotation.items),
    currency,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxRate: quotation.taxRate,
    tax: quotation.tax,
    shipping: quotation.shipping,
    total: quotation.total,
    amountInWords: numberToCurrencyWords(quotation.total),
    terms: parseTerms(quotation.terms),
    notes: quotation.notes ? [quotation.notes] : ['Thank you for considering our services.', 'We look forward to working with you.'],
    authorizedByName: quotation.preparedByUser?.name,
    authorizedByRole: 'Authorised Signature',
    qrValue: `https://mohdhms.com/quotation/${quotation.quotationNo || quotation.id}`,
  };
}
