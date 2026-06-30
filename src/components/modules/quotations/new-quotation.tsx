'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Copy, Printer, FileText, Send,
  MessageSquare, Search, X, CheckCircle2, Circle,
  Loader2, Upload, Sparkles, Package, Wrench, Clock,
  UserPlus, AlertCircle, Save, Eye, Paperclip, RotateCcw,
  Bot,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import type { QuotationLineItem, CustomerData, EmployeeData } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { numberToCurrencyWords } from '@/lib/number-to-words';

// ============ CONSTANTS ============

const UNITS = ['Nos', 'Set', 'Lot', 'Hr', 'Day', 'Month', 'Sqm', 'Meter', 'Kg', 'Ltr', 'Pcs', 'Unit'];

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
  '50% advance payment.',
  'Balance upon completion.',
  'Price validity 60 days.',
  'Delivery 3 working days.',
  'Material warranty follows manufacturer.',
  'Additional works subject to variation order.',
  'Payment by bank transfer.',
];

const WORKFLOW_STEPS = [
  'Draft', 'Review', 'Approved', 'Sent', 'Accepted',
  'Converted to WO', 'Converted to Invoice', 'Paid', 'Closed',
];

const ITEM_TYPES = [
  { value: 'inventory', label: 'Inventory', icon: Package, color: 'text-blue-600 bg-blue-50' },
  { value: 'labour', label: 'Labour', icon: Wrench, color: 'text-amber-600 bg-amber-50' },
  { value: 'service', label: 'Service', icon: Clock, color: 'text-purple-600 bg-purple-50' },
  { value: 'custom', label: 'Custom', icon: FileText, color: 'text-gray-600 bg-gray-50' },
] as const;

const DRAFT_KEY = 'quotation-draft';
const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym} ${amount.toFixed(2)}`;
}

interface DraftData {
  lineItems: QuotationLineItem[];
  formData: typeof INITIAL_FORM_STATE;
  customerSearch: string;
  selectedCustomerId: string | null;
  savedAt: string;
}

const INITIAL_FORM_STATE = {
  referenceNo: '',
  projectName: '',
  site: '',
  description: '',
  validUntil: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
  preparedBy: '',
  notes: '',
  terms: DEFAULT_TERMS,
  currency: 'BND',
  taxRate: '0',
  discount: 0,
  shipping: 0,
  exchangeRate: 1,
  labourCost: 0,
  materialCost: 0,
  attachments: [] as string[],
};

function createEmptyItem(overrides?: Partial<QuotationLineItem>): QuotationLineItem {
  return {
    title: '',
    description: '',
    unit: 'Nos',
    quantity: 0,
    rate: 0,
    amount: 0,
    itemType: 'custom',
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
  quotationCount: number;
  activeInvoiceCount: number;
}

// ============ SMART INVENTORY SEARCH RESULT ============

interface InventorySearchResult {
  id?: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unit: string;
  unitPrice: number;
  stockAvailable?: number | null;
  supplier?: string | null;
  itemType: string;
  useCount?: number;
}

// ============ MAIN COMPONENT ============

export function NewQuotation() {
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quotationNo, setQuotationNo] = useState('');
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout>>();
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Inventory search for line items
  const [inventorySearchState, setInventorySearchState] = useState<{
    index: number | null;
    query: string;
    results: InventorySearchResult[];
    loading: boolean;
    open: boolean;
  }>({ index: null, query: '', results: [], loading: false, open: false });
  const inventorySearchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Line items
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([createEmptyItem()]);

  // Form data
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Auto-save
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval>>();

  // Item input refs
  const itemInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // --- Fetch initial data ---
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [empRes, numRes] = await Promise.all([
          fetch('/api/employees?pageSize=100', { headers: authHeaders() }),
          fetch('/api/quotations/next-number', { headers: authHeaders() }),
        ]);

        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(empJson.data || []);
        }
        if (numRes.ok) {
          const numJson = await numRes.json();
          setQuotationNo(numJson.quotationNo || '');
        } else {
          setQuotationNo(`QTN/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/0001`);
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
          `/api/quotations/smart-search-customer?q=${encodeURIComponent(query)}&limit=8`,
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
  }, []);

  // --- Inventory smart search for line items ---
  const handleItemTitleChange = useCallback((index: number, value: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: value };
      if (updated[index].quantity && updated[index].rate) {
        updated[index].amount = updated[index].quantity * updated[index].rate;
      }
      const last = updated[updated.length - 1];
      if (last.title.trim() || last.quantity || last.rate) {
        updated.push(createEmptyItem());
      }
      return updated;
    });

    // Trigger inventory search
    if (inventorySearchTimer.current) clearTimeout(inventorySearchTimer.current);
    if (value.length < 2) {
      setInventorySearchState(prev => ({ ...prev, open: false, results: [] }));
      return;
    }

    setInventorySearchState(prev => ({ ...prev, index, query: value, loading: true, open: true }));
    inventorySearchTimer.current = setTimeout(async () => {
      try {
        const itemType = lineItems[index]?.itemType || '';
        const typeParam = itemType !== 'custom' ? itemType : '';
        const res = await fetch(
          `/api/quotations/smart-search-inventory?q=${encodeURIComponent(value)}&limit=8&type=${typeParam}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setInventorySearchState(prev => ({
            ...prev,
            results: json.results || [],
            loading: false,
          }));
        }
      } catch { /* silent */ }
      finally {
        setInventorySearchState(prev => ({ ...prev, loading: false }));
      }
    }, 250);
  }, [lineItems]);

  const applyInventorySuggestion = useCallback((index: number, item: InventorySearchResult) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        title: item.name,
        description: item.description || '',
        unit: item.unit,
        rate: item.unitPrice,
        amount: (updated[index].quantity || 1) * item.unitPrice,
        category: item.category || undefined,
        itemType: item.itemType === 'inventory' ? 'inventory' : 'custom',
      };
      const last = updated[updated.length - 1];
      if (last.title.trim() || last.quantity || last.rate) {
        updated.push(createEmptyItem());
      }
      return updated;
    });
    setInventorySearchState({ index: null, query: '', results: [], loading: false, open: false });
  }, []);

  // --- Line item handlers ---
  const updateLineItem = useCallback((index: number, field: keyof QuotationLineItem, value: string | number) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated[index].amount = updated[index].quantity * updated[index].rate;
      }
      const last = updated[updated.length - 1];
      if (last.title.trim() || last.quantity || last.rate) {
        updated.push(createEmptyItem());
      }
      return updated;
    });
  }, []);

  const addRow = useCallback((type?: string) => {
    setLineItems(prev => [...prev, createEmptyItem(type ? { itemType: type } : undefined)]);
  }, []);

  const deleteRow = useCallback((index: number) => {
    setLineItems(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const duplicateRow = useCallback((index: number) => {
    setLineItems(prev => {
      const copy = { ...prev[index], id: undefined, title: prev[index].title + ' (copy)' };
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
  }, []);

  const insertRow = useCallback((index: number, type?: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, createEmptyItem(type ? { itemType: type } : undefined));
      return updated;
    });
  }, []);

  // --- Computed values ---
  const validItems = useMemo(() => lineItems.filter(i => i.title.trim()), [lineItems]);

  const subtotal = useMemo(
    () => validItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [validItems]
  );

  const taxAmount = useMemo(
    () => subtotal * (parseFloat(formData.taxRate) / 100),
    [subtotal, formData.taxRate]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - formData.discount + taxAmount + formData.shipping + formData.labourCost + formData.materialCost),
    [subtotal, formData.discount, taxAmount, formData.shipping, formData.labourCost, formData.materialCost]
  );

  const convertedTotal = useMemo(
    () => grandTotal * formData.exchangeRate,
    [grandTotal, formData.exchangeRate]
  );

  const amountInWords = useMemo(() => {
    const words = numberToCurrencyWords(grandTotal);
    const currencyName = CURRENCY_NAMES[formData.currency] || formData.currency.toUpperCase();
    // Replace "BRUNEI DOLLARS" with the actual currency
    return words.replace('BRUNEI DOLLARS', currencyName).replace('BRUNEI DOLLAR', currencyName.replace(/S$/, ''));
  }, [grandTotal, formData.currency]);

  const convertedAmountInWords = useMemo(() => {
    if (formData.exchangeRate === 1) return null;
    const words = numberToCurrencyWords(convertedTotal);
    return words;
  }, [convertedTotal]);

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
        title: formData.projectName || 'Quotation',
        quotationNo,
        description: formData.description,
        referenceNo: formData.referenceNo,
        projectName: formData.projectName,
        site: formData.site,
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
        validUntil: formData.validUntil || null,
        notes: formData.notes,
        exchangeRate: formData.exchangeRate,
        labourCost: formData.labourCost,
        materialCost: formData.materialCost,
        attachments: formData.attachments.length > 0 ? JSON.stringify(formData.attachments) : null,
      };

      const res = await fetch('/api/quotations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      const result = await res.json();

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);

      toast.success(status === 'DRAFT' ? 'Quotation saved as draft' : 'Quotation submitted for review');
      setView('quotation-detail', { id: result.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }, [selectedCustomer, lineItems, formData, quotationNo, subtotal, taxAmount, grandTotal, setView]);

  // --- Close dropdowns on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Customer dropdown
      if (customerInputRef.current && !customerInputRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
      // Inventory dropdown
      const activeInput = inventorySearchState.index !== null ? itemInputRefs.current.get(inventorySearchState.index) : null;
      if (activeInput && !activeInput.contains(e.target as Node)) {
        setInventorySearchState(prev => ({ ...prev, open: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inventorySearchState.index]);

  // --- Item type counts ---
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = { inventory: 0, labour: 0, service: 0, custom: 0 };
    validItems.forEach(item => {
      const t = item.itemType || 'custom';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [validItems]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading quotation form...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-full">
        {/* ==================== MAIN 3-COLUMN LAYOUT ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 p-4 md:p-6 pb-28">

          {/* ============ LEFT COLUMN ============ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Customer Information Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Smart Search */}
                <div className="relative" ref={customerInputRef}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, phone, email..."
                      className="pl-9 h-9 text-sm pr-8"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => { if (customerResults.length > 0) setCustomerDropdownOpen(true); }}
                    />
                    {customerSearching && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Dropdown */}
                  {customerDropdownOpen && customerResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/70 border-b border-gray-50 last:border-0 transition-colors"
                            onClick={() => selectCustomer(c)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-gray-900 truncate">
                                {c.companyName || c.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {c.quotationCount > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                    {c.quotationCount} QTN
                                  </Badge>
                                )}
                                {c.activeInvoiceCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-200">
                                    {c.activeInvoiceCount} INV
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {c.companyName && c.name !== c.companyName && (
                              <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.phone} {c.email ? `| ${c.email}` : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected customer details */}
                {selectedCustomer ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedCustomer.companyName || selectedCustomer.name}
                      </span>
                      <button
                        onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>

                    {selectedCustomer.address && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Address</span>
                        <p className="text-sm text-gray-700">{selectedCustomer.address}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Phone</span>
                        <p className="text-sm text-gray-700">{selectedCustomer.phone || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Email</span>
                        <p className="text-sm text-gray-700 truncate">{selectedCustomer.email || '—'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Customer No.</span>
                        <p className="text-sm text-gray-700 font-mono">{selectedCustomer.customerNumber}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Country</span>
                        <p className="text-sm text-gray-700">{selectedCustomer.country || 'Brunei'}</p>
                      </div>
                    </div>

                    {selectedCustomer.pic && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">PIC</span>
                        <p className="text-sm text-gray-700">{selectedCustomer.pic}</p>
                      </div>
                    )}

                    {selectedCustomer.paymentTerms && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Terms</span>
                        <p className="text-sm text-gray-700">{selectedCustomer.paymentTerms}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Currency */}
                    <div>
                      <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(v) => setFormData(f => ({ ...f, currency: v }))}
                      >
                        <SelectTrigger className="w-full h-9 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exchange Rate */}
                    {formData.currency !== 'BND' && (
                      <div>
                        <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Exchange Rate to BND</Label>
                        <Input
                          type="number"
                          value={formData.exchangeRate || ''}
                          onChange={(e) => setFormData(f => ({ ...f, exchangeRate: parseFloat(e.target.value) || 1 }))}
                          className="h-9 text-sm mt-1"
                          min={0}
                          step="0.001"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <UserPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Search and select a customer
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Type name, phone, or email
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Terms & Conditions Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Terms & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {formData.terms.map((term, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground mt-2 w-4 shrink-0">{i + 1}.</span>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-gray-400 hover:text-rose-500"
                      onClick={() => {
                        if (formData.terms.length <= 1) return;
                        setFormData(f => ({ ...f, terms: f.terms.filter((_, idx) => idx !== i) }));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setFormData(f => ({ ...f, terms: [...f.terms, ''] }))}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Term
                </Button>
              </CardContent>
            </Card>

            {/* Notes / Remarks */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Notes / Remarks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes, special instructions..."
                  className="text-sm min-h-[100px]"
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {formData.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{att}</span>
                    <button
                      onClick={() => setFormData(f => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }))}
                      className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-dashed"
                  onClick={() => {
                    const name = prompt('Enter attachment file name:');
                    if (name?.trim()) {
                      setFormData(f => ({ ...f, attachments: [...f.attachments, name.trim()] }));
                    }
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Add Attachment
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ============ CENTER COLUMN ============ */}
          <div className="lg:col-span-5 space-y-4">

            {/* Quotation Info Header */}
            <Card className="py-0 gap-0">
              <CardContent className="p-4 md:p-5 space-y-4">
                {/* Row 1: Back + Title + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('quotations')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">New Quotation</h1>
                      {quotationNo && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{quotationNo}</p>
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

                {/* Row 2: Quotation No + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Quotation No.</Label>
                    <Input value={quotationNo} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Date</Label>
                    <Input type="date" value={dateStr} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed" />
                  </div>
                </div>

                {/* Row 3: Valid Until + Prepared By */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Valid Until</Label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(f => ({ ...f, validUntil: e.target.value }))}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Prepared By</Label>
                    <Select
                      value={formData.preparedBy}
                      onValueChange={(v) => setFormData(f => ({ ...f, preparedBy: v }))}
                    >
                      <SelectTrigger className="w-full h-9 text-sm mt-1">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}{e.employeeNumber ? ` (${e.employeeNumber})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 4: Reference No + Project Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Reference No.</Label>
                    <Input
                      value={formData.referenceNo}
                      onChange={(e) => setFormData(f => ({ ...f, referenceNo: e.target.value }))}
                      placeholder="Optional reference"
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Project Name</Label>
                    <Input
                      value={formData.projectName}
                      onChange={(e) => setFormData(f => ({ ...f, projectName: e.target.value }))}
                      placeholder="Enter project name"
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                </div>

                {/* Row 5: Site */}
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Site Location</Label>
                  <Input
                    value={formData.site}
                    onChange={(e) => setFormData(f => ({ ...f, site: e.target.value }))}
                    placeholder="Enter site location"
                    className="h-9 text-sm mt-1"
                  />
                </div>

                {/* Row 6: Description */}
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Description / Scope of Work</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="Enter description or scope of work..."
                    className="text-sm mt-1 min-h-[80px]"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items Card */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Line Items
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({validItems.length} item{validItems.length !== 1 ? 's' : ''})
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {/* Item type quick-add buttons */}
                    {ITEM_TYPES.map(type => (
                      <Tooltip key={type.value}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn('h-7 px-2 text-xs gap-1', type.color)}
                            onClick={() => addRow(type.value)}
                          >
                            <type.icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{type.label}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add {type.label} item</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {/* Item type summary badges */}
                {validItems.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {ITEM_TYPES.map(type => {
                      const count = itemCounts[type.value] || 0;
                      if (count === 0) return null;
                      return (
                        <Badge key={type.value} variant="secondary" className={cn('text-[10px] h-5 gap-1', type.color)}>
                          <type.icon className="h-2.5 w-2.5" />
                          {count} {type.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase w-8">#</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase min-w-[200px]">Item</th>
                        <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase w-16">Type</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-16">Unit</th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase w-20">Qty</th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase w-28">Rate</th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase w-28">Amount</th>
                        <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase w-20">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr
                          key={index}
                          className={cn(
                            'border-t border-gray-100 transition-colors',
                            item.title ? 'hover:bg-emerald-50/20' : 'bg-gray-50/30'
                          )}
                        >
                          {/* SL# */}
                          <td className="px-2 py-2 text-muted-foreground text-xs text-center align-top pt-3">
                            {index + 1}
                          </td>

                          {/* Item Title + Description */}
                          <td className="px-2 py-2 relative">
                            <div className="flex items-start gap-1.5">
                              <Input
                                ref={(el) => { if (el) itemInputRefs.current.set(index, el); }}
                                value={item.title}
                                onChange={(e) => handleItemTitleChange(index, e.target.value)}
                                placeholder="Type item name..."
                                className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Sparkles className="h-3.5 w-3.5 text-amber-400 mt-1.5 shrink-0" />
                            </div>
                            <div className="mt-0.5">
                              <Textarea
                                value={item.description || ''}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                placeholder="Description (optional)..."
                                className="text-xs text-gray-500 min-h-[28px] resize-none border-0 shadow-none focus-visible:ring-0 p-0 placeholder:text-gray-300"
                                rows={1}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            {/* Category/Warranty badges */}
                            {(item.category || item.warranty) && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {item.category && (
                                  <span className="text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                                    {item.category}
                                  </span>
                                )}
                                {item.warranty && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {item.warranty}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Inventory Search Dropdown */}
                            {inventorySearchState.index === index && inventorySearchState.open && (
                              <div className="absolute z-50 top-full mt-1 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-hidden">
                                {inventorySearchState.loading ? (
                                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching items...
                                  </div>
                                ) : inventorySearchState.results.length === 0 ? (
                                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                                    No items found
                                  </div>
                                ) : (
                                  <div className="py-1 max-h-52 overflow-y-auto">
                                    {inventorySearchState.results.map((inv) => (
                                      <button
                                        key={inv.id || inv.name}
                                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/70 border-b border-gray-50 last:border-0 transition-colors"
                                        onClick={() => applyInventorySuggestion(index, inv)}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm text-gray-900 truncate">{inv.name}</span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {inv.stockAvailable != null && (
                                              <span className={cn(
                                                'text-[10px] px-1.5 py-0.5 rounded-full',
                                                inv.stockAvailable > 0
                                                  ? 'text-emerald-700 bg-emerald-50'
                                                  : 'text-rose-600 bg-rose-50'
                                              )}>
                                                Stock: {inv.stockAvailable}
                                              </span>
                                            )}
                                            <span className="text-xs font-semibold text-emerald-700">
                                              {formatCurrency(inv.unitPrice, formData.currency)}
                                            </span>
                                          </div>
                                        </div>
                                        {inv.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{inv.description}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          {inv.sku && (
                                            <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded font-mono">
                                              {inv.sku}
                                            </span>
                                          )}
                                          {inv.category && (
                                            <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded">
                                              {inv.category}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded">
                                            {inv.unit}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Item Type */}
                          <td className="px-2 py-2 align-top pt-3">
                            <Select
                              value={item.itemType || 'custom'}
                              onValueChange={(v) => updateLineItem(index, 'itemType', v)}
                            >
                              <SelectTrigger className="h-8 text-[10px] border-0 shadow-none focus:ring-1 focus:ring-emerald-500 p-0 w-14">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>
                                    <span className="flex items-center gap-1">
                                      <t.icon className="h-3 w-3" />
                                      {t.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Unit */}
                          <td className="px-2 py-2 align-top pt-3">
                            <Select value={item.unit} onValueChange={(v) => updateLineItem(index, 'unit', v)}>
                              <SelectTrigger className="h-8 text-xs border-0 shadow-none focus:ring-1 focus:ring-emerald-500 p-0 w-14">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map(u => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Qty */}
                          <td className="px-2 py-2 align-top pt-3">
                            <Input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0"
                              min={0}
                            />
                          </td>

                          {/* Rate */}
                          <td className="px-2 py-2 align-top pt-3">
                            <Input
                              type="number"
                              value={item.rate || ''}
                              onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0"
                              min={0}
                              step="0.01"
                            />
                          </td>

                          {/* Amount */}
                          <td className="px-2 py-2 text-right font-semibold text-sm align-top pt-3">
                            {formatCurrency(item.amount, formData.currency)}
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-2 text-center align-top pt-3">
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => insertRow(index)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Insert row below</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => duplicateRow(index)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate row</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                                    onClick={() => deleteRow(index)}
                                    disabled={lineItems.length <= 1}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete row</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============ RIGHT COLUMN — Summary, Workflow, AI ============ */}
          <div className="lg:col-span-4 space-y-4">

            {/* Summary Card (sticky) */}
            <Card className="py-0 gap-0 lg:sticky lg:top-20">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Quotation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(subtotal, formData.currency)}
                  </span>
                </div>

                {/* Labour Cost */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    Labour Cost
                  </span>
                  <Input
                    type="number"
                    value={formData.labourCost || ''}
                    onChange={(e) => setFormData(f => ({ ...f, labourCost: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-28 text-sm text-right"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                {/* Material Cost */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    Material Cost
                  </span>
                  <Input
                    type="number"
                    value={formData.materialCost || ''}
                    onChange={(e) => setFormData(f => ({ ...f, materialCost: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-28 text-sm text-right"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600">Discount</span>
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
                  <span className="text-sm text-gray-600">Tax</span>
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

                {/* Shipping */}
                <div className="flex items-center justify-between gap-3">
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

                {/* Exchange rate converted total */}
                {formData.exchangeRate !== 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      In BND ({formData.exchangeRate}x)
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(convertedTotal, 'BND')}
                    </span>
                  </div>
                )}

                {/* Amount in Words */}
                <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs font-medium leading-relaxed">
                  {amountInWords}
                </div>

                {convertedAmountInWords && (
                  <div className="bg-gray-50 text-gray-600 rounded-lg p-3 text-xs font-medium leading-relaxed">
                    {convertedAmountInWords}
                  </div>
                )}
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
                    const isCompleted = i === 0; // Only "Draft" is completed
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
                            <div
                              className={cn(
                                'w-0.5 h-5',
                                isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                              )}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs py-1.5 -ml-1',
                            isCurrent
                              ? 'font-semibold text-gray-900'
                              : isCompleted
                                ? 'text-gray-600'
                                : 'text-gray-400'
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => toast.info('AI Price Optimizer — coming soon')}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggest Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ==================== STICKY BOTTOM ACTION BAR ==================== */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Left — secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm">
                      <Eye className="h-4 w-4 mr-1.5" /> Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview quotation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm">
                      <FileText className="h-4 w-4 mr-1.5" /> PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate PDF</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1.5" /> Print
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print quotation</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-9 text-sm"
                      onClick={() => toast.info('Email sending — coming soon')}>
                      <Send className="h-4 w-4 mr-1.5" /> Email
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send via Email</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-9 text-sm"
                      onClick={() => toast.info('WhatsApp sending — coming soon')}>
                      <MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send via WhatsApp</TooltipContent>
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
                  onClick={() => setView('quotations')}
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
  );
}