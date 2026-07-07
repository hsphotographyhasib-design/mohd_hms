# MOHD.HMS Enterprise — Deployment Guide

## Architecture
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Express.js + TypeScript)  
- **Database**: Supabase (PostgreSQL)

## Quick Start

### 1. Supabase Setup (one-time)
The database schema is in `supabase-schema.sql`. Push it via:
```bash
./scripts/push-supabase.sh YOUR_PROJECT_REF YOUR_ACCESS_TOKEN
```
Then push seed data via Supabase SQL Editor using `supabase-seed.sql`.

### 2. Backend (Render)
1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables** (see `backend/.env.example`):
     - `PORT` = 4000
     - `NODE_ENV` = production
     - `SUPABASE_URL` = your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
     - `JWT_SECRET` = generate a random 32+ char string
     - `FRONTEND_URL` = your Vercel frontend URL

### 3. Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your GitHub repo
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com/api`
   - `NEXT_PUBLIC_APP_URL` = your Vercel app URL
4. Deploy

### 4. CORS Configuration
The backend `FRONTEND_URL` env var must match your Vercel domain for CORS to work.

## Environment Variables

| Variable | Frontend | Backend | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | ❌ | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | ✅ | ❌ | Frontend URL for CORS |
| `SUPABASE_URL` | ❌ | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | Supabase service role key |
| `JWT_SECRET` | ❌ | ✅ | JWT signing secret |
| `FRONTEND_URL` | ❌ | ✅ | Frontend URL for CORS |

## Project Structure
```
├── backend/                 # Express.js API (Render)
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── lib/             # Supabase adapter, auth utils
│   │   └── index.ts         # Express server entry
│   ├── Dockerfile
│   └── render.yaml
├── src/                      # Next.js frontend (Vercel)
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   └── hooks/               # Custom hooks
├── supabase-schema.sql      # Database DDL
├── supabase-seed.sql        # Seed data
├── vercel.json              # Vercel config
└── scripts/                 # Utility scripts
```