'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Plus, Loader2, Search, Award } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const courseStatusColors: Record<string, string> = {
  planned: 'bg-sky-100 text-sky-800', ongoing: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-gray-100 text-gray-700',
};

const recordStatusColors: Record<string, string> = {
  enrolled: 'bg-sky-100 text-sky-800', in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800', failed: 'bg-rose-100 text-rose-800', cancelled: 'bg-gray-100 text-gray-700',
};

export function HrTraining() {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', provider: '', startDate: '', endDate: '', cost: '', maxParticipants: '', status: 'planned', description: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        fetch('/api/hr/training', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/hr/training?view=records', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const cJson = await cRes.json();
      const rJson = await rRes.json();
      setCourses(cJson.data || cJson || []);
      setRecords(rJson.data || rJson || []);
    } catch { toast.error('Failed to load training data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.title || !form.startDate) { toast.error('Title and start date are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/training', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, cost: parseFloat(form.cost) || null, maxParticipants: parseInt(form.maxParticipants) || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Course created');
      setDialogOpen(false);
      setForm({ title: '', provider: '', startDate: '', endDate: '', cost: '', maxParticipants: '', status: 'planned', description: '' });
      fetchData();
    } catch { toast.error('Failed to create course'); } finally { setSubmitting(false); }
  };

  const filterItems = (items: any[]) => items.filter((r: any) => !search || (r.title || r.employeeName || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-teal-600" /></div>
          <div><h1 className="text-2xl font-bold">Training Management</h1><p className="text-sm text-muted-foreground">Courses and employee training records</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Course</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses or records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Tabs defaultValue="courses">
        <TabsList><TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger><TabsTrigger value="records">Records ({records.length})</TabsTrigger></TabsList>
        <TabsContent value="courses"><Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Provider</TableHead><TableHead>Dates</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filterItems(courses).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No courses found</TableCell></TableRow>
            : filterItems(courses).map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.provider || '—'}</TableCell>
                <TableCell className="text-sm">{c.startDate?.slice(0, 10)} — {c.endDate?.slice(0, 10)}</TableCell>
                <TableCell>{c.cost != null ? `$${c.cost.toFixed(2)}` : '—'}</TableCell>
                <TableCell><Badge className={courseStatusColors[c.status] || ''}>{c.status}</Badge></TableCell>
              </TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>
        <TabsContent value="records"><Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Course</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Certificate</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filterItems(records).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
            : filterItems(records).map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{r.employeeName || '—'}</TableCell>
                <TableCell>{r.trainingTitle || r.title || '—'}</TableCell>
                <TableCell>{r.score != null ? r.score.toFixed(1) : '—'}</TableCell>
                <TableCell><Badge className={recordStatusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                <TableCell>{r.certificateUrl ? <Badge variant="outline"><Award className="h-3 w-3 mr-1" />Yes</Badge> : '—'}</TableCell>
              </TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Training Course</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Workplace Safety" /></div>
            <div><Label>Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Training Corp" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Cost ($)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
              <div><Label>Max Participants</Label><Input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="ongoing">Ongoing</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Course</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}