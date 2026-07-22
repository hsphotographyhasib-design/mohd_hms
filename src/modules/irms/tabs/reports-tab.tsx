'use client';

import React, { useCallback, useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  FileSpreadsheet,
  File,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Shield,
  Wrench,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { value: 'inspection_report', label: 'Inspection Report', icon: FileText },
  { value: 'monthly_summary', label: 'Monthly Summary', icon: BarChart3 },
  { value: 'compliance_report', label: 'Compliance Report', icon: Shield },
  { value: 'equipment_history', label: 'Equipment History', icon: Wrench },
  { value: 'inspector_performance', label: 'Inspector Performance', icon: User },
];

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', icon: File },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
];

function getAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useAuthStore.getState().token;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function buildReportUrl(reportType: string, dateFrom: string, dateTo: string) {
  const params = new URLSearchParams({ generate: reportType });
  if (dateFrom) params.set('fromDate', dateFrom);
  if (dateTo) params.set('toDate', dateTo);
  return `/api/irms/inspections/reports?${params.toString()}`;
}

function downloadDataAsFile(data: unknown, filename: string, format: string) {
  let content: string;
  let mimeType: string;
  let ext: string;

  if (format === 'csv') {
    content = jsonToCsv(data);
    mimeType = 'text/csv';
    ext = 'csv';
  } else {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
    ext = 'json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Simple JSON → CSV flattener for 1-level arrays of objects */
function jsonToCsv(data: unknown): string {
  const obj = data as Record<string, unknown>;
  let rows: Record<string, unknown>[] = [];

  // Extract the array of rows from different report structures
  if (obj.inspections) rows = obj.inspections as Record<string, unknown>[];
  else if (obj.months) rows = obj.months as Record<string, unknown>[];
  else if (obj.nonCompliantInspections) rows = obj.nonCompliantInspections as Record<string, unknown>[];
  else if (obj.equipment) rows = obj.equipment as Record<string, unknown>[];
  else if (obj.inspectors) rows = obj.inspectors as Record<string, unknown>[];
  else if (Array.isArray(data)) rows = data as Record<string, unknown>[];
  else rows = [obj];

  if (rows.length === 0) return '';

  // Collect all unique keys
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((k) => keys.add(k));
  });

  const header = Array.from(keys);
  const lines = [header.join(',')];
  rows.forEach((row) => {
    const values = header.map((k) => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape CSV values
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  });

  return lines.join('\n');
}

export default function ReportsTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canExport = role ? canPerformAction(role, 'inspection', 'export') : false;

  const [reportType, setReportType] = useState('inspection_report');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<Record<string, unknown> | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setReportError(null);
    setLastReport(null);
    setReportExpanded(false);
    try {
      const res = await fetch(buildReportUrl(reportType, dateFrom, dateTo), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setLastReport(data);
      toast.success('Report generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate report';
      setReportError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [reportType, dateFrom, dateTo]);

  const handleExport = useCallback(async (format: string) => {
    setExporting(format);
    try {
      const res = await fetch(buildReportUrl(reportType, dateFrom, dateTo), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadDataAsFile(data, `${reportType}_${timestamp}`, format);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  }, [reportType, dateFrom, dateTo]);

  const selectedTypeConfig = REPORT_TYPES.find((t) => t.value === reportType);

  // Extract summary from generated report for preview
  const summary = lastReport?.summary as Record<string, unknown> | undefined;
  const reportItems: unknown[] = lastReport
    ? ((lastReport.inspections ||
        lastReport.months ||
        lastReport.nonCompliantInspections ||
        lastReport.equipment ||
        lastReport.inspectors) as unknown[] | undefined) ?? []
    : [];
  const itemCount = Array.isArray(reportItems) ? reportItems.length : 0;

  return (
    <div className="space-y-6">
      {/* Report Generator */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="px-4 py-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {selectedTypeConfig && <selectedTypeConfig.icon className="h-4 w-4 text-emerald-600" />}
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">&nbsp;</Label>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          </div>

          {/* Export buttons */}
          {canExport && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 font-medium">Quick Export:</span>
              {EXPORT_FORMATS.map((fmt) => (
                <Button
                  key={fmt.value}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={exporting === fmt.value}
                  onClick={() => handleExport(fmt.value)}
                >
                  {exporting === fmt.value ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <fmt.icon className="h-3 w-3" />
                  )}
                  {fmt.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Report Result */}
      {lastReport && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Generated: {selectedTypeConfig?.label}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => downloadDataAsFile(lastReport, `${reportType}_${new Date().toISOString().slice(0, 10)}`, 'json')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download JSON
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setReportExpanded(!reportExpanded)}
                >
                  {reportExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {Object.entries(summary).map(([key, value]) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (s) => s.toUpperCase())
                    .trim();
                  const isPercent = label.toLowerCase().includes('rate') || label.toLowerCase().includes('pct');
                  const displayValue = typeof value === 'number'
                    ? isPercent ? `${value}%` : value.toLocaleString()
                    : String(value ?? '—');
                  return (
                    <div key={key} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-[11px] text-gray-500 truncate">{label}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{displayValue}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expandable data table */}
            {reportExpanded && itemCount > 0 && (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {Object.keys(reportItems[0] as Record<string, unknown>).slice(0, 8).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                          {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reportItems.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {Object.entries(item as Record<string, unknown>).slice(0, 8).map(([k, v]) => (
                          <td key={k} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                            {formatCellValue(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {itemCount > 50 && (
                  <p className="text-xs text-gray-400 text-center py-2">Showing 50 of {itemCount} rows</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {reportError && (
        <Card className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 rounded-xl">
          <CardContent className="px-4 py-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Report Generation Failed</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{reportError}</p>
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => setReportError(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!lastReport && !reportError && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="px-4 py-16">
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No report generated yet</p>
              <p className="text-xs mt-1 text-center max-w-sm">
                Select a report type, optionally set date filters, then click Generate to create your report.
                Reports are generated on-the-fly and can be downloaded as JSON or CSV.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Format a cell value for display in the preview table */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 50) return value.slice(0, 47) + '...';
    return value;
  }
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
