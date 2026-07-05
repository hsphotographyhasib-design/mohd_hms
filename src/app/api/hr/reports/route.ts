import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const reportTypes = [
  { id: 'attendance', title: 'Attendance Report', description: 'Employee attendance summary, late arrivals, and absence patterns.' },
  { id: 'leave', title: 'Leave Report', description: 'Leave usage by type and department-wise leave trends.' },
  { id: 'payroll', title: 'Payroll Report', description: 'Salary disbursement, deductions, and net pay breakdown.' },
  { id: 'department', title: 'Department Report', description: 'Headcount, turnover rate, and performance metrics.' },
  { id: 'employee', title: 'Employee Report', description: 'Employee demographics, tenure distribution, and status.' },
  { id: 'overtime', title: 'Overtime Report', description: 'Overtime hours, costs, and approval trends.' },
  { id: 'training', title: 'Training Report', description: 'Training completion rates and certification status.' },
  { id: 'performance', title: 'Performance Report', description: 'Performance scores and ratings distribution.' },
];

export async function GET() {
  try {
    const data = reportTypes.map((r) => ({ ...r, exportFormats: ['pdf', 'excel', 'csv'] }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const reportId = body.reportId || body.id;
    const report = reportTypes.find((r) => r.id === reportId);
    if (!report) return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    // Placeholder: in production, this would generate and return the report
    return NextResponse.json({ success: true, message: `${report.title} generation initiated. Report will be available shortly.`, reportId: report.id }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 }); }
}