'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Loader2, Pencil, Trash2,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const token = () => localStorage.getItem('cmms_token') || '';
const fmtBND = (n: number) =>
  `B$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface LabourRate {
  id: string;
  labourCode?: string;
  technicianGrade?: string;
  skillLevel?: string;
  hourlyCost?: number;
  hourlyCharge?: number;
  overtimeRate?: number;
  weekendRate?: number;
  holidayRate?: number;
  effectiveDate?: string;
  isActive?: boolean;
}

const emptyForm = {
  labourCode: '', technicianGrade: '', skillLevel: 'intermediate',
  hourlyCost: '', hourlyCharge: '', overtimeRate: '', weekendRate: '',
  holidayRate: '', effectiveDate: '', isActive: true,
};

export function LabourRates() {
  const [data, setData] = useState<{ data: LabourRate[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LabourRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<LabourRate | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      const res = await fetch(`/api/labour-rates?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load labour rates');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (rate: LabourRate) => {
    setEditing(rate);
    setForm({
      labourCode: rate.labourCode || '', technicianGrade: rate.technicianGrade || '',
      skillLevel: rate.skillLevel || 'intermediate', hourlyCost: String(rate.hourlyCost || ''),
      hourlyCharge: String(rate.hourlyCharge || ''), overtimeRate: String(rate.overtimeRate || ''),
      weekendRate: String(rate.weekendRate || ''), holidayRate: String(rate.holidayRate || ''),
      effectiveDate: rate.effectiveDate ? rate.effectiveDate.split('T')[0] : '',
      isActive: rate.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.technicianGrade || !form.skillLevel) { toast.error('Technician Grade and Skill Level are required'); return; }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        hourlyCost: parseFloat(form.hourlyCost) || 0,
        hourlyCharge: parseFloat(form.hourlyCharge) || 0,
        overtimeRate: parseFloat(form.overtimeRate) || 0,
        weekendRate: parseFloat(form.weekendRate) || 0,
        holidayRate: parseFloat(form.holidayRate) || 0,
      };
      const url = editing ? `/api/labour-rates/${editing.id}` : '/api/labour-rates';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Labour rate updated' : 'Labour rate created');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error(editing ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/labour-rates/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Labour rate deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const items = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Labour Rates</h2>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Rate
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Labour Code</TableHead>
                  <TableHead>Technician Grade</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead className="text-right">Hourly Cost</TableHead>
                  <TableHead className="text-right">Hourly Charge</TableHead>
                  <TableHead className="text-right">Overtime Rate</TableHead>
                  <TableHead className="text-right">Weekend Rate</TableHead>
                  <TableHead className="text-right">Holiday Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No labour rates found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-mono text-xs">{rate.labourCode || '—'}</TableCell>
                      <TableCell className="font-medium">{rate.technicianGrade || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{rate.skillLevel || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtBND(rate.hourlyCost || 0)}</TableCell>
                      <TableCell className="text-right">{fmtBND(rate.hourlyCharge || 0)}</TableCell>
                      <TableCell className="text-right">{fmtBND(rate.overtimeRate || 0)}</TableCell>
                      <TableCell className="text-right">{fmtBND(rate.weekendRate || 0)}</TableCell>
                      <TableCell className="text-right">{fmtBND(rate.holidayRate || 0)}</TableCell>
                      <TableCell className="text-sm">{rate.effectiveDate ? new Date(rate.effectiveDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          rate.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {rate.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rate)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(rate)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Labour Rate' : 'Add Labour Rate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Labour Code</Label>
                <Input className="mt-1" value={form.labourCode} onChange={(e) => setForm({ ...form, labourCode: e.target.value })} />
              </div>
              <div>
                <Label>Technician Grade *</Label>
                <Input className="mt-1" value={form.technicianGrade} onChange={(e) => setForm({ ...form, technicianGrade: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Skill Level *</Label>
              <Select value={form.skillLevel} onValueChange={(v) => setForm({ ...form, skillLevel: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="specialist">Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hourly Cost</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.hourlyCost} onChange={(e) => setForm({ ...form, hourlyCost: e.target.value })} />
              </div>
              <div>
                <Label>Hourly Charge</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.hourlyCharge} onChange={(e) => setForm({ ...form, hourlyCharge: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Overtime Rate</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: e.target.value })} />
              </div>
              <div>
                <Label>Weekend Rate</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.weekendRate} onChange={(e) => setForm({ ...form, weekendRate: e.target.value })} />
              </div>
              <div>
                <Label>Holiday Rate</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.holidayRate} onChange={(e) => setForm({ ...form, holidayRate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective Date</Label>
                <Input type="date" className="mt-1" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={(v) => setForm({ ...form, isActive: v === 'active' })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'} Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Labour Rate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this labour rate ({deleteTarget?.technicianGrade})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}