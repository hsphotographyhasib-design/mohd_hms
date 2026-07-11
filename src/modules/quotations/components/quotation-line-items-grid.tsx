'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuShortcut,
} from '@/shared/ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  Plus, Trash2, Copy, ArrowUp, ArrowDown, ChevronUp,
  ChevronDown, Loader2, Sparkles, AlertCircle,
  Package, Wrench, Clock, FileText,
} from 'lucide-react';
import type { QuotationLineItem } from '@/core/types';
import { cn } from '@/core/utils/utils';

// ============ CONSTANTS ============

const UNITS = ['Nos', 'Set', 'Lot', 'Hr', 'Day', 'Month', 'Sqm', 'Meter', 'Kg', 'Ltr', 'Pcs', 'Unit'];
const TAX_RATES = ['0', '5', '10', '15'];

export const ITEM_TYPES = [
  { value: 'inventory', label: 'Inventory', icon: Package, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'labour', label: 'Labour', icon: Wrench, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'service', label: 'Service', icon: Clock, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'custom', label: 'Custom', icon: FileText, color: 'text-gray-600 bg-gray-50 border-gray-200' },
] as const;

// ============ COLUMN DEFINITIONS ============

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  type: 'static' | 'text' | 'search' | 'textarea' | 'select' | 'number' | 'computed' | 'actions';
  sticky?: boolean;
  stickyLeft?: number;
  options?: readonly string[];
  align?: 'left' | 'center' | 'right';
  placeholder?: string;
  step?: string;
  min?: number;
}

export const COLUMNS: ColumnDef[] = [
  { key: '_rowNum', label: '#', width: 48, type: 'static', sticky: true, stickyLeft: 0, align: 'center' },
  { key: 'itemCode', label: 'Item Code', width: 110, type: 'text', align: 'left', placeholder: 'Code...' },
  { key: 'title', label: 'Item Name', width: 220, type: 'search', sticky: true, stickyLeft: 48, align: 'left', placeholder: 'Type item name...' },
  { key: 'description', label: 'Description', width: 260, type: 'textarea', align: 'left', placeholder: 'Description...' },
  { key: 'category', label: 'Category', width: 100, type: 'text', align: 'left', placeholder: 'Category' },
  { key: 'itemType', label: 'Type', width: 88, type: 'select', align: 'center', options: ['inventory', 'labour', 'service', 'custom'] as const },
  { key: 'unit', label: 'Unit', width: 78, type: 'select', align: 'center', options: UNITS as unknown as readonly string[] },
  { key: 'quantity', label: 'Qty', width: 78, type: 'number', align: 'right', placeholder: '0', min: 0 },
  { key: 'rate', label: 'Unit Price', width: 110, type: 'number', align: 'right', placeholder: '0.00', step: '0.01', min: 0 },
  { key: 'discount', label: 'Discount', width: 82, type: 'number', align: 'right', placeholder: '0.00', step: '0.01', min: 0 },
  { key: 'tax', label: 'Tax %', width: 72, type: 'select', align: 'center', options: TAX_RATES as unknown as readonly string[] },
  { key: 'labourCost', label: 'Labour', width: 100, type: 'number', align: 'right', placeholder: '0.00', step: '0.01', min: 0 },
  { key: 'materialCost', label: 'Material', width: 100, type: 'number', align: 'right', placeholder: '0.00', step: '0.01', min: 0 },
  { key: 'amount', label: 'Total', width: 115, type: 'computed', align: 'right' },
  { key: '_actions', label: '', width: 40, type: 'actions', align: 'center' },
];

const TOTAL_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

// ============ SEARCH RESULT TYPE ============

export interface InventorySearchResult {
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

// ============ HELPERS ============

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };
  const sym = symbols[currency] || currency;
  return `${sym} ${amount.toFixed(2)}`;
}

function computeLineAmount(item: QuotationLineItem): number {
  const lineSubtotal = item.quantity * item.rate;
  const lineDiscount = item.discount || 0;
  const afterDiscount = Math.max(0, lineSubtotal - lineDiscount);
  const lineTax = afterDiscount * ((item.tax || 0) / 100);
  return afterDiscount + lineTax + (item.labourCost || 0) + (item.materialCost || 0);
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cmms_token') || '';
}

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ============ VALIDATION ============

interface ValidationResult {
  isValid: boolean;
  errors: Record<number, Record<string, string>>;
}

function validateItems(items: QuotationLineItem[]): ValidationResult {
  const errors: Record<number, Record<string, string>> = {};
  let isValid = true;

  items.forEach((item, idx) => {
    if (!item.title.trim() && (item.quantity > 0 || item.rate > 0)) {
      if (!errors[idx]) errors[idx] = {};
      errors[idx].title = 'Item name is required';
      isValid = false;
    }
    if (item.quantity < 0) {
      if (!errors[idx]) errors[idx] = {};
      errors[idx].quantity = 'Invalid quantity';
      isValid = false;
    }
    if (item.rate < 0) {
      if (!errors[idx]) errors[idx] = {};
      errors[idx].rate = 'Invalid price';
      isValid = false;
    }
  });

  return { isValid, errors };
}


interface QuotationLineItemsGridProps {
  items: QuotationLineItem[];
  onItemsChange: (items: QuotationLineItem[]) => void;
  currency: string;
  validItemsCount?: number;
}

export function QuotationLineItemsGrid({
  items,
  onItemsChange,
  currency,
  validItemsCount,
}: QuotationLineItemsGridProps) {
  // --- Cell navigation state ---
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  // --- Item search state ---
  const [searchState, setSearchState] = useState<{
    rowIdx: number;
    query: string;
    results: InventorySearchResult[];
    loading: boolean;
    open: boolean;
    highlightedIdx: number;
  }>({ rowIdx: -1, query: '', results: [], loading: false, open: false, highlightedIdx: -1 });

  // --- Clipboard for Ctrl+C/V ---
  const [clipboardRow, setClipboardRow] = useState<QuotationLineItem | null>(null);

  // --- Refs ---
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Validation ---
  const validation = useMemo(() => validateItems(items), [items]);

  // --- Item type counts ---
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = { inventory: 0, labour: 0, service: 0, custom: 0 };
    items.filter(i => i.title.trim()).forEach(item => {
      const t = item.itemType || 'custom';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [items]);

  // --- Computed totals ---
  const computedTotals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalLabour = 0;
    let totalMaterial = 0;
    items.forEach(item => {
      if (!item.title.trim()) return;
      const lineSub = item.quantity * item.rate;
      const lineDisc = item.discount || 0;
      const afterDisc = Math.max(0, lineSub - lineDisc);
      const lineTax = afterDisc * ((item.tax || 0) / 100);
      subtotal += lineSub;
      totalDiscount += lineDisc;
      totalTax += lineTax;
      totalLabour += item.labourCost || 0;
      totalMaterial += item.materialCost || 0;
    });
    const lineTotal = subtotal - totalDiscount + totalTax + totalLabour + totalMaterial;
    return { subtotal, totalDiscount, totalTax, totalLabour, totalMaterial, lineTotal };
  }, [items]);

  // --- Register cell ref ---
  const registerRef = useCallback((key: string, el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  // --- Focus a cell ---
  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    // Skip static, computed, actions columns
    const col = COLUMNS[colIdx];
    if (!col || col.type === 'static' || col.type === 'computed' || col.type === 'actions') return;
    if (rowIdx < 0 || rowIdx >= items.length) return;

    setFocusedCell({ row: rowIdx, col: colIdx });
    setActiveCell({ row: rowIdx, col: colIdx });

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const el = cellRefs.current.get(`${rowIdx}-${colIdx}`);
      if (el) el.focus();
    });
  }, [items.length]);

  // --- Move cell navigation ---
  const moveCell = useCallback((fromRow: number, fromCol: number, deltaRow: number, deltaCol: number) => {
    let newRow = fromRow + deltaRow;
    let newCol = fromCol + deltaCol;

    // Wrap columns
    if (newCol >= COLUMNS.length) { newCol = 0; newRow++; }
    if (newCol < 0) { newCol = COLUMNS.length - 1; newRow--; }

    // Skip non-editable columns
    while (newCol >= 0 && newCol < COLUMNS.length) {
      const c = COLUMNS[newCol];
      if (c.type !== 'static' && c.type !== 'computed' && c.type !== 'actions') break;
      newCol += deltaCol;
    }

    // Clamp row
    newRow = Math.max(0, Math.min(newRow, items.length - 1));

    if (newRow >= 0 && newRow < items.length && newCol >= 0 && newCol < COLUMNS.length) {
      focusCell(newRow, newCol);
    }
  }, [items.length, focusCell]);

  // --- Keyboard handler ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    const col = COLUMNS[colIdx];
    const isSearchOpen = searchState.open && searchState.rowIdx === rowIdx && col?.key === 'title';

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        moveCell(rowIdx, colIdx, 0, e.shiftKey ? -1 : 1);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (isSearchOpen && searchState.highlightedIdx >= 0 && searchState.results.length > 0) {
          selectSearchResult(searchState.highlightedIdx);
        } else {
          moveCell(rowIdx, colIdx, e.shiftKey ? -1 : 1, 0);
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (isSearchOpen) {
          setSearchState(prev => ({
            ...prev,
            highlightedIdx: Math.min(prev.highlightedIdx + 1, prev.results.length - 1),
          }));
        } else {
          moveCell(rowIdx, colIdx, 1, 0);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (isSearchOpen) {
          setSearchState(prev => ({
            ...prev,
            highlightedIdx: Math.max(prev.highlightedIdx - 1, 0),
          }));
        } else {
          moveCell(rowIdx, colIdx, -1, 0);
        }
        break;
      }
      case 'ArrowLeft': {
        // Only prevent default if cursor is at start of input
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          e.preventDefault();
          moveCell(rowIdx, colIdx, 0, -1);
        }
        break;
      }
      case 'ArrowRight': {
        const target = e.target as HTMLInputElement;
        const val = target.value || '';
        if (target.selectionStart === val.length && target.selectionEnd === val.length) {
          e.preventDefault();
          moveCell(rowIdx, colIdx, 0, 1);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        if (isSearchOpen) {
          setSearchState(prev => ({ ...prev, open: false, highlightedIdx: -1 }));
        } else {
          setActiveCell(null);
          (e.target as HTMLElement).blur();
        }
        break;
      }
      case 'd': {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          duplicateRow(rowIdx);
        }
        break;
      }
      case 'c': {
        if ((e.ctrlKey || e.metaKey)) {
          const selection = document.getSelection()?.toString();
          if (!selection) {
            e.preventDefault();
            copyRow(rowIdx);
          }
        }
        break;
      }
      case 'v': {
        if ((e.ctrlKey || e.metaKey) && clipboardRow) {
          const activeEl = document.activeElement as HTMLInputElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
          e.preventDefault();
          pasteRowBelow(rowIdx);
        }
        break;
      }
    }
  }, [moveCell, searchState, clipboardRow]);

  // --- Row operations ---
  const createEmptyItem = useCallback((overrides?: Partial<QuotationLineItem>): QuotationLineItem => ({
    title: '',
    description: '',
    unit: 'Nos',
    quantity: 0,
    rate: 0,
    amount: 0,
    itemType: 'custom',
    ...overrides,
  }), []);

  const updateItem = useCallback((rowIdx: number, key: string, value: string | number) => {
    onItemsChange(items.map((item, i) => {
      if (i !== rowIdx) return item;
      const updated = { ...item, [key]: value };
      // Recompute amount
      updated.amount = computeLineAmount(updated);
      return updated;
    }));
  }, [items, onItemsChange]);

  const addRow = useCallback((type?: string) => {
    const lastItem = items[items.length - 1];
    if (lastItem && (lastItem.title.trim() || lastItem.quantity || lastItem.rate)) {
      onItemsChange([...items, createEmptyItem(type ? { itemType: type } : undefined)]);
    } else if (items.length > 0) {
      // Update the last empty row with the type
      onItemsChange(items.map((item, i) =>
        i === items.length - 1 && !item.title.trim() ? { ...item, itemType: type || item.itemType } : item
      ));
    }
    // Focus the new/empty row's title cell
    const targetRow = items.length > 0 && !lastItem?.title.trim() ? items.length - 1 : items.length;
    setTimeout(() => focusCell(targetRow, 2), 50); // col 2 = Item Name
  }, [items, onItemsChange, createEmptyItem, focusCell]);

  const deleteRow = useCallback((rowIdx: number) => {
    if (items.length <= 1) return;
    onItemsChange(items.filter((_, i) => i !== rowIdx));
  }, [items, onItemsChange]);

  const duplicateRow = useCallback((rowIdx: number) => {
    const copy = { ...items[rowIdx], id: undefined, title: items[rowIdx].title + ' (copy)' };
    const updated = [...items];
    updated.splice(rowIdx + 1, 0, copy);
    onItemsChange(updated);
    setTimeout(() => focusCell(rowIdx + 1, 2), 50);
  }, [items, onItemsChange, focusCell]);

  const insertRowAbove = useCallback((rowIdx: number, type?: string) => {
    const updated = [...items];
    updated.splice(rowIdx, 0, createEmptyItem(type ? { itemType: type } : undefined));
    onItemsChange(updated);
    setTimeout(() => focusCell(rowIdx, 2), 50);
  }, [items, onItemsChange, createEmptyItem, focusCell]);

  const insertRowBelow = useCallback((rowIdx: number, type?: string) => {
    const updated = [...items];
    updated.splice(rowIdx + 1, 0, createEmptyItem(type ? { itemType: type } : undefined));
    onItemsChange(updated);
    setTimeout(() => focusCell(rowIdx + 1, 2), 50);
  }, [items, onItemsChange, createEmptyItem, focusCell]);

  const moveRowUp = useCallback((rowIdx: number) => {
    if (rowIdx === 0) return;
    const updated = [...items];
    [updated[rowIdx - 1], updated[rowIdx]] = [updated[rowIdx], updated[rowIdx - 1]];
    onItemsChange(updated);
  }, [items, onItemsChange]);

  const moveRowDown = useCallback((rowIdx: number) => {
    if (rowIdx === items.length - 1) return;
    const updated = [...items];
    [updated[rowIdx], updated[rowIdx + 1]] = [updated[rowIdx + 1], updated[rowIdx]];
    onItemsChange(updated);
  }, [items, onItemsChange]);

  const copyRow = useCallback((rowIdx: number) => {
    setClipboardRow({ ...items[rowIdx] });
  }, [items]);

  const pasteRowBelow = useCallback((rowIdx: number) => {
    if (!clipboardRow) return;
    const paste = { ...clipboardRow, id: undefined, title: clipboardRow.title + ' (pasted)' };
    const updated = [...items];
    updated.splice(rowIdx + 1, 0, paste);
    onItemsChange(updated);
  }, [clipboardRow, items, onItemsChange]);

  // --- Item search ---
  const handleTitleChange = useCallback((rowIdx: number, value: string) => {
    updateItem(rowIdx, 'title', value);

    // Trigger search
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length < 2) {
      setSearchState(prev => ({ ...prev, open: false, results: [] }));
      return;
    }

    setSearchState(prev => ({ ...prev, rowIdx, query: value, loading: true, open: true, highlightedIdx: -1 }));

    searchTimerRef.current = setTimeout(async () => {
      try {
        const itemType = items[rowIdx]?.itemType || '';
        const typeParam = itemType !== 'custom' ? itemType : '';
        const res = await fetch(
          `/api/quotations/smart-search-inventory?q=${encodeURIComponent(value)}&limit=8&type=${typeParam}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setSearchState(prev => ({
            ...prev,
            results: json.results || [],
            loading: false,
            highlightedIdx: -1,
          }));
        }
      } catch { /* silent */ }
      finally {
        setSearchState(prev => ({ ...prev, loading: false }));
      }
    }, 250);
  }, [items, updateItem]);

  const selectSearchResult = useCallback((resultIdx: number) => {
    const result = searchState.results[resultIdx];
    if (!result) return;
    const rowIdx = searchState.rowIdx;

    const updated = items.map((item, i) => {
      if (i !== rowIdx) return item;
      return {
        ...item,
        title: result.name,
        itemCode: result.sku || item.itemCode,
        description: result.description || '',
        unit: result.unit,
        rate: result.unitPrice,
        category: result.category || undefined,
        itemType: result.itemType === 'inventory' ? 'inventory' : 'custom',
        amount: (item.quantity || 1) * result.unitPrice,
      };
    });
    onItemsChange(updated);
    setSearchState({ rowIdx: -1, query: '', results: [], loading: false, open: false, highlightedIdx: -1 });

    // Move to Quantity column
    setTimeout(() => focusCell(rowIdx, 7), 50); // col 7 = Qty
  }, [searchState, items, onItemsChange, focusCell]);

  // --- Clean up search timer ---
  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  // --- Close search on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchState.open) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-search-dropdown]')) {
          setSearchState(prev => ({ ...prev, open: false }));
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchState.open]);

  // --- Render ---
  const validCount = validItemsCount ?? items.filter(i => i.title.trim()).length;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Quick Add:</span>
          {ITEM_TYPES.map(type => (
            <Button
              key={type.value}
              variant="outline"
              size="sm"
              className={cn('h-8 px-2.5 text-xs gap-1.5', type.color)}
              onClick={() => addRow(type.value)}
            >
              <type.icon className="h-3 w-3" />
              {type.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {ITEM_TYPES.map(type => {
            const count = itemCounts[type.value] || 0;
            if (count === 0) return null;
            return (
              <Badge key={type.value} variant="secondary" className={cn('text-[10px] h-5 gap-1', type.color)}>
                <type.icon className="h-2.5 w-2.5" />
                {count}
              </Badge>
            );
          })}
          <span className="text-xs text-muted-foreground ml-1">
            {validCount} item{validCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={containerRef}
        className="rounded-lg border border-gray-200 bg-white overflow-auto"
        style={{ maxHeight: 'calc(100vh - 420px)', minHeight: 300 }}
      >
        <table
          className="w-full border-collapse"
          style={{ minWidth: TOTAL_MIN_WIDTH }}
        >
          {/* Sticky Header */}
          <thead>
            <tr className="bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
              {COLUMNS.map((col, colIdx) => {
                const isStickyHeader = col.sticky;
                const isActionCol = col.type === 'actions';
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2.5 py-2.5 border-b-2 border-gray-200 bg-gray-50/95 select-none whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      isStickyHeader && 'sticky z-[10] border-r border-gray-200',
                      isActionCol && 'w-10',
                    )}
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      maxWidth: col.width,
                      left: col.stickyLeft,
                      top: 0,
                    }}
                  >
                    {col.label || ''}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {items.map((item, rowIdx) => {
              const rowErrors = validation.errors[rowIdx];
              const isEmpty = !item.title.trim() && !item.quantity && !item.rate;
              const isRowActive = activeCell?.row === rowIdx;

              return (
                <ContextMenu key={rowIdx}>
                  <ContextMenuTrigger asChild>
                    <tr
                      className={cn(
                        'group transition-colors',
                        isRowActive && 'bg-emerald-50/30',
                        !isRowActive && !isEmpty && 'hover:bg-gray-50/60',
                        isEmpty && 'bg-gray-50/20',
                        rowIdx === items.length - 1 && isEmpty && 'border-b-0',
                      )}
                    >
                      {COLUMNS.map((col, colIdx) => {
                        const cellKey = col.key as keyof QuotationLineItem;
                        const error = rowErrors?.[col.key];
                        const isFocused = focusedCell?.row === rowIdx && focusedCell?.col === colIdx;
                        const isCellActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;

                        // Special handling for title column (search)
                        if (col.key === 'title') {
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'px-1 border-b border-gray-100 relative',
                                col.sticky && 'sticky z-[5] bg-white border-r border-gray-200',
                                isRowActive && 'bg-emerald-50/30',
                              )}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                                left: col.stickyLeft,
                              }}
                            >
                              <div className="relative">
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={item.title}
                                    onChange={(e) => handleTitleChange(rowIdx, e.target.value)}
                                    placeholder={col.placeholder}
                                    className={cn(
                                      'h-11 flex-1 px-2.5 text-sm font-medium transition-colors border-0 shadow-none bg-transparent rounded-sm',
                                      'focus-visible:ring-1 focus-visible:ring-emerald-500 placeholder:text-gray-300',
                                      error && 'ring-1 ring-rose-300 bg-rose-50/30',
                                      isCellActive && 'ring-1 ring-emerald-200',
                                    )}
                                    onFocus={() => {
                                      setFocusedCell({ row: rowIdx, col: colIdx });
                                      setActiveCell({ row: rowIdx, col: colIdx });
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                    ref={(el) => registerRef(`${rowIdx}-${colIdx}`, el)}
                                  />
                                  <Sparkles className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />
                                </div>

                                {/* Search Dropdown */}
                                {searchState.open && searchState.rowIdx === rowIdx && (
                                  <div
                                    data-search-dropdown
                                    className="absolute z-50 top-full mt-0.5 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-hidden"
                                  >
                                    {searchState.loading ? (
                                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching items...
                                      </div>
                                    ) : searchState.results.length === 0 ? (
                                      <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                                        No items found. Press Enter to create custom item.
                                      </div>
                                    ) : (
                                      <div className="py-1 max-h-52 overflow-y-auto">
                                        {searchState.results.map((inv, idx) => (
                                          <button
                                            key={inv.id || inv.name}
                                            className={cn(
                                              'w-full text-left px-3 py-2 border-b border-gray-50 last:border-0 transition-colors',
                                              idx === searchState.highlightedIdx
                                                ? 'bg-emerald-50 text-emerald-900'
                                                : 'hover:bg-gray-50',
                                            )}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => selectSearchResult(idx)}
                                            onMouseEnter={() => setSearchState(prev => ({ ...prev, highlightedIdx: idx }))}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-medium text-sm truncate">{inv.name}</span>
                                              <div className="flex items-center gap-2 shrink-0">
                                                {inv.stockAvailable != null && (
                                                  <span className={cn(
                                                    'text-[10px] px-1.5 py-0.5 rounded-full',
                                                    inv.stockAvailable > 0
                                                      ? 'text-emerald-700 bg-emerald-50'
                                                      : 'text-rose-600 bg-rose-50',
                                                  )}>
                                                    Stock: {inv.stockAvailable}
                                                  </span>
                                                )}
                                                <span className="text-xs font-semibold text-emerald-700">
                                                  {formatCurrency(inv.unitPrice, currency)}
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
                                              {inv.useCount && inv.useCount > 1 && (
                                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                  Used {inv.useCount}x
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // _rowNum is handled specially
                        if (col.key === '_rowNum') {
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'sticky z-[5] border-b border-gray-100 bg-gray-50/80 px-2 text-center text-xs text-muted-foreground font-mono select-none',
                                isRowActive && 'bg-emerald-50/50',
                              )}
                              style={{ left: col.stickyLeft, width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              {rowIdx + 1}
                            </td>
                          );
                        }

                        // _actions is handled specially
                        if (col.key === '_actions') {
                          return (
                            <td
                              key={col.key}
                              className="px-1 text-center border-b border-gray-100"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => { e.stopPropagation(); insertRowBelow(rowIdx); }}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Insert below</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-500"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => { e.stopPropagation(); deleteRow(rowIdx); }}
                                      disabled={items.length <= 1}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Delete row</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          );
                        }

                        // Computed amount
                        if (col.key === 'amount') {
                          const amt = computeLineAmount(item);
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'px-2.5 text-right font-bold text-sm border-b border-gray-100 select-none',
                                amt > 0 ? 'text-gray-900' : 'text-gray-300',
                              )}
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              {amt > 0 ? formatCurrency(amt, currency) : '—'}
                            </td>
                          );
                        }

                        // Standard editable cells (text, number, select, textarea)
                        if (col.type === 'select') {
                          const val = String(item[cellKey] ?? (col.key === 'itemType' ? 'custom' : ''));
                          return (
                            <td
                              key={col.key}
                              className="px-1 border-b border-gray-100"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              <Select
                                value={val}
                                onValueChange={(v) => updateItem(rowIdx, col.key, v)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-11 w-full p-0 px-2 text-xs font-medium border-0 shadow-none bg-transparent rounded-sm transition-colors',
                                    'focus:ring-1 focus:ring-emerald-500',
                                    isCellActive && 'ring-1 ring-emerald-200',
                                  )}
                                  onFocus={() => {
                                    setFocusedCell({ row: rowIdx, col: colIdx });
                                    setActiveCell({ row: rowIdx, col: colIdx });
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {col.options?.map((opt) => {
                                    if (col.key === 'itemType') {
                                      const t = ITEM_TYPES.find(t => t.value === opt);
                                      return (
                                        <SelectItem key={opt} value={opt} className="text-xs">
                                          <span className="flex items-center gap-1.5">
                                            {t && <t.icon className="h-3 w-3" />}
                                            {t?.label || opt}
                                          </span>
                                        </SelectItem>
                                      );
                                    }
                                    return <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        }

                        if (col.type === 'textarea') {
                          return (
                            <td
                              key={col.key}
                              className="px-1 border-b border-gray-100 align-top"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              <Textarea
                                value={String(item[cellKey] ?? '')}
                                onChange={(e) => updateItem(rowIdx, col.key, e.target.value)}
                                placeholder={col.placeholder}
                                className={cn(
                                  'min-h-[44px] resize-none py-2.5 w-full px-2.5 text-xs leading-relaxed border-0 shadow-none bg-transparent rounded-sm transition-colors',
                                  'focus-visible:ring-1 focus-visible:ring-emerald-500 placeholder:text-gray-300',
                                  isCellActive && 'ring-1 ring-emerald-200',
                                )}
                                onFocus={() => {
                                  setFocusedCell({ row: rowIdx, col: colIdx });
                                  setActiveCell({ row: rowIdx, col: colIdx });
                                }}
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                rows={1}
                                ref={(el) => registerRef(`${rowIdx}-${colIdx}`, el)}
                              />
                            </td>
                          );
                        }

                        if (col.type === 'number') {
                          const numVal = item[cellKey] as number | undefined;
                          return (
                            <td
                              key={col.key}
                              className="px-1 border-b border-gray-100"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            >
                              <Input
                                type="number"
                                value={numVal || ''}
                                onChange={(e) => updateItem(rowIdx, col.key, parseFloat(e.target.value) || 0)}
                                placeholder={col.placeholder}
                                min={col.min}
                                step={col.step}
                                className={cn(
                                  'h-11 w-full px-2.5 text-sm font-medium text-right border-0 shadow-none bg-transparent rounded-sm transition-colors',
                                  'focus-visible:ring-1 focus-visible:ring-emerald-500 placeholder:text-gray-300',
                                  error && 'ring-1 ring-rose-300 bg-rose-50/30',
                                  isCellActive && 'ring-1 ring-emerald-200',
                                )}
                                onFocus={() => {
                                  setFocusedCell({ row: rowIdx, col: colIdx });
                                  setActiveCell({ row: rowIdx, col: colIdx });
                                }}
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                ref={(el) => registerRef(`${rowIdx}-${colIdx}`, el)}
                              />
                            </td>
                          );
                        }

                        // Default: text input
                        return (
                          <td
                            key={col.key}
                            className="px-1 border-b border-gray-100"
                            style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                          >
                            <Input
                              value={String(item[cellKey] ?? '')}
                              onChange={(e) => updateItem(rowIdx, col.key, e.target.value)}
                              placeholder={col.placeholder}
                              className={cn(
                                'h-11 w-full px-2.5 text-sm font-medium border-0 shadow-none bg-transparent rounded-sm transition-colors',
                                'focus-visible:ring-1 focus-visible:ring-emerald-500 placeholder:text-gray-300',
                                error && 'ring-1 ring-rose-300 bg-rose-50/30',
                                isCellActive && 'ring-1 ring-emerald-200',
                              )}
                              onFocus={() => {
                                setFocusedCell({ row: rowIdx, col: colIdx });
                                setActiveCell({ row: rowIdx, col: colIdx });
                              }}
                              onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                              ref={(el) => registerRef(`${rowIdx}-${colIdx}`, el)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </ContextMenuTrigger>

                  {/* Right-click Context Menu */}
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => insertRowAbove(rowIdx)} className="text-xs gap-2">
                      <ChevronUp className="h-3.5 w-3.5" /> Insert Above
                      <ContextMenuShortcut className="text-[10px] ml-auto">Alt+↑</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => insertRowBelow(rowIdx)} className="text-xs gap-2">
                      <ChevronDown className="h-3.5 w-3.5" /> Insert Below
                      <ContextMenuShortcut className="text-[10px] ml-auto">Alt+↓</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => duplicateRow(rowIdx)} className="text-xs gap-2">
                      <Copy className="h-3.5 w-3.5" /> Duplicate Row
                      <ContextMenuShortcut className="text-[10px] ml-auto">Ctrl+D</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => moveRowUp(rowIdx)} disabled={rowIdx === 0} className="text-xs gap-2">
                      <ArrowUp className="h-3.5 w-3.5" /> Move Up
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => moveRowDown(rowIdx)} disabled={rowIdx === items.length - 1} className="text-xs gap-2">
                      <ArrowDown className="h-3.5 w-3.5" /> Move Down
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => deleteRow(rowIdx)}
                      disabled={items.length <= 1}
                      className="text-xs gap-2 text-rose-600 focus:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Row
                      <ContextMenuShortcut className="text-[10px] ml-auto">Del</ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 mt-3">
        {items.map((item, rowIdx) => (
          <div
            key={rowIdx}
            className={cn(
              'border border-gray-200 rounded-lg p-4 space-y-3 bg-white',
              activeCell?.row === rowIdx && 'ring-1 ring-emerald-300',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Input
                  value={item.title}
                  onChange={(e) => handleTitleChange(rowIdx, e.target.value)}
                  placeholder="Item name..."
                  className="h-9 text-sm font-medium border-0 shadow-none px-0 focus-visible:ring-0"
                />
                <Input
                  value={item.itemCode || ''}
                  onChange={(e) => updateItem(rowIdx, 'itemCode', e.target.value)}
                  placeholder="Item code..."
                  className="h-7 text-xs text-muted-foreground border-0 shadow-none px-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400"
                  onClick={() => insertRowBelow(rowIdx)}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-500"
                  onClick={() => deleteRow(rowIdx)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Textarea
              value={item.description || ''}
              onChange={(e) => updateItem(rowIdx, 'description', e.target.value)}
              placeholder="Description..."
              className="text-xs min-h-[36px] border-0 shadow-none px-0 focus-visible:ring-0 resize-none"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Qty</label>
                <Input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(rowIdx, 'quantity', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm border-0 shadow-none px-0 focus-visible:ring-0"
                  min={0}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Unit Price</label>
                <Input
                  type="number"
                  value={item.rate || ''}
                  onChange={(e) => updateItem(rowIdx, 'rate', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm border-0 shadow-none px-0 focus-visible:ring-0"
                  min={0}
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Unit</label>
                <Select value={item.unit} onValueChange={(v) => updateItem(rowIdx, 'unit', v)}>
                  <SelectTrigger className="h-8 text-xs border-0 shadow-none px-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Type</label>
                <Select value={item.itemType || 'custom'} onValueChange={(v) => updateItem(rowIdx, 'itemType', v)}>
                  <SelectTrigger className="h-8 text-xs border-0 shadow-none px-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        <span className="flex items-center gap-1"><t.icon className="h-3 w-3" />{t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Line Total</span>
              <span className="text-sm font-bold text-emerald-700">
                {formatCurrency(computeLineAmount(item), currency)}
              </span>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 border-dashed text-xs gap-2"
          onClick={() => addRow()}
        >
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {/* Validation Summary */}
      {!validation.isValid && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="text-xs text-rose-600">
            {Object.keys(validation.errors).length} item(s) have validation errors
          </span>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden lg:flex items-center gap-3 mt-3 px-1 text-[10px] text-gray-400">
        <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Tab</kbd> Next cell</span>
        <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> Next row</span>
        <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Ctrl+D</kbd> Duplicate</span>
        <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Right-click</kbd> More actions</span>
      </div>
    </TooltipProvider>
  );
}