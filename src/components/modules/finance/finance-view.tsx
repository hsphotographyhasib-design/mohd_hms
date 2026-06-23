'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, Clock, Loader2, Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store';
import type { InvoiceItem, PaginatedResponse } from '@/types';
import { toast } from 'sonner';

// ============ HELPERS ============

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-teal-100 text-teal-800', CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

function truncateId(id: string): string {
  return id.length > 8 ? id.substring(0, 8) + '...' : id;
}

const token = () => localStorage.getItem('cmms_token') || '';

const PIE_COLORS = ['#6b7280', '#f59e0b', '#14b8a6', '#10b981', '#f43f5e'];

interface FinanceData {
  totalRevenue: number;
  pendingRevenue: number;
  outstandingAmount: number;
  collectionRate: number;
  totalExpenses: number;
  monthlyRevenue: { month: string; revenue: number }[];
  invoiceStatusCounts: { status: string; count: number }[];
}

// ============ LOADING SKELETON ============

function FinanceSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function FinanceView() {
  const setView = useAppStore((s) => s.setView);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [finRes, invRes] = await Promise.all([
        fetch('/api/finance', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/invoices?pageSize=5', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (!finRes.ok) throw new Error('Failed to load finance data');
      const finJson = await finRes.json();
      setFinanceData(finJson);
      if (invRes.ok) {
        const invJson = await invRes.json();
        setRecentInvoices(invJson.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <FinanceSkeleton />;
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertTriangle className="h-12 w-12 text-rose-500" />
            <p className="text-lg font-medium text-rose-600">{error}</p>
            <Button variant="outline" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fin = financeData;

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(fin?.totalRevenue ?? 0),
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      color: 'border-emerald-200 bg-emerald-50/50',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Pending Revenue',
      value: formatCurrency(fin?.pendingRevenue ?? 0),
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      color: 'border-amber-200 bg-amber-50/50',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(fin?.outstandingAmount ?? 0),
      icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
      color: 'border-rose-200 bg-rose-50/50',
      iconBg: 'bg-rose-100',
    },
    {
      label: 'Collection Rate',
      value: `${(fin?.collectionRate ?? 0).toFixed(1)}%`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      color: 'border-emerald-200 bg-emerald-50/50',
      iconBg: 'bg-emerald-100',
    },
  ];

  const invoiceBreakdown = fin?.invoiceStatusCounts || [
    { status: 'DRAFT', count: 0 },
    { status: 'PENDING', count: 0 },
    { status: 'APPROVED', count: 0 },
    { status: 'PAID', count: 0 },
    { status: 'OVERDUE', count: 0 },
  ];

  const statusColorMap: Record<string, string> = {
    DRAFT: '#6b7280',
    PENDING: '#f59e0b',
    APPROVED: '#14b8a6',
    PAID: '#10b981',
    OVERDUE: '#f43f5e',
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Finance Overview</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.color}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {fin?.monthlyRevenue && fin.monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fin.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Invoice Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-48 w-48 flex-shrink-0">
                {invoiceBreakdown.some((s) => s.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoiceBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {invoiceBreakdown.map((entry, idx) => (
                          <Cell key={entry.status} fill={statusColorMap[entry.status] || PIE_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name.replace(/_/g, ' ')]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No data
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                {invoiceBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statusColorMap[s.status] || '#6b7280' }}
                      />
                      <span className="text-sm">{s.status.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-sm font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No recent invoices
                    </TableCell>
                  </TableRow>
                ) : (
                  recentInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setView('invoice-detail', { id: inv.id })}
                    >
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{inv.customerName || '—'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(inv.total)}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
