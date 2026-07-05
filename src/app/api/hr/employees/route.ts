import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, sanitizeInput } from '@/lib/auth';
import { getDbFriendlyMessage } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.user.tenantId;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const employmentType = searchParams.get('employmentType') || '';

    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { employeeId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.departmentId = department;
    }
    if (status) {
      where.status = status;
    }
    if (employmentType) {
      where.employmentType = employmentType;
    }

    const [data, total] = await Promise.all([
      db.hrEmployee.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, avatar: true } },
          department: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.hrEmployee.count({ where }),
    ]);

    const employees = data.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      userId: e.userId,
      employeeId: e.employeeId,
      departmentId: e.departmentId,
      departmentName: e.department?.name || null,
      designation: e.designation,
      employmentType: e.employmentType,
      status: e.status,
      joiningDate: e.joiningDate?.toISOString() || null,
      basicSalary: e.basicSalary,
      nationality: e.nationality,
      passportNumber: e.passportNumber,
      passportExpiry: e.passportExpiry?.toISOString() || null,
      visaNumber: e.visaNumber,
      visaExpiry: e.visaExpiry?.toISOString() || null,
      drivingLicense: e.drivingLicense,
      drivingLicenseExpiry: e.drivingLicenseExpiry?.toISOString() || null,
      probationEnds: e.probationEnds?.toISOString() || null,
      contractEnd: e.contractEnd?.toISOString() || null,
      bankName: e.bankName,
      bankAccount: e.bankAccount,
      bankBranch: e.bankBranch,
      emergencyName: e.emergencyName,
      emergencyPhone: e.emergencyPhone,
      emergencyRelation: e.emergencyRelation,
      dateOfBirth: e.dateOfBirth?.toISOString() || null,
      gender: e.gender,
      maritalStatus: e.maritalStatus,
      bloodGroup: e.bloodGroup,
      photo: e.photo,
      reportingToId: e.reportingToId,
      shiftId: e.shiftId,
      userName: e.user?.name || '',
      userEmail: e.user?.email || '',
      userPhone: e.user?.phone || '',
      userAvatar: e.user?.avatar || '',
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data: employees,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const userId = sanitizeInput(body.userId || '');
    const employeeId = sanitizeInput(body.employeeId || `EMP-${Date.now().toString(36).toUpperCase()}`);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const employee = await db.hrEmployee.create({
      data: {
        tenantId,
        userId,
        employeeId,
        departmentId: body.departmentId || null,
        designation: sanitizeInput(body.designation || ''),
        employmentType: body.employmentType || 'full_time',
        reportingToId: body.reportingToId || null,
        basicSalary: body.basicSalary ? parseFloat(body.basicSalary) : null,
        nationality: sanitizeInput(body.nationality || ''),
        passportNumber: sanitizeInput(body.passportNumber || ''),
        passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : null,
        visaNumber: sanitizeInput(body.visaNumber || ''),
        visaExpiry: body.visaExpiry ? new Date(body.visaExpiry) : null,
        drivingLicense: sanitizeInput(body.drivingLicense || ''),
        drivingLicenseExpiry: body.drivingLicenseExpiry ? new Date(body.drivingLicenseExpiry) : null,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
        probationEnds: body.probationEnds ? new Date(body.probationEnds) : null,
        contractEnd: body.contractEnd ? new Date(body.contractEnd) : null,
        bankName: sanitizeInput(body.bankName || ''),
        bankAccount: sanitizeInput(body.bankAccount || ''),
        bankBranch: sanitizeInput(body.bankBranch || ''),
        emergencyName: sanitizeInput(body.emergencyName || ''),
        emergencyPhone: sanitizeInput(body.emergencyPhone || ''),
        emergencyRelation: sanitizeInput(body.emergencyRelation || ''),
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender || null,
        maritalStatus: body.maritalStatus || null,
        bloodGroup: sanitizeInput(body.bloodGroup || ''),
        status: body.status || 'active',
        shiftId: body.shiftId || null,
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
    }, { status: 201 });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}