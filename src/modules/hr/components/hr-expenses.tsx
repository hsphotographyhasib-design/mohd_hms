'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Loader2, Search, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const categories = ['fuel', 'travel', 'meals', 'accommodation', 'office_supplies', 'other'];
const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', MANAGER_APPROVED: 'bg-sky-100 text-sky-800',
  HR_APPROVED: 'bg-teal-100 text-teal-800', REJECTED: 'bg-rose-100 text-rose-800',
  PAID: 'bg-emerald-100 text-emerald-800',
};

export function HrExpenses() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', category: 'travel', amount: '', description: '', expenseDate: '', receiptUrl: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/expenses', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load expenses'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.amount || !form.expenseDate) { toast.error('Employee, amount, and date are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) throw new Error();
      toast.success('Expense claim submitted');
      setDialogOpen(false);
      setForm({ employeeName: '', category: 'travel', amount: '', description: '', expenseDate: '', receiptUrl: '' });
      fetchData();
    } catch { toast.error('Failed to submit expense'); } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/hr/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      toast.success(`Expense ${status === 'REJECTED' ? 'rejected' : status === 'PAID' ? 'marked paid' : 'approved'}`);
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const filtered = data.filter((e: any) => !search || (e.employeeName || e.description || e.category || '').toLowerCase().includes(search.toLowerCase()));
  const totalAmount = data.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><Receipt className="h-5 w-5 text-orange-600" /></div>
          <div><h1 className="text-2xl font-bold">Expense Claims</h1><p className="text-sm text-muted-foreground">Total: ${totalAmount.toFixed(2)}</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Expense</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead>
          <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
            : filtered.map((e: any) => (
              <TableRow key={e.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{e.employeeName || '—'}</TableCell>
                <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                <TableCell className="font-semibold">${e.amount?.toFixed(2)}</TableCell>
                <TableCell className="text-sm">{e.expenseDate?.slice(0, 10)}</TableCell>
                <TableCell><Badge className={statusColors[e.status] || ''}>{e.status}</Badge></TableCell>
                <TableCell>{e.receiptUrl ? <Badge variant="outline">Attached</Badge> : '—'}</TableCell>
                <TableCell>
                  {e.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(e.id, 'MANAGER_APPROVED')}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => updateStatus(e.id, 'REJECTED')}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                  {e.status === 'MANAGER_APPROVED' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-teal-600" onClick={() => updateStatus(e.id, 'HR_APPROVED')}><Check className="h-3.5 w-3.5 mr-1" />HR</Button>
                    </div>
                  )}
                  {e.status === 'HR_APPROVED' && (
                    <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(e.id, 'PAID')}><Check className="h-3.5 w-3.5 mr-1" />Pay</Button>
                  )}
                </TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select></div>
              <div><Label>Amount ($) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <div><Label>Expense Date *</Label><Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Receipt URL</Label><Input value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}