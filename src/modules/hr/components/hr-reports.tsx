'use client';

import {
  BarChart3, FileText, Calendar, DollarSign, Building2, Users, Clock, GraduationCap, Star,
  Download, FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';

const reports = [
  { id: 'attendance', title: 'Attendance Report', description: 'Employee attendance summary, late arrivals, early departures, and absence patterns.', icon: <Calendar className="h-6 w-6 text-sky-600" />, color: 'border-sky-200 bg-sky-50/50' },
  { id: 'leave', title: 'Leave Report', description: 'Leave usage by type, balance overview, and department-wise leave trends.', icon: <FileText className="h-6 w-6 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50' },
  { id: 'payroll', title: 'Payroll Report', description: 'Salary disbursement, deductions, overtime pay, and net pay breakdown.', icon: <DollarSign className="h-6 w-6 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50' },
  { id: 'department', title: 'Department Report', description: 'Headcount, turnover rate, and department-wise performance metrics.', icon: <Building2 className="h-6 w-6 text-violet-600" />, color: 'border-violet-200 bg-violet-50/50' },
  { id: 'employee', title: 'Employee Report', description: 'Employee demographics, tenure distribution, and status overview.', icon: <Users className="h-6 w-6 text-teal-600" />, color: 'border-teal-200 bg-teal-50/50' },
  { id: 'overtime', title: 'Overtime Report', description: 'Overtime hours, costs, and approval trends by department.', icon: <Clock className="h-6 w-6 text-orange-600" />, color: 'border-orange-200 bg-orange-50/50' },
  { id: 'training', title: 'Training Report', description: 'Training completion rates, scores, and certification status.', icon: <GraduationCap className="h-6 w-6 text-cyan-600" />, color: 'border-cyan-200 bg-cyan-50/50' },
  { id: 'performance', title: 'Performance Report', description: 'Performance scores, ratings distribution, and review completion.', icon: <Star className="h-6 w-6 text-rose-600" />, color: 'border-rose-200 bg-rose-50/50' },
];

export function HrReports() {
  const handleGenerate = (report: typeof reports[0]) => {
    toast.success(`Generating ${report.title}...`, { description: 'Report will be ready shortly.' });
  };

  const handleExport = (format: string, reportName: string) => {
    toast.info(`Exporting ${reportName} as ${format.toUpperCase()}`, { description: `${format.toUpperCase()} export will be downloaded.` });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">HR Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export HR analytics reports</p>
        </div>
      </div>

      {/* Export All buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => handleExport('pdf', 'All Reports')}>
          <Download className="h-4 w-4 mr-2" />Export All (PDF)
        </Button>
        <Button variant="outline" onClick={() => handleExport('excel', 'All Reports')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Export All (Excel)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reports.map((r) => (
          <Card key={r.id} className={`border ${r.color} hover:shadow-md transition-shadow`}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                  {r.icon}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm"
                  onClick={() => handleGenerate(r)}
                >
                  Generate
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Export PDF" onClick={() => handleExport('pdf', r.title)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Export Excel" onClick={() => handleExport('excel', r.title)}>
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}