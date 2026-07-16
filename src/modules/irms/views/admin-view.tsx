'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Check,
  Minus,
  Users,
  Shield,
  ScrollText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLES, ROLE_PERMISSIONS, type IrmUser, type IrmActivity } from '@/modules/irms/lib';
import { toast } from 'sonner';

const PERMISSIONS = ['create', 'edit', 'delete', 'approve', 'manage', 'view'] as const;

export default function AdminView() {
  const [users, setUsers] = useState<IrmUser[]>([]);
  const [activities, setActivities] = useState<IrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [, setEditUser] = useState<IrmUser | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Viewer' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/irms/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(Array.isArray(json) ? json : json.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/irms/activities');
      if (res.ok) {
        const json = await res.json();
        setActivities(Array.isArray(json) ? json : json.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchActivities()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchActivities]);

  const handleCreateUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Name and email required');
      return;
    }
    try {
      const res = await fetch('/api/irms/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) throw new Error();
      toast.success('User created');
      setUserDialogOpen(false);
      setUserForm({ name: '', email: '', role: 'Viewer' });
      fetchUsers();
    } catch {
      toast.error('Failed to create user');
    }
  };

  const handleUpdateRole = async (user: IrmUser, role: string) => {
    try {
      const res = await fetch(`/api/irms/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      toast.success('Role updated');
      fetchUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleToggleActive = async (user: IrmUser) => {
    try {
      const res = await fetch(`/api/irms/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) throw new Error();
      toast.success('User updated');
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">User management and RBAC</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            RBAC Matrix
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Users</CardTitle>
              <Dialog
                open={userDialogOpen}
                onOpenChange={(open) => {
                  setUserDialogOpen(open);
                  setEditUser(null);
                  setUserForm({ name: '', email: '', role: 'Viewer' });
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={userForm.role}
                        onValueChange={(v) => setUserForm({ ...userForm, role: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleCreateUser}
                    >
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(v) => handleUpdateRole(user, v)}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.active}
                              onCheckedChange={() => handleToggleActive(user)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="text-xs">
                              {user.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RBAC Matrix Tab */}
        <TabsContent value="rbac">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Role-Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-white dark:bg-gray-900">Role</th>
                      {PERMISSIONS.map((p) => (
                        <th key={p} className="p-2 text-center font-medium text-muted-foreground capitalize">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES.map((role) => (
                      <tr key={role} className="border-t">
                        <td className="p-2 font-medium sticky left-0 bg-white dark:bg-gray-900">
                          {role}
                        </td>
                        {PERMISSIONS.map((perm) => {
                          const has = (ROLE_PERMISSIONS[role] || []).includes(perm);
                          return (
                            <td key={perm} className="p-2 text-center">
                              {has ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activities recorded</p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(a.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {a.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {a.description}
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.user?.name || 'System'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}