'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Switch } from '@/shared/ui/switch';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const emptyLeaveType = { name: '', code: '', daysAllowed: '', isPaid: true, carryForward: false, maxCarryDays: '', requiresDoc: false };

export function HrSettings() {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [section, setSection] = useState('');
  const [form, setForm] = useState<any>(emptyLeaveType);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/settings', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setLeaveTypes(json.leaveTypes || []);
      setShifts(json.shifts || []);
      setHolidays(json.holidays || []);
    } catch { toast.error('Failed to load settings'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const isEdit = !!editId;
      const url = isEdit ? `/api/hr/settings/${editId}` : '/api/hr/settings';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, section }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${section} ${isEdit ? 'updated' : 'created'}`);
      setDialogOpen(false);
      setForm(emptyLeaveType);
      setEditId(null);
      fetchData();
    } catch { toast.error('Failed to save'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch(`/api/hr/settings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const openDialog = (sec: string, item?: any) => {
    setSection(sec);
    if (item) {
      setEditId(item.id);
      setForm({ name: item.name || '', code: item.code || '', daysAllowed: String(item.daysAllowed || ''), isPaid: item.isPaid ?? true, carryForward: item.carryForward ?? false, maxCarryDays: String(item.maxCarryDays || ''), requiresDoc: item.requiresDoc ?? false, startTime: item.startTime || '', endTime: item.endTime || '', breakMinutes: String(item.breakMinutes || '60'), date: item.date?.slice(0, 10) || '', type: item.type || 'public', recurring: item.recurring ?? false });
    } else {
      setEditId(null);
      if (sec === 'leave_types') setForm(emptyLeaveType);
      else if (sec === 'shifts') setForm({ name: '', startTime: '08:00', endTime: '17:00', breakMinutes: '60' });
      else if (sec === 'holidays') setForm({ name: '', date: '', type: 'public', recurring: false });
      else if (sec === 'approval') setForm({ module: 'leave', levels: 'manager,hr' });
    }
    setDialogOpen(true);
  };

  const approvalWorkflows = [
    { module: 'Leave Request', levels: ['Supervisor', 'HR Officer'] },
    { module: 'Travel Request', levels: ['Manager', 'HR Manager'] },
    { module: 'Expense Claim', levels: ['Manager', 'HR', 'Finance'] },
    { module: 'Overtime', levels: ['Supervisor', 'HR'] },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Settings className="h-5 w-5 text-slate-600" /></div>
        <div><h1 className="text-2xl font-bold">HR Settings</h1><p className="text-sm text-muted-foreground">Configure leave types, shifts, holidays, and workflows</p></div>
      </div>

      <Tabs defaultValue="leave_types">
        <TabsList><TabsTrigger value="leave_types">Leave Types</TabsTrigger><TabsTrigger value="shifts">Shifts</TabsTrigger><TabsTrigger value="holidays">Holidays</TabsTrigger><TabsTrigger value="approval">Approvals</TabsTrigger></TabsList>

        <TabsContent value="leave_types"><Card><CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Leave Types</CardTitle>
          <Button size="sm" onClick={() => openDialog('leave_types')}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
        </CardHeader><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Days</TableHead><TableHead>Paid</TableHead><TableHead>Carry Fwd</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            : leaveTypes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave types</TableCell></TableRow>
            : leaveTypes.map((lt: any) => (
              <TableRow key={lt.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{lt.name}</TableCell><TableCell><Badge variant="outline">{lt.code}</Badge></TableCell>
                <TableCell>{lt.daysAllowed}</TableCell><TableCell>{lt.isPaid ? <Badge className="bg-emerald-100 text-emerald-800">Yes</Badge> : 'No'}</TableCell>
                <TableCell>{lt.carryForward ? <Badge className="bg-sky-100 text-sky-800">Yes ({lt.maxCarryDays || '∞'})</Badge> : 'No'}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('leave_types', lt)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(lt.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>

        <TabsContent value="shifts"><Card><CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Shift Templates</CardTitle>
          <Button size="sm" onClick={() => openDialog('shifts')}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
        </CardHeader><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Break</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            : shifts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No shifts configured</TableCell></TableRow>
            : shifts.map((s: any) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.startTime}</TableCell><TableCell>{s.endTime}</TableCell><TableCell>{s.breakMinutes} min</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('shifts', s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>

        <TabsContent value="holidays"><Card><CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Company Holidays</CardTitle>
          <Button size="sm" onClick={() => openDialog('holidays')}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
        </CardHeader><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Recurring</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            : holidays.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No holidays</TableCell></TableRow>
            : holidays.map((h: any) => (
              <TableRow key={h.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{h.name}</TableCell><TableCell>{h.date?.slice(0, 10)}</TableCell>
                <TableCell><Badge variant="outline">{h.type}</Badge></TableCell><TableCell>{h.recurring ? 'Yes' : 'No'}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('holidays', h)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>

        <TabsContent value="approval"><Card><CardHeader><CardTitle className="text-base">Approval Workflows</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {approvalWorkflows.map((w) => (
              <div key={w.module} className="flex items-center justify-between border rounded-lg p-4">
                <div><p className="font-medium">{w.module}</p>
                  <div className="flex gap-2 mt-1">{w.levels.map((l, i) => (<span key={i} className="text-sm text-muted-foreground">{i > 0 && '→ '}{l}</span>))}</div>
                </div>
                <Switch checked disabled />
              </div>
            ))}
          </CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} {section === 'leave_types' ? 'Leave Type' : section === 'shifts' ? 'Shift' : section === 'holidays' ? 'Holiday' : 'Setting'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {section === 'leave_types' && (<>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Annual Leave" /></div>
                <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ANNUAL" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Days Allowed *</Label><Input type="number" value={form.daysAllowed} onChange={(e) => setForm({ ...form, daysAllowed: e.target.value })} /></div>
                <div><Label>Max Carry Days</Label><Input type="number" value={form.maxCarryDays} onChange={(e) => setForm({ ...form, maxCarryDays: e.target.value })} /></div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} /><Label>Paid</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.carryForward} onCheckedChange={(v) => setForm({ ...form, carryForward: v })} /><Label>Carry Forward</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.requiresDoc} onCheckedChange={(v) => setForm({ ...form, requiresDoc: v })} /><Label>Requires Doc</Label></div>
              </div>
            </>)}
            {section === 'shifts' && (<>
              <div><Label>Shift Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning Shift" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
                <div><Label>Break (min)</Label><Input type="number" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} /></div>
              </div>
            </>)}
            {section === 'holidays' && (<>
              <div><Label>Holiday Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New Year" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="company">Company</SelectItem><SelectItem value="optional">Optional</SelectItem></SelectContent>
                </Select></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} /><Label>Recurring yearly</Label></div>
            </>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editId ? 'Update' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}