'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/app-shell/store';
import { STATUS_STYLES, formatDateShort } from './shared';
import type { CalendarInspection } from '../lib';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarTab() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [inspections, setInspections] = useState<CalendarInspection[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayInspections, setSelectedDayInspections] = useState<CalendarInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Pad with nulls for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [year, month]);

  const inspectionsByDay = useMemo(() => {
    const map: Record<string, CalendarInspection[]> = {};
    for (const insp of inspections) {
      const inspDate = new Date(insp.date);
      if (inspDate.getFullYear() === year && inspDate.getMonth() === month) {
        const key = String(inspDate.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(insp);
      }
    }
    return map;
  }, [inspections, year, month]);

  const loadInspections = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/irms/inspections?view=calendar&month=${monthStr}`, { headers: h });
      if (res.ok) {
        const data = await res.json();
        setInspections(Array.isArray(data) ? data : data.data ?? data.items ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const handleDayClick = useCallback((day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay(dateStr);
    setSelectedDayInspections(inspectionsByDay[String(day)] ?? []);
  }, [year, month, inspectionsByDay]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar grid */}
      <div className="lg:col-span-2">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base font-semibold">
                {MONTHS[month]} {year}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                {/* Header row */}
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-gray-50 dark:bg-gray-800 text-center py-2 text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {d}
                  </div>
                ))}
                {/* Day cells */}
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="bg-white dark:bg-gray-900 min-h-[72px] sm:min-h-[90px] p-1"
                      />
                    );
                  }
                  const dayKey = String(day);
                  const dayInspections = inspectionsByDay[dayKey] ?? [];
                  const isSelected = selectedDay === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                  return (
                    <div
                      key={day}
                      className={`bg-white dark:bg-gray-900 min-h-[72px] sm:min-h-[90px] p-1 cursor-pointer transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/10 ${
                        isSelected ? 'ring-2 ring-emerald-500 ring-inset' : ''
                      }`}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        isToday(day)
                          ? 'bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {day}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {dayInspections.slice(0, 3).map((insp) => (
                          <div
                            key={insp.id}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            title={insp.title}
                            style={{
                              backgroundColor:
                                insp.status === 'completed' ? '#16a34a' :
                                insp.status === 'failed' ? '#dc2626' :
                                insp.status === 'in_progress' ? '#eab308' :
                                insp.priority === 'critical' ? '#dc2626' :
                                insp.priority === 'high' ? '#f97316' :
                                '#3b82f6',
                            }}
                          />
                        ))}
                        {dayInspections.length > 3 && (
                          <span className="text-[9px] text-gray-400 leading-none">+{dayInspections.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected day panel */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            {selectedDay ? formatDateShort(selectedDay) : 'Select a Day'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!selectedDay ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <CalendarDays className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Click a day on the calendar to view inspections</p>
            </div>
          ) : selectedDayInspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <Inbox className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No inspections scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedDayInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{insp.title}</p>
                    <Badge variant="secondary" className={`${STATUS_STYLES[insp.status] ?? ''} text-[10px] px-1.5 py-0 shrink-0`}>
                      {insp.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    {insp.equipmentName && <span>{insp.equipmentName}</span>}
                    {insp.equipmentName && insp.assignedToName && <span>·</span>}
                    {insp.assignedToName && <span>{insp.assignedToName}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 capitalize ${
                      insp.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      insp.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      insp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'
                    }`}>
                      {insp.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}