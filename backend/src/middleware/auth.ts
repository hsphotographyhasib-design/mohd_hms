import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';

/** Extend Express Request to carry authenticated user info */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, unknown>;
      tenantId?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Express middleware that verifies the JWT Bearer token.
 * Attaches `req.user` (the decoded payload) and `req.tenantId`.
 * Returns 401 if the token is missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = payload as unknown as Record<string, unknown>;
  req.tenantId = (payload as any).tenantId as string;
  next();
}