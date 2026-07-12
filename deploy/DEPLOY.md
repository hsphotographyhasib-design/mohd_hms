# FacilityPro — Deployment Guide

**Company:** SMART MAINTENANCE SERVICES SDN BHD (BE1318)
**Framework:** Next.js 16 + React 19 + TypeScript
**Stack:** Vercel (Frontend) + Render (Backend API) + Supabase (PostgreSQL)

---

## Architecture Overview

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Vercel    │  ← Next.js 16 (Frontend + API fallback)
                    │  Frontend   │
                    └──────┬──────┘
                           │ /api/* (unmatched routes)
                    ┌──────▼──────┐
                    │   Render    │  ← Express.js Backend API
                    │  Backend    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │  ← PostgreSQL + PostgREST + Auth
                    │  Database   │
                    └─────────────┘
```

| Component | Platform | Purpose |
|-----------|----------|---------|
| **Frontend** | Vercel | Next.js app (SSR, API routes, static assets) |
| **Backend API** | Render | Express.js REST API (`backend/`) |
| **Database** | Supabase | PostgreSQL database + PostgREST API |
| **Auth** | Supabase | JWT-based authentication |
| **Storage** | Supabase | File uploads (documents, photos) |

---

## Prerequisites

- [Vercel](https://vercel.com) account (free tier works)
- [Render](https://render.com) account (free/starter plan)
- [Supabase](https://supabase.com) account (free tier works)
- GitHub repository connected to Vercel

---

## Step 1: Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g., `mohd-hms`)
3. Set a database password (save this!)
4. Select the closest region to your users
5. Click **Create new project**

### 1.2 Get Connection Details

After project creation:

1. Go to **Settings** → **Database**
2. Copy the **Connection string** (URI format):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. Go to **Settings** → **API**
4. Copy the **Project URL** (e.g., `https://xxxx.supabase.co`)
5. Copy the **service_role key** (anon key has limited access)

### 1.3 Push Database Schema

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Push Prisma schema to Supabase
npx prisma db push

# (Optional) Seed initial data
npx prisma db seed
```

### 1.4 Run SQL Schema Sync (if using external backend)

If the external Express backend uses Supabase's PostgREST API directly, you need to ensure all columns exist in the Supabase database. The `supabase-schema.sql` file contains the full schema definition.

Run it in **Supabase SQL Editor**:

1. Go to **SQL Editor** in Supabase dashboard
2. Open `supabase-schema.sql` from the project root
3. Paste and execute

---

## Step 2: Render Backend Setup

### 2.1 Create Web Service

1. Go to [Render](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `mohd-hms-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Docker
   - **Plan:** Starter (or Free)
4. Click **Create Web Service**

### 2.2 Environment Variables

Set these in Render → **Environment**:

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `4000` | Backend port |
| `NODE_ENV` | `production` | Production mode |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key from Supabase |
| `JWT_SECRET` | *(generate one)* | JWT signing secret |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` | Vercel frontend URL |
| `FIREBASE_PROJECT_ID` | *(optional)* | For push notifications |
| `FIREBASE_CLIENT_EMAIL` | *(optional)* | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | *(optional)* | Firebase service account key |

### 2.3 Backend URL

After deployment, your backend will be available at:
```
https://mohd-hms-backend.onrender.com
```

---

## Step 3: Vercel Frontend Setup

### 3.1 Import Project

1. Go to [Vercel](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (root)
   - **Build Command:** `prisma generate && next build`
   - **Install Command:** `bun install`

### 3.2 Environment Variables

Set these in Vercel → **Settings** → **Environment Variables**:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Supabase connection string |
| `JWT_SECRET` | *(same as Render)* | JWT signing secret |
| `NEXT_PUBLIC_API_URL` | `https://mohd-hms-backend.onrender.com` | Render backend URL |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel URL |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase service role key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | *(optional)* | For push notifications |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | *(optional)* | For push notifications |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | *(optional)* | For push notifications |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | *(optional)* | For push notifications |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | *(optional)* | For push notifications |

### 3.3 Deploy

Click **Deploy**. Vercel will automatically:
1. Install dependencies with `bun install`
2. Generate Prisma client
3. Build the Next.js application
4. Deploy to CDN

### 3.4 Custom Domain (Optional)

1. Vercel → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. SSL is provisioned automatically

---

## Step 4: Verify Deployment

```bash
# Check Vercel frontend
curl https://your-app.vercel.app/api/health

# Check Render backend
curl https://mohd-hms-backend.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","service":"FacilityPro","version":"0.2.0","environment":"production"}
```

---

## How API Routing Works

The `next.config.ts` contains a **rewrite rule** that proxies unmatched `/api/*` requests to the Render backend:

```typescript
// In production, unmatched API routes are forwarded to Render
async rewrites() {
  const backendUrl = process.env.BACKEND_URL || 'https://mohd-hms.onrender.com';
  return {
    afterFiles: [{
      source: '/api/:path*',
      destination: `${backendUrl}/api/:path*`,
    }],
  };
}
```

**Route resolution order:**
1. Next.js checks for a matching API route handler (e.g., `/api/auth/login`)
2. If no handler exists, the request is proxied to the Render backend
3. This allows some API routes to be handled by Next.js (using Supabase directly) while others go to the Express backend

---

## Updating the Deployment

### Frontend (Vercel)
- Push to `main` branch → Vercel auto-deploys
- Or trigger a manual redeploy in Vercel dashboard

### Backend (Render)
- Push to `main` branch → Render auto-rebuilds (if auto-deploy is enabled)
- Render uses `backend/Dockerfile` and `backend/render.yaml` for configuration

### Database (Supabase)
- After schema changes, run: `npx prisma db push`
- Or use the Supabase SQL Editor for manual migrations

---

## Troubleshooting

### Vercel Build Fails
- Check that `prisma generate` runs before `next build`
- Verify all environment variables are set
- Check Vercel build logs for TypeScript errors

### Render Backend Not Starting
- Check Render logs for startup errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure the Dockerfile builds successfully locally

### API Requests Return 502
- Check if the Render backend is running (not in "cold start")
- Verify `NEXT_PUBLIC_API_URL` matches the Render backend URL
- Check Render logs for errors

### Database Connection Errors
- Verify `DATABASE_URL` is correct (include `?sslmode=require`)
- Check Supabase project status (not paused)
- Ensure IP allowlist includes Vercel/Render IPs (or allow all)

### CORS Errors
- Verify `FRONTEND_URL` on Render matches your Vercel domain
- Check that the backend CORS middleware allows the Vercel origin

---

## Environment Variable Reference

See [`.env.example`](../.env.example) for the complete list of environment variables with descriptions.