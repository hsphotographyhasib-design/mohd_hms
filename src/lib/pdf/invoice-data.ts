import { db } from '@/lib/db';
import { numberToCurrencyWords } from '@/lib/number-to-words';
import { DEFAULT_INVOICE_TERMS, DEFAULT_PAYMENT } from '@/lib/company';
import { fmtDate, parsePrintableItems, parseTermsOr } from './parse-helpers';
import type { PrintableDocumentData } from './types';

export async function buildInvoicePrintData(tenantId: string, invoiceId: string): Promise<PrintableDocumentData | null> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
      creator: { select: { name: true } },
      preparer: { select: { name: true } },
    },
  });
  if (!invoice) return null;

  const currency = invoice.currency || 'BND';
  const isPaid = invoice.status === 'PAID';

  return {
    docType: 'INVOICE',
    docNumber: invoice.invoiceNumber,
    statusBadge: isPaid ? { label: 'PAID', tone: 'paid' } : null,
    meta: [
      { label: 'Invoice Date', value: fmtDate(invoice.createdAt) },
      { label: 'Due Date', value: fmtDate(invoice.dueDate) },
      ...(invoice.referenceNo ? [{ label: 'Reference', value: invoice.referenceNo }] : []),
      ...(invoice.poReference ? [{ label: 'PO / Ref No.', value: invoice.poReference }] : []),
      { label: 'Payment Terms', value: invoice.paymentTerms || '30 Days' },
      { label: 'Currency', value: `${currency} - ${currency === 'BND' ? 'Brunei Dollar' : currency}` },
      { label: 'Prepared By', value: invoice.preparer?.name || invoice.creator?.name || '—' },
    ],
    billTo: {
      name: invoice.customer.companyName || invoice.customer.name,
      addressLines: invoice.customer.address ? [invoice.customer.address] : [],
      phone: invoice.customer.phone || undefined,
      email: invoice.customer.email || undefined,
      contact: invoice.customer.pic || undefined,
      contactLabel: invoice.customer.pic ? '(PIC)' : undefined,
    },
    shipTo: invoice.shipToName
      ? {
          name: invoice.shipToName,
          addressLines: invoice.shipToAddress ? [invoice.shipToAddress] : [],
          phone: invoice.shipToPhone || undefined,
          contact: invoice.shipToContact || undefined,
        }
      : {
          name: invoice.customer.companyName || invoice.customer.name,
          addressLines: invoice.customer.address ? [invoice.customer.address] : [],
          phone: invoice.customer.phone || undefined,
          contact: invoice.customer.pic || undefined,
        },
    thirdCard: {
      title: 'PAYMENT INFORMATION',
      rows: [
        { label: 'Bank Name', value: invoice.bankName || DEFAULT_PAYMENT.bankName, highlight: false },
        { label: 'Account Name', value: invoice.bankAccountName || DEFAULT_PAYMENT.accountName },
        { label: 'Account No.', value: invoice.bankAccountNo || DEFAULT_PAYMENT.accountNo },
        { label: 'Payment Method', value: invoice.paymentMethod || DEFAULT_PAYMENT.method },
        { label: 'Payment Status', value: isPaid ? 'Paid' : invoice.status === 'CANCELLED' ? 'Cancelled' : 'Unpaid', highlight: isPaid },
        ...(invoice.paidAt ? [{ label: 'Paid On', value: fmtDate(invoice.paidAt) }] : []),
        ...(invoice.transactionId ? [{ label: 'Transaction ID', value: invoice.transactionId }] : []),
      ],
    },
    items: parsePrintableItems(invoice.items),
    currency,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxRate: invoice.taxRate,
    tax: invoice.tax,
    shipping: invoice.shipping,
    total: invoice.total,
    amountInWords: numberToCurrencyWords(invoice.total),
    terms: parseTermsOr(invoice.terms, DEFAULT_INVOICE_TERMS),
    notes: invoice.notes ? [invoice.notes] : ['Thank you for choosing us.', 'We look forward to working with you again.'],
    authorizedByName: invoice.preparer?.name || invoice.creator?.name,
    authorizedByRole: 'Authorised Signature',
    qrValue: `https://mohdhms.com/invoice/${invoice.invoiceNumber}`,
  };
}
