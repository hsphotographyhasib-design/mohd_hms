'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserCog, Search, ChevronDown, ArrowRight, Loader2, CheckCircle2,
  AlertTriangle, X, Info,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Separator } from '@/shared/ui/separator';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { toast } from 'sonner';
import { useAuthStore } from '@/app-shell/store';
import { ROLE_TRANSITION_MATRIX } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/types';

// ── Role Definitions ─────────────────────────────────────────────────

interface RoleDefinition {
  key: UserRole;
  label: string;
  description: string;
  icon: string;
  tier: 'executive' | 'management' | 'operations' | 'support' | 'external';
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform control. Can manage all users, settings, and system configuration.',
    icon: '👑',
    tier: 'executive',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full tenant management. Can manage users, roles, and all business operations.',
    icon: '🛡',
    tier: 'executive',
  },
  {
    key: 'manager',
    label: 'Manager',
    description: 'Department-level oversight. Can manage teams, reports, and resources.',
    icon: '📋',
    tier: 'management',
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    description: 'Can assign technicians, manage work orders, and approve completions.',
    icon: '👷',
    tier: 'operations',
  },
  {
    key: 'technician',
    label: 'Technician',
    description: 'Executes assigned work orders, inspections, and equipment maintenance.',
    icon: '🔧',
    tier: 'operations',
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Manages invoices, payments, quotations, and financial reporting.',
    icon: '💰',
    tier: 'support',
  },
  {
    key: 'hr',
    label: 'HR',
    description: 'Manages employees, attendance, payroll, recruitment, and HR operations.',
    icon: '👥',
    tier: 'support',
  },
  {
    key: 'user',
    label: 'User',
    description: 'Standard internal user with basic operational access.',
    icon: '👤',
    tier: 'operations',
  },
  {
    key: 'customer',
    label: 'Customer',
    description: 'Can submit complaints, view own records, and track service progress.',
    icon: '🏠',
    tier: 'external',
  },
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  supervisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  technician: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  finance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hr: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  user: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  customer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  vendor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  guest: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500',
};

// ── Types ───────────────────────────────────────────────────────────

export interface ChangeRoleModalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  authProvider: string | null;
  employeeNumber: string | null;
  department?: { id: string; name: string } | null;
  tenant?: { id: string; name: string; domain: string | null } | null;
}

interface ChangeRoleModalProps {
  user: ChangeRoleModalUser;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAuthProviderLabel(provider: string | null): string {
  if (!provider) return 'Email';
  const map: Record<string, string> = { email: 'Email', google: 'Google', whatsapp: 'WhatsApp' };
  return map[provider] || provider;
}

// ── Component ───────────────────────────────────────────────────────

export function ChangeRoleModal({ user, open, onClose, onSuccess }: ChangeRoleModalProps) {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const callerRole = currentUser?.role || 'guest';

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute available roles for the caller
  const availableRoles = useMemo(() => {
    const allowed = ROLE_TRANSITION_MATRIX[callerRole];
    if (!allowed) return [];
    return ROLE_DEFINITIONS.filter((r) => allowed.has(r.key));
  }, [callerRole]);

  // Filtered roles by search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return availableRoles;
    const q = searchQuery.toLowerCase();
    return availableRoles.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q)
    );
  }, [availableRoles, searchQuery]);

  const selectedRoleDef = ROLE_DEFINITIONS.find((r) => r.key === selectedRole);
  const isSameRole = selectedRole === user.role;
  const isGoogleCustomerUpgrade = user.authProvider === 'google' && user.role === 'customer';

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setSelectedRole('');
      setSearchQuery('');
      setConfirming(false);
      setError(null);
      setShowDropdown(false);
      // Auto-focus search after modal renders
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // ── Submit ─────────────────────────────────────────────────────

  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleSubmit = async () => {
    if (!selectedRole || isSameRole || submitting) return;
    setSubmitting(true);
    setError(null);
    setDebugInfo('');

    const endpoint = `/api/admin/users/${user.id}/role`;

    try {
      const token = localStorage.getItem('cmms_token') || '';
      if (!token) {
        throw { status: 0, message: 'No authentication token found. Please log in again.', body: null };
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      // Parse response — handle non-JSON responses gracefully
      let data: Record<string, unknown> | null = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw { status: res.status, message: `Server returned non-JSON response (HTTP ${res.status})`, body: text.slice(0, 500) };
      }

      if (!res.ok) {
        const serverError = (data?.error as string) || (data?.detail as string) || data?.message as string || null;
        const errorMsg = serverError || `Server error (HTTP ${res.status})`;
        const debugParts = [
          `Status: ${res.status} ${res.statusText}`,
          `Endpoint: PATCH ${endpoint}`,
          serverError ? `Error: ${serverError}` : null,
          data?.detail ? `Detail: ${data.detail as string}` : null,
        ].filter(Boolean).join('\n');
        throw { status: res.status, message: errorMsg, body: data, debug: debugParts };
      }

      const fromLabel = ROLE_DEFINITIONS.find((r) => r.key === data?.previousRole)?.label || String(data?.previousRole || '');
      const toLabel = ROLE_DEFINITIONS.find((r) => r.key === data?.newRole)?.label || String(data?.newRole || '');

      toast.success(`Role changed: ${fromLabel} → ${toLabel}`);
      setConfirming(false);
      onSuccess();
      onClose();
    } catch (err) {
      let msg: string;
      let debug: string = '';

      if (err && typeof err === 'object' && 'message' in err) {
        const e = err as { message: string; status?: number; debug?: string; body?: unknown };
        msg = e.message;
        debug = e.debug || `Status: ${e.status ?? 'unknown'} | Endpoint: ${endpoint}`;
      } else if (err instanceof Error) {
        msg = err.message;
        debug = `Endpoint: ${endpoint} | ${err.stack?.slice(0, 200) || 'No stack trace'}`;
      } else {
        msg = 'Unable to update user role. Please try again.';
        debug = `Endpoint: ${endpoint} | Unknown error: ${String(err)}`;
      }

      setError(msg);
      setDebugInfo(debug);
      setConfirming(false);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setConfirming(false); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ── Header ── */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGoogleCustomerUpgrade ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {isGoogleCustomerUpgrade
                ? <ArrowRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                : <UserCog className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <div>
              {isGoogleCustomerUpgrade ? 'Upgrade User Role' : 'Change User Role'}
            </div>
          </DialogTitle>
          <DialogDescription>
            {isGoogleCustomerUpgrade
              ? 'Upgrade this Google sign-up user from the default Customer role.'
              : 'Select a new role for this user. This will immediately update their permissions.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── User Info Card ── */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                {getInitials(user.name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className={ROLE_BADGE_CLASSES[user.role] || ''}>
              {(ROLE_DEFINITIONS.find((r) => r.key === user.role)?.label) || user.role.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
              {getAuthProviderLabel(user.authProvider)}
            </Badge>
            {user.department?.name && (
              <Badge variant="outline">{user.department.name}</Badge>
            )}
          </div>
        </div>

        {/* ── Role Selector (Dropdown) ── */}
        {!confirming && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Role</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={submitting}
              >
                {selectedRoleDef ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base">{selectedRoleDef.icon}</span>
                    <span className="font-medium">{selectedRoleDef.label}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Search and select a role...</span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown panel */}
              {showDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search roles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <ScrollArea className="max-h-[240px]">
                    <div className="p-1">
                      {filteredRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No roles found</p>
                      ) : (
                        filteredRoles.map((role) => (
                          <button
                            key={role.key}
                            type="button"
                            className={`w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors ${
                              selectedRole === role.key ? 'bg-accent' : ''
                            } ${role.key === user.role ? 'opacity-50' : ''}`}
                            onClick={() => {
                              if (role.key === user.role) return;
                              setSelectedRole(role.key);
                              setShowDropdown(false);
                              setSearchQuery('');
                            }}
                            disabled={role.key === user.role}
                          >
                            <span className="text-lg mt-0.5 shrink-0">{role.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{role.label}</span>
                                {role.key === user.role && (
                                  <span className="text-[10px] text-muted-foreground">(current)</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{role.description}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Selected role description */}
            {selectedRoleDef && (
              <div className="rounded-md border bg-muted/30 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{selectedRoleDef.label}</span>{' — '}
                  <span className="text-muted-foreground">{selectedRoleDef.description}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Confirmation View ── */}
        {confirming && selectedRoleDef && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Confirm Role Change
              </p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Badge variant="outline" className={`text-sm px-3 py-1 ${ROLE_BADGE_CLASSES[user.role] || ''}`}>
                    {(ROLE_DEFINITIONS.find((r) => r.key === user.role)?.label) || user.role.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <Badge variant="outline" className={`text-sm px-3 py-1 ${ROLE_BADGE_CLASSES[selectedRole] || ''}`}>
                    {selectedRoleDef.label}
                  </Badge>
                </div>
              </div>
              <Separator className="my-3" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You are about to change <span className="font-semibold">{user.name}</span>&apos;s role from{' '}
                <span className="font-semibold">{(ROLE_DEFINITIONS.find((r) => r.key === user.role)?.label) || user.role.replace(/_/g, ' ')}</span> to{' '}
                <span className="font-semibold">{selectedRoleDef.label}</span>.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                This action will immediately update the user&apos;s permissions, navigation menu, and dashboard access.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3 flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">Unable to update user role</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
                  {debugInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-500 cursor-pointer hover:underline">Technical Details</summary>
                      <pre className="text-[10px] text-red-400 mt-1 font-mono whitespace-pre-wrap break-all leading-relaxed">{debugInfo}</pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer Actions ── */}
        <div className="flex justify-end gap-2 pt-2">
          {!confirming ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!selectedRole || isSameRole || submitting}
                onClick={() => setConfirming(true)}
              >
                {isGoogleCustomerUpgrade ? 'Review Upgrade' : 'Continue'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setConfirming(false); setError(null); }} disabled={submitting}>
                Back
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Role Change
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* ── Permission info ── */}
        {!isSuperAdmin && availableRoles.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            As an Admin, you can promote users to: {availableRoles.map((r) => r.label).join(', ')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
