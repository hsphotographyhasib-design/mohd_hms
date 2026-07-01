import { NextRequest, NextResponse } from 'next/server';
import * as T from '@/lib/email-service/templates';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/templates
 * Returns list of all available email templates with their variable definitions.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const templateList = [
    { identifier: 'welcomeEmail', name: 'Welcome Email', module: 'auth', description: 'Sent when new customer/employee registers', variables: T.welcomeEmail({ name: '', email: '', loginUrl: '' }).variables },
    { identifier: 'emailVerification', name: 'Email Verification', module: 'auth', description: 'Email verification after registration', variables: T.emailVerification({ name: '', verificationUrl: '' }).variables },
    { identifier: 'forgotPassword', name: 'Forgot Password', module: 'auth', description: 'Password reset link', variables: T.forgotPassword({ name: '', resetUrl: '' }).variables },
    { identifier: 'passwordChanged', name: 'Password Changed', module: 'auth', description: 'Password change notification', variables: T.passwordChanged({ name: '' }).variables },
    { identifier: 'complaintCreated', name: 'Complaint Created', module: 'complaints', description: 'New complaint notification', variables: T.complaintCreated({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintAssigned', name: 'Complaint Assigned', module: 'complaints', description: 'Complaint assigned to technician', variables: T.complaintAssigned({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintAccepted', name: 'Complaint Accepted', module: 'complaints', description: 'Technician accepted the complaint', variables: T.complaintAccepted({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintTechOnWay', name: 'Technician On The Way', module: 'complaints', description: 'Technician en route', variables: T.complaintTechOnWay({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintWorkStarted', name: 'Work Started', module: 'complaints', description: 'Work has begun', variables: T.complaintWorkStarted({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintCompleted', name: 'Complaint Completed', module: 'complaints', description: 'Work completed, awaiting confirmation', variables: T.complaintCompleted({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'complaintClosed', name: 'Complaint Closed', module: 'complaints', description: 'Complaint resolved and closed', variables: T.complaintClosed({ ticketNo: '', status: '', customerName: '' }).variables },
    { identifier: 'woCreated', name: 'Work Order Created', module: 'work-orders', description: 'New work order notification', variables: T.woCreated({ woNumber: '', status: '' }).variables },
    { identifier: 'woAssigned', name: 'Work Order Assigned', module: 'work-orders', description: 'Work order assigned', variables: T.woAssigned({ woNumber: '', status: '' }).variables },
    { identifier: 'woCompleted', name: 'Work Order Completed', module: 'work-orders', description: 'Work order completed', variables: T.woCompleted({ woNumber: '', status: '' }).variables },
    { identifier: 'woClosed', name: 'Work Order Closed', module: 'work-orders', description: 'Work order closed', variables: T.woClosed({ woNumber: '', status: '' }).variables },
    { identifier: 'quotationSent', name: 'Quotation Sent', module: 'quotations', description: 'Quotation sent to customer', variables: T.quotationSent({ quoteNumber: '', customerName: '' }).variables },
    { identifier: 'quotationAccepted', name: 'Quotation Accepted', module: 'quotations', description: 'Customer accepted quotation', variables: T.quotationAccepted({ quoteNumber: '', customerName: '' }).variables },
    { identifier: 'quotationRejected', name: 'Quotation Rejected', module: 'quotations', description: 'Customer rejected quotation', variables: T.quotationRejected({ quoteNumber: '', customerName: '' }).variables },
    { identifier: 'quotationExpiring', name: 'Quotation Expiring', module: 'quotations', description: 'Quotation about to expire', variables: T.quotationExpiring({ quoteNumber: '', customerName: '', expiryDate: '' }).variables },
    { identifier: 'invoiceSent', name: 'Invoice Sent', module: 'invoices', description: 'Invoice sent to customer', variables: T.invoiceSent({ invoiceNumber: '', customerName: '', amount: '', dueDate: '' }).variables },
    { identifier: 'invoiceOverdue', name: 'Invoice Overdue', module: 'invoices', description: 'Overdue invoice reminder', variables: T.invoiceOverdue({ invoiceNumber: '', customerName: '', amount: '', dueDate: '' }).variables },
    { identifier: 'paymentReceived', name: 'Payment Received', module: 'invoices', description: 'Payment received notification', variables: T.paymentReceived({ invoiceNumber: '', customerName: '', amount: '', paymentDate: '' }).variables },
    { identifier: 'paymentConfirmation', name: 'Payment Confirmation', module: 'finance', description: 'Finance payment confirmation', variables: T.paymentConfirmation({ customerName: '', amount: '', paymentDate: '' }).variables },
    { identifier: 'lowStockAlert', name: 'Low Stock Alert', module: 'inventory', description: 'Inventory low stock warning', variables: T.lowStockAlert({ itemName: '', currentStock: 0, minStock: 0 }).variables },
    { identifier: 'outOfStockAlert', name: 'Out of Stock', module: 'inventory', description: 'Item out of stock', variables: T.outOfStockAlert({ itemName: '' }).variables },
    { identifier: 'pmUpcoming', name: 'PM Upcoming', module: 'pm', description: 'Preventive maintenance reminder', variables: T.pmUpcoming({ scheduleId: '', equipmentName: '', scheduledDate: '' }).variables },
    { identifier: 'pmCompleted', name: 'PM Completed', module: 'pm', description: 'Maintenance completed', variables: T.pmCompleted({ scheduleId: '', equipmentName: '', completedDate: '' }).variables },
    { identifier: 'equipmentWarrantyExpiring', name: 'Warranty Expiring', module: 'equipment', description: 'Equipment warranty expiring', variables: T.equipmentWarrantyExpiring({ equipmentName: '', expiryDate: '' }).variables },
    { identifier: 'equipmentInspectionDue', name: 'Inspection Due', module: 'equipment', description: 'Equipment inspection due', variables: T.equipmentInspectionDue({ equipmentName: '', inspectionType: '', dueDate: '' }).variables },
    { identifier: 'employeeInvitation', name: 'Employee Invitation', module: 'hr', description: 'Invite new employee', variables: T.employeeInvitation({ name: '', email: '', role: '', setupUrl: '' }).variables },
    { identifier: 'leaveApproval', name: 'Leave Response', module: 'hr', description: 'Leave approval/rejection', variables: T.leaveApproval({ name: '', leaveType: '', startDate: '', endDate: '', approved: true }).variables },
    { identifier: 'payrollNotification', name: 'Payroll Notification', module: 'hr', description: 'Salary processed notification', variables: T.payrollNotification({ name: '', payPeriod: '', payDate: '' }).variables },
    { identifier: 'inspectionReport', name: 'Inspection Report', module: 'inspection', description: 'Inspection report email with PDF attachment', variables: T.inspectionReport({ reportType: '', equipmentName: '', location: '', date: '', inspectorName: '' }).variables },
  ];

  return NextResponse.json({ templates: templateList, total: templateList.length });
}