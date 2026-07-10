'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import {
  ArrowLeft, Copy, Printer, Search, X, CheckCircle2, Circle,
  Loader2, Sparkles, QrCode,
  Eye, FileDown, MessageCircle, Send, Truck, Wrench, Package,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import type { InvoiceLineItem, CustomerData, EmployeeData, InvoiceItem, InvoiceStatus } from '@/core/types';
import { toast } from 'sonner';
import { InvoicePreviewDialog } from './invoice-preview-dialog';
import { QuotationLineItemsGrid } from '@/modules/quotations/components/quotation-line-items-grid';
import { cn } from '@/core/utils/utils';
import { format, addDays } from 'date-fns';
import { numberToCurrencyWords } from '@/core/utils/number-to-words';
import dynamic from 'next/dynamic';

// Lazy-load QR Code (client-only)
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

// ============ CONSTANTS ============

const TAX_RATES = ['0', '5', '10', '15'];
const CURRENCIES = ['BND', 'USD', 'SGD', 'MYR'];

const CURRENCY_SYMBOLS: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };

const CURRENCY_NAMES: Record<string, string> = {
  BND: 'BRUNEI DOLLARS',
  USD: 'US DOLLARS',
  SGD: 'SINGAPORE DOLLARS',
  MYR: 'MALAYSIAN RINGGIT',
};

const DEFAULT_TERMS = [
  '50% advance payment and balance upon completion.',
  'Price validity: 60 days from the invoice date.',
  'Delivery period: 3 working days.',
  'Additional works are subject to variation order.',
  'Warranty applies only to workmanship.',
  'Material warranty follows manufacturer terms.',
  'Payment by bank transfer or cheque.',
];

const STATUS_WORKFLOW: { status: InvoiceStatus; label: string; color: string }[] = [
  { status: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { status: 'REVIEW', label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  { status: 'APPROVED', label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  { status: 'SENT', label: 'Sent', color: 'bg-indigo-100 text-indigo-700' },
  { status: 'VIEWED', label: 'Viewed', color: 'bg-purple-100 text-purple-700' },
  { status: 'PARTIALLY_PAID', label: 'Partially Paid', color: 'bg-orange-100 text-orange-700' },
  { status: 'PAID', label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  { status: 'CLOSED', label: 'Closed', color: 'bg-gray-200 text-gray-600' },
];

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym} ${amount.toFixed(2)}`;
}

// ============ BARCODE COMPONENT ============

function BarcodeDisplay({ value }: { value: string }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current || !value) return;
    import('jsbarcode').then((JsBarcode) => {
      try {
        JsBarcode.default(barcodeRef.current, value, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          margin: 5,
        });
      } catch {
        // Fallback if barcode fails
      }
    });
  }, [value]);

  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg ref={barcodeRef} className="max-w-full" />
      <QRCodeSVG
        value={value}
        size={64}
        level="M"
        includeMargin={false}
        bgColor="#FFFFFF"
        fgColor="#111827"
      />
      <span className="text-[10px] text-muted-foreground">Scan to open invoice</span>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function InvoiceForm({ invoiceId }: { invoiceId: string }) {
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResultsOpen, setCustomerResultsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{
    title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0,
  }]);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    referenceNo: '',
    poReference: '',
    paymentTerms: '',
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    preparedBy: '',
    notes: '',
    terms: DEFAULT_TERMS,
    currency: 'BND',
    taxRate: '0',
    discount: 0,
    shipping: 0,
    shipToName: '',
    shipToAddress: '',
    shipToPhone: '',
    shipToContact: '',
  });

  // --- Fetch initial data ---
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [custRes, empRes, invRes] = await Promise.all([
          fetch('/api/customers?pageSize=100', { headers: authHeaders() }),
          fetch('/api/employees?pageSize=100', { headers: authHeaders() }),
          fetch(`/api/invoices/${invoiceId}`, { headers: authHeaders() }),
        ]);

        if (custRes.ok) {
          const custJson = await custRes.json();
          setCustomers(custJson.data || []);
        }
        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(empJson.data || []);
        }

        if (invRes.ok) {
          const inv = await invRes.json() as InvoiceItem;
          setInvoice(inv);

          // Populate form
          setFormData({
            title: inv.title || '',
            description: inv.description || '',
            referenceNo: inv.referenceNo || '',
            poReference: inv.poReference || '',
            paymentTerms: inv.paymentTerms || '',
            dueDate: inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '',
            preparedBy: inv.preparedBy || '',
            notes: inv.notes || '',
            terms: inv.terms
              ? (typeof inv.terms === 'string' ? JSON.parse(inv.terms) : inv.terms)
              : DEFAULT_TERMS,
            currency: inv.currency || 'BND',
            taxRate: String(inv.taxRate ?? 0),
            discount: inv.discount ?? 0,
            shipping: inv.shipping ?? 0,
            shipToName: inv.shipToName || '',
            shipToAddress: inv.shipToAddress || '',
            shipToPhone: inv.shipToPhone || '',
            shipToContact: inv.shipToContact || '',
          });

          // Parse line items
          if (inv.items) {
            const parsed = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
            setLineItems(parsed.length > 0
              ? parsed.map((item: InvoiceLineItem) => ({
                  ...item,
                  description: item.description || '',
                  unit: item.unit || 'Nos',
                }))
              : [{ title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 }]
            );
          }

          // Load customer
          if (inv.customerId) {
            const list = customers.length > 0 ? { data: customers } : await custRes.clone().json();
            const found = (list.data || []).find((c: CustomerData) => c.id === inv.customerId);
            if (found) {
              setSelectedCustomer(found);
              setCustomerSearch(found.companyName || found.name);
            }
          }
        } else {
          toast.error('Failed to load invoice');
          setView('invoices');
        }
      } catch (err) {
        console.error('Init error:', err);
        toast.error('Failed to load invoice data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [invoiceId, setView]);

  // --- Computed totals ---
  const validItems = useMemo(() => lineItems.filter(i => i.title.trim()), [lineItems]);

  const subtotal = useMemo(
    () => validItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [validItems]
  );

  const lineDiscountTotal = useMemo(
    () => validItems.reduce((sum, item) => sum + (item.discount || 0), 0),
    [validItems]
  );

  const lineTaxTotal = useMemo(
    () => validItems.reduce((sum, item) => {
      const sub = item.quantity * item.rate;
      const disc = item.discount || 0;
      const afterDisc = Math.max(0, sub - disc);
      return sum + afterDisc * ((item.tax || 0) / 100);
    }, 0),
    [validItems]
  );

  const lineLabourTotal = useMemo(
    () => validItems.reduce((sum, item) => sum + (item.labourCost || 0), 0),
    [validItems]
  );

  const lineMaterialTotal = useMemo(
    () => validItems.reduce((sum, item) => sum + (item.materialCost || 0), 0),
    [validItems]
  );

  const remainingAfterLineDiscounts = subtotal - lineDiscountTotal;
  const globalTax = remainingAfterLineDiscounts * (parseFloat(formData.taxRate) / 100);
  const taxAmount = lineTaxTotal + globalTax;

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - formData.discount - lineDiscountTotal + taxAmount + formData.shipping + lineLabourTotal + lineMaterialTotal),
    [subtotal, formData.discount, lineDiscountTotal, taxAmount, formData.shipping, lineLabourTotal, lineMaterialTotal]
  );

  const amountInWords = useMemo(() => {
    const words = numberToCurrencyWords(grandTotal);
    const currencyName = CURRENCY_NAMES[formData.currency] || formData.currency;
    return words.replace('BRUNEI DOLLARS', currencyName).replace('BRUNEI DOLLAR', currencyName.replace(/S$/, ''));
  }, [grandTotal, formData.currency]);

  // --- Customer search filtering ---
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.customerNumber.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    ).slice(0, 8);
  }, [customerSearch, customers]);

  const handleItemsChange = useCallback((newItems: InvoiceLineItem[]) => {
    const lastItem = newItems[newItems.length - 1];
    if (!lastItem || (lastItem.title.trim() || lastItem.quantity || lastItem.rate)) {
      newItems = [...newItems, { title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0, itemType: 'custom', itemCode: '', discount: 0, tax: 0, labourCost: 0, materialCost: 0 }];
    }
    setLineItems(newItems);
  }, []);

  // --- Save handler ---
  const handleSave = useCallback(async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    const itemsToSave = lineItems.filter((item) => item.title.trim() !== '');
    if (itemsToSave.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        title: formData.title || 'Invoice',
        description: formData.description,
        referenceNo: formData.referenceNo,
        poReference: formData.poReference,
        paymentTerms: formData.paymentTerms,
        dueDate: formData.dueDate || null,
        preparedBy: formData.preparedBy || null,
        items: JSON.stringify(itemsToSave),
        terms: JSON.stringify(formData.terms),
        currency: formData.currency,
        subtotal,
        taxRate: parseFloat(formData.taxRate),
        tax: taxAmount,
        discount: formData.discount,
        shipping: formData.shipping,
        total: grandTotal,
        notes: formData.notes,
        shipToName: formData.shipToName || null,
        shipToAddress: formData.shipToAddress || null,
        shipToPhone: formData.shipToPhone || null,
        shipToContact: formData.shipToContact || null,
      };

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      toast.success('Invoice updated');
      setView('invoice-detail', { id: invoiceId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, lineItems, formData, invoiceId, subtotal, taxAmount, grandTotal, setView]);

  // --- Workflow actions ---
  const handleWorkflowAction = useCallback(async (action: string, targetStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Action failed');
      }
      toast.success(`Invoice ${action.toLowerCase()}`);
      setView('invoice-detail', { id: invoiceId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()}`);
    }
  }, [invoiceId, setView]);

  // --- Preview ---
  const buildPreviewData = () => ({
    id: invoiceId,
    invoiceNumber: invoice?.invoiceNumber || '',
    title: formData.title || 'Invoice',
    description: formData.description,
    referenceNo: formData.referenceNo,
    poReference: formData.poReference,
    paymentTerms: formData.paymentTerms,
    dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
    preparedByName: formData.preparedBy,
    items: JSON.stringify(lineItems.filter((i) => i.title.trim() !== '')),
    terms: JSON.stringify(formData.terms),
    currency: formData.currency,
    subtotal,
    taxRate: parseFloat(formData.taxRate),
    tax: taxAmount,
    discount: formData.discount,
    shipping: formData.shipping,
    total: grandTotal,
    status: invoice?.status || 'DRAFT',
    notes: formData.notes,
    createdAt: invoice?.createdAt || new Date().toISOString(),
    amountPaid: invoice?.amountPaid,
    balanceDue: grandTotal - (invoice?.amountPaid ?? 0),
    payments: invoice?.payments,
    customer: selectedCustomer
      ? {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || undefined,
          email: selectedCustomer.email || undefined,
          address: selectedCustomer.address || undefined,
          companyName: selectedCustomer.companyName || undefined,
          pic: selectedCustomer.pic || undefined,
          district: selectedCustomer.district || undefined,
          country: selectedCustomer.country || undefined,
        }
      : undefined,
  });

  // --- Save silent for PDF/Email ---
  const handleSaveSilent = async (): Promise<string | null> => {
    if (!selectedCustomer) { toast.error('Please select a customer'); return null; }
    const itemsToSave = lineItems.filter((item) => item.title.trim() !== '');
    if (itemsToSave.length === 0) { toast.error('Add at least one line item'); return null; }
    try {
      const payload = {
        customerId: selectedCustomer.id,
        title: formData.title || 'Invoice',
        description: formData.description,
        referenceNo: formData.referenceNo,
        poReference: formData.poReference,
        paymentTerms: formData.paymentTerms,
        dueDate: formData.dueDate || null,
        preparedBy: formData.preparedBy || null,
        items: JSON.stringify(itemsToSave),
        terms: JSON.stringify(formData.terms),
        currency: formData.currency,
        subtotal,
        taxRate: parseFloat(formData.taxRate),
        tax: taxAmount,
        discount: formData.discount,
        shipping: formData.shipping,
        total: grandTotal,
        notes: formData.notes,
        shipToName: formData.shipToName || null,
        shipToAddress: formData.shipToAddress || null,
        shipToPhone: formData.shipToPhone || null,
        shipToContact: formData.shipToContact || null,
      };
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      return invoiceId;
    } catch {
      toast.error('Failed to save invoice');
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    const id = await handleSaveSilent();
    if (!id) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/generate-pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${(invoice?.invoiceNumber || 'draft').replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    const id = await handleSaveSilent();
    if (!id) return;
    if (!selectedCustomer?.email) { toast.error('No customer email found'); return; }
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email failed');
      toast.success(`Invoice sent to ${selectedCustomer.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const id = await handleSaveSilent();
    if (!id) return;
    if (!selectedCustomer?.phone) { toast.error('No customer phone found'); return; }
    try {
      const res = await fetch(`/api/invoices/${id}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'WhatsApp failed');
      window.open(data.whatsappLink, '_blank');
    } catch {
      const msg = encodeURIComponent(
        `Dear ${selectedCustomer.name},\n\nInvoice *${invoice?.invoiceNumber}*\nAmount: *${formData.currency} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}*\n\n- MOHD.HMS ENTERPRISE`
      );
      const phone = (selectedCustomer.phone || '').replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }
  };

  // --- Current status index ---
  const currentStatusIdx = useMemo(() => {
    if (!invoice) return 0;
    const idx = STATUS_WORKFLOW.findIndex(s => s.status === invoice.status);
    return idx >= 0 ? idx : 0;
  }, [invoice]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading invoice...</span>
      </div>
    );
  }

  return (
    <Fragment>
    <TooltipProvider>
      <div className="flex flex-col min-h-full">
        {/* ==================== INVOICE INFO (FULL WIDTH) ==================== */}
        <div className="p-4 md:p-6 pb-0">
          <Card className="py-0 gap-0">
            <CardContent className="p-4 md:p-5 space-y-4">
              {/* Row 1: Back + Title + Status + Source */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('invoice-detail', { id: invoiceId })}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Edit Invoice</h1>
                    {invoice?.invoiceNumber && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{invoice.invoiceNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Conversion source */}
                  {invoice?.quotationNo && (
                    <Badge variant="secondary" className="text-[10px]">
                      From QTN: {invoice.quotationNo}
                    </Badge>
                  )}
                  {invoice?.workOrderTitle && (
                    <Badge variant="secondary" className="text-[10px]">
                      WO: {invoice.workOrderTitle}
                    </Badge>
                  )}
                  {invoice && (
                    <Badge className={cn(
                      'border-0',
                      STATUS_WORKFLOW.find(s => s.status === invoice.status)?.color || 'bg-gray-100 text-gray-700'
                    )}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {STATUS_WORKFLOW.find(s => s.status === invoice.status)?.label || invoice.status}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Row 2: Customer Search */}
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customer..."
                      className="pl-10 h-9 text-sm"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerResultsOpen(true);
                        if (selectedCustomer) setSelectedCustomer(null);
                      }}
                      onFocus={() => setCustomerResultsOpen(true)}
                    />
                  </div>
                  {selectedCustomer && (
                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="p-1 hover:bg-gray-100 rounded">
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                {customerResultsOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.companyName || c.name);
                          setCustomerResultsOpen(false);
                        }}
                      >
                        <span className="font-medium">{c.companyName || c.name}</span>
                        <span className="block text-xs text-muted-foreground">{c.phone} {c.email ? `| ${c.email}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 bg-gray-50/80 rounded-lg p-3">
                  {selectedCustomer.address && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Address</span>
                      <p className="text-sm text-gray-700 mt-0.5">{selectedCustomer.address}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Customer No.</span>
                    <p className="text-sm text-gray-700 font-mono mt-0.5">{selectedCustomer.customerNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Phone</span>
                    <p className="text-sm text-gray-700 mt-0.5">{selectedCustomer.phone || '—'}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Row 3: Invoice Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice No.</Label>
                  <Input value={invoice?.invoiceNumber || ''} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed font-mono" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Date</Label>
                  <Input type="date" value={invoice?.createdAt ? format(new Date(invoice.createdAt), 'yyyy-MM-dd') : ''} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData(f => ({ ...f, dueDate: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Prepared By</Label>
                  <Select value={formData.preparedBy} onValueChange={(v) => setFormData(f => ({ ...f, preparedBy: v }))}>
                    <SelectTrigger className="w-full h-9 text-sm mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}{e.employeeNumber ? ` (${e.employeeNumber})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Reference No.</Label>
                  <Input value={formData.referenceNo} onChange={(e) => setFormData(f => ({ ...f, referenceNo: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData(f => ({ ...f, currency: v }))}>
                    <SelectTrigger className="w-full h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Title + PO Reference + Payment Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">PO Reference</Label>
                  <Input value={formData.poReference} onChange={(e) => setFormData(f => ({ ...f, poReference: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Terms</Label>
                  <Input value={formData.paymentTerms} onChange={(e) => setFormData(f => ({ ...f, paymentTerms: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
              </div>

              {/* Row 5: Description */}
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} className="text-sm mt-1 min-h-[60px]" rows={2} />
              </div>

              {/* Row 6: Ship To */}
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3 w-3" /> Ship To
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  <Input value={formData.shipToName} onChange={(e) => setFormData(f => ({ ...f, shipToName: e.target.value }))} placeholder="Ship to name" className="h-9 text-sm" />
                  <Input value={formData.shipToPhone} onChange={(e) => setFormData(f => ({ ...f, shipToPhone: e.target.value }))} placeholder="Phone" className="h-9 text-sm" />
                  <Input value={formData.shipToAddress} onChange={(e) => setFormData(f => ({ ...f, shipToAddress: e.target.value }))} placeholder="Ship to address" className="h-9 text-sm md:col-span-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================== MAIN CONTENT: GRID + SUMMARY ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 p-4 md:p-6 pb-28">
          {/* ============ LEFT: LINE ITEMS + TERMS ============ */}
          <div className="lg:col-span-9 space-y-4">

            {/* Line Items Grid */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Line Items</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({validItems.length} item{validItems.length !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <QuotationLineItemsGrid
                  items={lineItems}
                  onItemsChange={handleItemsChange}
                  currency={formData.currency}
                  validItemsCount={validItems.length}
                />
              </CardContent>
            </Card>

            {/* Bottom Row: Terms + Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Terms & Conditions */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  {formData.terms.map((term, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground mt-1.5 w-4 shrink-0">{i + 1}.</span>
                      <Textarea
                        value={term}
                        onChange={(e) => {
                          const updated = [...formData.terms];
                          updated[i] = e.target.value;
                          setFormData(f => ({ ...f, terms: updated }));
                        }}
                        className="text-sm min-h-[36px] resize-none p-2"
                        rows={1}
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
                    onClick={() => setFormData(f => ({ ...f, terms: [...f.terms, ''] }))}
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Add Term
                  </Button>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes / Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes..."
                    className="text-sm min-h-[100px]"
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ============ RIGHT: Barcode + Summary + Workflow ============ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Barcode & QR Code Card */}
            {invoice?.invoiceNumber && (
              <Card className="py-0 gap-0">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> Barcode / QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex justify-center">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 inline-block">
                    <BarcodeDisplay value={invoice.invoiceNumber} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Card (sticky) */}
            <Card className="py-0 gap-0 lg:sticky lg:top-20">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(subtotal, formData.currency)}</span>
                </div>

                {lineDiscountTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Line Discounts</span>
                    <span className="text-sm font-medium text-rose-600">-{formatCurrency(lineDiscountTotal, formData.currency)}</span>
                  </div>
                )}

                {lineLabourTotal > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5"><Wrench className="h-3 w-3" /> Labour</span>
                    <span className="text-xs text-gray-500">{formatCurrency(lineLabourTotal, formData.currency)}</span>
                  </div>
                )}

                {lineMaterialTotal > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5"><Package className="h-3 w-3" /> Material</span>
                    <span className="text-xs text-gray-500">{formatCurrency(lineMaterialTotal, formData.currency)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">Additional Discount</span>
                  <Input
                    type="number"
                    value={formData.discount || ''}
                    onChange={(e) => setFormData(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-28 text-sm text-right"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tax Rate</span>
                  <Select value={formData.taxRate} onValueChange={(v) => setFormData(f => ({ ...f, taxRate: v }))}>
                    <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {taxAmount > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400">Tax amount</span>
                    <span className="text-xs text-gray-500">{formatCurrency(taxAmount, formData.currency)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">Shipping</span>
                  <Input
                    type="number"
                    value={formData.shipping || ''}
                    onChange={(e) => setFormData(f => ({ ...f, shipping: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-28 text-sm text-right"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">Grand Total</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(grandTotal, formData.currency)}</span>
                </div>

                {/* Payment status */}
                {invoice?.amountPaid != null && invoice.amountPaid > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="text-emerald-600 font-medium">{formatCurrency(invoice.amountPaid, formData.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-gray-900">Balance Due</span>
                      <span className="text-rose-600">{formatCurrency(grandTotal - invoice.amountPaid, formData.currency)}</span>
                    </div>
                  </>
                )}

                <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs font-medium leading-relaxed">
                  {amountInWords}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Status Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Workflow Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-0">
                  {STATUS_WORKFLOW.map((step, i) => {
                    const isCompleted = i <= currentStatusIdx;
                    const isCurrent = i === currentStatusIdx;
                    return (
                      <div key={step.status} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                            isCompleted ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 text-gray-400'
                          )}>
                            {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          </div>
                          {i < STATUS_WORKFLOW.length - 1 && (
                            <div className={cn('w-0.5 h-6', isCompleted ? 'bg-emerald-500' : 'bg-gray-200')} />
                          )}
                        </div>
                        <span className={cn(
                          'text-sm py-2 -ml-1',
                          isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ==================== STICKY BOTTOM ACTION BAR ==================== */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Left group — secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-1.5" /> Preview
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                  {pdfLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" />}
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                <Button variant="secondary" size="sm" className="h-9 text-sm" onClick={handleSendEmail} disabled={emailLoading}>
                  {emailLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Email
                </Button>
                <Button variant="secondary" size="sm" className="h-9 text-sm" onClick={handleSendWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => toast.info('Duplicate — creates a new invoice with same data')}>
                  <Copy className="h-4 w-4 mr-1.5" /> Duplicate
                </Button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right group — primary & workflow actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setView('invoice-detail', { id: invoiceId })}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save
                </Button>

                {/* Workflow action buttons */}
                {invoice?.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    className="h-9 text-sm bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => handleWorkflowAction('Submit for Review', 'REVIEW')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Submit for Review
                  </Button>
                )}
                {invoice?.status === 'REVIEW' && (
                  <Button
                    size="sm"
                    className="h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleWorkflowAction('Approve', 'APPROVED')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Approve
                  </Button>
                )}
                {(invoice?.status === 'APPROVED' || invoice?.status === 'DRAFT') && (
                  <Button
                    size="sm"
                    className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleWorkflowAction('Send', 'SENT')}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>

      {/* ===== PREVIEW DIALOG ===== */}
      <InvoicePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        invoice={buildPreviewData()}
        onPrint={() => window.print()}
        onDownloadPdf={handleDownloadPdf}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleSendWhatsApp}
      />
    </Fragment>
  );
}