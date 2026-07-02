import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { sendEmail, renderWelcomeEmail } from '@/lib/email';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Find or create default tenant for new registrations
    let tenant = await withRetry(
      () => db.tenant.findFirst({ where: { domain: 'default.facilitypro.com' } }),
      { label: 'register-findTenant' }
    );
    if (!tenant) {
      tenant = await withRetry(
        () =>
          db.tenant.create({
            data: {
              name: 'Default Organization',
              domain: 'default.facilitypro.com',
              plan: 'professional',
              maxUsers: 50,
            },
          }),
        { label: 'register-createTenant' }
      );
    }

    const existing = await withRetry(
      () => db.user.findFirst({ where: { tenantId: tenant.id, email } }),
      { label: 'register-checkEmail' }
    );
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await withRetry(
      () =>
        db.user.create({
          data: {
            tenantId: tenant.id,
            email,
            passwordHash,
            name,
            role: role || 'technician',
            profileCompleted: false,
          },
          include: { tenant: { select: { id: true, name: true, domain: true } } },
        }),
      { label: 'register-createUser' }
    );

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Server authentication is not configured. Please contact the administrator.' },
        { status: 503 },
      );
    }

    // Send welcome email (best-effort, non-blocking)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';
      const tpl = renderWelcomeEmail({
        name: user.name,
        email: user.email,
        loginUrl: `${baseUrl}/login`,
      });
      await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        module: 'auth',
        templateName: 'Welcome Email',
      });
    } catch (err) {
      console.error('[register] welcome email failed', err);
    }

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}