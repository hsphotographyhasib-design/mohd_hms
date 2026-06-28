'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Filter, MoreHorizontal, Shield, UserCog, Lock, Unlock,
  Trash2, History, LogOut, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, Eye, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuthStore, hasMinRole } from '@/store';
import type { UserRole } from '@/types';

// ============ TYPES ============

interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  profileCompleted: boolean;
  avatar: string | null;
  employeeNumber: string | null;
  department: { id: string; name: string } | null;
}

interface LoginSession {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActivity: string;
  isRevoked: boolean;
  createdAt: string;
}

interface DeviceInfo {
  id: string;
  name: string | null;
  type: string | null;
  browser: string | null;
  os: string | null;
  lastSeen: string;
  isTrusted: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  employeeNumber: string | null;
  departmentId: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastLogin: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; domain: string | null } | null;
  department: { id: string; name: string } | null;
  loginSessions: LoginSession[];
  devices: DeviceInfo[];
  auditLogs: AuditLogEntry[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============ CONSTANTS ============

const ALL_ROLES: UserRole[] = [
  'super_admin', 'admin', 'manager', 'supervisor',
  'technician', 'finance', 'customer', 'vendor', 'guest',
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  supervisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  technician: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  finance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  customer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  vendor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  guest: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  technician: 'Technician',
  finance: 'Finance',
  customer: 'Customer',
  vendor: 'Vendor',
  guest: 'Guest',
};

const token = () => localStorage.getItem('cmms_token') || '';

// ============ HELPERS ============

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className={ROLE_BADGE_CLASSES[role] || ''}>
      {ROLE_LABELS[role] || role.replace(/_/g, ' ')}
    </Badge>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500'
      }
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      ) : (
        <XCircle className="h-3 w-3 mr-1" />
      )}
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============ LOADING SKELETONS ============

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-36" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function MobileCardSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ============ MAIN COMPONENT ============

export function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // List state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Detail modal state
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Audit log view state
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  // ============ FETCH USERS ============

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/auth/users?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load users');
      }

      const json = await res.json();
      setUsers(json.users || []);
      setPagination(json.pagination || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ============ FETCH USER DETAIL ============

  const openUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load user details');
      const json = await res.json();
      setSelectedUser(json.user);
    } catch {
      toast.error('Failed to load user details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Refresh detail after actions
  const refreshDetail = useCallback(async () => {
    if (!selectedUser?.id) return;
    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedUser(json.user);
      }
    } catch {
      // silent
    }
    fetchUsers();
  }, [selectedUser?.id, fetchUsers]);

  // ============ ACTIONS ============

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    setActionLoading('change-role');
    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change role');
      toast.success(`Role changed to ${ROLE_LABELS[newRole]}`);
      setRoleDialogOpen(false);
      setNewRole('');
      refreshDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    const newStatus = !selectedUser.isActive;
    const label = newStatus ? 'activate' : 'suspend';
    setActionLoading('toggle-active');
    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${label} user`);
      toast.success(`User ${label}d successfully`);
      refreshDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUser) return;
    setActionLoading('force-logout');
    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}/sessions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to force logout');
      toast.success(data.message || 'All sessions revoked');
      refreshDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to force logout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      toast.success('User deactivated and all sessions revoked');
      setDeleteDialogOpen(false);
      setDetailOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const openRoleChange = () => {
    if (!selectedUser) return;
    setNewRole(selectedUser.role);
    setRoleDialogOpen(true);
  };

  // ============ STATS ============

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  const stats = [
    { label: 'Total Users', value: pagination?.total ?? 0, icon: <Users className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50' },
    { label: 'Active', value: activeCount, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50' },
    { label: 'Inactive', value: inactiveCount, icon: <XCircle className="h-4 w-4 text-gray-500" />, color: 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/50' },
  ];

  // ============ FILTERED AUDIT LOGS ============

  const filteredAuditLogs = selectedUser?.auditLogs?.filter((log) =>
    auditFilter ? log.action === auditFilter : true
  ) || [];

  const uniqueAuditActions = Array.from(
    new Set(selectedUser?.auditLogs?.map((l) => l.action) || [])
  ).sort();

  // ============ RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage users, roles, and access control</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1">
          <Shield className="h-3 w-3 mr-1.5" />
          Admin Panel
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Phone</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[130px]">Registered</TableHead>
                  <TableHead className="min-w-[130px]">Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow
                      key={u.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openUserDetail(u.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            {u.employeeNumber && (
                              <p className="text-xs text-muted-foreground">{u.employeeNumber}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.phone || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.department?.name || '—'}</TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell><StatusBadge active={u.isActive} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.lastLogin)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openUserDetail(u.id); }}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className={page === pageNum ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <MobileCardSkeleton />
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No users found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          users.map((u) => (
            <Card
              key={u.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openUserDetail(u.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RoleBadge role={u.role} />
                    <StatusBadge active={u.isActive} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{u.phone || u.department?.name || '—'}</span>
                  <span>{formatDate(u.lastLogin)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Mobile Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              {pagination.page}/{pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ============ USER DETAIL DIALOG ============ */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <Separator />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : selectedUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      {selectedUser.name}
                      {selectedUser.isOnline && (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Online" />
                      )}
                    </div>
                    <p className="text-sm font-normal text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Quick info row */}
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role={selectedUser.role} />
                  <StatusBadge active={selectedUser.isActive} />
                  {selectedUser.profileCompleted && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                      Profile Complete
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Phone</p>
                    <p className="font-medium">{selectedUser.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Employee No.</p>
                    <p className="font-medium">{selectedUser.employeeNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Department</p>
                    <p className="font-medium">{selectedUser.department?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Company</p>
                    <p className="font-medium">{selectedUser.tenant?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Registered</p>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Last Login</p>
                    <p className="font-medium">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                </div>

                <Separator />

                {/* Active Sessions */}
                {selectedUser.loginSessions && selectedUser.loginSessions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-600" />
                      Active Sessions ({selectedUser.loginSessions.filter((s) => !s.isRevoked).length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Device</TableHead>
                            <TableHead className="text-xs">IP Address</TableHead>
                            <TableHead className="text-xs">Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedUser.loginSessions.slice(0, 5).map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="text-xs">
                                <div>
                                  <p>{session.deviceName || session.deviceType || 'Unknown'}</p>
                                  <p className="text-muted-foreground">{session.browser} {session.os}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono">{session.ipAddress || '—'}</TableCell>
                              <TableCell className="text-xs">{formatDate(session.lastActivity)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* Change Role - admin/super_admin only, not own account */}
                  {(isSuperAdmin || hasMinRole(currentUser?.role || 'guest', 'admin')) &&
                    selectedUser.id !== currentUser?.id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openRoleChange}
                              disabled={actionLoading !== null}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Change this user's role</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                  {/* Activate / Suspend */}
                  {selectedUser.id !== currentUser?.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleActive}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === 'toggle-active' ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : selectedUser.isActive ? (
                              <Lock className="h-4 w-4 mr-2" />
                            ) : (
                              <Unlock className="h-4 w-4 mr-2" />
                            )}
                            {selectedUser.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{selectedUser.isActive ? 'Suspend this user account' : 'Activate this user account'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Force Logout / Reset Login */}
                  {selectedUser.id !== currentUser?.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleForceLogout}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === 'force-logout' ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4 mr-2" />
                            )}
                            Force Logout
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke all sessions, force re-login</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Reset Login (same as force logout) */}
                  {selectedUser.id !== currentUser?.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleForceLogout}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === 'force-logout' ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Reset Login
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke all sessions and force re-login</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* View Audit Log */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditOpen(true)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Audit Log
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View recent audit entries for this user</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Delete - super_admin only */}
                  {isSuperAdmin && selectedUser.id !== currentUser?.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/50 dark:text-red-400"
                            onClick={() => setDeleteDialogOpen(true)}
                            disabled={actionLoading !== null}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Soft delete this user (super_admin only)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Own account indicator */}
                {selectedUser.id === currentUser?.id && (
                  <p className="text-xs text-muted-foreground italic">
                    Some actions are disabled for your own account.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ============ CHANGE ROLE DIALOG ============ */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change role for <span className="font-medium text-foreground">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={r} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSuperAdmin && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Only super_admin can change roles. You may not have permission.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleChangeRole}
              disabled={actionLoading !== null || newRole === selectedUser?.role}
            >
              {actionLoading === 'change-role' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION DIALOG ============ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              This will deactivate <span className="font-medium text-foreground">{selectedUser?.name}</span> and revoke all their active sessions. This action can be undone by an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
              <CardContent className="p-4 text-sm">
                <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedUser?.name}</span></p>
                <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedUser?.email}</span></p>
                <p><span className="text-muted-foreground">Role:</span> <span className="font-medium">{selectedUser?.role}</span></p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'delete' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ AUDIT LOG DIALOG ============ */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-600" />
              Audit Log — {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>Recent audit entries for this user</DialogDescription>
          </DialogHeader>

          {uniqueAuditActions.length > 1 && (
            <div className="flex gap-2">
              <Select value={auditFilter || 'all'} onValueChange={(v) => setAuditFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueAuditActions.map((action) => (
                    <SelectItem key={action} value={action}>{action.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Entity</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                      No audit entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.details || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}