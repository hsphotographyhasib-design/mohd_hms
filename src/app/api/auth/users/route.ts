import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hashPassword, generateToken } from '@/lib/auth';
import { sendEmail, renderWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/users — Invite a new user (admin/super_admin only).
 * Sends an invitation email with a one-time login link.
 */
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
          },
          include: { tenant: { select: { id: true, name: true, domain: true } } },
        }),
      { label: 'invite-createUser' },
    );

    // Generate invitation token (one-time use, same as JWT but for invitations)
    const inviteToken = generateToken({
      userId: user.id,
      tenantId,
      role: user.role,
      email: user.email,
      isInvitation: true,
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Server authentication is not configured. Invitation cannot be sent.' },
        { status: 503 },
      );
    }

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
