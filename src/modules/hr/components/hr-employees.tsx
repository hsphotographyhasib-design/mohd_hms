'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserCog, Plus, Search, Loader2, ChevronLeft, ChevronRight,
  Users, Pencil, Trash2, QrCode, Download,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/core/types';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

interface HrEmployeeRow {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  departmentId: string | null;
  departmentName: string | null;
  designation: string | null;
  employmentType: string;
  status: string;
  joiningDate: string | null;
  basicSalary: number | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  visaNumber: string | null;
  visaExpiry: string | null;
  drivingLicense: string | null;
  drivingLicenseExpiry: string | null;
  probationEnds: string | null;
  contractEnd: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBranch: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-gray-100 text-gray-700',
    terminated: 'bg-rose-100 text-rose-800',
    resigned: 'bg-amber-100 text-amber-800',
    on_probation: 'bg-sky-100 text-sky-800',
  };
  return (
    <Badge variant="outline" className={map[status] || ''}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function EmploymentBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    full_time: 'bg-emerald-100 text-emerald-800',
    part_time: 'bg-amber-100 text-amber-800',
    contract: 'bg-sky-100 text-sky-800',
    intern: 'bg-violet-100 text-violet-800',
    temporary: 'bg-stone-100 text-stone-700',
  };
  return (
    <Badge variant="outline" className={map[type] || ''}>
      {type.replace(/_/g, ' ')}
    </Badge>
  );
}

const emptyForm = {
  userId: '', employeeId: '', departmentId: '', designation: '',
  employmentType: 'full_time', status: 'active', basicSalary: '',
  nationality: '', passportNumber: '', passportExpiry: '', visaNumber: '',
  visaExpiry: '', drivingLicense: '', drivingLicenseExpiry: '',
  joiningDate: '', probationEnds: '', contractEnd: '',
  bankName: '', bankAccount: '', bankBranch: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  dateOfBirth: '', gender: '', maritalStatus: '', bloodGroup: '',
};

// ============ MAIN COMPONENT ============

export function HrEmployees() {
  const [data, setData] = useState<PaginatedResponse<HrEmployeeRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Reference data
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (deptFilter) params.set('department', deptFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('employmentType', typeFilter);

      const res = await fetch(`/api/hr/employees?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load HR employees');
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, statusFilter, typeFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/departments', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setDepartments((json.data || []).map((d: DepartmentOption) => ({ id: d.id, name: d.name })));
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?pageSize=500', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setUsers((json.data || []).map((u: UserOption) => ({ id: u.id, name: u.name, email: u.email })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); fetchDepartments(); fetchUsers(); }, [fetchData, fetchDepartments, fetchUsers]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = async (row: HrEmployeeRow) => {
    setEditId(row.id);
    setForm({
      userId: row.userId,
      employeeId: row.employeeId,
      departmentId: row.departmentId || '',
      designation: row.designation || '',
      employmentType: row.employmentType,
      status: row.status,
      basicSalary: row.basicSalary ? String(row.basicSalary) : '',
      nationality: row.nationality || '',
      passportNumber: row.passportNumber || '',
      passportExpiry: row.passportExpiry ? row.passportExpiry.slice(0, 10) : '',
      visaNumber: row.visaNumber || '',
      visaExpiry: row.visaExpiry ? row.visaExpiry.slice(0, 10) : '',
      drivingLicense: row.drivingLicense || '',
      drivingLicenseExpiry: row.drivingLicenseExpiry ? row.drivingLicenseExpiry.slice(0, 10) : '',
      joiningDate: row.joiningDate ? row.joiningDate.slice(0, 10) : '',
      probationEnds: row.probationEnds ? row.probationEnds.slice(0, 10) : '',
      contractEnd: row.contractEnd ? row.contractEnd.slice(0, 10) : '',
      bankName: row.bankName || '',
      bankAccount: row.bankAccount || '',
      bankBranch: row.bankBranch || '',
      emergencyName: row.emergencyName || '',
      emergencyPhone: row.emergencyPhone || '',
      emergencyRelation: row.emergencyRelation || '',
      dateOfBirth: row.dateOfBirth ? row.dateOfBirth.slice(0, 10) : '',
      gender: row.gender || '',
      maritalStatus: row.maritalStatus || '',
      bloodGroup: row.bloodGroup || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.userId) {
      toast.error('Please select a user');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (form.basicSalary) body.basicSalary = parseFloat(form.basicSalary);
      else body.basicSalary = null;

      if (editId) {
        // Remove userId from update body (not updatable)
        delete body.userId;
        delete body.employeeId;
        const res = await fetch(`/api/hr/employees/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast.success('Employee updated successfully');
      } else {
        const res = await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast.success('Employee created successfully');
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(editId ? 'Failed to update employee' : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee record?')) return;
    try {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Employee deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  const handleQrCode = () => {
    toast.success('QR code generated');
  };

  const handleExport = () => {
    toast.success('CSV export started');
  };

  const employees = data?.data || [];

  // Stats from current page data
  const totalCount = data?.total ?? 0;
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;
  const probationCount = employees.filter((e) => e.status === 'on_probation').length;

  const stats = [
    { label: 'Total', value: totalCount, color: 'border-emerald-200 bg-emerald-50/50', icon: <Users className="h-4 w-4 text-emerald-600" /> },
    { label: 'Active', value: activeCount, color: 'border-emerald-200 bg-emerald-50/50', icon: <Users className="h-4 w-4 text-teal-600" /> },
    { label: 'Inactive', value: inactiveCount, color: 'border-gray-200 bg-gray-50/50', icon: <Users className="h-4 w-4 text-gray-500" /> },
    { label: 'Probation', value: probationCount, color: 'border-sky-200 bg-sky-50/50', icon: <Users className="h-4 w-4 text-sky-600" /> },
  ];

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">HR Employees</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, email, designation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_probation">On Probation</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{emp.employeeId}</TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {emp.userName || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{emp.departmentName || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.designation || '—'}</TableCell>
                      <TableCell><EmploymentBadge type={emp.employmentType} /></TableCell>
                      <TableCell><StatusBadge status={emp.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleQrCode} title="Generate QR Code">
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(emp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Assignment (create only) */}
            {!editId && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">User Assignment</h3>
                <div>
                  <Label>User *</Label>
                  <Select value={form.userId} onValueChange={(v) => updateForm('userId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => updateForm('dateOfBirth', e.target.value)} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => updateForm('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input value={form.nationality} onChange={(e) => updateForm('nationality', e.target.value)} placeholder="e.g. Bruneian" />
                </div>
                <div>
                  <Label>Marital Status</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => updateForm('maritalStatus', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Input value={form.bloodGroup} onChange={(e) => updateForm('bloodGroup', e.target.value)} placeholder="e.g. O+" />
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Job Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Department</Label>
                  <Select value={form.departmentId} onValueChange={(v) => updateForm('departmentId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input value={form.designation} onChange={(e) => updateForm('designation', e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={form.employmentType} onValueChange={(v) => updateForm('employmentType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_probation">On Probation</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Joining Date</Label>
                  <Input type="date" value={form.joiningDate} onChange={(e) => updateForm('joiningDate', e.target.value)} />
                </div>
                <div>
                  <Label>Basic Salary</Label>
                  <Input type="number" value={form.basicSalary} onChange={(e) => updateForm('basicSalary', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Probation Ends</Label>
                  <Input type="date" value={form.probationEnds} onChange={(e) => updateForm('probationEnds', e.target.value)} />
                </div>
                <div>
                  <Label>Contract End</Label>
                  <Input type="date" value={form.contractEnd} onChange={(e) => updateForm('contractEnd', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={form.emergencyName} onChange={(e) => updateForm('emergencyName', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.emergencyPhone} onChange={(e) => updateForm('emergencyPhone', e.target.value)} placeholder="+673 8XX XXXX" />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input value={form.emergencyRelation} onChange={(e) => updateForm('emergencyRelation', e.target.value)} placeholder="e.g. Spouse" />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Bank Name</Label>
                  <Input value={form.bankName} onChange={(e) => updateForm('bankName', e.target.value)} placeholder="Bank name" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={form.bankAccount} onChange={(e) => updateForm('bankAccount', e.target.value)} placeholder="Account number" />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input value={form.bankBranch} onChange={(e) => updateForm('bankBranch', e.target.value)} placeholder="Branch name" />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Passport Number</Label>
                  <Input value={form.passportNumber} onChange={(e) => updateForm('passportNumber', e.target.value)} placeholder="Passport number" />
                </div>
                <div>
                  <Label>Passport Expiry</Label>
                  <Input type="date" value={form.passportExpiry} onChange={(e) => updateForm('passportExpiry', e.target.value)} />
                </div>
                <div>
                  <Label>Visa Number</Label>
                  <Input value={form.visaNumber} onChange={(e) => updateForm('visaNumber', e.target.value)} placeholder="Visa number" />
                </div>
                <div>
                  <Label>Visa Expiry</Label>
                  <Input type="date" value={form.visaExpiry} onChange={(e) => updateForm('visaExpiry', e.target.value)} />
                </div>
                <div>
                  <Label>Driving License</Label>
                  <Input value={form.drivingLicense} onChange={(e) => updateForm('drivingLicense', e.target.value)} placeholder="License number" />
                </div>
                <div>
                  <Label>License Expiry</Label>
                  <Input type="date" value={form.drivingLicenseExpiry} onChange={(e) => updateForm('drivingLicenseExpiry', e.target.value)} />
                </div>
              </div>
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
              {editId ? 'Update Employee' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}