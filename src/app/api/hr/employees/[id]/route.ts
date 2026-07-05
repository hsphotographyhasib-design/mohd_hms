import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, sanitizeInput } from '@/lib/auth';
import { getDbFriendlyMessage } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const employee = await db.hrEmployee.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: employee.id,
      tenantId: employee.tenantId,
      userId: employee.userId,
      employeeId: employee.employeeId,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name || null,
      designation: employee.designation,
      employmentType: employee.employmentType,
      status: employee.status,
      joiningDate: employee.joiningDate?.toISOString() || null,
      basicSalary: employee.basicSalary,
      nationality: employee.nationality,
      passportNumber: employee.passportNumber,
      passportExpiry: employee.passportExpiry?.toISOString() || null,
      visaNumber: employee.visaNumber,
      visaExpiry: employee.visaExpiry?.toISOString() || null,
      drivingLicense: employee.drivingLicense,
      drivingLicenseExpiry: employee.drivingLicenseExpiry?.toISOString() || null,
      probationEnds: employee.probationEnds?.toISOString() || null,
      contractEnd: employee.contractEnd?.toISOString() || null,
      bankName: employee.bankName,
      bankAccount: employee.bankAccount,
      bankBranch: employee.bankBranch,
      emergencyName: employee.emergencyName,
      emergencyPhone: employee.emergencyPhone,
      emergencyRelation: employee.emergencyRelation,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      bloodGroup: employee.bloodGroup,
      photo: employee.photo,
      reportingToId: employee.reportingToId,
      shiftId: employee.shiftId,
      userName: employee.user?.name || '',
      userEmail: employee.user?.email || '',
      userPhone: employee.user?.phone || '',
      userAvatar: employee.user?.avatar || '',
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.hrEmployee.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = await db.hrEmployee.update({
      where: { id },
      data: {
        departmentId: body.departmentId !== undefined ? body.departmentId : undefined,
        designation: body.designation !== undefined ? sanitizeInput(body.designation) : undefined,
        employmentType: body.employmentType !== undefined ? body.employmentType : undefined,
        status: body.status !== undefined ? body.status : undefined,
        basicSalary: body.basicSalary !== undefined ? (body.basicSalary ? parseFloat(body.basicSalary) : null) : undefined,
        nationality: body.nationality !== undefined ? sanitizeInput(body.nationality) : undefined,
        passportNumber: body.passportNumber !== undefined ? sanitizeInput(body.passportNumber) : undefined,
        passportExpiry: body.passportExpiry !== undefined ? (body.passportExpiry ? new Date(body.passportExpiry) : null) : undefined,
        visaNumber: body.visaNumber !== undefined ? sanitizeInput(body.visaNumber) : undefined,
        visaExpiry: body.visaExpiry !== undefined ? (body.visaExpiry ? new Date(body.visaExpiry) : null) : undefined,
        drivingLicense: body.drivingLicense !== undefined ? sanitizeInput(body.drivingLicense) : undefined,
        drivingLicenseExpiry: body.drivingLicenseExpiry !== undefined ? (body.drivingLicenseExpiry ? new Date(body.drivingLicenseExpiry) : null) : undefined,
        joiningDate: body.joiningDate !== undefined ? (body.joiningDate ? new Date(body.joiningDate) : null) : undefined,
        probationEnds: body.probationEnds !== undefined ? (body.probationEnds ? new Date(body.probationEnds) : null) : undefined,
        contractEnd: body.contractEnd !== undefined ? (body.contractEnd ? new Date(body.contractEnd) : null) : undefined,
        bankName: body.bankName !== undefined ? sanitizeInput(body.bankName) : undefined,
        bankAccount: body.bankAccount !== undefined ? sanitizeInput(body.bankAccount) : undefined,
        bankBranch: body.bankBranch !== undefined ? sanitizeInput(body.bankBranch) : undefined,
        emergencyName: body.emergencyName !== undefined ? sanitizeInput(body.emergencyName) : undefined,
        emergencyPhone: body.emergencyPhone !== undefined ? sanitizeInput(body.emergencyPhone) : undefined,
        emergencyRelation: body.emergencyRelation !== undefined ? sanitizeInput(body.emergencyRelation) : undefined,
        dateOfBirth: body.dateOfBirth !== undefined ? (body.dateOfBirth ? new Date(body.dateOfBirth) : null) : undefined,
        gender: body.gender !== undefined ? body.gender : undefined,
        maritalStatus: body.maritalStatus !== undefined ? body.maritalStatus : undefined,
        bloodGroup: body.bloodGroup !== undefined ? sanitizeInput(body.bloodGroup) : undefined,
        reportingToId: body.reportingToId !== undefined ? body.reportingToId : undefined,
        shiftId: body.shiftId !== undefined ? body.shiftId : undefined,
      },
      include: {
        user: { select: { name: true, email: true } },
        department: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: employee.id,
      employeeId: employee.employeeId,
      departmentName: employee.department?.name || null,
      userName: employee.user?.name || '',
      status: employee.status,
    });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.hrEmployee.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await db.hrEmployee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}