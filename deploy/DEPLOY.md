# FacilityPro — Hostinger Business Hosting Deployment Guide

**Company:** SMART MAINTENANCE SERVICES SDN BHD (BE1318)
**Framework:** Next.js 16 + React 19 + SQLite (Prisma)
**Target:** Hostinger Business Hosting (cPanel + Node.js)

---

## Overview

Hostinger Business hosting uses **cPanel** with **Phusion Passenger** to run Node.js applications. There is **no root access**, **no Docker**, and **no custom Nginx** — the web server (Apache/LiteSpeed) is managed by cPanel.

This means:
- ✅ Next.js app runs via cPanel's "Setup Node.js App" feature
- ✅ SQLite works (file-based, no database server needed)
- ✅ File uploads work (stored in your hosting account)
- ✅ SSL via cPanel (free Let's Encrypt or Hostinger SSL)
- ❌ WhatsApp service will **NOT** work (needs Chrome/Xvfb, no system access)
- ❌ No Docker, no PM2, no custom system packages

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Hostinger plan | Business Web Hosting or higher |
| Node.js | Version 20 (set via cPanel) |
| Build machine | Linux, WSL, or Docker (for building the package) |
| Domain | Pointed to your Hostinger hosting (A record in cPanel) |
| Terminal access | cPanel Terminal or SSH (available on Business plan) |

---

## Deployment Steps

### Step 1: Build the Deployment Package

You build the app on **your local machine** (or WSL), then upload the result to Hostinger.

#### Option A: Build on Linux / WSL (Recommended)

```bash
# From the project root directory
cd /path/to/your/project

# Install dependencies, build, and create deployable package
bash deploy/hosting/build-package.sh
```

#### Option B: Build with Docker (macOS / Windows)

Use Docker to ensure Linux-compatible native modules (sharp, etc.):

```bash
# Requires Docker installed on your machine
bash deploy/hosting/build-package.sh --docker
```

This creates **`facilitypro-deploy.tar.gz`** (~80-120 MB) in the project root.

> **What the package contains:**
> - `app/server.js` — Next.js standalone server
> - `app/.next/` — Built application
> - `app/node_modules/` — Runtime dependencies
> - `app/public/` — Static assets
> - `app/prisma/` — Database schema
> - `app/db/` — Empty directory for SQLite
> - `app/storage/` — Empty directories for uploads
> - `app/.env.example` — Environment template
> - `app/.htaccess` — Apache rewrite rules

---

### Step 2: Upload to Hostinger

#### Via cPanel File Manager
1. Log in to **cPanel** → **File Manager**
2. Navigate to your home directory (`/home/<username>/`)
3. Click **Upload** → upload `facilitypro-deploy.tar.gz`
4. After upload, right-click the file → **Extract**
5. Rename the extracted `app` folder to your preferred app name (e.g., `facilitypro`)

#### Via SFTP (Faster for large files)
```bash
# Upload the package
sftp u366055699@orangered-hippopotamus-866396.hostingersite.com
put facilitypro-deploy.tar.gz
bye

# SSH in and extract
ssh u366055699@orangered-hippopotamus-866396.hostingersite.com
tar xzf facilitypro-deploy.tar.gz
mv app facilitypro
rm facilitypro-deploy.tar.gz
```

#### Via cPanel Terminal
```bash
# If you uploaded the file via File Manager
cd ~
tar xzf facilitypro-deploy.tar.gz
mv app facilitypro
```

---

### Step 3: Configure Environment Variables

```bash
# SSH into your hosting (or use cPanel Terminal)
ssh u366055699@orangered-hippopotamus-866396.hostingersite.com
cd ~/facilitypro

# Create .env from the template
# The template is already pre-configured for your domain.
cp .env.example .env
nano .env
```

**The template is pre-filled. Verify these values:**

```env
# Your public URL (already set)
APP_URL=https://orangered-hippopotamus-866396.hostingersite.com

# JWT secret (already generated — 64 hex chars)
JWT_SECRET=ac3582fa63dd6514476ac31f63495bcd705d03f3dbd173ae06822bc5ff00c302

# Database — SQLite file (NOT MySQL)
DATABASE_URL=file:./db/custom.db

# Storage for uploaded documents
STORAGE_ROOT=./storage
```

> **Important:** Do NOT set `PORT` or `HOSTNAME` — cPanel's Passenger sets these automatically. If you set them, the app may fail to start.
>
> **Note:** This app uses **SQLite** (file database). The MySQL database in your cPanel (`u366055699_mohd_hms`) is **not used**. You can delete it to free up resources.

---

### Step 4: Create the Node.js App in cPanel

1. Log in to **cPanel**
2. Go to **Software** → **Setup Node.js App**
3. Click **Create Application**
4. Fill in the form:

| Field | Value |
|-------|-------|
| **Node.js version** | 20.x |
| **Application mode** | `Production` |
| **Application root** | `facilitypro` |
| **Application URL** | `orangered-hippopotamus-866396.hostingersite.com` |
| **Application startup file** | `server.js` |

5. Click **Create**

cPanel will automatically run `npm install` and start the application.

> **If cPanel doesn't have Node.js 20:** Go to cPanel → Software → **Node.js Selector** and install Node.js 20 first. Then retry.

---

### Step 5: Initialize the Database

The database needs to be pushed from the Prisma schema:

```bash
# SSH into your hosting
ssh u366055699@orangered-hippopotamus-866396.hostingersite.com
cd ~/facilitypro

# Generate Prisma client (if not already done)
npx prisma generate

# Push schema to create SQLite database
npx prisma db push

# (Optional) Seed initial data
npx prisma db seed
```

> If `npx` doesn't work on cPanel, you may need to run these commands via cPanel Terminal.

---

### Step 6: Setup SSL

Hostinger Business hosting includes **free SSL**.

#### Option A: Hostinger Auto-SSL (Easiest)
1. cPanel → **SSL/TLS Status** (or **Security** → **SSL/TLS**)
2. Select your domain → click **Issue SSL**

#### Option B: Let's Encrypt via cPanel
1. cPanel → **SSL/TLS** → **Let's Encrypt**
2. Select your domain → issue the certificate

#### Option C: Hostinger SSL from Dashboard
1. Log in to **Hostinger hPanel**
2. Go to **Websites** → **SSL**
3. Select free SSL for your domain

After SSL is active, your app is accessible at **`https://your-domain.com`**

---

### Step 7: Verify Deployment

```bash
# Check if the app is running
curl https://orangered-hippopotamus-866396.hostingersite.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","service":"FacilityPro","version":"0.2.0","environment":"production"}
```

Open **`https://orangered-hippopotamus-866396.hostingersite.com`** in your browser. You should see the FacilityPro landing page.

---

## Managing the Application

### Restart the App
1. cPanel → **Software** → **Setup Node.js App**
2. Find your application → click **Restart**
3. Or use cPanel Terminal: `touch ~/facilitypro/tmp/restart.txt`

### View Logs
1. cPanel → **Software** → **Setup Node.js App**
2. Click **Run NPM Install** → then check the log output
3. Or via Terminal:
   ```bash
   # Application logs (cPanel stores them here)
   cat ~/logs/facilitypro/error.log
   ```

### Update the App (New Version)
1. Build a new package locally: `bash deploy/hosting/build-package.sh`
2. Upload `facilitypro-deploy.tar.gz` to the server
3. Extract and overwrite: `tar xzf facilitypro-deploy.tar.gz --overwrite`
4. Copy back your `.env`: `cp .env.backup facilitypro/.env`
5. Regenerate Prisma client: `cd facilitypro && npx prisma generate`
6. Restart in cPanel

### Run Database Migrations
```bash
cd ~/facilitypro
npx prisma db push
```

---

## Limitations on Business Hosting

| Feature | Supported? | Notes |
|---------|-----------|-------|
| Next.js API routes | ✅ Yes | Via cPanel Node.js |
| SQLite database | ✅ Yes | File-based, no server needed |
| File uploads | ✅ Yes | Within hosting storage limit |
| SSL/HTTPS | ✅ Yes | Free via Hostinger or Let's Encrypt |
| Custom domains | ✅ Yes | Via cPanel |
| WhatsApp service | ❌ No | Requires Chrome + Xvfb (not available) |
| Docker | ❌ No | No root access |
| Custom Nginx | ❌ No | cPanel manages web server |
| PM2 / system services | ❌ No | cPanel/Passenger manages processes |
| WebSocket (socket.io) | ⚠️ Maybe | Depends on cPanel configuration |
| Cron jobs | ✅ Yes | Via cPanel Cron Jobs |

### WhatsApp Service Alternative
The WhatsApp service requires a real browser (Chrome) which cannot be installed on shared hosting. Options:
1. **Upgrade to Hostinger VPS** — full root access, can run Chrome + Docker
2. **Use a separate VPS** just for WhatsApp, proxy requests from the shared hosting app
3. **Use a third-party WhatsApp API** (e.g., Twilio, MessageBird) instead of @open-wa/wa-automate

---

## Troubleshooting

### App Won't Start

```bash
# Check the startup file exists
ls -la ~/facilitypro/server.js

# Check Node.js version
node -v  # Should be v20.x

# Try running manually to see the error
cd ~/facilitypro
node server.js
```

**Common causes:**
- Wrong startup file path (must be `server.js`, not `./server.js`)
- PORT conflict (remove PORT from .env — let cPanel set it)
- Missing node_modules (click "Run NPM Install" in cPanel)

### "Application Error" in Browser

```bash
# Check if the process is running
# cPanel → Setup Node.js App → look for green status

# Check error logs
cat ~/logs/facilitypro/error.log 2>/dev/null

# Or check cPanel's Node.js log output
```

### Database Error (SQLITE_CANTOPEN)

```bash
# Ensure db directory exists and is writable
mkdir -p ~/facilitypro/db
chmod 755 ~/facilitypro/db

# Re-push the schema
cd ~/facilitypro
npx prisma db push
```

### 508 Resource Limit Exceeded

Hostinger Business hosting has process/memory limits. If you hit this:
- Restart the app via cPanel (frees leaked memory)
- Check for memory leaks in API routes
- Consider upgrading to VPS if this happens frequently

### Upload Fails (413 Payload Too Large)

```bash
# Check .htaccess or ask Hostinger support to increase upload limit
# The default is usually 64MB which should be enough

# Also check your .env MAX_FILE_SIZE
```

### SSL Not Working

1. Verify the domain DNS A record points to the correct Hostinger IP
2. Wait up to 24 hours for DNS propagation
3. Check SSL status in cPanel → SSL/TLS Status
4. Force HTTPS redirect: the `.htaccess` file handles this

---

## File Reference

```
deploy/
├── hosting/                        # ← Hostinger Business hosting files
│   ├── build-package.sh            # Build deployment package (run locally)
│   ├── Dockerfile.build            # Cross-platform Docker builder
│   ├── .env.production             # Production env template
│   └── .htaccess                   # Apache rewrite rules
├── vps/                            # ← VPS deployment files (separate guide)
│   ├── Dockerfile, docker-compose.yml, nginx/, pm2/, etc.
│   └── ...
├── deploy.sh                       # VPS deploy script
├── backup.sh                       # Database backup script
├── restore.sh                      # Database restore script
└── DEPLOY.md                       # This file
```

### Server Directory Structure (after deployment)

```
/home/<cpanel-username>/
├── facilitypro/                    # Application root
│   ├── server.js                   # Startup file (set in cPanel)
│   ├── .next/                      # Next.js build output
│   ├── node_modules/               # Runtime dependencies
│   ├── public/                     # Static assets (logo, robots.txt)
│   ├── prisma/
│   │   └── schema.prisma           # Database schema
│   ├── db/
│   │   └── custom.db               # SQLite database (created on first run)
│   ├── storage/
│   │   ├── chunks/                 # Upload chunks (temporary)
│   │   └── documents/              # Final uploaded documents
│   ├── .env                        # Environment variables (create from .env.example)
│   └── .htaccess                   # Apache rewrite rules
├── logs/                           # Application logs (managed by cPanel)
└── facilitypro-deploy.tar.gz       # (remove after extraction)
```

---

## Quick Start Checklist

```bash
# ═══ LOCAL MACHINE ═══

# 1. Build the deployment package
bash deploy/hosting/build-package.sh --docker
# Output: facilitypro-deploy.tar.gz

# ═══ HOSTINGER SERVER ═══

# 2. Upload via cPanel File Manager or SFTP
# sftp u366055699@orangered-hippopotamus-866396.hostingersite.com <<< put facilitypro-deploy.tar.gz

# 3. Extract
ssh u366055699@orangered-hippopotamus-866396.hostingersite.com
tar xzf facilitypro-deploy.tar.gz && mv app facilitypro

# 4. Configure environment
cd ~/facilitypro
cp .env.example .env
nano .env
# Set: JWT_SECRET, APP_URL
# Remove: PORT (cPanel sets it)

# 5. Create Node.js app in cPanel
# cPanel → Software → Setup Node.js App
# Node.js: 20.x | Root: facilitypro | Startup: server.js

# 6. Initialize database
npx prisma generate
npx prisma db push

# 7. Setup SSL
# cPanel → SSL/TLS Status → Issue SSL

# 8. Verify
curl https://orangered-hippopotamus-866396.hostingersite.com/api/health
```

Done! Your FacilityPro application is live at:
  https://orangered-hippopotamus-866396.hostingersite.com 🚀