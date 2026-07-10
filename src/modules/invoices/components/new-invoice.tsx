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
  ArrowLeft, Plus, Trash2, Printer, Search, X, CheckCircle2, Circle,
  Loader2, Upload, Sparkles, Package, Wrench,
  Save, Eye, Paperclip, RotateCcw, FileDown, MessageCircle, Send,
  Bot, Truck,
} from 'lucide-react';
import { InvoicePreviewDialog } from './invoice-preview-dialog';
import { QuotationLineItemsGrid } from '@/modules/quotations/components/quotation-line-items-grid';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import type { InvoiceLineItem, EmployeeData } from '@/core/types';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';
import { format, addDays } from 'date-fns';
import { numberToCurrencyWords } from '@/core/utils/number-to-words';

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

const WORKFLOW_STEPS = [
  'Draft', 'Review', 'Approved', 'Sent', 'Partially Paid', 'Paid', 'Closed',
];

const DRAFT_KEY = 'invoice-draft';
const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym} ${amount.toFixed(2)}`;
}

interface DraftData {
  lineItems: InvoiceLineItem[];
  formData: typeof INITIAL_FORM_STATE;
  customerSearch: string;
  selectedCustomerId: string | null;
  savedAt: string;
}

const INITIAL_FORM_STATE = {
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
};

function createEmptyItem(overrides?: Partial<InvoiceLineItem>): InvoiceLineItem {
  return {
    title: '',
    description: '',
    unit: 'Nos',
    quantity: 0,
    rate: 0,
    amount: 0,
    itemType: 'custom',
    itemCode: '',
    discount: 0,
    tax: 0,
    labourCost: 0,
    materialCost: 0,
    ...overrides,
  };
}

// ============ SMART CUSTOMER SEARCH RESULT ============

interface CustomerSearchResult {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  customerNumber: string;
  pic?: string | null;
  country?: string | null;
  district?: string | null;
  taxRate?: number;
  paymentTerms?: string | null;
  invoiceCount: number;
  activeInvoiceCount: number;
}

// ============ MAIN COMPONENT =============

export function NewInvoice() {
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout>>();
  const customerInputRef = useRef<HTMLDivElement>(null);

  // Line items — reuse QuotationLineItemsGrid with InvoiceLineItem (same shape)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([createEmptyItem()]);

  // Form data
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Auto-save
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval>>();

  // --- Fetch initial data ---
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [empRes, numRes] = await Promise.all([
          fetch('/api/employees?pageSize=100', { headers: authHeaders() }),
          fetch('/api/invoices/next-number', { headers: authHeaders() }),
        ]);

        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(empJson.data || []);
        }
        if (numRes.ok) {
          const numJson = await numRes.json();
          setInvoiceNumber(numJson.invoiceNumber || '');
        } else {
          setInvoiceNumber(`INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/0001`);
        }

        // Try to load draft
        try {
          const draftStr = localStorage.getItem(DRAFT_KEY);
          if (draftStr) {
            const draft: DraftData = JSON.parse(draftStr);
            if (draft.lineItems?.length) setLineItems(draft.lineItems);
            if (draft.formData) {
              setFormData((prev) => ({ ...prev, ...draft.formData, terms: draft.formData.terms || DEFAULT_TERMS }));
            }
            if (draft.customerSearch) setCustomerSearch(draft.customerSearch);
            if (draft.savedAt) setLastSaved(draft.savedAt);
            toast.info('Draft restored from auto-save');
          }
        } catch { /* ignore */ }
      } catch (err) {
        console.error('Init error:', err);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // --- Auto-save every 30s ---
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (!hasChanges) return;
      const validItems = lineItems.filter(i => i.title.trim());
      if (validItems.length === 0 && !customerSearch.trim()) return;

      const draft: DraftData = {
        lineItems,
        formData,
        customerSearch,
        selectedCustomerId: selectedCustomer?.id || null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSaved(new Date().toISOString());
      setHasChanges(false);
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [lineItems, formData, customerSearch, selectedCustomer, hasChanges]);

  // Mark changes on any state update
  useEffect(() => { setHasChanges(true); }, [lineItems, formData, customerSearch, selectedCustomer]);

  // --- Customer smart search ---
  const handleCustomerSearch = useCallback((query: string) => {
    setCustomerSearch(query);
    setSelectedCustomer(null);
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);

    if (query.length < 1) {
      setCustomerResults([]);
      setCustomerDropdownOpen(false);
      return;
    }

    setCustomerSearching(true);
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/invoices/smart-search-customer?q=${encodeURIComponent(query)}&limit=8`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setCustomerResults(json.results || []);
          setCustomerDropdownOpen(true);
        }
      } catch { /* silent */ }
      finally { setCustomerSearching(false); }
    }, 200);
  }, []);

  const selectCustomer = useCallback((c: CustomerSearchResult) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.companyName || c.name);
    setCustomerDropdownOpen(false);
    // Auto-populate payment terms from customer if available
    if (c.paymentTerms) {
      setFormData(f => ({ ...f, paymentTerms: c.paymentTerms || f.paymentTerms }));
    }
  }, []);

  const handleItemsChange = useCallback((newItems: InvoiceLineItem[]) => {
    const lastItem = newItems[newItems.length - 1];
    if (!lastItem || (lastItem.title.trim() || lastItem.quantity || lastItem.rate)) {
      newItems = [...newItems, createEmptyItem()];
    }
    setLineItems(newItems);
  }, []);

  // --- Computed values ---
  const validItems = useMemo(() => lineItems.filter(i => i.title.trim()), [lineItems]);

  const lineSubtotal = useMemo(
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

  const subtotal = lineSubtotal;
  const remainingAfterLineDiscounts = subtotal - lineDiscountTotal;
  const globalTax = remainingAfterLineDiscounts * (parseFloat(formData.taxRate) / 100);
  const taxAmount = lineTaxTotal + globalTax;

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - formData.discount - lineDiscountTotal + taxAmount + formData.shipping + lineLabourTotal + lineMaterialTotal),
    [subtotal, formData.discount, lineDiscountTotal, taxAmount, formData.shipping, lineLabourTotal, lineMaterialTotal]
  );

  const amountInWords = useMemo(() => {
    const words = numberToCurrencyWords(grandTotal);
    const currencyName = CURRENCY_NAMES[formData.currency] || formData.currency.toUpperCase();
    return words.replace('BRUNEI DOLLARS', currencyName).replace('BRUNEI DOLLAR', currencyName.replace(/S$/, ''));
  }, [grandTotal, formData.currency]);

  // --- Clear draft ---
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setLineItems([createEmptyItem()]);
    setFormData(INITIAL_FORM_STATE);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setLastSaved(null);
    toast.success('Draft cleared');
  }, []);

  // --- Save handler ---
  const handleSave = useCallback(async (status: 'DRAFT' | 'REVIEW' = 'DRAFT') => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    const itemsToSave = lineItems.filter(i => i.title.trim());
    if (itemsToSave.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    if (status === 'DRAFT') setSaving(true);
    else setSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomer.id,
        title: formData.title || 'Invoice',
        invoiceNumber,
        description: formData.description,
        referenceNo: formData.referenceNo,
        poReference: formData.poReference,
        paymentTerms: formData.paymentTerms,
        dueDate: formData.dueDate || null,
        preparedBy: formData.preparedBy || null,
        items: JSON.stringify(itemsToSave),
        terms: JSON.stringify(formData.terms),
        currency: formData.currency,
        taxRate: parseFloat(formData.taxRate),
        discount: formData.discount,
        shipping: formData.shipping,
        subtotal,
        tax: taxAmount,
        total: grandTotal,
        status,
        notes: formData.notes,
        shipToName: formData.shipToName || null,
        shipToAddress: formData.shipToAddress || null,
        shipToPhone: formData.shipToPhone || null,
        shipToContact: formData.shipToContact || null,
      };

      const res = savedInvoiceId
        ? await fetch(`/api/invoices/${savedInvoiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/invoices/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      const result = await res.json();
      const id = result.id || savedInvoiceId;

      localStorage.removeItem(DRAFT_KEY);

      toast.success(status === 'DRAFT' ? 'Invoice saved as draft' : 'Invoice submitted for review');
      setView('invoice-detail', { id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }, [selectedCustomer, lineItems, formData, invoiceNumber, subtotal, taxAmount, grandTotal, savedInvoiceId, setView]);

  // --- Preview helper ---
  const buildPreviewData = () => ({
    id: savedInvoiceId || 'preview',
    invoiceNumber,
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
    status: 'DRAFT',
    notes: formData.notes,
    createdAt: new Date().toISOString(),
    customer: selectedCustomer
      ? {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || undefined,
          email: selectedCustomer.email || undefined,
          address: selectedCustomer.address || undefined,
          companyName: selectedCustomer.companyName || undefined,
          pic: selectedCustomer.pic || undefined,
        }
      : undefined,
  });

  // --- Close customer dropdown on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerInputRef.current && !customerInputRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading invoice form...</span>
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
              {/* Row 1: Back + Title + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('invoices')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">New Invoice</h1>
                    {invoiceNumber && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{invoiceNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastSaved && (
                    <span className="text-[10px] text-muted-foreground">
                      Auto-saved {format(new Date(lastSaved), 'HH:mm:ss')}
                    </span>
                  )}
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Draft
                  </Badge>
                </div>
              </div>

              {/* Row 2: Customer Search (full width) */}
              <div className="relative" ref={customerInputRef}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customer by name, phone, email..."
                      className="pl-10 h-10 text-sm pr-8"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => { if (customerResults.length > 0) setCustomerDropdownOpen(true); }}
                    />
                    {customerSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <span className="font-semibold text-gray-900">{selectedCustomer.companyName || selectedCustomer.name}</span>
                      <span className="text-xs text-muted-foreground">{selectedCustomer.phone}</span>
                      <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Dropdown */}
                {customerDropdownOpen && customerResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 border-b border-gray-50 last:border-0 transition-colors"
                          onClick={() => selectCustomer(c)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {c.companyName || c.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.invoiceCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{c.invoiceCount} INV</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.phone} {c.email ? `| ${c.email}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Customer Details */}
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
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Country</span>
                    <p className="text-sm text-gray-700 mt-0.5">{selectedCustomer.country || 'Brunei'}</p>
                  </div>
                  {selectedCustomer.paymentTerms && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Terms</span>
                      <p className="text-sm text-gray-700 mt-0.5">{selectedCustomer.paymentTerms}</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Row 3: Invoice Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice No.</Label>
                  <Input value={invoiceNumber} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed font-mono" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Date</Label>
                  <Input type="date" value={dateStr} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed" />
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
                  <Input value={formData.referenceNo} onChange={(e) => setFormData(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Optional" className="h-9 text-sm mt-1" />
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
                  <Input value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Enter invoice title" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">PO Reference</Label>
                  <Input value={formData.poReference} onChange={(e) => setFormData(f => ({ ...f, poReference: e.target.value }))} placeholder="Purchase order ref" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Terms</Label>
                  <Input value={formData.paymentTerms} onChange={(e) => setFormData(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="e.g. Net 30" className="h-9 text-sm mt-1" />
                </div>
              </div>

              {/* Row 5: Description */}
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Description / Scope of Work</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Enter description or scope of work..." className="text-sm mt-1 min-h-[60px]" rows={2} />
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
          {/* ============ LEFT: LINE ITEMS + BOTTOM ROW ============ */}
          <div className="lg:col-span-9 space-y-4">

            {/* Line Items Enterprise Grid */}
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

            {/* Bottom Row: Terms + Notes + Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Terms & Conditions */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-1.5">
                  {formData.terms.map((term, i) => (
                    <div key={i} className="flex gap-1.5 items-start">
                      <span className="text-[10px] text-muted-foreground mt-2 w-3 shrink-0">{i + 1}.</span>
                      <Textarea
                        value={term}
                        onChange={(e) => {
                          const updated = [...formData.terms];
                          updated[i] = e.target.value;
                          setFormData(f => ({ ...f, terms: updated }));
                        }}
                        className="text-xs min-h-[32px] resize-none p-1.5"
                        rows={1}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-gray-400 hover:text-rose-500"
                        onClick={() => {
                          if (formData.terms.length <= 1) return;
                          setFormData(f => ({ ...f, terms: f.terms.filter((_, idx) => idx !== i) }));
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-[11px] text-muted-foreground hover:text-foreground mt-1"
                    onClick={() => setFormData(f => ({ ...f, terms: [...f.terms, ''] }))}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Term
                  </Button>
                </CardContent>
              </Card>

              {/* Notes / Remarks */}
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
                    placeholder="Internal notes, special instructions..."
                    className="text-xs min-h-[80px]"
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-1.5">
                  {formData.attachments && formData.attachments.length > 0 ? (
                    formData.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-700 flex-1 truncate">{att}</span>
                        <button
                          onClick={() => setFormData(f => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }))}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <X className="h-2.5 w-2.5 text-gray-400" />
                        </button>
                      </div>
                    ))
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-dashed"
                    onClick={() => {
                      const name = prompt('Enter attachment file name:');
                      if (name?.trim()) {
                        setFormData(f => ({ ...f, attachments: [...(f.attachments || []), name.trim()] }));
                      }
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Add Attachment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ============ RIGHT: SUMMARY + WORKFLOW + AI (STICKY) ============ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Summary Card (sticky) */}
            <Card className="py-0 gap-0 lg:sticky lg:top-20">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(subtotal, formData.currency)}
                  </span>
                </div>

                {/* Line Discount */}
                {lineDiscountTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Line Discounts</span>
                    <span className="text-sm font-medium text-rose-600">
                      -{formatCurrency(lineDiscountTotal, formData.currency)}
                    </span>
                  </div>
                )}

                {/* Labour Cost */}
                {lineLabourTotal > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Wrench className="h-3 w-3" /> Labour (from items)
                    </span>
                    <span className="text-xs text-gray-500">{formatCurrency(lineLabourTotal, formData.currency)}</span>
                  </div>
                )}

                {/* Material Cost */}
                {lineMaterialTotal > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Material (from items)
                    </span>
                    <span className="text-xs text-gray-500">{formatCurrency(lineMaterialTotal, formData.currency)}</span>
                  </div>
                )}

                {/* Global Discount */}
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

                {/* Tax */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tax Rate</span>
                  <Select
                    value={formData.taxRate}
                    onValueChange={(v) => setFormData(f => ({ ...f, taxRate: v }))}
                  >
                    <SelectTrigger className="h-8 w-28 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map(r => (
                        <SelectItem key={r} value={r}>{r}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {taxAmount > 0 && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-gray-400">Tax amount</span>
                    <span className="text-xs text-gray-500">{formatCurrency(taxAmount, formData.currency)}</span>
                  </div>
                )}

                {/* Shipping */}
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

                {/* Grand Total */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">Grand Total</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(grandTotal, formData.currency)}
                  </span>
                </div>

                {/* Amount in Words */}
                <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs font-medium leading-relaxed">
                  {amountInWords}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Status Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-0">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isCompleted = i === 0;
                    const isCurrent = i === 0;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'border-2 border-gray-300 text-gray-400'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" />
                            )}
                          </div>
                          {i < WORKFLOW_STEPS.length - 1 && (
                            <div className={cn('w-0.5 h-5', isCompleted ? 'bg-emerald-500' : 'bg-gray-200')} />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs py-1.5 -ml-1',
                            isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                          )}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-500" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Use AI to help generate descriptions, notes, or optimize pricing.
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => toast.info('AI Description Generator — coming soon')}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Description
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => toast.info('AI Notes Generator — coming soon')}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>        {/* ==================== STICKY BOTTOM ACTION BAR ==================== */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Left — secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setShowPreview(true)}>
                      <Eye className="h-4 w-4 mr-1.5" /> Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview invoice</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1.5" /> Print
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print invoice</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm"
                      onClick={clearDraft}
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" /> Clear Draft
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear auto-saved draft</TooltipContent>
                </Tooltip>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right — primary actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-sm"
                  onClick={() => setView('invoices')}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving || submitting}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleSave('REVIEW')}
                  disabled={saving || submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Submit for Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>

      <InvoicePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        invoice={buildPreviewData()}
        onPrint={() => window.print()}
      />
    </Fragment>
  );
}