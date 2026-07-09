'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Users, Pencil, Trash2, Loader2, UserCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  headName: string | null;
  employeeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const DEPT_COLORS = [
  'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300',
  'border-teal-200 bg-teal-50/50 hover:border-teal-300',
  'border-amber-200 bg-amber-50/50 hover:border-amber-300',
  'border-rose-200 bg-rose-50/50 hover:border-rose-300',
  'border-sky-200 bg-sky-50/50 hover:border-sky-300',
  'border-violet-200 bg-violet-50/50 hover:border-violet-300',
  'border-fuchsia-200 bg-fuchsia-50/50 hover:border-fuchsia-300',
  'border-stone-200 bg-stone-50/50 hover:border-stone-300',
];

const DEPT_ICON_COLORS = [
  'text-emerald-600 bg-emerald-100',
  'text-teal-600 bg-teal-100',
  'text-amber-600 bg-amber-100',
  'text-rose-600 bg-rose-100',
  'text-sky-600 bg-sky-100',
  'text-violet-600 bg-violet-100',
  'text-fuchsia-600 bg-fuchsia-100',
  'text-stone-600 bg-stone-100',
];

// ============ MAIN COMPONENT ============

export function HrDepartments() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', headId: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/departments', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setDepartments(json.data || []);
      setUsers(json.users || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', headId: '' });
    setDialogOpen(true);
  };

  const openEdit = (dept: DepartmentData) => {
    setEditId(dept.id);
    setForm({
      name: dept.name,
      description: dept.description || '',
      headId: dept.headId || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Department updated' : 'Department created');
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(editId ? 'Failed to update department' : 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await fetch(`/api/hr/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Department deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete department');
    }
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d.employeeCount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Departments</h1>
            <p className="text-sm text-muted-foreground">
              {departments.length} departments &middot; {totalEmployees} total employees
            </p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Department
        </Button>
      </div>

      {/* Department Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No departments yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first department to organize your team.
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Create Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map((dept, idx) => {
            const colorIdx = idx % DEPT_COLORS.length;
            return (
              <Card
                key={dept.id}
                className={`border transition-all duration-200 ${DEPT_COLORS[colorIdx]}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${DEPT_ICON_COLORS[colorIdx]}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(dept)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base">{dept.name}</h3>
                    {dept.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{dept.employeeCount} employees</span>
                    </div>
                    {dept.headName && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground max-w-[100px] truncate">
                          {dept.headName}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Department Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Engineering"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the department..."
                rows={3}
              />
            </div>
            <div>
              <Label>Department Head</Label>
              <Select value={form.headId} onValueChange={(v) => setForm((p) => ({ ...p, headId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department head" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}