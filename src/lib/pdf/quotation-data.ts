import { db } from '@/lib/db';
import { numberToCurrencyWords } from '@/lib/number-to-words';
import { DEFAULT_QUOTATION_TERMS } from '@/lib/company';
import { fmtDate, parsePrintableItems, parseTermsOr } from './parse-helpers';
import type { PrintableDocumentData } from './types';

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
    items: parsePrintableItems(quotation.items),
    currency,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxRate: quotation.taxRate,
    tax: quotation.tax,
    shipping: quotation.shipping,
    total: quotation.total,
    amountInWords: numberToCurrencyWords(quotation.total),
    terms: parseTermsOr(quotation.terms, DEFAULT_QUOTATION_TERMS),
    notes: quotation.notes ? [quotation.notes] : ['Thank you for considering our services.', 'We look forward to working with you.'],
    authorizedByName: quotation.preparedByUser?.name,
    authorizedByRole: 'Authorised Signature',
    qrValue: `https://mohdhms.com/quotation/${quotation.quotationNo || quotation.id}`,
  };
}
