'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Phone, Mail, Building2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CustomerResult {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  building?: string;
  floor?: string;
  unit?: string;
  customerNumber?: string;
}

interface SmartCustomerSearchProps {
  /** Currently selected customer ID */
  value: string;
  /** Fires when a customer is selected from results or cleared */
  onChange: (customerId: string, customerData: CustomerResult) => void;
  /** Tenant ID to scope the search */
  tenantId: string;
  /** Disables the input and prevents searching */
  disabled?: boolean;
  /** Placeholder text shown in the input */
  placeholder?: string;
  /** Optional callback to create a new customer when no results found */
  onCreateNew?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;
const TOKEN_KEY = 'cmms_token';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartCustomerSearch({
  value,
  onChange,
  tenantId,
  disabled = false,
  placeholder = 'Search customer by name, email, phone…',
  onCreateNew,
}: SmartCustomerSearchProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, CustomerResult[]>>(new Map());
  const isInternalClearRef = useRef(false);

  // ── Sync selected customer from value prop ─────────────────────────────────
  useEffect(() => {
    if (!value) {
      if (!isInternalClearRef.current) {
        setSelectedCustomer(null);
        setQuery('');
      }
      isInternalClearRef.current = false;
      return;
    }

    // If we already have this customer selected, nothing to do
    if (selectedCustomer?.id === value) return;

    // Try to find it in the cache
    for (const cached of cacheRef.current.values()) {
      const found = cached.find((c) => c.id === value);
      if (found) {
        setSelectedCustomer(found);
        setQuery(found.name);
        return;
      }
    }
    // Also check current results
    const inResults = results.find((c) => c.id === value);
    if (inResults) {
      setSelectedCustomer(inResults);
      setQuery(inResults.name);
    }
    // If not found anywhere, we just show the value as-is (the parent can
    // resolve the name later or the user can re-select).
  }, [value, selectedCustomer?.id, results]);

  // ── Click outside handler ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Cleanup debounce timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Search function ────────────────────────────────────────────────────────
  const performSearch = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setResults([]);
        setIsOpen(false);
        setHasSearched(false);
        return;
      }

      // Check cache first
      const cacheKey = trimmed.toLowerCase();
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached);
        setIsOpen(true);
        setHasSearched(true);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const token = getAuthToken();
        if (!token) {
          setResults([]);
          setIsOpen(true);
          setIsLoading(false);
          return;
        }

        const params = new URLSearchParams({
          search: trimmed,
          pageSize: String(RESULT_LIMIT),
        });

        const res = await fetch(`/api/customers?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          console.error('[SmartCustomerSearch] API error:', res.status);
          setResults([]);
          setIsOpen(true);
          return;
        }

        const json = await res.json();
        const data: CustomerResult[] = json.data ?? [];

        // Update cache
        cacheRef.current.set(cacheKey, data);
        // Keep cache size reasonable (max 30 entries)
        if (cacheRef.current.size > 30) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }

        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('[SmartCustomerSearch] fetch error:', err);
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ── Input change handler with debounce ─────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If user clears the input, clear selection
    if (!newValue) {
      handleClear();
      return;
    }

    // If we had a selected customer and user starts typing, deselect
    if (selectedCustomer && newValue !== selectedCustomer.name) {
      setSelectedCustomer(null);
    }

    setQuery(newValue);
    setActiveIndex(-1);

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(newValue);
    }, DEBOUNCE_MS);
  };

  // ── Select a customer ──────────────────────────────────────────────────────
  const handleSelect = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setQuery(customer.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(customer.id, customer);
  };

  // ── Clear selection ────────────────────────────────────────────────────────
  const handleClear = () => {
    isInternalClearRef.current = true;
    setSelectedCustomer(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setHasSearched(false);
    onChange('', {} as CustomerResult);
  };

  // ── Focus handler: re-open dropdown if there are results ───────────────────
  const handleFocus = () => {
    if (results.length > 0 || hasSearched) {
      setIsOpen(true);
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // ── Create new customer handler ────────────────────────────────────────────
  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew?.();
  };

  // ── Determine what to show in the input ────────────────────────────────────
  const displayValue = selectedCustomer ? selectedCustomer.name : query;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input row */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />

        <Input
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            pl-9 ${selectedCustomer ? 'pr-9' : ''}
            ${isOpen ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
            transition-all duration-150
          `}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="smart-customer-search-results"
        />

        {/* Clear button when a customer is selected */}
        {selectedCustomer && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear selected customer"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="size-4 animate-spin text-emerald-500" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="smart-customer-search-results"
          role="listbox"
          className="
            absolute z-50 mt-1.5 w-full
            bg-white rounded-xl border border-gray-200 shadow-lg shadow-black/5
            max-h-80 overflow-y-auto
            animate-in fade-in-0 zoom-in-95 duration-150
          "
        >
          {/* Results list */}
          {results.length > 0 ? (
            <div className="py-1.5">
              {results.map((customer, idx) => {
                const isCompanyDifferent =
                  customer.companyName &&
                  customer.companyName.trim() !== '' &&
                  customer.companyName.trim().toLowerCase() !==
                    customer.name.trim().toLowerCase();

                return (
                  <button
                    key={customer.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    onClick={() => handleSelect(customer)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`
                      w-full text-left px-4 py-3 transition-colors duration-100
                      ${idx === activeIndex
                        ? 'bg-emerald-50 border-l-2 border-emerald-500'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }
                      ${idx < results.length - 1 ? 'border-b border-gray-100' : ''}
                    `}
                  >
                    {/* Primary: Customer name */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {customer.name}
                      </span>
                      {customer.customerNumber && (
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {customer.customerNumber}
                        </span>
                      )}
                    </div>

                    {/* Company name (if different from person name) */}
                    {isCompanyDifferent && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="size-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 truncate">
                          {customer.companyName}
                        </span>
                      </div>
                    )}

                    {/* Contact row: phone + email */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="size-3 shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : hasSearched && !isLoading ? (
            /* No results state */
            <div className="py-6 px-4 text-center">
              <div className="text-sm text-gray-500 mb-3">
                No customers found
              </div>
              {onCreateNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNew}
                  className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                >
                  <Plus className="size-4" />
                  Create New Customer
                </Button>
              )}
            </div>
          ) : null}

          {/* Results count footer when there are results */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[11px] text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''} found
                &middot; Use arrow keys to navigate
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartCustomerSearch;