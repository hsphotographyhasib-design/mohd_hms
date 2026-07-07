import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword } from '../lib/auth.js';

const router = Router();

// ─── GET / — List Employees ─────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const departmentId = (req.query.departmentId as string) || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeNumber: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    const data = (items as any[]).map((u: any) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      name: u.name,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      employeeNumber: u.employeeNumber,
      departmentId: u.departmentId,
      departmentName: u.department?.name,
      isActive: u.isActive,
      isOnline: u.isOnline,
      lastLogin: u.lastLogin?.toISOString?.() || null,
      profileCompleted: u.profileCompleted,
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
    }));

    res.json({
      data,
      total: total as number,
      page,
      pageSize,
      totalPages: Math.ceil((total as number) / pageSize),
    });
  } catch (error) {
    console.error('Employees list error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── POST / — Create Employee ───────────────────────────────────────────────
router.route('/').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const callerRole = req.user!.role as string;

    // RBAC: only admin, hr, and super_admin can manage employees
    if (!['super_admin', 'admin', 'hr'].includes(callerRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { email, name, phone, role: employeeRole, employeeNumber, departmentId, password } = req.body;

    if (!email || !name || !employeeRole) {
      res.status(400).json({ error: 'Email, name, and role are required' });
      return;
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const employee = await db.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: employeeRole,
        employeeNumber: employeeNumber || null,
        departmentId: departmentId || null,
        profileCompleted: true,
      },
    } as any);

    const e = employee as any;
    res.status(201).json({
      id: e.id,
      tenantId: e.tenantId,
      email: e.email,
      name: e.name,
      phone: e.phone,
      avatar: e.avatar,
      role: e.role,
      employeeNumber: e.employeeNumber,
      departmentId: e.departmentId,
      departmentName: e.department?.name,
      isActive: e.isActive,
      isOnline: e.isOnline,
      profileCompleted: e.profileCompleted,
      createdAt: e.createdAt?.toISOString?.() || e.createdAt,
      updatedAt: e.updatedAt?.toISOString?.() || e.updatedAt,
    });
  } catch (error) {
    console.error('Employee create error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

export default router;