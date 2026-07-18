'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  FileSpreadsheet,
  File,
  BarChart3,
  Inbox,
  CalendarDays,
  Shield,
  Wrench,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDate } from './shared';
import type { GeneratedReport } from '../lib';

const REPORT_TYPES = [
  { value: 'inspection_report', label: 'Inspection Report', icon: FileText },
  { value: 'monthly_summary', label: 'Monthly Summary', icon: BarChart3 },
  { value: 'compliance_report', label: 'Compliance Report', icon: Shield },
  { value: 'equipment_history', label: 'Equipment History', icon: Wrench },
  { value: 'inspector_performance', label: 'Inspector Performance', icon: User },
];

const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: File },
];

export default function ReportsTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canExport = role ? canPerformAction(role, 'inspection', 'export') : false;

  const [reportType, setReportType] = useState('inspection_report');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/irms/inspections/reports', { headers: h });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.data ?? data.items ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/irms/inspections/reports', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          type: reportType,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          format: 'pdf',
        }),
      });
      if (res.ok) {
        loadReports();
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }, [reportType, dateFrom, dateTo, loadReports]);

  const handleExport = useCallback(async (format: string) => {
    setExporting(format);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams({
        type: reportType,
        format,
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      });

      const res = await fetch(`/api/irms/inspections/reports/export?${params}`, { headers: h });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${format}.${format === 'excel' ? 'xlsx' : format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent fail
    } finally {
      setExporting(null);
    }
  }, [reportType, dateFrom, dateTo]);

  const selectedTypeConfig = REPORT_TYPES.find((t) => t.value === reportType);

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

      {/* Previously Generated Reports */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="px-4 py-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Previously Generated Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <Inbox className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No reports generated yet</p>
              <p className="text-xs mt-1">Select a report type and click Generate to create your first report</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                        {report.type.replace('_', ' ')}
                      </Badge>
                      <span>{formatDate(report.generatedAt)}</span>
                      {report.size && <span>· {report.size}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                      {report.format}
                    </Badge>
                    {report.downloadUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}