'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIrmStore, REPORT_STATUSES, type IrmReport } from '@/modules/irms/lib';
import { toast } from 'sonner';

// Simple date helpers (no date-fns dependency required)
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatMonth(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reports, setReports] = useState<IrmReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const setView = useIrmStore((s) => s.setView);
  const setSelectedReportId = useIrmStore((s) => s.setSelectedReportId);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/irms/reports');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReports(Array.isArray(json) ? json : json.data || []);
    } catch {
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Map reports by date string
  const reportsByDate = useMemo(() => {
    const map: Record<string, IrmReport[]> = {};
    reports.forEach((r) => {
      const d = new Date(r.inspectionDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reports]);

  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    : null;

  const selectedDateReports = selectedDateKey ? reportsByDate[selectedDateKey] || [] : [];

  // Upcoming inspections (future dates)
  const upcomingReports = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reports
      .filter((r) => new Date(r.inspectionDate) >= today)
      .sort((a, b) => new Date(a.inspectionDate).getTime() - new Date(b.inspectionDate).getTime())
      .slice(0, 10);
  }, [reports]);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleReportClick = (id: string) => {
    setSelectedReportId(id);
    setView('report-view');
  };

  const getStatusColor = (status: string) => {
    const s = REPORT_STATUSES.find((r) => r.value === status);
    if (!s) return 'bg-gray-400';
    if (status === 'approved') return 'bg-green-500';
    if (status === 'draft') return 'bg-gray-400';
    if (status === 'rejected') return 'bg-red-500';
    return 'bg-blue-500';
  };

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground text-sm">Inspection schedule overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base min-w-[180px] text-center">
                  {formatMonth(currentMonth)}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="bg-white dark:bg-gray-950 p-2 min-h-[70px]" />;
                  }
                  const cellDate = new Date(year, month, day);
                  const key = `${year}-${month}-${day}`;
                  const dayReports = reportsByDate[key] || [];
                  const isToday = isSameDay(cellDate, today);
                  const isSelected = selectedDate && isSameDay(cellDate, selectedDate);

                  return (
                    <div
                      key={key}
                      className={`bg-white dark:bg-gray-950 p-2 min-h-[70px] cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isSelected ? 'ring-2 ring-green-500 ring-inset' : ''
                      }`}
                      onClick={() => setSelectedDate(cellDate)}
                    >
                      <span
                        className={`text-xs font-medium inline-flex items-center justify-center h-6 w-6 rounded-full ${
                          isToday
                            ? 'bg-green-600 text-white'
                            : 'text-foreground'
                        }`}
                      >
                        {day}
                      </span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayReports.slice(0, 3).map((r) => (
                          <span
                            key={r.id}
                            className={`h-2 w-2 rounded-full ${getStatusColor(r.status)}`}
                            title={r.number}
                          />
                        ))}
                        {dayReports.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{dayReports.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Reports */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No inspections on this date</p>
              ) : (
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-2">
                    {selectedDateReports.map((r) => {
                      const status = REPORT_STATUSES.find((s) => s.value === r.status);
                      return (
                        <div
                          key={r.id}
                          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors text-sm"
                          onClick={() => handleReportClick(r.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{r.number}</span>
                            {status && (
                              <Badge variant="secondary" className={`${status.color} text-[10px]`}>
                                {status.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {r.project?.name || '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming inspections</p>
              ) : (
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-2">
                    {upcomingReports.map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors text-sm"
                        onClick={() => handleReportClick(r.id)}
                      >
                        <p className="font-medium">{r.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.inspectionDate).toLocaleDateString()} · {r.project?.name || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}