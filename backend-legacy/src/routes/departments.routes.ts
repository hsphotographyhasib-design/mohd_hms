import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { cachedFetch } from '../cache/cache.service.js';
import { TTL } from '../cache/cache.constants.js';

const router = Router();

router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '50', 10), 100);

    const cacheKey = `hms:departments:list:${tenantId}`;
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const departments = await db.department.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
        take: pageSize,
      });
      return { data: departments };
    }, TTL.departmentList);

    res.json(data);
  } catch (error) {
    console.error('Departments fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;