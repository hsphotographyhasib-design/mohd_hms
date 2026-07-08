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
import notificationRoutes from './routes/notifications.routes.js';

// ─── App Setup ───────────────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security headers — allow cross-origin API access from Vercel frontend
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — explicit allowlist (API is bearer-token only, no cookies are ever sent cross-origin)
const staticAllowedOrigins = new Set(
  [FRONTEND_URL, 'https://mohdhms.com', 'https://www.mohdhms.com', 'http://localhost:3000']
    .concat((process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()))
    .filter(Boolean)
);
const vercelPreviewOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin(origin, callback) {
    if (!origin || staticAllowedOrigins.has(origin) || vercelPreviewOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: false,
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