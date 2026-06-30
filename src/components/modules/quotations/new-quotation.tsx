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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Copy, Printer, FileText, Send,
  MessageSquare, Search, X, CheckCircle2, Circle,
  Loader2, Upload, GripVertical, Sparkles, Save,
  ChevronDown, ChevronUp, UserPlus, PackagePlus,
  FileUp, Clock, AlertCircle, Eye, MoreVertical,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { numberToCurrencyWords } from '@/lib/number-to-words';

// ============ CONSTANTS ============

const UNITS = ['Nos', 'Set', 'Lot', 'Hr', 'Day', 'Month', 'Sqm', 'Meter', 'Kg', 'Ltr', 'Pcs', 'Unit'];
const TAX_RATES = ['0', '5', '10', '15'];
const CURRENCIES = ['BND', 'USD', 'SGD', 'MYR'];

const ITEM_TYPES = [
  'Inventory', 'Spare Parts', 'Labour', 'Service', 'Equipment Service',
  'Supply Only', 'Supply & Install', 'Rental', 'Consumables',
];

const WORKFLOW_STEPS = [
  { key: 'DRAFT', label: 'Draft', desc: 'Quotation is being prepared' },
  { key: 'REVIEW', label: 'Review', desc: 'Pending manager review' },
  { key: 'APPROVED', label: 'Approved', desc: 'Approved by management' },
  { key: 'SENT', label: 'Sent', desc: 'Sent to customer' },
  { key: 'VIEWED', label: 'Viewed', desc: 'Customer has viewed' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Customer accepted' },
  { key: 'REJECTED', label: 'Rejected', desc: 'Customer rejected' },
  { key: 'CONVERTED_WO', label: 'Work Order', desc: 'Converted to Work Order' },
  { key: 'CONVERTED_INVOICE', label: 'Invoice', desc: 'Converted to Invoice' },
  { key: 'PAID', label: 'Paid', desc: 'Payment received' },
  { key: 'CLOSED', label: 'Closed', desc: 'Quotation closed' },
];

const DEFAULT_TERMS = [
  '50% advance payment.',
  'Balance upon completion.',
  'Prices valid for 30 days from quotation date.',
  'All materials are subject to availability.',
  "Warranty as per manufacturer's terms.",
  'Installation charges are included unless stated otherwise.',
  'Transportation charges are included within Brunei-Muara District.',
  'This quotation is not a contract and is subject to acceptance.',
];

const DRAFT_KEY = 'quotation-draft-v2';

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };
  const sym = symbols[currency] || currency;
  return `${sym} ${amount.toFixed(2)}`;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-emerald-600 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function generateLineId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============ INTERFACES ============

interface SmartCustomer {
  id: string;
  name: string;
  companyName?: string | null;
  customerNumber: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  pic?: string | null;
  country?: string | null;
  district?: string | null;
  taxRate?: number | null;
  paymentTerms?: string | null;
  quotationCount: number;
  activeInvoiceCount: number;
}

interface SmartInventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unit: string;
  unitPrice: number;
  stockAvailable: number | null;
  supplier?: string | null;
  location?: string | null;
  itemType: string;
}

interface LineItemData {
  _id: string;
  title: string;
  description: string;
  itemType: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  markupPct: number;
  amount: number;
  inventoryItemId?: string;
  category?: string;
  warranty?: string;
  estimatedHours?: number;
}

interface AttachmentData {
  id: string;
  name: string;
  size: number;
  type: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============ MAIN COMPONENT ============

export function NewQuotation() {
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);

  // --- Core State ---
  const [quotationNo, setQuotationNo] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // --- Customer State ---
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<SmartCustomer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SmartCustomer | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerKeyIndex, setCustomerKeyIndex] = useState(0);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ companyName: '', name: '', mobile: '', email: '', address: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // --- Inventory Search State ---
  const [inventoryResults, setInventoryResults] = useState<SmartInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [activeItemSearchIdx, setActiveItemSearchIdx] = useState<number | null>(null);
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const [inventoryKeyIndex, setInventoryKeyIndex] = useState(0);
  const itemSearchRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // --- Form Data ---
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { _id: generateLineId(), title: '', description: '', itemType: 'Inventory', unit: 'Nos', quantity: 0, unitPrice: 0, discountPct: 0, taxPct: 0, markupPct: 0, amount: 0 },
  ]);

  const [formData, setFormData] = useState({
    referenceNo: '',
    projectName: '',
    site: '',
    description: '',
    validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    currency: 'BND',
    exchangeRate: 1,
    taxRate: '0',
    discount: 0,
    shipping: 0,
    notes: '',
    terms: [...DEFAULT_TERMS],
  });

  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [termsExpanded, setTermsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);

  // --- Auto-save ---
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ============ EFFECTS ============

  // Fetch quotation number on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/quotations/next-number', { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          setQuotationNo(json.quotationNo || '');
        } else {
          setQuotationNo(`QTN/HMS/${format(new Date(), 'yyyy')}/0001`);
        }
      } catch {
        setQuotationNo(`QTN/HMS/${format(new Date(), 'yyyy')}/0001`);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.customerQuery) setCustomerQuery(draft.customerQuery);
      if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
      if (draft.lineItems?.length) setLineItems(draft.lineItems);
      if (draft.formData) setFormData((prev) => ({ ...prev, ...draft.formData }));
      if (draft.quotationNo) setQuotationNo(draft.quotationNo);
      if (draft.attachments) setAttachments(draft.attachments);
      toast.info('Draft restored from auto-save');
    } catch {
      // ignore corrupt draft
    }
  }, []);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      const draft = {
        customerQuery,
        selectedCustomer,
        lineItems,
        formData,
        quotationNo,
        attachments,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSaveStatus('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [customerQuery, selectedCustomer, lineItems, formData, quotationNo, attachments]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Smart customer search (debounced)
  useEffect(() => {
    if (!customerQuery.trim() || customerQuery.length < 1) {
      setCustomerResults([]);
      setCustomerDropdownOpen(false);
      return;
    }
    if (selectedCustomer) return;

    setCustomerLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quotations/smart-search-customer?q=${encodeURIComponent(customerQuery)}&limit=8`, { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          setCustomerResults(json.results || []);
          setCustomerDropdownOpen(json.results?.length > 0);
          setCustomerKeyIndex(0);
        }
      } catch {
        // silent
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, selectedCustomer]);

  // Smart inventory search (debounced)
  useEffect(() => {
    if (activeItemSearchIdx === null) { setInventoryResults([]); return; }
    const item = lineItems[activeItemSearchIdx];
    if (!item?.title?.trim() || item.title.length < 2) {
      setInventoryResults([]);
      setInventoryDropdownOpen(false);
      return;
    }

    setInventoryLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quotations/smart-search-inventory?q=${encodeURIComponent(item.title)}&limit=8`, { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          setInventoryResults(json.results || []);
          setInventoryDropdownOpen(json.results?.length > 0);
          setInventoryKeyIndex(0);
        }
      } catch {
        // silent
      } finally {
        setInventoryLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeItemSearchIdx, lineItems.map((li, i) => i === activeItemSearchIdx ? li.title : '').join('')]);

  // ============ COMPUTED VALUES ============

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.amount || 0), 0),
    [lineItems]
  );

  const taxAmount = useMemo(
    () => subtotal * (parseFloat(formData.taxRate) / 100),
    [subtotal, formData.taxRate]
  );

  const labourCost = useMemo(
    () => lineItems.filter((i) => i.itemType === 'Labour').reduce((sum, i) => sum + (i.amount || 0), 0),
    [lineItems]
  );

  const materialCost = useMemo(
    () => lineItems.filter((i) => i.itemType !== 'Labour' && i.itemType !== 'Service').reduce((sum, i) => sum + (i.amount || 0), 0),
    [lineItems]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - formData.discount + taxAmount + formData.shipping),
    [subtotal, formData.discount, taxAmount, formData.shipping]
  );

  const amountInWords = useMemo(() => numberToCurrencyWords(grandTotal), [grandTotal]);

  const margin = useMemo(() => {
    if (grandTotal === 0) return 0;
    return grandTotal - materialCost;
  }, [grandTotal, materialCost]);

  const profitPct = useMemo(() => {
    if (grandTotal === 0) return 0;
    return ((margin / grandTotal) * 100);
  }, [margin, grandTotal]);

  const validItemsCount = useMemo(() => lineItems.filter((i) => i.title.trim() !== '').length, [lineItems]);

  // ============ HANDLERS ============

  // --- Customer ---
  const selectCustomer = useCallback((c: SmartCustomer) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.companyName || c.name);
    setCustomerDropdownOpen(false);
    setShowNewCustomerForm(false);
  }, []);

  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerQuery('');
    customerSearchRef.current?.focus();
  }, []);

  const handleCustomerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!customerDropdownOpen || customerResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCustomerKeyIndex((p) => (p + 1) % customerResults.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCustomerKeyIndex((p) => (p - 1 + customerResults.length) % customerResults.length); }
    else if (e.key === 'Enter' && customerResults[customerKeyIndex]) { e.preventDefault(); selectCustomer(customerResults[customerKeyIndex]); }
    else if (e.key === 'Escape') { setCustomerDropdownOpen(false); }
  }, [customerDropdownOpen, customerResults, customerKeyIndex, selectCustomer]);

  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomer.name && !newCustomer.companyName) { toast.error('Company name or customer name is required'); return; }
    setCreatingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: newCustomer.name || newCustomer.companyName,
          phone: newCustomer.mobile || '00000000',
          email: newCustomer.email || undefined,
          address: newCustomer.address || undefined,
          companyName: newCustomer.companyName || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const smartC: SmartCustomer = {
          id: created.id, name: created.name, companyName: created.companyName,
          customerNumber: created.customerNumber, email: created.email, phone: created.phone,
          address: created.address, quotationCount: 0, activeInvoiceCount: 0,
        };
        selectCustomer(smartC);
        toast.success('Customer created and selected');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create customer');
      }
    } catch {
      toast.error('Failed to create customer');
    } finally {
      setCreatingCustomer(false);
    }
  }, [newCustomer, selectCustomer]);

  // --- Line Items ---
  const updateLineItem = useCallback((idx: number, field: string, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-calculate amount
      const li = updated[idx];
      const base = (li.quantity * li.unitPrice) * (1 + li.markupPct / 100);
      const afterDisc = base - (base * li.discountPct / 100);
      const afterTax = afterDisc + (afterDisc * li.taxPct / 100);
      updated[idx].amount = Math.round(afterTax * 100) / 100;
      return updated;
    });
  }, []);

  const addRow = useCallback((afterIdx?: number) => {
    const newItem: LineItemData = { _id: generateLineId(), title: '', description: '', itemType: 'Inventory', unit: 'Nos', quantity: 0, unitPrice: 0, discountPct: 0, taxPct: 0, markupPct: 0, amount: 0 };
    setLineItems((prev) => {
      const updated = [...prev];
      const insertAt = afterIdx !== undefined ? afterIdx + 1 : prev.length;
      updated.splice(insertAt, 0, newItem);
      return updated;
    });
  }, []);

  const deleteRow = useCallback((idx: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const duplicateRow = useCallback((idx: number) => {
    setLineItems((prev) => {
      const copy = { ...prev[idx], _id: generateLineId(), title: prev[idx].title + ' (copy)' };
      const updated = [...prev];
      updated.splice(idx + 1, 0, copy);
      return updated;
    });
  }, []);

  const selectInventoryItem = useCallback((idx: number, item: SmartInventoryItem) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const li = updated[idx];
      const qty = li.quantity || 1;
      updated[idx] = {
        ...li,
        title: item.name,
        description: item.description || '',
        unit: item.unit,
        unitPrice: item.unitPrice,
        itemType: item.itemType === 'labour' ? 'Labour' : item.category || 'Inventory',
        inventoryItemId: item.itemType === 'inventory' ? item.id : undefined,
        category: item.category || undefined,
      };
      const base = (qty * item.unitPrice) * (1 + li.markupPct / 100);
      updated[idx].amount = Math.round(base * 100) / 100;
      return updated;
    });
    setInventoryDropdownOpen(false);
    setActiveItemSearchIdx(null);
  }, []);

  const handleItemSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!inventoryDropdownOpen || inventoryResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setInventoryKeyIndex((p) => (p + 1) % inventoryResults.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setInventoryKeyIndex((p) => (p - 1 + inventoryResults.length) % inventoryResults.length); }
    else if (e.key === 'Enter' && activeItemSearchIdx !== null && inventoryResults[inventoryKeyIndex]) {
      e.preventDefault();
      selectInventoryItem(activeItemSearchIdx, inventoryResults[inventoryKeyIndex]);
    }
    else if (e.key === 'Escape') { setInventoryDropdownOpen(false); setActiveItemSearchIdx(null); }
  }, [inventoryDropdownOpen, inventoryResults, inventoryKeyIndex, activeItemSearchIdx, selectInventoryItem]);

  // --- Attachments ---
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newAttachments: AttachmentData[] = files.map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`${files.length} file(s) attached`);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // --- Save ---
  const handleSaveDraft = useCallback(async () => {
    if (!selectedCustomer) { toast.error('Please select a customer'); return; }
    const validItems = lineItems.filter((i) => i.title.trim() !== '');
    if (validItems.length === 0) { toast.error('Add at least one line item'); return; }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        title: formData.projectName || 'Quotation',
        description: formData.description,
        referenceNo: formData.referenceNo,
        projectName: formData.projectName,
        site: formData.site,
        items: JSON.stringify(validItems.map(({ _id, ...rest }) => rest)),
        terms: formData.terms,
        currency: formData.currency,
        exchangeRate: formData.exchangeRate,
        taxRate: parseFloat(formData.taxRate),
        discount: formData.discount,
        shipping: formData.shipping,
        labourCost,
        materialCost,
        validUntil: formData.validUntil || null,
        notes: formData.notes,
        attachments,
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

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Quotation saved successfully');
      setView('quotations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, lineItems, formData, quotationNo, labourCost, materialCost, attachments, setView]);

  // ============ LOADING STATE ============

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading quotation form...</span>
      </div>
    );
  }

  // ============ RENDER ============

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* ===== PAGE HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setView('quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Quotation</h1>
            <p className="text-sm text-gray-500">Create a new quotation for your customer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Saved</span>
          )}
          {lastSaved && (
            <span className="text-xs text-gray-400">Auto-saved {format(lastSaved, 'HH:mm:ss')}</span>
          )}
          <Badge className="bg-emerald-100 text-emerald-800 border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" /> DRAFT
          </Badge>
        </div>
      </div>

      {/* ===== MAIN 2-COLUMN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===== LEFT COLUMN ===== */}
        <div className="lg:col-span-8 space-y-5">

          {/* ---------- CUSTOMER INFORMATION ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Smart Search */}
              <div className="relative" ref={customerDropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={customerSearchRef}
                  placeholder="Search customer by name, company, phone, email..."
                  className="pl-10 h-10 text-sm"
                  value={selectedCustomer ? (selectedCustomer.companyName || selectedCustomer.name) : customerQuery}
                  onChange={(e) => {
                    if (selectedCustomer) { clearCustomer(); return; }
                    setCustomerQuery(e.target.value);
                  }}
                  onFocus={() => { if (!selectedCustomer && customerQuery.trim()) setCustomerDropdownOpen(true); }}
                  onKeyDown={handleCustomerKeyDown}
                />
                {customerLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-emerald-500" /></div>
                )}
                {selectedCustomer && (
                  <button
                    onClick={clearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}

                {/* Dropdown */}
                {customerDropdownOpen && customerResults.length > 0 && !selectedCustomer && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-hidden">
                    <ScrollArea className="max-h-72">
                      {customerResults.map((c, i) => (
                        <button
                          key={c.id}
                          className={cn(
                            'w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors',
                            i === customerKeyIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                          )}
                          onClick={() => selectCustomer(c)}
                          onMouseEnter={() => setCustomerKeyIndex(i)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-medium text-sm text-gray-900 block truncate">
                                {highlightMatch(c.companyName || c.name, customerQuery)}
                              </span>
                              {c.companyName && c.name !== c.companyName && (
                                <span className="text-xs text-gray-500 block truncate">{highlightMatch(c.name, customerQuery)}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-mono text-gray-400 block">{c.customerNumber}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{highlightMatch(c.phone, customerQuery)}</span>
                            {c.email && <span className="truncate">{highlightMatch(c.email, customerQuery)}</span>}
                            {c.quotationCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{c.quotationCount} QTN</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                {/* No match + Create New */}
                {customerDropdownOpen && customerResults.length === 0 && !customerLoading && customerQuery.trim().length >= 2 && !selectedCustomer && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500 mb-2">Customer not found</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => { setShowNewCustomerForm(true); setCustomerDropdownOpen(false); }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create New Customer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Customer Details */}
              {selectedCustomer && !showNewCustomerForm && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{selectedCustomer.companyName || selectedCustomer.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono">{selectedCustomer.customerNumber}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {selectedCustomer.address && (
                      <div className="col-span-2 md:col-span-3">
                        <span className="text-xs text-gray-500 uppercase">Address</span>
                        <p className="text-gray-700">{selectedCustomer.address}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Phone</span>
                      <p className="text-gray-700">{selectedCustomer.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Email</span>
                      <p className="text-gray-700 truncate">{selectedCustomer.email || '—'}</p>
                    </div>
                    {selectedCustomer.pic && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">PIC</span>
                        <p className="text-gray-700">{selectedCustomer.pic}</p>
                      </div>
                    )}
                    {selectedCustomer.country && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Country</span>
                        <p className="text-gray-700">{selectedCustomer.country}</p>
                      </div>
                    )}
                    {selectedCustomer.district && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">District</span>
                        <p className="text-gray-700">{selectedCustomer.district}</p>
                      </div>
                    )}
                    {selectedCustomer.taxRate !== undefined && selectedCustomer.taxRate !== null && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Tax Rate</span>
                        <p className="text-gray-700">{selectedCustomer.taxRate}%</p>
                      </div>
                    )}
                    {selectedCustomer.paymentTerms && (
                      <div className="col-span-2 md:col-span-3">
                        <span className="text-xs text-gray-500 uppercase">Payment Terms</span>
                        <p className="text-gray-700">{selectedCustomer.paymentTerms}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                    {selectedCustomer.quotationCount > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{selectedCustomer.quotationCount} previous quotation(s)</span>}
                    {selectedCustomer.activeInvoiceCount > 0 && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{selectedCustomer.activeInvoiceCount} active invoice(s)</span>}
                  </div>
                </div>
              )}

              {/* Inline New Customer Form */}
              {showNewCustomerForm && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Create New Customer</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewCustomerForm(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Company Name *</Label>
                      <Input className="h-9 text-sm mt-1" placeholder="Company name" value={newCustomer.companyName}
                        onChange={(e) => setNewCustomer((p) => ({ ...p, companyName: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Contact Person *</Label>
                      <Input className="h-9 text-sm mt-1" placeholder="Full name" value={newCustomer.name}
                        onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Mobile *</Label>
                      <Input className="h-9 text-sm mt-1" placeholder="+673 XXXXXXXX" value={newCustomer.mobile}
                        onChange={(e) => setNewCustomer((p) => ({ ...p, mobile: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input className="h-9 text-sm mt-1" placeholder="email@example.com" value={newCustomer.email}
                        onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input className="h-9 text-sm mt-1" placeholder="Full address" value={newCustomer.address}
                        onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                    {creatingCustomer && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Save Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---------- QUOTATION INFORMATION ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Quotation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Quotation No.</Label>
                  <Input value={quotationNo} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed font-mono" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Date</Label>
                  <Input type="date" value={dateStr} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Valid Until</Label>
                  <Input type="date" value={formData.validUntil}
                    onChange={(e) => setFormData((f) => ({ ...f, validUntil: e.target.value }))}
                    className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Prepared By</Label>
                  <Input value={user?.name || ''} readOnly className="h-9 text-sm mt-1 bg-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Reference No.</Label>
                  <Input value={formData.referenceNo} onChange={(e) => setFormData((f) => ({ ...f, referenceNo: e.target.value }))}
                    placeholder="Optional" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Project Name</Label>
                  <Input value={formData.projectName} onChange={(e) => setFormData((f) => ({ ...f, projectName: e.target.value }))}
                    placeholder="Enter project name" className="h-9 text-sm mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-500 uppercase">Site</Label>
                  <Input value={formData.site} onChange={(e) => setFormData((f) => ({ ...f, site: e.target.value }))}
                    placeholder="Enter site location" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Exchange Rate</Label>
                  <Input type="number" value={formData.exchangeRate} onChange={(e) => setFormData((f) => ({ ...f, exchangeRate: parseFloat(e.target.value) || 1 }))}
                    className="h-9 text-sm mt-1" min={0} step="0.01" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Tax Rate</Label>
                  <Select value={formData.taxRate} onValueChange={(v) => setFormData((f) => ({ ...f, taxRate: v }))}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{TAX_RATES.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Discount (flat)</Label>
                  <Input type="number" value={formData.discount || ''} onChange={(e) => setFormData((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-sm mt-1" min={0} step="0.01" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase">Shipping</Label>
                  <Input type="number" value={formData.shipping || ''} onChange={(e) => setFormData((f) => ({ ...f, shipping: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-sm mt-1" min={0} step="0.01" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label className="text-xs text-gray-500 uppercase">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Scope of work or description..." className="text-sm mt-1 min-h-[72px]" rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---------- LINE ITEMS ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 text-emerald-600" /> Line Items
                  <Badge variant="secondary" className="text-[10px] font-normal ml-1">{validItemsCount} item(s)</Badge>
                </CardTitle>
                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => addRow()}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-10">#</th>
                      <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase min-w-[200px]">Item</th>
                      <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase w-32">Type</th>
                      <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-16">Unit</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-16">Qty</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-24">Price</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-16">Disc%</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-16">Tax%</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-16">Mk%</th>
                      <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-28">Amount</th>
                      <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={item._id} className={cn('border-t border-gray-100', item.title ? 'hover:bg-emerald-50/20' : 'bg-gray-50/30')}>
                        {/* # */}
                        <td className="px-2 py-1.5 text-muted-foreground text-xs text-center">{idx + 1}</td>

                        {/* Item Search */}
                        <td className="px-2 py-1.5 relative">
                          <div className="flex items-center gap-1">
                            <input
                              ref={(el) => { if (el) itemSearchRefs.current.set(idx, el); }}
                              type="text"
                              value={item.title}
                              onChange={(e) => { updateLineItem(idx, 'title', e.target.value); setActiveItemSearchIdx(idx); }}
                              onFocus={() => setActiveItemSearchIdx(idx)}
                              onKeyDown={handleItemSearchKeyDown}
                              placeholder="Search item..."
                              className="w-full h-8 text-sm font-medium border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent placeholder:text-gray-300"
                            />
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[280px]">{item.description}</p>
                          )}
                          {/* Inventory Dropdown */}
                          {inventoryDropdownOpen && activeItemSearchIdx === idx && inventoryResults.length > 0 && (
                            <div className="absolute z-50 top-full left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-hidden">
                              <ScrollArea className="max-h-56">
                                {inventoryResults.map((inv, i) => (
                                  <button
                                    key={inv.id + inv.name}
                                    className={cn(
                                      'w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors',
                                      i === inventoryKeyIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                                    )}
                                    onClick={() => selectInventoryItem(idx, inv)}
                                    onMouseEnter={() => setInventoryKeyIndex(i)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-900 truncate">{highlightMatch(inv.name, item.title)}</span>
                                      <span className="text-xs font-semibold text-emerald-700 shrink-0 ml-2">{formatCurrency(inv.unitPrice, formData.currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {inv.sku && <span className="text-[10px] text-gray-400 font-mono">{inv.sku}</span>}
                                      {inv.category && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{inv.category}</span>}
                                      {inv.stockAvailable !== null && (
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', inv.stockAvailable > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                                          Stock: {inv.stockAvailable}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </ScrollArea>
                            </div>
                          )}
                          {/* No match + create */}
                          {inventoryDropdownOpen && activeItemSearchIdx === idx && inventoryResults.length === 0 && !inventoryLoading && item.title.trim().length >= 2 && (
                            <div className="absolute z-50 top-full left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
                              <p className="text-sm text-gray-500 text-center mb-2">Item not found</p>
                              <Button size="sm" variant="outline" className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs"
                                onClick={() => { toast.info('Create Inventory Item — open inventory module'); setInventoryDropdownOpen(false); }}>
                                <PackagePlus className="h-3 w-3 mr-1" /> Create New Inventory Item
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-2 py-1.5">
                          <Select value={item.itemType} onValueChange={(v) => updateLineItem(idx, 'itemType', v)}>
                            <SelectTrigger className="h-8 text-[11px] border-0 shadow-none p-0 w-full focus:ring-1 focus:ring-emerald-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>

                        {/* Unit */}
                        <td className="px-2 py-1.5">
                          <Select value={item.unit} onValueChange={(v) => updateLineItem(idx, 'unit', v)}>
                            <SelectTrigger className="h-8 text-[11px] border-0 shadow-none p-0 w-16 focus:ring-1 focus:ring-emerald-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>

                        {/* Qty */}
                        <td className="px-2 py-1.5">
                          <input type="number" value={item.quantity || ''}
                            onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent" min={0} />
                        </td>

                        {/* Price */}
                        <td className="px-2 py-1.5">
                          <input type="number" value={item.unitPrice || ''}
                            onChange={(e) => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent" min={0} step="0.01" />
                        </td>

                        {/* Disc% */}
                        <td className="px-2 py-1.5">
                          <input type="number" value={item.discountPct || ''}
                            onChange={(e) => updateLineItem(idx, 'discountPct', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-xs text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent" min={0} max={100} />
                        </td>

                        {/* Tax% */}
                        <td className="px-2 py-1.5">
                          <input type="number" value={item.taxPct || ''}
                            onChange={(e) => updateLineItem(idx, 'taxPct', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-xs text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent" min={0} max={100} />
                        </td>

                        {/* Markup% */}
                        <td className="px-2 py-1.5">
                          <input type="number" value={item.markupPct || ''}
                            onChange={(e) => updateLineItem(idx, 'markupPct', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-xs text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500 p-0 bg-transparent" min={0} />
                        </td>

                        {/* Amount */}
                        <td className="px-2 py-1.5 text-right font-semibold text-sm text-gray-900">
                          {formatCurrency(item.amount, formData.currency)}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Insert Above" onClick={() => addRow(idx - 1 < 0 ? 0 : idx - 1)}>
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Insert Below" onClick={() => addRow(idx)}>
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600" title="Duplicate" onClick={() => duplicateRow(idx)}>
                              <Copy className="h-3 w-3" />
                            </button>
                            <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete" onClick={() => deleteRow(idx)} disabled={lineItems.length <= 1}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">{lineItems.length} row(s) · {validItemsCount} with data</p>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => addRow()}>
                  <Plus className="h-3 w-3 mr-1" /> Add Row
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---------- TERMS & CONDITIONS ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setTermsExpanded(!termsExpanded)}>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Terms & Conditions</CardTitle>
                {termsExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </CardHeader>
            {termsExpanded && (
              <CardContent className="space-y-2">
                {formData.terms.map((term, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground mt-2 w-4 shrink-0">{i + 1}.</span>
                    <Textarea
                      value={term}
                      onChange={(e) => {
                        const updated = [...formData.terms];
                        updated[i] = e.target.value;
                        setFormData((f) => ({ ...f, terms: updated }));
                      }}
                      className="text-sm min-h-[32px] resize-none p-2"
                      rows={1}
                    />
                    <button className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500 shrink-0 mt-1" onClick={() => setFormData((f) => ({ ...f, terms: f.terms.filter((_, j) => j !== i) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setFormData((f) => ({ ...f, terms: [...f.terms, ''] }))}>
                  <Plus className="h-3 w-3 mr-1" /> Add Term
                </Button>
              </CardContent>
            )}
          </Card>

          {/* ---------- NOTES ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setNotesExpanded(!notesExpanded)}>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Notes</CardTitle>
                {notesExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </CardHeader>
            {notesExpanded && (
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes..."
                  className="text-sm min-h-[80px]"
                  rows={3}
                />
              </CardContent>
            )}
          </Card>

          {/* ---------- ATTACHMENTS ---------- */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-emerald-600" /> Attachments
                  {attachments.length > 0 && <Badge variant="secondary" className="text-[10px] font-normal">{attachments.length}</Badge>}
                </CardTitle>
                {attachmentsExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </CardHeader>
            {attachmentsExpanded && (
              <CardContent className="space-y-3">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => toast.info('File upload will be available in production')}
                >
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drag & drop files here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, Images, Drawings, BOQ</p>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700 truncate">{att.name}</p>
                            <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500" onClick={() => removeAttachment(att.id)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ===== RIGHT COLUMN — STICKY SUMMARY ===== */}
        <div className="lg:col-span-4 space-y-5">
          <div className="lg:sticky lg:top-20 space-y-5">

            {/* Summary Card */}
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal, formData.currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="text-red-500">-{formatCurrency(formData.discount, formData.currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tax ({formData.taxRate}%)</span><span className="font-medium">{formatCurrency(taxAmount, formData.currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span className="font-medium">{formatCurrency(formData.shipping, formData.currency)}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-gray-500">Labour Cost</span><span className="font-medium text-blue-600">{formatCurrency(labourCost, formData.currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Material Cost</span><span className="font-medium text-amber-600">{formatCurrency(materialCost, formData.currency)}</span></div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Grand Total</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(grandTotal, formData.currency)}</span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs font-medium leading-relaxed">
                  {amountInWords}
                </div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-gray-500">Margin</span><span className={cn('font-medium', margin >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatCurrency(margin, formData.currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Profit %</span><span className={cn('font-medium', profitPct >= 0 ? 'text-emerald-600' : 'text-red-500')}>{profitPct.toFixed(1)}%</span></div>
              </CardContent>
            </Card>

            {/* Workflow Status Card */}
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" /> Workflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isCurrent = i === 0;
                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                            isCurrent ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200 text-gray-300'
                          )}>
                            {isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                          </div>
                          {i < WORKFLOW_STEPS.length - 1 && <div className="w-0.5 h-5 bg-gray-200" />}
                        </div>
                        <div className="pb-2 -ml-1">
                          <span className={cn('text-sm', isCurrent ? 'font-semibold text-gray-900' : 'text-gray-400')}>{step.label}</span>
                          {isCurrent && <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ===== STICKY BOTTOM ACTION BAR ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setView('quotations')}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => toast.info('Preview coming soon')}>
                <Eye className="h-4 w-4 mr-1.5" /> Preview
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
