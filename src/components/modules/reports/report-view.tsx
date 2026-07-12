'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, FileText, Download,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#a855f7', '#f97316', '#06b6d4', '#84cc16'];

interface ReportData {
  summary?: Record<string, number | string>;
  chartData?: { name: string; value: number; count?: number; [key: string]: unknown }[];
  tableData?: Record<string, unknown>[];
  columns?: string[];
}

const TAB_CONFIG: { value: string; label: string; apiType: string }[] = [
  { value: 'complaint', label: 'Complaints', apiType: 'complaint' },
  { value: 'work_order', label: 'Work Orders', apiType: 'work_order' },
  { value: 'equipment', label: 'Equipment', apiType: 'equipment' },
  { value: 'financial', label: 'Financial', apiType: 'financial' },
  { value: 'pm', label: 'PM', apiType: 'pm' },
];

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-72 w-full" /></CardContent></Card>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  );
}

function ReportTabContent({ apiType }: { apiType: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${apiType}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error(`Failed to load ${apiType} report`);
    } finally {
      setLoading(false);
    }
  }, [apiType]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = (format_type: string) => {
    toast.info(`Export ${format_type} coming soon`);
  };

  if (loading) return <ReportSkeleton />;

  const summary = data?.summary || {};
  const chartData = data?.chartData || [];
  const tableData = data?.tableData || [];
  const columns = data?.columns || [];

  const summaryEntries = Object.entries(summary).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      {summaryEntries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryEntries.map(([key, val]) => (
            <KpiCard
              key={key}
              label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              value={typeof val === 'number' && key.toLowerCase().includes('amount') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('cost')
                ? fmt(val)
                : String(val)}
            />
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              {apiType === 'financial' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : apiType === 'equipment' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
          <FileText className="h-4 w-4 mr-2" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('Excel')}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Data Table */}
      {tableData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(columns.length > 0 ? columns : Object.keys(tableData[0])).map((col) => (
                      <TableHead key={col}>
                        {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, i) => (
                    <TableRow key={i}>
                      {(columns.length > 0 ? columns : Object.keys(row)).map((col) => (
                        <TableCell key={col}>
                          {typeof row[col] === 'number'
                            ? (col.toLowerCase().includes('amount') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue') || col.toLowerCase().includes('total')
                                ? fmt(row[col] as number)
                                : String(row[col]))
                            : String(row[col] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data fallback */}
      {summaryEntries.length === 0 && chartData.length === 0 && tableData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No data available for this report</p>
        </div>
      )}
    </div>
  );
}

export function ReportView() {
  const [activeTab, setActiveTab] = useState('complaint');

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <ReportTabContent apiType={tab.apiType} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}