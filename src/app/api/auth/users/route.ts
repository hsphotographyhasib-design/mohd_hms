import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { hashPassword, generateToken } from '@/core/auth/auth-lib';
import { sendEmail, renderWelcomeEmail } from '@/core/email/email';

export const dynamic = 'force-dynamic';

// ============ GET: List users (admin/super_admin only) ============

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.replace('Bearer ', ''));
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = payload.tenantId as string;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';
    const providerFilter = searchParams.get('provider') || '';
    const onlineFilter = searchParams.get('online') || '';

    // Build where clause
    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter;
    }

    if (statusFilter === 'active') {
      where.isActive = true;
    } else if (statusFilter === 'inactive') {
      where.isActive = false;
    }

    if (providerFilter) {
      where.authProvider = providerFilter;
    }

    if (onlineFilter === 'online') {
      where.isOnline = true;
    } else if (onlineFilter === 'offline') {
      where.isOnline = false;
    }

    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      withRetry(
        () =>
          db.user.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              isActive: true,
              isOnline: true,
              lastLogin: true,
              createdAt: true,
              profileCompleted: true,
              employeeNumber: true,
              authProvider: true,
              department: { select: { id: true, name: true } },
            },
          }),
        { label: 'listUsers-findMany' }
      ),
      withRetry(
        () => db.user.count({ where }),
        { label: 'listUsers-count' }
      ),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      users,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}

// ============ POST: Invite a new user (admin/super_admin only) ============

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload || !['super_admin', 'admin'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = payload.tenantId as string;
    const inviterId = payload.userId as string;
    const body = await request.json();
    const { name, email, password, role, departmentId, phone, sendInvite } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Check for duplicate email
    const existing = await withRetry(
      () => db.user.findFirst({ where: { tenantId, email } }),
      { label: 'invite-checkDuplicate' },
    );
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Create the user with hashed password
    const passwordHash = await hashPassword(password);
    const user = await withRetry(
      () =>
        db.user.create({
          data: {
            tenantId,
            email,
            passwordHash,
            name,
            role: role || 'technician',
            profileCompleted: false,
            departmentId: departmentId || null,
            phone: phone || null,
            authProvider: 'email',
          },
          include: { tenant: { select: { id: true, name: true, domain: true } } },
        }),
      { label: 'invite-createUser' },
    );

    // Generate invitation token
    const inviteToken = generateToken({
      userId: user.id,
      tenantId,
      role: user.role,
      email: user.email,
      isInvitation: true,
    });

    // Send invitation email
    if (sendInvite !== false) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';
        const tpl = renderWelcomeEmail({
          name: user.name,
          email: user.email,
          loginUrl: `${baseUrl}/reset-password?token=${encodeURIComponent(inviteToken)}`,
        });
        await sendEmail({
          to: user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          module: 'auth',
          templateName: 'User Invitation',
        });
      } catch (err) {
        console.error('[invite-user] invitation email failed', err);
      }
    }

    // Audit log (non-critical)
    withRetry(
      () =>
        db.auditLog.create({
          data: {
            tenantId,
            userId: inviterId,
            action: 'invite_user',
            entity: 'User',
            entityId: user.id,
            newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            device: 'api',
          },
        }),
      { label: 'invite-audit' }
    ).catch(() => {});

    return NextResponse.json({
      message: `User invited successfully: ${user.name} (${user.email})`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        profileCompleted: user.profileCompleted,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}