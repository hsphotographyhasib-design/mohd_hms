// ============ COMPANY INFORMATION ============
// Single source of truth for company details used across
// Invoice, Quotation, and other document views.

export const COMPANY = {
  name: 'MOHD.HMS ENTERPRISE',
  shortName: 'MH',
  address: 'No. 25, Spg 88, Jln Gadong BE1318',
  city: 'Bandar Seri Begawan, Brunei Darussalam',
  fullAddress: 'No. 25, Spg 88, Jln Gadong BE1318, Bandar Seri Begawan, Brunei Darussalam',
  phone: '+673 245 6789',
  email: 'info@mohdhms.com',
  website: 'www.mohdhms.com',
  regNo: 'BE1318',
  logoSvg: '/mohd_hms_logo.svg',
} as const;

export const COMPANY_COLORS = {
  primary: '#006b2d',
  green: '#00b050',
  greenBright: '#17a55a',
  greenSoft: '#e9f9f0',
  paidBg: '#d6f5e1',
  paidText: '#157f3c',
  ink: '#1f2937',
  ink2: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
} as const;

export const DEFAULT_INVOICE_TERMS = [
  '50% advance payment and balance upon completion.',
  'Price validity: 60 days from the invoice date.',
  'Delivery period: 3 working days.',
  'Additional works are subject to variation order.',
  'Warranty applies only to workmanship.',
  'Material warranty follows manufacturer terms.',
  'Payment by bank transfer or cheque.',
];

export const DEFAULT_QUOTATION_TERMS = [
  'This quotation is valid for the period stated above only.',
  '50% advance payment and balance upon completion.',
  'Delivery period: 3 working days after confirmation.',
  'Price quoted are in BND and inclusive of installation.',
  'Warranty applies only to workmanship.',
  'Material warranty follows manufacturer terms.',
  'Additional works are subject to variation order.',
  'Payment by bank transfer or cheque.',
];

export const DEFAULT_PAYMENT = {
  bankName: 'BAIDURI BANK',
  accountName: 'MOHD.HMS ENTERPRISE',
  accountNo: '00-12345-678901-2',
  method: 'Bank Transfer',
} as const;