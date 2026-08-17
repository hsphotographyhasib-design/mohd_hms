# MOHD.HMS ENTERPRISE — FastAPI Backend

> Multi-tenant facility management system — HMS Enterprise API

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [API Versioning](#api-versioning)
- [Endpoint Summary](#endpoint-summary)
- [Authentication](#authentication)
- [RBAC — Role-Based Access Control](#rbac--role-based-access-control)
- [Multi-Tenancy](#multi-tenancy)
- [Caching](#caching)
- [Middleware Stack](#middleware-stack)
- [Testing](#testing)
- [Deployment](#deployment)
- [Frontend Migration](#frontend-migration)
- [Project Structure](#project-structure)
- [License](#license)

---

## Project Overview

**MOHD.HMS ENTERPRISE** is a production-grade FastAPI backend for a multi-tenant hospitality and facility management system (HMS). It replaces the existing Express/Next.js API routes with a dedicated Python service, providing:

- **303 RESTful API endpoints** across 33 feature modules
- **11 user roles** with feature-level + action-level permission enforcement
- **Multi-tenant data isolation** — every query auto-scoped by `tenantId`
- **JWT-compatible authentication** — tokens work interchangeably with the frontend's NextAuth layer
- **Upstash Redis caching** with cache-through pattern and graceful degradation
- **Docker-first deployment** with Render.com support

| Metric | Value |
|---|---|
| Python files | 153 |
| Lines of code | ~39,000 |
| Feature modules | 33 |
| API endpoints | 303 |
| Test cases | 69 |
| Dependencies | 15 |

---

## Architecture

The backend follows a **feature-based modular architecture** with a clean separation of concerns:

```
Request
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Middleware Stack                                     │
│  (CORS → Rate Limit → Security Headers →              │
│   Logging → Request ID → Size Limit)                  │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Router Layer  (app/features/<module>/router.py)       │
│  — HTTP handlers, request validation, response       │
│    formatting, dependency injection                    │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Service Layer  (app/features/<module>/service.py)    │
│  — Business logic, data transformation,              │
│    cross-module orchestration                          │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Database Layer  (app/core/database.py)               │
│  — Supabase PostgREST via httpx.AsyncClient           │
│  — CRUD helpers: query, insert, update, delete, count  │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Supabase  (PostgreSQL + PostgREST + Auth + Storage)  │
└──────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **No ORM** — Direct PostgREST queries via `httpx.AsyncClient` for maximum transparency and performance
2. **Supabase as BaaS** — Auth, database, storage, and realtime are all handled by Supabase
3. **Feature modules** — Each module is self-contained with its own router, service, schemas, and tests
4. **Centralized RBAC** — Single source of truth in `app/rbac/permissions.py` (mirrored from frontend)
5. **Dependency injection** — Auth, database, settings, and RBAC are all injected via FastAPI `Depends()`
6. **Graceful degradation** — Redis failures do not crash the app; caching is optional

---

## Quick Start

### Option 1: Local Development

```bash
# Clone and enter the backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at **http://localhost:8000** with hot-reload enabled.

### Option 2: Docker

```bash
# Build and run
docker build -t mohd-hms-backend .
docker run -p 8000:8000 --env-file .env mohd-hms-backend

# Or with Docker Compose (if available)
docker compose up --build
```

### Option 3: Render.com

1. Connect your Git repository to [Render.com](https://render.com)
2. Render auto-detects the `render.yaml` configuration
3. Set the required environment variables in the Render dashboard
4. Deploy — the health check at `/health` confirms readiness

---

## Environment Variables

All configuration is loaded from environment variables (with `.env` file support for local development).

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | No | `production` | `development` / `production` |
| `APP_NAME` | No | `MOHD.HMS ENTERPRISE` | Application name |
| `APP_VERSION` | No | `1.0.0` | Version string |
| `PORT` | No | `8000` | Server port |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `JWT_SECRET` | **Yes** | — | HMAC secret for JWT signing |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE` | No | `604800` | Token TTL in seconds (7 days) |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Supabase service role key |
| `SUPABASE_ANON_KEY` | **Yes** | — | Supabase anonymous key |
| `UPSTASH_REDIS_REST_URL` | No | — | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | Upstash Redis token |
| `FIREBASE_PROJECT_ID` | No | — | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | No | — | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | No | — | Firebase service account private key |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `EMAIL_HOST` | No | — | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USERNAME` | No | — | SMTP username |
| `EMAIL_PASSWORD` | No | — | SMTP password |
| `WHATSAPP_API_URL` | No | — | WhatsApp Business API URL |
| `WHATSAPP_TOKEN` | No | — | WhatsApp Business API token |
| `GOOGLE_MAPS_API_KEY` | No | — | Google Maps API key |

See [`.env.example`](.env.example) for the full template.

---

## API Documentation

When running in **development** mode (`APP_ENV=development`), interactive documentation is available:

| URL | Format | Description |
|---|---|---|
| `/docs` | Swagger UI | Interactive API explorer |
| `/redoc` | ReDoc | Alternative documentation viewer |
| `/openapi.json` | OpenAPI 3.1 | Machine-readable spec |

> **Note:** Documentation endpoints are disabled in production for security.

---

## API Versioning

All feature endpoints are mounted under the `/api/v1/` prefix:

```
http://localhost:8000/api/v1/auth/login
http://localhost:8000/api/v1/complaints
http://localhost:8000/api/v1/work-orders
http://localhost:8000/api/v1/invoices/{id}
```

Health check endpoints are at the root level (outside `/api/v1`):

```
GET /health          → Liveness probe
GET /health/ready    → Readiness probe (checks Supabase + Redis)
```

---

## Endpoint Summary

| Module | Prefix | Endpoints | Description |
|---|---|---|---|
| **auth** | `/auth` | 22 | Login, register, OAuth, OTP, password reset, token refresh, sessions |
| **users** | `/users` | 4 | User profile, update, list |
| **admin** | `/admin/users` | 4 | Admin user management (create, delete, role assignment) |
| **employees** | `/employees` | 2 | Employee CRUD |
| **technicians** | `/technicians` | 5 | Technician listing, availability, assignment |
| **departments** | `/departments` | 2 | Department listing |
| **complaints** | `/complaints` | 10 | Complaint CRUD, assignment, workflow, escalation |
| **work-orders** | `/work-orders` | 5 | Work order CRUD, status transitions |
| **equipment** | `/equipment` | 5 | Equipment registry, QR codes, maintenance history |
| **pm** | `/pm` | 2 | Preventive maintenance scheduling |
| **quotations** | `/quotations` | 13 | Quotation CRUD, convert to WO/invoice, PDF, send |
| **invoices** | `/invoices` | 10 | Invoice CRUD, payment recording, PDF, send |
| **payments** | `/payments` | 2 | Payment processing, verification |
| **customers** | `/customers` | 3 | Customer CRUD |
| **dashboard** | `/dashboard` | 4 | KPI stats, charts, recent activity |
| **notifications** | `/notifications` | 8 | Push, in-app, FCM, mark-read, device management |
| **presence** | `/presence` | 3 | Attendance, check-in/out, location tracking |
| **inventory** | `/inventory` | 16 | Items, warehouses, categories, suppliers, stock, price book |
| **purchases** | `/purchases` | 1 | Purchase order creation |
| **finance** | `/finance` | 1 | Financial reports, GL entries |
| **vehicles** | `/vehicles` | 3 | Fleet management |
| **hr** | `/hr` | 42 | Leave, attendance, payroll, recruitment, training, shifts, visitors, disciplinary, medical, assets, expenses, performance, announcements, documents, travel, holidays, settings, reports |
| **irms** | `/irms` | 24 | Inspections, templates, checklists, photos, signatures, analytics |
| **cms** | `/cms` | 48 | Pages, SEO, media, builder, publishing |
| **whatsapp** | `/whatsapp` | 20 | Templates, campaigns, AI replies, settings, reports |
| **email** | `/email` | 13 | Templates, campaigns, sending, logs, settings |
| **documents** | `/documents` | 7 | Upload, download, versioning, categories |
| **sessions** | `/sessions` | 8 | Active sessions, device info, revoke |
| **settings** | `/settings` | 1 | System configuration (Super Admin only) |
| **reports** | `/reports` | 1 | Report generation and export |
| **service-items** | `/service-items` | 4 | Service item catalog |
| **service-categories** | `/service-categories` | 2 | Service category management |
| **service-packages** | `/service-packages` | 2 | Bundle/package management |
| **labour-rates** | `/labour-rates` | 2 | Labour rate management |
| **price-book** | `/price-book` | 2 | Price book management |
| **health** | `/` | 2 | Liveness and readiness probes |
| | | **303** | **Total** |

---

## Authentication

All protected endpoints require a **JWT Bearer token** in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Details

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Expiry | 7 days (604,800 seconds) |
| Temp tokens | 30 minutes (OTP, password reset) |
| Password hashing | bcrypt with auto-generated salt |

### JWT Payload

```json
{
  "userId": "usr-abc-123",
  "tenantId": "tenant-xyz-456",
  "role": "admin",
  "email": "admin@example.com",
  "name": "Admin User",
  "exp": 1700000000,
  "iat": 1699393600
}
```

> **Compatibility:** Tokens are fully compatible with the existing NextAuth/Express auth layer. The same token works for both the frontend API routes and the FastAPI backend.

### Auth Flow

1. User submits credentials to `POST /api/v1/auth/login`
2. Server validates against Supabase Auth and returns a signed JWT
3. Client includes the JWT in the `Authorization` header for all subsequent requests
4. The `get_current_user` dependency extracts and validates the token on every protected endpoint

---

## RBAC — Role-Based Access Control

The system implements a comprehensive, two-tier permission model that is the **exact backend mirror** of the frontend's `permissions-matrix.ts`.

### Role Hierarchy

| Role | Level | Description |
|---|---|---|
| `super_admin` | 100 | Full system access, all tenants (if multi-tenant admin) |
| `admin` | 90 | Full tenant access, user management |
| `manager` | 80 | Department-level oversight |
| `supervisor` | 70 | Team supervision, work assignment |
| `technician` | 50 | Assigned work execution |
| `finance` | 60 | Financial data and invoicing |
| `hr` | 55 | People management, payroll |
| `user` | 40 | General read access |
| `customer` | 10 | Own data only |
| `vendor` | 5 | *(Deprecated)* |
| `guest` | 0 | *(Deprecated)* |

### Two-Tier Permissions

1. **Feature-level** — Controls which modules a role can access:
   ```python
   FEATURE_PERMISSIONS = {
       "complaints": ["super_admin", "admin", "manager", "supervisor", "technician", "user", "customer"],
       "settings":   ["super_admin"],
       "finance":    ["super_admin", "admin", "finance"],
       ...
   }
   ```

2. **Action-level** — Controls specific operations within a feature:
   ```python
   ACTION_PERMISSIONS = {
       "complaint": {
           "create":             ["super_admin", "admin", "manager", "supervisor", "technician", "customer"],
           "delete":             ["super_admin", "admin"],
           "assign_technician":  ["super_admin", "admin", "supervisor", "manager"],
           "override_status":    ["super_admin", "admin"],
           ...
       }
   }
   ```

### Usage in Endpoints

```python
from app.api.dependencies import require_role, require_min_role, require_permission

@router.get("/dashboard")
async def get_dashboard(
    user: AuthUser = Depends(require_min_role("user")),
): ...

@router.delete("/complaints/{id}")
async def delete_complaint(
    user: AuthUser = Depends(require_permission("complaint.delete")),
): ...
```

### Data Scope

Role-based data scoping ensures users can **only see data they're authorized to access**:

- **super_admin / admin** → Full tenant data
- **manager** → Department technicians' data
- **supervisor** → Own team's assigned records
- **technician** → Only records assigned to them
- **customer** → Only their own records
- **finance** → Tenant invoices and customer data

This is enforced server-side in `app/rbac/data_scope.py` — URL manipulation cannot bypass it.

---

## Multi-Tenancy

Every database query is automatically filtered by `tenantId` extracted from the JWT token:

```python
# In every service call:
async def list_complaints(tenant_id: str, ...):
    return await query_table("complaints", tenant_id=tenant_id, ...)
```

**Security guarantee:** Even if a `tenantId` parameter is manually included in a request URL, the server always overrides it with the value from the verified JWT. Cross-tenant data leakage is impossible at the API level.

---

## Caching

### Upstash Redis Integration

Caching is implemented via the Upstash Redis **REST API** (not redis-py), using `httpx` for async calls.

### Cache-Through Pattern

```python
from app.integrations.redis import get_redis

redis = get_redis()

# Automatic cache-through: checks Redis first, falls back to fetcher
data = await redis.cached_fetch(
    key="hms:tenant-123:dashboard:stats",
    fetcher=lambda: fetch_dashboard_stats(tenant_id),
    ttl=300,  # 5 minutes
)
```

### Key Structure

All cache keys follow the format: `hms:{tenant_id}:{feature}:{identifier}`

Example: `hms:tenant-abc:dashboard:stats:daily`

### Graceful Degradation

If Redis is unavailable, all operations silently fall through to direct database queries. No requests fail due to cache issues. Redis availability is reported in the `/health/ready` endpoint.

---

## Middleware Stack

Middleware is applied in order (outermost first):

| Order | Middleware | Purpose |
|---|---|---|
| 1 | `RequestSizeLimitMiddleware` | Rejects requests > 10 MB |
| 2 | `RateLimitMiddleware` | Rate limiting per client IP |
| 3 | `SecurityHeadersMiddleware` | Adds security headers to responses |
| 4 | `LoggingMiddleware` | Structured request/response logging |
| 5 | `RequestIDMiddleware` | Generates/propagates `X-Request-ID` |
| 6 | `CORSMiddleware` | Cross-origin resource sharing |

All middleware skips health check and documentation paths for performance.

---

## Testing

### Test Framework

- **pytest** + **pytest-asyncio** for async test support
- **httpx.AsyncClient** with ASGI transport (no real HTTP server needed)
- Mocked Supabase and Redis (no external dependencies)

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=term-missing
```

### Test Infrastructure

The test suite (`tests/conftest.py`) provides:

- **`app` fixture** — Fresh FastAPI app per test (bypasses lifespan/real connections)
- **`client` fixture** — Async httpx client with real JWT auth
- **`sa_client`, `admin_client`, `customer_client`, `tech_client`** — Pre-authenticated clients for each role
- **`mock_db` fixture** — In-memory data stores that simulate database CRUD
- **`make_auth_headers(role)`** — Helper to generate valid JWT for any role
- **`create_test_app(overrides)`** — Custom app factory for dependency injection

### Test Coverage

| Test File | Tests | Coverage |
|---|---|---|
| `test_health.py` | 5 | Health/ready endpoints, 404 handling |
| `test_auth.py` | 18 | Login, register, me, profile, OTP, refresh, logout, RBAC |
| `test_rbac.py` | 21 | Role hierarchy, permissions matrix, role transitions |
| `test_complaints.py` | 25 | CRUD, workflow, escalation, assignment, status transitions |
| **Total** | **69** | **All passing** |

---

## Deployment

### Docker

```dockerfile
# Multi-stage build (Python 3.12-slim)
# Non-root user, health check built-in
# See Dockerfile for details
docker build -t mohd-hms-backend .
docker run -p 8000:8000 --env-file .env mohd-hms-backend
```

### Render.com

The repository includes `render.yaml` for zero-config deployment:

- **Runtime:** Python 3.12
- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `/health`
- **Auto-deploy:** Enabled on push

### Environment Checklist

Before deploying to production, ensure these environment variables are set:

- [ ] `APP_ENV=production`
- [ ] `JWT_SECRET` — Use a strong random string (min 32 characters)
- [ ] `SUPABASE_URL` + keys — Production Supabase project
- [ ] `UPSTASH_REDIS_REST_URL` + token — For caching (recommended)
- [ ] `CORS_ORIGINS` — Your production frontend URL(s)

---

## Frontend Migration

The backend is designed for a **zero-change migration** from the Next.js API routes.

### Setup

Set the `NEXT_PUBLIC_API_URL` environment variable in your Next.js frontend to route all `/api/...` calls to the FastAPI backend:

```bash
# .env.local (Next.js frontend)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

### How It Works

The frontend's `api-client.ts` (`resolveApiUrl()`) rewrites all relative API calls:

```
Before:  fetch('/api/v1/complaints')  →  Next.js API route
After:   fetch('/api/v1/complaints')  →  https://your-backend.onrender.com/api/v1/complaints
```

When `NEXT_PUBLIC_API_URL` is empty or unset, behavior is unchanged — calls continue to go through Next.js API routes.

### JWT Compatibility

The FastAPI backend uses the **same JWT secret** and **same payload format** (`{userId, tenantId, role, email}`) as the NextAuth layer. Tokens issued by either system are accepted by both.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # Application entry point, lifespan, middleware
│   ├── api/
│   │   ├── router.py              # Main API router — aggregates all feature routers
│   │   └── dependencies.py        # Auth, DB, RBAC dependency injection
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (env vars)
│   │   ├── database.py            # Supabase PostgREST client + CRUD helpers
│   │   ├── security.py            # JWT, bcrypt, OTP generation
│   │   ├── exceptions.py           # Custom exception handlers
│   │   ├── logging.py              # Structured logging (structlog)
│   │   └── middleware.py          # Request logging, rate limit, security headers
│   ├── rbac/
│   │   ├── permissions.py         # Feature + action permission matrix
│   │   ├── data_scope.py           # Role-based data scoping
│   │   └── audit.py               # Audit trail utilities
│   ├── integrations/
│   │   ├── redis.py               # Upstash Redis REST client
│   │   ├── supabase.py            # Supabase client wrapper
│   │   ├── email.py               # SMTP email integration
│   │   ├── whatsapp.py            # WhatsApp Business API
│   │   ├── firebase.py            # Firebase Admin SDK
│   │   └── schemas.py             # Integration Pydantic models
│   ├── utils/
│   │   ├── pagination.py          # Offset/limit pagination helper
│   │   └── helpers.py             # General utility functions
│   └── features/                  # 33 feature modules, each with:
│       ├── auth/                  #   router.py, service.py, schemas.py, __init__.py
│       ├── users/
│       ├── employees/
│       ├── technicians/
│       ├── departments/
│       ├── complaints/
│       ├── work_orders/
│       ├── equipment/
│       ├── pm/
│       ├── quotations/
│       ├── invoices/
│       ├── payments/
│       ├── customers/
│       ├── dashboard/
│       ├── notifications/
│       ├── presence/
│       ├── inventory/
│       ├── purchases/
│       ├── finance/
│       ├── vehicles/
│       ├── hr/
│       ├── irms/
│       ├── cms/
│       ├── whatsapp/
│       ├── email/
│       ├── documents/
│       ├── sessions/
│       ├── settings/
│       ├── reports/
│       └── service_items/
├── tests/
│   ├── conftest.py                # Shared fixtures, mock DB, JWT helpers
│   ├── test_health.py             # Health endpoint tests
│   ├── test_auth.py               # Authentication tests
│   ├── test_rbac.py               # RBAC permission tests
│   └── test_complaints.py         # Complaints workflow tests
├── .env.example                   # Environment variable template
├── .gitignore
├── Dockerfile                     # Multi-stage production build
├── render.yaml                    # Render.com deployment config
├── pyproject.toml                 # Python project metadata
└── requirements.txt               # Python dependencies
```

---

## License

Proprietary — MOHD.HMS ENTERPRISE. All rights reserved.
