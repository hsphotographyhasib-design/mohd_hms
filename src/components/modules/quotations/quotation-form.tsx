'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Copy, Printer, FileText, Send,
  MessageSquare, Search, X, CheckCircle2, Circle,
  Loader2, Upload, GripVertical, Sparkles, QrCode,
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { QuotationLineItem, CustomerData, EmployeeData } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import dynamic from 'next/dynamic';

// Lazy-load QR Code (client-only)
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

// ============ CONSTANTS ============

const UNITS = ['Nos', 'Set', 'Lot', 'Hr', 'Day', 'Month', 'Sqm', 'Meter', 'Kg', 'Ltr', 'Pcs', 'Unit'];
const TAX_RATES = ['0', '5', '10', '15'];
const CURRENCIES = ['BND', 'USD', 'SGD', 'MYR'];

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
  'Converted to Work Order', 'Converted to Invoice', 'Paid', 'Closed',
];

// ============ NUMBER TO WORDS ============

function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  if (!Number.isFinite(num)) return 'ZERO';

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  function convertBelowThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' AND ' + convertBelowThousand(n % 100) : '');
  }

  let words = '';
  if (intPart >= 1000000) {
    words += convertBelowThousand(Math.floor(intPart / 1000000)) + ' MILLION ';
  }
  if (intPart >= 1000) {
    words += convertBelowThousand(Math.floor((intPart % 1000000) / 1000)) + ' THOUSAND ';
  }
  if (intPart % 1000 > 0) {
    words += convertBelowThousand(intPart % 1000);
  }
  if (decPart > 0) {
    words += ' AND ' + convertBelowThousand(decPart) + ' CENTS';
  }

  return words.trim() || 'ZERO';
}

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };
  const sym = currencySymbols[currency] || currency;
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
      <span className="text-[10px] text-muted-foreground">Scan to open quotation</span>
    </div>
  );
}

// ============ ITEM SUGGESTION DROPDOWN ============

interface ItemSuggestion {
  title: string;
  description?: string;
  unit: string;
  rate: number;
  category?: string;
  warranty?: string;
  count: number;
}

function ItemSuggestionDropdown({
  query,
  onSelect,
  onClose,
  position,
}: {
  query: string;
  onSelect: (item: ItemSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number } | null;
}) {
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/quotations/item-suggestions?q=${encodeURIComponent(query)}&limit=8`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setSuggestions(json.suggestions || []);
          setSelectedIndex(0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden"
      style={position ? { top: position.top, left: Math.min(position.left, window.innerWidth - 340) } : undefined}
    >
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching items...
        </div>
      ) : (
        <div className="py-1 max-h-60 overflow-y-auto">
          {suggestions.map((item, i) => (
            <button
              key={item.title}
              className={cn(
                'w-full text-left px-3 py-2.5 hover:bg-emerald-50/70 transition-colors border-b border-gray-50 last:border-0',
                i === selectedIndex && 'bg-emerald-50/70'
              )}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-gray-900 truncate">{item.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {item.count > 1 && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {item.count}x
                    </span>
                  )}
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(item.rate, 'BND')}
                  </span>
                </div>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded">
                  {item.unit}
                </span>
                {item.category && (
                  <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                )}
                {item.warranty && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {item.warranty}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function QuotationForm({ quotationId }: { quotationId?: string }) {
  const setView = useAppStore((s) => s.setView);

  // --- State ---
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResultsOpen, setCustomerResultsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [quotationNo, setQuotationNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [suggestionState, setSuggestionState] = useState<{
    index: number | null;
    query: string;
    position: { top: number; left: number } | null;
  }>({ index: null, query: '', position: null });

  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([
    { title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 },
  ]);

  const [formData, setFormData] = useState({
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
  });

  // --- Fetch initial data ---
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [custRes, empRes, numRes] = await Promise.all([
          fetch('/api/customers?pageSize=100', { headers: authHeaders() }),
          fetch('/api/employees?pageSize=100', { headers: authHeaders() }),
          fetch('/api/quotations/next-number', { headers: authHeaders() }),
        ]);

        if (custRes.ok) {
          const custJson = await custRes.json();
          setCustomers(custJson.data || []);
        }
        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(empJson.data || []);
        }
        if (numRes.ok) {
          const numJson = await numRes.json();
          setQuotationNo(numJson.quotationNo || '');
        } else {
          const now = new Date();
          setQuotationNo(`QTN/${now.getFullYear()}/0001`);
        }

        // Load quotation if editing
        if (quotationId) {
          const qRes = await fetch(`/api/quotations/${quotationId}`, { headers: authHeaders() });
          if (qRes.ok) {
            const q = await qRes.json();
            setQuotationNo(q.quotationNo || '');
            setFormData({
              referenceNo: q.referenceNo || '',
              projectName: q.projectName || '',
              site: q.site || '',
              description: q.description || '',
              validUntil: q.validUntil ? format(new Date(q.validUntil), 'yyyy-MM-dd') : '',
              preparedBy: q.preparedBy || '',
              notes: q.notes || '',
              terms: q.terms ? (typeof q.terms === 'string' ? JSON.parse(q.terms) : q.terms) : DEFAULT_TERMS,
              currency: q.currency || 'BND',
              taxRate: String(q.taxRate ?? 0),
              discount: q.discount ?? 0,
              shipping: q.shipping ?? 0,
            });
            if (q.items) {
              const parsed = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
              setLineItems(parsed.length > 0
                ? parsed.map((item: QuotationLineItem) => ({
                    ...item,
                    description: item.description || '',
                    unit: item.unit || 'Nos',
                  }))
                : [{ title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 }]
              );
            }
            // Load customer
            if (q.customerId) {
              const custList = customers.length > 0 ? { data: customers } : await custRes.clone().json();
              const list = custList.data || [];
              const found = list.find((c: CustomerData) => c.id === q.customerId);
              if (found) {
                setSelectedCustomer(found);
                setCustomerSearch(found.companyName || found.name);
              }
            }
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [quotationId]);

  // --- Computed ---
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [lineItems]
  );

  const taxAmount = useMemo(
    () => subtotal * (parseFloat(formData.taxRate) / 100),
    [subtotal, formData.taxRate]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - formData.discount + taxAmount + formData.shipping),
    [subtotal, formData.discount, taxAmount, formData.shipping]
  );

  const amountInWords = useMemo(() => {
    const words = numberToWords(grandTotal);
    const currencyName = CURRENCY_NAMES[formData.currency] || formData.currency;
    return `${words} ${currencyName} ONLY`;
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

  // --- Line item handlers ---
  const updateLineItem = useCallback((index: number, field: keyof QuotationLineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated[index].amount = updated[index].quantity * updated[index].rate;
      }
      // Ensure last row is empty
      const lastItem = updated[updated.length - 1];
      if (lastItem.title !== '' || lastItem.quantity !== 0 || lastItem.rate !== 0) {
        updated.push({ title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 });
      }
      return updated;
    });
  }, []);

  const addRow = useCallback(() => {
    setLineItems((prev) => [...prev, { title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 }]);
  }, []);

  const deleteRow = useCallback((index: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const insertRow = useCallback((index: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, { title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 });
      return updated;
    });
  }, []);

  const duplicateRow = useCallback((index: number) => {
    setLineItems((prev) => {
      const copy = { ...prev[index], id: undefined, title: prev[index].title + ' (copy)' };
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
  }, []);

  const applyItemSuggestion = useCallback((index: number, suggestion: ItemSuggestion) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        title: suggestion.title,
        description: suggestion.description || '',
        unit: suggestion.unit,
        rate: suggestion.rate,
        amount: (updated[index].quantity || 1) * suggestion.rate,
        category: suggestion.category,
        warranty: suggestion.warranty,
      };
      // Ensure last row is empty
      const lastItem = updated[updated.length - 1];
      if (lastItem.title !== '' || lastItem.quantity !== 0 || lastItem.rate !== 0) {
        updated.push({ title: '', description: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 });
      }
      return updated;
    });
    setSuggestionState({ index: null, query: '', position: null });
  }, []);

  // --- Item title input ref for position calculation ---
  const itemInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const handleItemTitleFocus = useCallback((index: number) => {
    const input = itemInputRefs.current.get(index);
    if (input) {
      const rect = input.getBoundingClientRect();
      setSuggestionState({
        index,
        query: lineItems[index]?.title || '',
        position: { top: rect.bottom + 4, left: rect.left },
      });
    }
  }, [lineItems]);

  const handleItemTitleChange = useCallback((index: number, value: string) => {
    updateLineItem(index, 'title', value);
    const input = itemInputRefs.current.get(index);
    if (input) {
      const rect = input.getBoundingClientRect();
      setSuggestionState({
        index,
        query: value,
        position: { top: rect.bottom + 4, left: rect.left },
      });
    }
  }, [updateLineItem]);

  // --- Save handler ---
  const handleSave = useCallback(async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    const validItems = lineItems.filter((item) => item.title.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
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
        items: JSON.stringify(validItems),
        terms: JSON.stringify(formData.terms),
        currency: formData.currency,
        subtotal,
        taxRate: parseFloat(formData.taxRate),
        tax: taxAmount,
        discount: formData.discount,
        shipping: formData.shipping,
        total: grandTotal,
        status: 'DRAFT',
        validUntil: formData.validUntil || null,
        notes: formData.notes,
      };

      const res = quotationId
        ? await fetch(`/api/quotations/${quotationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/quotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      toast.success(quotationId ? 'Quotation updated' : 'Quotation created');
      setView('quotations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, lineItems, formData, quotationNo, subtotal, taxAmount, grandTotal, quotationId, setView]);

  // --- Current workflow step ---
  const currentStepIndex = 0;

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = () => setSuggestionState((s) => ({ ...s, index: null, query: '' }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading quotation...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* ==================== MAIN 3-COLUMN LAYOUT ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 p-4 md:p-6 pb-28">
        {/* ============ LEFT COLUMN — Customer Info & Terms ============ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Information */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email..."
                  className="pl-9 h-9 text-sm"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerResultsOpen(true);
                    if (selectedCustomer) {
                      setSelectedCustomer(null);
                    }
                  }}
                  onFocus={() => setCustomerResultsOpen(true)}
                />
                {customerResultsOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0 transition-colors"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.companyName || c.name);
                          setCustomerResultsOpen(false);
                        }}
                      >
                        <span className="font-medium">{c.companyName || c.name}</span>
                        {c.companyName && c.name !== c.companyName && (
                          <span className="text-muted-foreground ml-1">({c.name})</span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {c.phone} {c.email ? `| ${c.email}` : ''}
                        </span>
                      </button>
                    ))}
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
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>

                  {selectedCustomer.address && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Address</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.address}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Phone</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Email</span>
                      <p className="text-sm text-gray-700 truncate">{selectedCustomer.email || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Customer No.</span>
                      <p className="text-sm text-gray-700 font-mono">{selectedCustomer.customerNumber}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Country</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.country || 'Brunei'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">District</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.district || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Tax Rate</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.taxRate ?? 0}%</p>
                    </div>
                  </div>

                  {selectedCustomer.pic && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase">PIC</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.pic}</p>
                    </div>
                  )}

                  {selectedCustomer.paymentTerms && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Payment Terms</span>
                      <p className="text-sm text-gray-700">{selectedCustomer.paymentTerms}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Currency */}
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData((f) => ({ ...f, currency: v }))}
                    >
                      <SelectTrigger className="w-full h-9 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Search and select a customer above
                </p>
              )}
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {formData.terms.map((term, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-muted-foreground mt-1.5 w-4 shrink-0">{i + 1}.</span>
                  <Textarea
                    value={term}
                    onChange={(e) => {
                      const updated = [...formData.terms];
                      updated[i] = e.target.value;
                      setFormData((f) => ({ ...f, terms: updated }));
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
                onClick={() => setFormData((f) => ({ ...f, terms: [...f.terms, ''] }))}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Term
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ============ CENTER COLUMN — Quotation Info & Line Items ============ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quotation Info Header */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4 md:p-5 space-y-4">
              {/* Row 1: Title + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setView('quotations')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-lg font-bold text-gray-900">
                    {quotationId ? 'Edit Quotation' : 'New Quotation'}
                  </h1>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Draft
                </Badge>
              </div>

              {/* Row 2: Quotation No + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Quotation No.</Label>
                  <Input
                    value={quotationNo}
                    readOnly
                    className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Date</Label>
                  <Input
                    type="date"
                    value={dateStr}
                    readOnly
                    className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 3: Valid Until + Prepared By */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData((f) => ({ ...f, validUntil: e.target.value }))}
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Prepared By</Label>
                  <Select
                    value={formData.preparedBy}
                    onValueChange={(v) => setFormData((f) => ({ ...f, preparedBy: v }))}
                  >
                    <SelectTrigger className="w-full h-9 text-sm mt-1">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
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
                  <Label className="text-xs text-gray-500 uppercase">Reference No.</Label>
                  <Input
                    value={formData.referenceNo}
                    onChange={(e) => setFormData((f) => ({ ...f, referenceNo: e.target.value }))}
                    placeholder="Optional reference"
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Project Name</Label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => setFormData((f) => ({ ...f, projectName: e.target.value }))}
                    placeholder="Enter project name"
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </div>

              {/* Row 5: Site */}
              <div>
                <Label className="text-xs text-gray-500 uppercase">Site</Label>
                <Input
                  value={formData.site}
                  onChange={(e) => setFormData((f) => ({ ...f, site: e.target.value }))}
                  placeholder="Enter site location"
                  className="h-9 text-sm mt-1"
                />
              </div>

              {/* Row 6: Description */}
              <div>
                <Label className="text-xs text-gray-500 uppercase">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Enter description or scope of work..."
                  className="text-sm mt-1 min-h-[80px]"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Line Items
                </CardTitle>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={addRow}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-10">
                        SL
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[220px]">
                        Item
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">
                        Unit
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-20">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-10">
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
                        <td className="px-3 py-2 text-muted-foreground text-xs text-center align-top pt-3">
                          {index + 1}
                        </td>

                        {/* Item Title + Description (below) */}
                        <td className="px-3 py-2 relative">
                          <div className="flex items-start gap-1.5">
                            <Input
                              ref={(el) => {
                                if (el) itemInputRefs.current.set(index, el);
                              }}
                              value={item.title}
                              onChange={(e) => handleItemTitleChange(index, e.target.value)}
                              onFocus={() => handleItemTitleFocus(index)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Type item name..."
                              className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 font-medium"
                            />
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 mt-1.5 shrink-0" />
                          </div>
                          {/* Description BELOW item title */}
                          <div className="mt-1">
                            <Textarea
                              value={item.description || ''}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder="Item description (optional)..."
                              className="text-xs text-gray-500 min-h-[32px] resize-none border-0 shadow-none focus-visible:ring-0 p-0 placeholder:text-gray-300"
                              rows={1}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {/* Category/Warranty badges */}
                          {(item.category || item.warranty) && (
                            <div className="flex items-center gap-1.5 mt-1">
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

                          {/* Item Suggestion Dropdown */}
                          {suggestionState.index === index && suggestionState.query.length >= 2 && (
                            <ItemSuggestionDropdown
                              query={suggestionState.query}
                              onSelect={(s) => applyItemSuggestion(index, s)}
                              onClose={() => setSuggestionState((prev) => ({ ...prev, index: null, query: '' }))}
                              position={suggestionState.position}
                            />
                          )}
                        </td>

                        {/* Unit */}
                        <td className="px-3 py-2 align-top pt-3">
                          <Select
                            value={item.unit}
                            onValueChange={(v) => updateLineItem(index, 'unit', v)}
                          >
                            <SelectTrigger className="h-8 text-xs border-0 shadow-none focus:ring-1 focus:ring-emerald-500 p-0 w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-2 align-top pt-3">
                          <Input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0"
                            min={0}
                          />
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-2 align-top pt-3">
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
                        <td className="px-3 py-2 text-right font-semibold text-sm align-top pt-3">
                          {formatCurrency(item.amount, formData.currency)}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 text-center align-top pt-3">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                              onClick={() => insertRow(index)}
                              title="Insert row below"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => duplicateRow(index)}
                              title="Duplicate row"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                              onClick={() => deleteRow(index)}
                              disabled={lineItems.length <= 1}
                              title="Delete row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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

        {/* ============ RIGHT COLUMN — Summary, Barcode, Workflow ============ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Barcode & QR Code Card */}
          {quotationNo && (
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Barcode / QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center">
                <div className="bg-white rounded-lg p-3 border border-gray-100 inline-block">
                  <BarcodeDisplay value={quotationNo} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="py-0 gap-0 lg:sticky lg:top-20">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Summary
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

              {/* Discount */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">Discount</span>
                <Input
                  type="number"
                  value={formData.discount || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                  className="h-8 w-28 text-sm text-right"
                  min={0}
                  step="0.01"
                />
              </div>

              {/* Tax Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tax</span>
                <Select
                  value={formData.taxRate}
                  onValueChange={(v) => setFormData((f) => ({ ...f, taxRate: v }))}
                >
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_RATES.map((r) => (
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
                  onChange={(e) => setFormData((f) => ({ ...f, shipping: parseFloat(e.target.value) || 0 }))}
                  className="h-8 w-28 text-sm text-right"
                  min={0}
                  step="0.01"
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
              <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-sm font-medium">
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
                {WORKFLOW_STEPS.map((step, i) => {
                  const isCompleted = i <= currentStepIndex;
                  const isCurrent = i === currentStepIndex;
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
                              'w-0.5 h-6',
                              isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                            )}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm py-2 -ml-1',
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
        </div>
      </div>

      {/* ==================== STICKY FOOTER ==================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Left group — secondary actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 text-sm">
                <FileText className="h-4 w-4 mr-1.5" /> Preview
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-sm">
                <FileText className="h-4 w-4 mr-1.5" /> Generate PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
              <Button variant="secondary" size="sm" className="h-9 text-sm">
                <Send className="h-4 w-4 mr-1.5" /> Email
              </Button>
              <Button variant="secondary" size="sm" className="h-9 text-sm">
                <MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
              <Button variant="outline" size="sm" className="h-9 text-sm">
                <Copy className="h-4 w-4 mr-1.5" /> Duplicate
              </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right group — primary actions */}
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
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Save Draft
              </Button>
              <Button
                size="sm"
                className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => toast.info('Convert to Work Order — coming soon')}
              >
                Convert to WO
              </Button>
              <Button
                size="sm"
                className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => toast.info('Convert to Invoice — coming soon')}
              >
                Convert to Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}