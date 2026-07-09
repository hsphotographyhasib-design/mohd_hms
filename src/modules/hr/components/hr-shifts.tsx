'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
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
import { Textarea } from '@/shared/ui/textarea';
import {
  Sun, Moon, Sunrise, Palette, Plus, Trash2, Pencil, Loader2,
  CalendarDays, Users, Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SelectOption } from '@/core/types';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

function ShiftCard({ shift, onEdit, onDelete }: {
  shift: ShiftData;
  onEdit: (s: ShiftData) => void;
  onDelete: (id: string) => void;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    Morning: <Sunrise className="h-5 w-5" />,
    Evening: <Sun className="h-5 w-5" />,
    Night: <Moon className="h-5 w-5" />,
  };
  const icon = iconMap[shift.name] || <Palette className="h-5 w-5" />;
  const effectiveHrs = (() => {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm) - shift.breakMinutes;
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  })();

  return (
    <Card className="border-l-4" style={{ borderLeftColor: shift.color }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: shift.color + '20', color: shift.color }}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{shift.name}</h3>
              <p className="text-sm text-muted-foreground">{shift.startTime} — {shift.endTime}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(shift)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => onDelete(shift.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Break: {shift.breakMinutes} min</span>
          <span>Effective: {effectiveHrs}h</span>
          <Badge variant="outline" className="text-xs">{shift.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShiftData {
  id: string;
  tenantId: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface ScheduleData {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  shiftColor: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  weeklyOffDays: string;
  createdAt: string;
}

interface HolidayData {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  type: string;
  recurring: boolean;
  createdAt: string;
}

const SHIFT_COLORS = ['#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'];

// ============ MAIN COMPONENT ============

export function HrShifts() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'schedule' | 'holidays'>('shifts');

  // Shifts state
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 60, color: '#3b82f6', isActive: true });
  const [shiftSubmitting, setShiftSubmitting] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedSubmitting, setSchedSubmitting] = useState(false);
  const [schedForm, setSchedForm] = useState({ employeeId: '', shiftId: '', effectiveFrom: '', effectiveTo: '', weeklyOffDays: '[]' });
  const [employees, setEmployees] = useState<SelectOption[]>([]);

  // Holiday state
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(true);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'public', recurring: false });

  // Fetch employees for schedule
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?pageSize=200', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setEmployees((json.data || []).map((e: { id: string; name: string }) => ({ label: e.name, value: e.id })));
    } catch { /* silent */ }
  }, []);

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const res = await fetch('/api/hr/shifts', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setShifts(json.shifts || []);
    } catch { toast.error('Failed to load shifts'); }
    finally { setShiftsLoading(false); }
  }, []);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setSchedLoading(true);
    try {
      const res = await fetch('/api/hr/shifts?view=schedules', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setSchedules(json.schedules || []);
    } catch { toast.error('Failed to load schedules'); }
    finally { setSchedLoading(false); }
  }, []);

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    setHolidayLoading(true);
    try {
      const res = await fetch('/api/hr/holidays', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setHolidays(json.holidays || []);
    } catch { toast.error('Failed to load holidays'); }
    finally { setHolidayLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); fetchShifts(); }, [fetchEmployees, fetchShifts]);
  useEffect(() => { if (activeTab === 'schedule') fetchSchedules(); }, [activeTab, fetchSchedules]);
  useEffect(() => { if (activeTab === 'holidays') fetchHolidays(); }, [activeTab, fetchHolidays]);

  // Shift CRUD
  const openNewShift = () => {
    setEditingShift(null);
    setShiftForm({ name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 60, color: '#3b82f6', isActive: true });
    setShiftDialogOpen(true);
  };

  const openEditShift = (s: ShiftData) => {
    setEditingShift(s);
    setShiftForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes, color: s.color, isActive: s.isActive });
    setShiftDialogOpen(true);
  };

  const handleSaveShift = async () => {
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Name, start time, and end time are required');
      return;
    }
    setShiftSubmitting(true);
    try {
      const body = { ...shiftForm, id: editingShift?.id || undefined };
      const res = await fetch('/api/hr/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: editingShift ? 'update' : 'create', ...body }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingShift ? 'Shift updated' : 'Shift created');
      setShiftDialogOpen(false);
      fetchShifts();
    } catch { toast.error('Failed to save shift'); }
    finally { setShiftSubmitting(false); }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift?')) return;
    try {
      const res = await fetch('/api/hr/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Shift deleted');
      fetchShifts();
    } catch { toast.error('Failed to delete shift'); }
  };

  // Schedule CRUD
  const handleSaveSchedule = async () => {
    if (!schedForm.employeeId || !schedForm.shiftId || !schedForm.effectiveFrom) {
      toast.error('Employee, shift, and effective date are required');
      return;
    }
    setSchedSubmitting(true);
    try {
      const res = await fetch('/api/hr/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'assign_schedule', ...schedForm, effectiveTo: schedForm.effectiveTo || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Shift schedule assigned');
      setSchedDialogOpen(false);
      setSchedForm({ employeeId: '', shiftId: '', effectiveFrom: '', effectiveTo: '', weeklyOffDays: '[]' });
      fetchSchedules();
    } catch { toast.error('Failed to assign shift'); }
    finally { setSchedSubmitting(false); }
  };

  // Holiday CRUD
  const handleSaveHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      toast.error('Name and date are required');
      return;
    }
    setHolidaySubmitting(true);
    try {
      const res = await fetch('/api/hr/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(holidayForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Holiday added');
      setHolidayDialogOpen(false);
      setHolidayForm({ name: '', date: '', type: 'public', recurring: false });
      fetchHolidays();
    } catch { toast.error('Failed to add holiday'); }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      const res = await fetch('/api/hr/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch { toast.error('Failed to delete holiday'); }
  };

  const holidayTypeBadge: Record<string, string> = {
    public: 'bg-amber-100 text-amber-800',
    company: 'bg-sky-100 text-sky-800',
    optional: 'bg-purple-100 text-purple-800',
  };

  const tabs = [
    { key: 'shifts' as const, label: 'Shifts', icon: <Palette className="h-4 w-4" /> },
    { key: 'schedule' as const, label: 'Schedules', icon: <Users className="h-4 w-4" /> },
    { key: 'holidays' as const, label: 'Holidays', icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Palette className="h-5 w-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
        </div>
        {activeTab === 'shifts' && (
          <Button onClick={openNewShift} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New Shift
          </Button>
        )}
        {activeTab === 'schedule' && (
          <Button onClick={() => { fetchSchedules(); setSchedDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Assign Shift
          </Button>
        )}
        {activeTab === 'holidays' && (
          <Button onClick={() => setHolidayDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Holiday
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={activeTab === t.key ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </Button>
        ))}
      </div>

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftsLoading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            )) : shifts.length === 0 ? (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No shifts configured. Create your first shift.</CardContent></Card>
            ) : shifts.map((s) => (
              <ShiftCard key={s.id} shift={s} onEdit={openEditShift} onDelete={handleDeleteShift} />
            ))}
          </div>
        </>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Weekly Off</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  )) : schedules.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No shift schedules assigned</TableCell></TableRow>
                  ) : schedules.map((s) => {
                    let offDays: string[] = [];
                    try { offDays = JSON.parse(s.weeklyOffDays); } catch { /* */ }
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{s.employeeName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.shiftColor }} />
                            {s.shiftName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(s.effectiveFrom).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{s.effectiveTo ? new Date(s.effectiveTo).toLocaleDateString() : 'Ongoing'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {offDays.map((d) => (
                              <Badge key={d} variant="outline" className="text-xs capitalize">{d}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={async () => {
                            try {
                              const res = await fetch('/api/hr/shifts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                                body: JSON.stringify({ action: 'delete_schedule', id: s.id }),
                              });
                              if (!res.ok) throw new Error();
                              toast.success('Schedule removed');
                              fetchSchedules();
                            } catch { toast.error('Failed to remove schedule'); }
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidayLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  )) : holidays.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No holidays configured</TableCell></TableRow>
                  ) : holidays.map((h) => (
                    <TableRow key={h.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm font-mono">{new Date(h.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell><Badge variant="outline" className={holidayTypeBadge[h.type] || ''}>{h.type}</Badge></TableCell>
                      <TableCell>
                        {h.recurring ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600"><Repeat className="h-3 w-3" /> Yes</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => handleDeleteHoliday(h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Create/Edit Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingShift ? 'Edit Shift' : 'New Shift'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Shift Name *</Label>
              <Input className="mt-1" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="e.g. Morning, Evening, Night" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time *</Label>
                <Input type="time" className="mt-1" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input type="time" className="mt-1" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Break (minutes)</Label>
              <Input type="number" className="mt-1" value={shiftForm.breakMinutes} onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {SHIFT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${shiftForm.color === c ? 'scale-125 border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setShiftForm({ ...shiftForm, color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={shiftForm.isActive} onCheckedChange={(v) => setShiftForm({ ...shiftForm, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} disabled={shiftSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {shiftSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingShift ? 'Update' : 'Create'} Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Assign Dialog */}
      <Dialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Shift Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={schedForm.employeeId} onValueChange={(v) => setSchedForm({ ...schedForm, employeeId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift *</Label>
              <Select value={schedForm.shiftId} onValueChange={(v) => setSchedForm({ ...schedForm, shiftId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>{shifts.filter((s) => s.isActive).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /> {s.name} ({s.startTime}–{s.endTime})</span>
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective From *</Label>
                <Input type="date" className="mt-1" value={schedForm.effectiveFrom} onChange={(e) => setSchedForm({ ...schedForm, effectiveFrom: e.target.value })} />
              </div>
              <div>
                <Label>Effective To</Label>
                <Input type="date" className="mt-1" value={schedForm.effectiveTo} onChange={(e) => setSchedForm({ ...schedForm, effectiveTo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Weekly Off Days</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                  const current: string[] = (() => { try { return JSON.parse(schedForm.weeklyOffDays); } catch { return []; } })();
                  const isSelected = current.includes(day);
                  return (
                    <Badge
                      key={day}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        const updated = isSelected ? current.filter((d) => d !== day) : [...current, day];
                        setSchedForm({ ...schedForm, weeklyOffDays: JSON.stringify(updated) });
                      }}
                    >
                      {day.slice(0, 3)}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule} disabled={schedSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {schedSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday Create Dialog */}
      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Holiday Name *</Label>
              <Input className="mt-1" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. New Year's Day" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={holidayForm.type} onValueChange={(v) => setHolidayForm({ ...holidayForm, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="company">Company Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={holidayForm.recurring} onCheckedChange={(v) => setHolidayForm({ ...holidayForm, recurring: v })} />
              <Label>Recurring (repeats annually)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHoliday} disabled={holidaySubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {holidaySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}