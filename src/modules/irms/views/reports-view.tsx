'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Pencil, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIrmStore, REPORT_STATUSES, PRIORITIES, WORK_CATEGORIES, type IrmReport } from '@/modules/irms/lib';
import { toast } from 'sonner';

export default function ReportsView() {
  const [reports, setReports] = useState<IrmReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');

  const reportsFilter = useIrmStore((s) => s.reportsFilter);
  const setReportsFilter = useIrmStore((s) => s.setReportsFilter);
  const setView = useIrmStore((s) => s.setView);
  const setSelectedReportId = useIrmStore((s) => s.setSelectedReportId);

  // Apply incoming filter on mount
  useEffect(() => {
    if (reportsFilter) {
      if (reportsFilter.status) setStatus(reportsFilter.status);
      if (reportsFilter.priority) setPriority(reportsFilter.priority);
      if (reportsFilter.category) setCategory(reportsFilter.category);
      if (reportsFilter.q) setSearch(reportsFilter.q);
      setReportsFilter(null);
    }
  }, [reportsFilter, setReportsFilter]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (priority !== 'all') params.set('priority', priority);
      if (category !== 'all') params.set('workCategory', category);
      if (search) params.set('q', search);
      const res = await fetch(`/api/irms/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setReports(Array.isArray(json) ? json : json.data || []);
    } catch {
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [status, priority, category, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getStatusBadge = (s: string) => {
    const found = REPORT_STATUSES.find((r) => r.value === s);
    return found ? (
      <Badge variant="secondary" className={`${found.color} text-xs`}>
        {found.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{s}</Badge>
    );
  };

  const getPriorityBadge = (p: string) => {
    const found = PRIORITIES.find((r) => r.value === p);
    return found ? (
      <Badge variant="secondary" className={`${found.color} text-xs`}>
        {found.label}
      </Badge>
    ) : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Inspection reports</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => {
            setSelectedReportId(null);
            setView('report-builder');
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPORT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {WORK_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-center">Photos</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">{r.number}</TableCell>
                      <TableCell>
                        {new Date(r.inspectionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {r.project?.name || '—'}
                      </TableCell>
                      <TableCell>{r.inspector?.name || '—'}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell>{getPriorityBadge(r.priority)}</TableCell>
                      <TableCell className="text-center">
                        {r._count?.photos || r.photos?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReportId(r.id);
                              setView('report-view');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReportId(r.id);
                              setView('report-builder');
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}