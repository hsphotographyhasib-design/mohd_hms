'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import type { UserRole, PaginatedResponse } from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Mail,
} from 'lucide-react';

// ============ Types ============

interface UserItem {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  googleId: string | null;
  role: UserRole;
  employeeNumber?: string;
  isActive: boolean;
  isOnline: boolean;
  lastLogin?: string;
  profileCompleted: boolean;
  createdAt: string;
  department?: string;
}

// ============ Constants ============

const ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'];

const ROLE_LABELS: Record<UserRole, string> = {
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

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  supervisor: 'bg-orange-100 text-orange-800 border-orange-200',
  technician: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  finance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  customer: 'bg-gray-100 text-gray-800 border-gray-200',
  vendor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  guest: 'bg-stone-100 text-stone-800 border-stone-200',
};

const PAGE_SIZE = 10;

// ============ Helpers ============

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============ Google SVG Icon ============

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ============ Component ============

export function UserManagement() {
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Role change dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [roleChanging, setRoleChanging] = useState(false);

  // Confirm status toggle dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogUser, setStatusDialogUser] = useState<UserItem | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchUsers = useCallback(async (searchVal: string, roleVal: string, pageNum: number) => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(PAGE_SIZE) });
      if (searchVal.trim()) params.set('search', searchVal.trim());
      if (roleVal !== 'all') params.set('role', roleVal);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to fetch users');
      }
      const data: PaginatedResponse<UserItem> = await res.json();
      setUsers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    fetchUsers(search, roleFilter, page);
  }, [fetchUsers, search, roleFilter, page]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(value, roleFilter, 1);
    }, 400);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  // Role change
  const openRoleDialog = (u: UserItem) => {
    setRoleDialogUser(u);
    setSelectedRole(u.role);
    setRoleDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!roleDialogUser || selectedRole === roleDialogUser.role) {
      setRoleDialogOpen(false);
      return;
    }
    setRoleChanging(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: roleDialogUser.id, role: selectedRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to update role');
      }
      const data = await res.json();
      toast.success(`Role updated to ${ROLE_LABELS[selectedRole]} for ${roleDialogUser.name}`);
      setRoleDialogOpen(false);
      fetchUsers(search, roleFilter, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setRoleChanging(false);
    }
  };

  // Status toggle
  const openStatusDialog = (u: UserItem) => {
    setStatusDialogUser(u);
    setStatusDialogOpen(true);
  };

  const handleStatusToggle = async () => {
    if (!statusDialogUser) return;
    setStatusChanging(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: statusDialogUser.id, isActive: !statusDialogUser.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to update status');
      }
      toast.success(`${statusDialogUser.name} has been ${statusDialogUser.isActive ? 'disabled' : 'enabled'}`);
      setStatusDialogOpen(false);
      fetchUsers(search, roleFilter, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  // Stats
  const activeCount = users.filter((u) => u.isActive).length;
  const googleCount = users.filter((u) => u.googleId !== null).length;

  // Access control
  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <ShieldAlert className="h-12 w-12 text-red-400" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You do not have permission to access user management. This area is restricted to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage user roles and access</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-xl font-bold">{loading ? '-' : total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Users</p>
              <p className="text-xl font-bold">{loading ? '-' : activeCount}<span className="text-xs font-normal text-muted-foreground">/{users.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <GoogleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Google Sign-In</p>
              <p className="text-xl font-bold">{loading ? '-' : googleCount}<span className="text-xs font-normal text-muted-foreground">/{users.length}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sign-in</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar} alt={u.name} />
                          <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    {/* Role */}
                    <TableCell>
                      <button
                        onClick={() => openRoleDialog(u)}
                        className="group cursor-pointer"
                        title="Click to change role"
                      >
                        <Badge
                          variant="outline"
                          className={`${ROLE_COLORS[u.role]} group-hover:opacity-80 transition-opacity`}
                        >
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </button>
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.isActive
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {/* Sign-in Method */}
                    <TableCell>
                      {u.googleId ? (
                        <div className="flex items-center gap-1.5" title="Google Sign-In">
                          <GoogleIcon className="h-4 w-4" />
                          <span className="text-xs text-muted-foreground">Google</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5" title="Email/Password">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                      )}
                    </TableCell>
                    {/* Last Login */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{relativeTime(u.lastLogin)}</span>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => openStatusDialog(u)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === page ? 'default' : 'outline'}
                      size="sm"
                      className={item === page ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="py-4">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : users.length === 0 ? (
          <Card className="py-4">
            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No users found</p>
            </CardContent>
          </Card>
        ) : (
          users.map((u) => (
            <Card key={u.id} className="py-4">
              <CardContent className="space-y-3">
                {/* User Info + Status Toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Switch
                    checked={u.isActive}
                    onCheckedChange={() => openStatusDialog(u)}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>

                {/* Badges Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => openRoleDialog(u)} className="cursor-pointer">
                    <Badge variant="outline" className={ROLE_COLORS[u.role]}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </button>
                  <Badge
                    variant="outline"
                    className={
                      u.isActive
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {u.googleId ? (
                    <div className="flex items-center gap-1" title="Google Sign-In">
                      <GoogleIcon className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1" title="Email/Password">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {relativeTime(u.lastLogin)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <Card className="py-3">
            <CardContent className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for <span className="font-medium text-foreground">{roleDialogUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={roleChanging}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleRoleChange}
              disabled={roleChanging || selectedRole === roleDialogUser?.role}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {roleChanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirm Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialogUser?.isActive ? 'Disable User' : 'Enable User'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {statusDialogUser?.isActive ? 'disable' : 'enable'}{' '}
              <span className="font-medium text-foreground">{statusDialogUser?.name}</span>?
              {statusDialogUser?.isActive && (
                <span className="block mt-1 text-xs">
                  Disabled users will not be able to sign in.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={statusChanging}>Cancel</Button>
            </DialogClose>
            <Button
              variant={statusDialogUser?.isActive ? 'destructive' : 'default'}
              onClick={handleStatusToggle}
              disabled={statusChanging}
              className={!statusDialogUser?.isActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              {statusChanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {statusDialogUser?.isActive ? 'Disable' : 'Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}