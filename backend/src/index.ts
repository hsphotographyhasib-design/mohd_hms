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

// ─── App Setup ───────────────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security headers
app.use(helmet());

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

// ─── Start Server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[MOHD.HMS Backend] Running on port ${PORT}`);
  console.log(`[MOHD.HMS Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[MOHD.HMS Backend] Frontend URL: ${FRONTEND_URL}`);
  console.log(`[MOHD.HMS Backend] Supabase URL: ${process.env.SUPABASE_URL || 'not configured'}`);
});

export default app;