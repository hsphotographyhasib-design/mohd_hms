'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Users, Plus, Search, Eye, Pencil, Trash2, Loader2,
  ChevronLeft, ChevronRight, UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number | null) => n ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';

// ============ TYPES ============

interface JobPosition {
  id: string;
  title: string;
  type: string;
  vacancies: number;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  requirements: string | null;
  status: string;
  postedDate: string;
  closingDate: string | null;
  candidateCount: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: string;
  appliedAt: string;
  interviewDate: string | null;
  offerSalary: number | null;
  notes: string | null;
  jobId: string;
  jobTitle: string;
}

// ============ BADGES ============

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-800',
    closed: 'bg-gray-100 text-gray-700',
    on_hold: 'bg-amber-100 text-amber-800',
    filled: 'bg-teal-100 text-teal-800',
  };
  return <Badge variant="outline" className={styles[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const PIPELINE_STEPS = ['applied', 'screening', 'interview', 'offer', 'hired'] as const;

function PipelineBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    applied: 'bg-gray-100 text-gray-700',
    screening: 'bg-sky-100 text-sky-800',
    interview: 'bg-amber-100 text-amber-800',
    offer: 'bg-teal-100 text-teal-800',
    hired: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
  };
  return <Badge variant="outline" className={styles[status] || ''}>{status}</Badge>;
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted-foreground text-sm">—</span>;
  const styles: Record<string, string> = {
    referral: 'bg-purple-100 text-purple-800',
    linkedin: 'bg-sky-100 text-sky-800',
    website: 'bg-emerald-100 text-emerald-800',
    walk_in: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={styles[source] || ''}>{source.replace(/_/g, ' ')}</Badge>;
}

// ============ JOB FORM FIELDS ============

const JOB_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

const JOB_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'filled', label: 'Filled' },
];

const CANDIDATE_STATUS_OPTIONS = [
  ...PIPELINE_STEPS,
  'rejected',
];

const CANDIDATE_SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'walk_in', label: 'Walk-in' },
];

// ============ MAIN COMPONENT ============

export function HrRecruitment() {
  const [tab, setTab] = useState<'jobs' | 'candidates'>('jobs');

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <Button
          variant={tab === 'jobs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('jobs')}
          className={tab === 'jobs' ? 'bg-white shadow-sm' : ''}
        >
          <Briefcase className="h-4 w-4 mr-2" /> Job Positions
        </Button>
        <Button
          variant={tab === 'candidates' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('candidates')}
          className={tab === 'candidates' ? 'bg-white shadow-sm' : ''}
        >
          <Users className="h-4 w-4 mr-2" /> Candidates
        </Button>
      </div>

      {tab === 'jobs' ? <JobsTab /> : <CandidatesTab />}
    </div>
  );
}

// ============ JOBS TAB ============

function JobsTab() {
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Job form dialog
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'full_time', vacancies: 1, location: '',
    salaryMin: '', salaryMax: '', description: '', requirements: '',
    closingDate: '', status: 'open',
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/hr/recruitment/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setJobs(json.data || []);
      setTotal(json.total || 0);
    } catch {
      toast.error('Failed to load job positions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const openCreate = () => {
    setEditingJob(null);
    setForm({ title: '', type: 'full_time', vacancies: 1, location: '', salaryMin: '', salaryMax: '', description: '', requirements: '', closingDate: '', status: 'open' });
    setJobDialogOpen(true);
  };

  const openEdit = (job: JobPosition) => {
    setEditingJob(job);
    setForm({
      title: job.title,
      type: job.type,
      vacancies: job.vacancies,
      location: job.location || '',
      salaryMin: job.salaryMin ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax ? String(job.salaryMax) : '',
      description: job.description || '',
      requirements: job.requirements || '',
      closingDate: job.closingDate ? job.closingDate.split('T')[0] : '',
      status: job.status,
    });
    setJobDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Job title is required'); return; }
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        type: form.type,
        vacancies: Number(form.vacancies),
        location: form.location || null,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        description: form.description || null,
        requirements: form.requirements || null,
        closingDate: form.closingDate || null,
      };

      if (editingJob) {
        const res = await fetch(`/api/hr/recruitment/jobs/${editingJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ ...body, status: form.status }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success('Job updated');
      } else {
        const res = await fetch('/api/hr/recruitment/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success('Job created');
      }
      setJobDialogOpen(false);
      fetchJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job position?')) return;
    try {
      const res = await fetch(`/api/hr/recruitment/jobs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Job deleted');
      fetchJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {JOB_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 w-full sm:w-56"
            />
          </div>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Post Job
        </Button>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No job positions found. Click "Post Job" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.type.replace(/_/g, ' ')} · {job.vacancies} vacancy{job.vacancies !== 1 ? 'ies' : ''}</p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>

                {job.salaryMin && (
                  <p className="text-sm font-medium text-emerald-700">
                    {fmt(job.salaryMin)}{job.salaryMax ? ` – ${fmt(job.salaryMax)}` : ''}
                  </p>
                )}

                {job.location && (
                  <p className="text-sm text-muted-foreground">📍 {job.location}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Posted {new Date(job.postedDate).toLocaleDateString()}</span>
                  {job.closingDate && <span>Closes {new Date(job.closingDate).toLocaleDateString()}</span>}
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" /> {job.candidateCount} applicant{job.candidateCount !== 1 ? 's' : ''}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(job)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} job(s) total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Job Form Dialog */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit Job' : 'Post New Job'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Maintenance Technician" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vacancies</Label>
                <Input type="number" min={1} value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Salary Min</Label>
                <Input type="number" min={0} step={100} value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="e.g. 3000" />
              </div>
              <div className="space-y-2">
                <Label>Salary Max</Label>
                <Input type="number" min={0} step={100} value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} placeholder="e.g. 5000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dubai" />
              </div>
              <div className="space-y-2">
                <Label>Closing Date</Label>
                <Input type="date" value={form.closingDate} onChange={(e) => setForm({ ...form, closingDate: e.target.value })} />
              </div>
            </div>
            {editingJob && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Job description..." />
            </div>
            <div className="space-y-2">
              <Label>Requirements (one per line)</Label>
              <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={4} placeholder="5+ years experience&#10;Relevant degree&#10;Technical certifications" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingJob ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ CANDIDATES TAB ============

function CandidatesTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Create candidate dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ jobId: '', name: '', email: '', phone: '', source: '', notes: '' });

  // Detail dialog
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchJobsList = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/recruitment/jobs?pageSize=200', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setJobs((json.data || []).map((j: JobPosition) => ({ id: j.id, title: j.title })));
    } catch { /* ignore */ }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      if (jobFilter) params.set('jobId', jobFilter);
      const res = await fetch(`/api/hr/recruitment/candidates?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setCandidates(json.data || []);
      setTotal(json.total || 0);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, jobFilter]);

  useEffect(() => { fetchCandidates(); fetchJobsList(); }, [fetchCandidates, fetchJobsList]);

  const handleCreate = async () => {
    if (!form.jobId || !form.name || !form.email) {
      toast.error('Job, name, and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/recruitment/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          jobId: form.jobId,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          source: form.source || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Candidate added');
      setCreateOpen(false);
      setForm({ jobId: '', name: '', email: '', phone: '', source: '', notes: '' });
      fetchCandidates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hr/recruitment/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Candidate status updated');
      fetchCandidates();
      if (detailCandidate?.id === id) setDetailOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/recruitment/candidates/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDetailCandidate(json.data);
      setDetailOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load candidate');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {CANDIDATE_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jobFilter} onValueChange={(v) => { setJobFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Add Candidate
        </Button>
      </div>

      {/* Pipeline visual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {PIPELINE_STEPS.map((step, idx) => {
              const count = candidates.filter((c) => c.status === step).length;
              return (
                <div key={step} className="flex items-center gap-1 min-w-0">
                  {idx > 0 && <div className="w-6 h-px bg-muted-foreground/20 flex-shrink-0" />}
                  <div className="flex flex-col items-center gap-1 min-w-0 px-3 py-1">
                    <span className="text-lg font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap capitalize">{step}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-1 min-w-0">
              <div className="w-6 h-px bg-muted-foreground/20 flex-shrink-0" />
              <div className="flex flex-col items-center gap-1 min-w-0 px-3 py-1">
                <span className="text-lg font-bold text-rose-600">{candidates.filter((c) => c.status === 'rejected').length}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rejected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No candidates found
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.jobTitle}</TableCell>
                      <TableCell><SourceBadge source={c.source} /></TableCell>
                      <TableCell className="text-sm">{new Date(c.appliedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PipelineBadge status={c.status} />
                          {/* Quick advance */}
                          {c.status !== 'hired' && c.status !== 'rejected' && (
                            <Select>
                              <SelectTrigger className="h-7 w-7 p-0 border-0" />
                              <SelectContent>
                                {CANDIDATE_STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => (
                                  <SelectItem key={s} value={s} onClick={() => handleStatusChange(c.id, s)}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(c.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Candidate Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Position *</Label>
              <Select value={form.jobId} onValueChange={(v) => setForm({ ...form, jobId: v })}>
                <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Candidate Detail</DialogTitle>
          </DialogHeader>
          {detailCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{detailCandidate.name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{detailCandidate.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{detailCandidate.phone || '—'}</span></div>
                <div><span className="text-muted-foreground">Source:</span> <SourceBadge source={detailCandidate.source} /></div>
                <div><span className="text-muted-foreground">Job:</span> <span className="font-medium">{(detailCandidate as Candidate & { job?: { title: string } }).job?.title || detailCandidate.jobTitle}</span></div>
                <div><span className="text-muted-foreground">Applied:</span> <span className="font-medium">{new Date(detailCandidate.appliedAt).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <PipelineBadge status={detailCandidate.status} /></div>
                {detailCandidate.interviewDate && (
                  <div><span className="text-muted-foreground">Interview:</span> <span className="font-medium">{new Date(detailCandidate.interviewDate).toLocaleDateString()}</span></div>
                )}
                {detailCandidate.offerSalary && (
                  <div><span className="text-muted-foreground">Offer:</span> <span className="font-medium">{fmt(detailCandidate.offerSalary)}</span></div>
                )}
              </div>
              {detailCandidate.notes && (
                <div className="text-sm border rounded-lg p-3 bg-muted/30">
                  <p className="text-muted-foreground mb-1 font-medium">Notes</p>
                  <p>{detailCandidate.notes}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {detailCandidate.status !== 'hired' && detailCandidate.status !== 'rejected' && (
                  CANDIDATE_STATUS_OPTIONS.filter((s) => s !== detailCandidate.status).map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(detailCandidate.id, s)}>
                      Move to {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}