'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import {
  Settings, Plus, Loader2, Shield, Database, Globe, Server, HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/app-shell/store';
import { canAccess } from '@/app-shell/store';
import { format } from 'date-fns';
import type { UserRole, EmployeeData } from '@/core/types';

const token = () => localStorage.getItem('cmms_token') || '';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-sky-100 text-sky-800',
    APPROVED: 'bg-teal-100 text-teal-800', RECEIVED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-rose-100 text-rose-800', active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-gray-100 text-gray-600', maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'];

const FEATURES = [
  'dashboard', 'equipment', 'complaints', 'work-orders', 'invoices',
  'pm', 'quotations', 'inventory', 'customers', 'employees',
  'purchases', 'vehicles', 'finance', 'reports', 'notifications', 'settings',
];

function RoleLabel({ role }: { role: UserRole }) {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager',
    supervisor: 'Supervisor', technician: 'Technician', finance: 'Finance', customer: 'Customer',
  };
  return <span className="text-sm font-medium">{labels[role] || role}</span>;
}

export function SettingsView() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-4">
          <GeneralTab user={user} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          <RolesTab />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-4">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab({ user }: { user: { tenantName?: string; tenantDomain?: string } | null }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orgName: user?.tenantName || '',
    domain: user?.tenantDomain || '',
    address: '',
    phone: '',
    email: '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate save - in production this would call an API
      await new Promise((r) => setTimeout(r, 500));
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Organization Name</Label>
            <Input
              className="mt-1"
              value={form.orgName}
              onChange={(e) => setForm({ ...form, orgName: e.target.value })}
              placeholder="Organization name"
            />
          </div>
          <div>
            <Label>Domain</Label>
            <Input
              className="mt-1"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder="company.com"
            />
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Textarea
            className="mt-1"
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Organization address..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input
              className="mt-1"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              className="mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@company.com"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: '' as UserRole | '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees?pageSize=50', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setUsers(json.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleInvite = async () => {
    if (!form.name || !form.email || !form.role) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(`Invitation sent to ${form.email}`);
      setDialogOpen(false);
      setForm({ name: '', email: '', role: '' });
      fetchUsers();
    } catch {
      toast.error('Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {u.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Edit
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

      {/* Invite User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                className="mt-1"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          Permissions Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px] sticky left-0 bg-background z-10">Feature</TableHead>
                {ALL_ROLES.map((role) => (
                  <TableHead key={role} className="min-w-[90px] text-center capitalize">
                    {role === 'super_admin' ? 'Super Admin' : role}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEATURES.map((feature) => (
                <TableRow key={feature}>
                  <TableCell className="font-medium capitalize sticky left-0 bg-background z-10">
                    {feature.replace(/-/g, ' ')}
                  </TableCell>
                  {ALL_ROLES.map((role) => {
                    const hasAccess = canAccess(role, feature);
                    return (
                      <TableCell key={role} className="text-center">
                        {hasAccess ? (
                          <span className="text-emerald-600 font-bold text-lg leading-none">✓</span>
                        ) : (
                          <span className="text-gray-400 font-bold text-lg leading-none">✗</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface SystemInfo {
  version: string;
  environment: string;
  database: {
    status: 'Connected' | 'Disconnected';
    type: string;
    latencyMs: number | null;
    error: string | null;
  };
  recordCounts: Record<string, number> | null;
  lastBackup: string | null;
  responseTime: number;
}

function SystemTab() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/system-info', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SystemInfo = await res.json();
      setInfo(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load system info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  const dbConnected = info?.database.status === 'Connected';
  const envLabel = info?.environment === 'production' ? 'Production' : 'Development';
  const backupLabel = info?.lastBackup
    ? format(new Date(info.lastBackup), 'MMM d, yyyy HH:mm')
    : 'N/A';

  return (
    <div className="space-y-4">
      {/* Core System Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Version */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Server className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Platform Version</p>
              {loading && !info ? (
                <Skeleton className="h-5 w-16 mt-0.5" />
              ) : (
                <p className="font-semibold">v{info?.version ?? '—'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Environment</p>
              {loading && !info ? (
                <Skeleton className="h-5 w-24 mt-0.5" />
              ) : (
                <p className="font-semibold">{info ? envLabel : '—'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dbConnected ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              <Database className={`h-5 w-5 ${dbConnected ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Database Status</p>
              {loading && !info ? (
                <Skeleton className="h-5 w-24 mt-0.5" />
              ) : info ? (
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${dbConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {info.database.status}
                  </span>
                  {info.database.latencyMs != null && dbConnected && (
                    <span className="text-xs text-muted-foreground">({info.database.latencyMs}ms)</span>
                  )}
                  {info.database.error && (
                    <span className="text-xs text-rose-500 truncate max-w-[160px]" title={info.database.error}>
                      — {info.database.error}
                    </span>
                  )}
                </div>
              ) : (
                <p className="font-semibold">—</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Backup */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Last Backup</p>
              {loading && !info ? (
                <Skeleton className="h-5 w-28 mt-0.5" />
              ) : (
                <p className="font-semibold">{info ? backupLabel : '—'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Type & Record Counts */}
      {info && !loading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Database Details
              {info.database.type && (
                <Badge variant="outline" className="text-xs font-normal">
                  {info.database.type}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">
                <span>Failed to load system information.</span>
                <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={fetchSystemInfo}>
                  Retry
                </Button>
              </div>
            ) : info.recordCounts ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Customers', value: info.recordCounts.customers },
                  { label: 'Equipment', value: info.recordCounts.equipment },
                  { label: 'Complaints', value: info.recordCounts.complaints },
                  { label: 'Work Orders', value: info.recordCounts.workOrders },
                  { label: 'Invoices', value: info.recordCounts.invoices },
                  { label: 'Employees', value: info.recordCounts.employees },
                  { label: 'PM Schedules', value: info.recordCounts.pmSchedules },
                  { label: 'Inventory Items', value: info.recordCounts.inventoryItems },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-2xl font-bold">{item.value ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : !dbConnected ? (
              <p className="text-sm text-muted-foreground">Database not connected — record counts unavailable.</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}