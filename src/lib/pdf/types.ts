export interface PrintableLineItem {
  title: string;
  description?: string;
  unit?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PrintableParty {
  name: string;
  addressLines?: string[];
  phone?: string;
  email?: string;
  contact?: string; // e.g. "PIC" or site contact name
  contactLabel?: string; // label suffix, e.g. "(PIC)"
}

export interface PrintableCardRow {
  label: string;
  value: string;
  highlight?: boolean; // renders in green (e.g. "Paid")
}

export interface PrintableMetaRow {
  label: string;
  value: string;
}

export interface PrintableDocumentData {
  docType: 'INVOICE' | 'QUOTATION';
  docNumber: string;
  statusBadge?: { label: string; tone: 'paid' | 'neutral' } | null;

  meta: PrintableMetaRow[];

  billTo: PrintableParty;
  shipTo: PrintableParty;
  thirdCard?: { title: string; rows: PrintableCardRow[] } | null;

  items: PrintableLineItem[];
  currency: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  shipping: number;
  total: number;
  amountInWords: string;

  terms: string[];
  notes: string[];

  authorizedByName?: string;
  authorizedByRole?: string;
  qrValue: string;
}
