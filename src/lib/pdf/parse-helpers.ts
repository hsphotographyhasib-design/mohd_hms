import { format } from 'date-fns';
import type { PrintableLineItem } from './types';

export function fmtDate(d?: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy') : '—';
}

// Parses the stored line-item JSON into the printable shape. Each line's amount
// is derived from quantity * rate when both are present (so the printed Amount
// column always agrees with the recomputed subtotal), falling back to the
// stored amount for flat "description + amount" line items.
export function parsePrintableItems(itemsJson: string): PrintableLineItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate ?? item.unitPrice) || 0;
      const hasQtyRate = item.quantity != null && (item.rate ?? item.unitPrice) != null;
      const amount = hasQtyRate ? quantity * rate : Number(item.amount) || 0;
      return {
        title: String(item.title || item.description || 'Item'),
        description: item.title ? (item.description ? String(item.description) : undefined) : undefined,
        unit: item.unit ? String(item.unit) : 'Nos',
        quantity,
        rate,
        amount,
      };
    });
  } catch {
    return [];
  }
}

export function parseTermsOr(termsJson: string | null, fallback: string[]): string[] {
  if (!termsJson) return fallback;
  try {
    const parsed = JSON.parse(termsJson);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* fall through */ }
  return fallback;
}
