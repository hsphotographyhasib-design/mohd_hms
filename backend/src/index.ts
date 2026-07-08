/**
 * MOHD.HMS Enterprise — Express.js Backend Service
 *
 * Deployment target: Render (Docker)
 * Database: Supabase (PostgreSQL via REST API)
 * Frontend: Vercel (Next.js)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// ─── Cache & Queue ─────────────────────────────────────────────────────────
import { initRedis, isRedisAvailable } from './cache/redis.client.js';
import { startWorkers, stopWorkers } from './queue/queue.service.js';
import './queue/queue.workers.js'; // Register all job handlers

// ─── Route imports ────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import complaintsRoutes from './routes/complaints.routes.js';
import workOrdersRoutes from './routes/work-orders.routes.js';
import customersRoutes from './routes/customers.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import googleAuthRoutes from './routes/google-auth.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import cacheRoutes from './routes/cache.routes.js';

// ─── App Setup ───────────────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security headers — allow cross-origin API access from Vercel frontend
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — allow any origin (Render backend is API-only, no cookies sent cross-origin)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// JSON body parser (10mb limit for photos/attachments)
app.use(express.json({ limit: '10mb' }));

// Request logging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MOHD.HMS Enterprise',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Mount Route Groups ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cache', cacheRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error Handler]', err);

  const status = 'statusCode' in err ? (err as any).statusCode : 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── Initialize Redis & Start Queue Workers ────────────────────────────────
initRedis();

const QUEUE_NAMES = ['emails', 'notifications', 'whatsapp', 'reminders'];
if (isRedisAvailable()) {
  startWorkers(QUEUE_NAMES);
  console.log(`[MOHD.HMS Backend] Queue workers started for: ${QUEUE_NAMES.join(', ')}`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[MOHD.HMS Backend] SIGTERM received — shutting down...');
  stopWorkers();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[MOHD.HMS Backend] SIGINT received — shutting down...');
  stopWorkers();
  process.exit(0);
});

// ─── Start Server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[MOHD.HMS Backend] Running on port ${PORT}`);
  console.log(`[MOHD.HMS Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[MOHD.HMS Backend] Frontend URL: ${FRONTEND_URL}`);
  console.log(`[MOHD.HMS Backend] Supabase URL: ${process.env.SUPABASE_URL || 'not configured'}`);
  console.log(`[MOHD.HMS Backend] Redis: ${isRedisAvailable() ? 'connected' : 'not configured (caching disabled)'}`);
});

export default app;