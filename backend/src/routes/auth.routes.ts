import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { verifyPassword, generateToken, hashPassword, generateCustomerNumber } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── POST /login ─────────────────────────────────────────────────────────────
router.route('/login').post(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await db.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last login (best-effort)
    db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), isOnline: true, authProvider: 'email' },
    }).catch(() => {});

    const normalizedRole = (user.role as string).toLowerCase();

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: normalizedRole,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: normalizedRole,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantDomain: user.tenant?.domain,
        employeeNumber: user.employeeNumber,
        departmentId: user.departmentId,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── POST /register ──────────────────────────────────────────────────────────
router.route('/register').post(async (req: Request, res: Response) => {
  let name: string;
  let email: string;
  let password: string;
  let role: string;
  try {
    const body = req.body;
    name = body.name;
    email = body.email;
    password = body.password;
    role = body.role;
  } catch {
    res.status(400).json({ error: 'Invalid request data. Please check your input.' });
    return;
  }

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  try {
    // Use provided tenantId or find default tenant
    const body = req.body as any;
    let tenantId = body.tenantId;

    if (!tenantId) {
      const tenant = await db.tenant.findFirst({ where: { domain: 'default.facilitypro.com' } });
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const existing = await db.user.findFirst({ where: { tenantId, email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name,
        role: role || 'customer',
        authProvider: 'email',
        profileCompleted: false,
      },
    });

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    // Notify admins (best-effort)
    try {
      const admins = await db.user.findMany({
        where: { tenantId, role: { in: ['super_admin', 'admin'] }, isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map((admin: any) => ({
            tenantId,
            userId: admin.id,
            title: 'New User Registered',
            message: `${user.name} has successfully registered as a ${user.role}.`,
            type: 'info',
            isRead: false,
          })),
        });
      }
    } catch (err) {
      console.error('[register] admin notification failed', err);
    }

    res.json({
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
    console.error('Register DB error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── POST /forgot-password ───────────────────────────────────────────────────
router.route('/forgot-password').post(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ ok: false, message: 'Email is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!validEmail) {
      res.json({ ok: true, message: 'If an account exists for this email, a verification code has been sent.' });
      return;
    }

    // Look up user
    const user = await db.user.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, phone: true, tenantId: true, isActive: true, passwordHash: true },
    });

    // Don't reveal existence
    if (!user || !user.isActive) {
      res.json({ ok: true, message: 'If an account exists for this email, a verification code has been sent.' });
      return;
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await import('node:crypto').then(c => {
      const encoder = new TextEncoder();
      return c.subtle.digest('SHA-256', encoder.encode(otp)).then(buf => {
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      });
    });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await db.passwordResetOtp.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          email: normalizedEmail,
          otpHash: await otpHash,
          expiresAt,
          maxAttempts: 5,
          maxResends: 3,
          status: 'active',
        },
      });
    } catch (err) {
      console.error('[forgot-password] create OTP error', err);
    }

    // Mask email for response
    const parts = normalizedEmail.split('@');
    const masked = parts[0].slice(0, 2) + '***@' + parts[1];

    res.json({
      ok: true,
      message: 'If an account exists for this email, a verification code has been sent.',
      email: masked,
      expiresIn: 900,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────
router.route('/me').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        tenant: { select: { id: true, name: true, domain: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: (user as any).tenant?.name,
      tenantDomain: (user as any).tenant?.domain,
      employeeNumber: user.employeeNumber,
      departmentId: user.departmentId,
      departmentName: (user as any).department?.name,
      isActive: user.isActive,
      isOnline: user.isOnline,
      profileCompleted: user.profileCompleted,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('Auth me DB error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── PUT /profile ────────────────────────────────────────────────────────────
router.route('/profile').put(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const { name, phone } = req.body;

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        profileCompleted: true,
      },
      include: {
        tenant: { select: { id: true, name: true, domain: true } },
        department: { select: { id: true, name: true } },
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: (user as any).tenant?.name,
      tenantDomain: (user as any).tenant?.domain,
      employeeNumber: user.employeeNumber,
      departmentId: user.departmentId,
      departmentName: (user as any).department?.name,
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

export default router;