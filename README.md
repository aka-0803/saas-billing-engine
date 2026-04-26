# SaaS Billing Engine

A production-style multi-tenant SaaS billing backend built with **NestJS**, **Prisma (MySQL)**, **Redis**, **BullMQ**, and **AWS** (S3 + RDS).

> Portfolio project demonstrating backend architecture, async job queues, cloud storage, usage-based billing, and containerised deployment.

---

## Architecture & Request Flow

```
HTTP Request
     ↓
[RateLimitGuard]       ← GLOBAL — per-tenant sliding 60s window (plan-aware, Redis)
     ↓
[JwtAuthGuard]         ← per controller — Bearer token → req.user { userId, tenantId }
     ↓
[RolesGuard]           ← per route — @Roles('admin') enforces admin-only access
     ↓
[ValidationPipe]       ← GLOBAL — class-validator, whitelist, transform
     ↓
[Controller → Service → Prisma (MySQL)]
     ↓ (post-response)
[UsageInterceptor]     ← GLOBAL — auto-increments tenant usage +1

── Invoice generation ──────────────────────────────────────────
BillingService.generateInvoice()
     ↓
[Invoice row created]  ← synchronous, pdf_url = null
     ↓
[BullMQ job enqueued]  ← non-blocking, stored in Redis
     ↓ (background worker)
[InvoiceProcessor]     ← generates PDF → uploads to S3 → saves pdf_url

── Invoice download ─────────────────────────────────────────────
GET /billing/invoice/:id/download
     ↓
[S3Service.getPresignedUrl()]  ← 15-min time-limited URL
     ↓
{ download_url }       ← client downloads directly from S3
```

---

## Module Structure

```
backend/src/
├── prisma/          — PrismaService (global module)
├── redis/           — RedisService (ioredis wrapper)
├── storage/         — S3Service: upload + presigned URL generation
├── auth/            — JWT auth: signup, login, JwtStrategy, JwtAuthGuard
│   ├── decorators/  — @Roles() SetMetadata decorator
│   └── guards/      — JwtAuthGuard, RolesGuard
├── user/            — User CRUD, role management, soft delete
├── tenant/          — Tenant CRUD, soft delete
├── plan/            — Plan CRUD (price, usage_limit, rate_limit_per_minute)
├── subscription/    — Lifecycle: create, cache, usage tracking, renewal
│   └── usage.interceptor.ts  ← auto-tracks every authenticated request
├── billing/
│   ├── billing.constants.ts  ← INVOICE_QUEUE constant (isolated to avoid circular imports)
│   ├── billing.service.ts    ← invoice generation (producer) + presigned URL
│   ├── billing.controller.ts ← HTTP endpoints
│   └── invoice.processor.ts  ← BullMQ worker: PDF → S3 → pdf_url saved
├── payments/        — Webhook simulation, idempotency key deduplication
└── rate-limit/      — Global RateLimitGuard (plan-aware, Redis-backed)
```

---

## Data Models

```
Tenant ──< User
Tenant ──< Subscription >── Plan
Subscription ──< Invoice        (has pdf_url → S3 key)
Subscription ──< UsageRecord
Tenant ──< Invoice
Tenant ──< UsageRecord
```

All models use **soft delete** (`is_deleted` int flag) and have `created_at` + `modified_time`.

**Invoice fields:** `amount`, `status` (PENDING/PAID), `pdf_url` (S3 key, null until worker runs), `billing_period_start/end`.

**Plan fields:** `name`, `price`, `usage_limit`, `rate_limit_per_minute`.

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Register user to a tenant |
| POST | `/auth/login` | — | Returns JWT access token |
| POST | `/tenant/create` | JWT + Admin | Create tenant |
| GET | `/tenant` | JWT | List active tenants |
| DELETE | `/tenant/:id` | JWT + Admin | Soft delete tenant |
| POST | `/plan/create` | JWT + Admin | Create plan |
| GET | `/plan` | JWT | List active plans |
| POST | `/subscription/create` | JWT | Create subscription + enqueue initial invoice PDF |
| GET | `/subscription/:id` | JWT | Get subscription (Redis-cached 5 min) |
| POST | `/subscription/increment-usage` | JWT | Manual usage increment |
| POST | `/subscription/renew/:id` | JWT | Invoice period → roll dates → reset usage |
| POST | `/billing/generate-invoice/:subscriptionId` | JWT | Create invoice + enqueue PDF generation job |
| POST | `/billing/run` | JWT + Admin | Trigger billing cron manually |
| GET | `/billing/invoice/:id/download` | JWT | Get 15-min pre-signed S3 URL for invoice PDF |
| POST | `/payments/webhook` | JWT | Simulate payment, mark invoice PAID |
| GET | `/users` | JWT | Get users for a tenant |
| POST | `/users` | JWT + Admin | Create user (admin only) |
| PATCH | `/users` | JWT | Update user / soft delete |

Swagger UI: `http://localhost:3000/api/docs`

---

## Key Behaviours

### Billing & Invoices
- **Overage pricing:** `total = plan.price + max(0, usage − limit) × $2.00/unit`
- **Async PDF generation:** Invoice row is created instantly; PDF is generated and uploaded to S3 by a background BullMQ worker (3 retries, exponential backoff: 2s → 4s → 8s)
- **Download flow:** `GET /billing/invoice/:id/download` returns `{ download_url }` — a pre-signed S3 URL valid for 15 minutes. Client downloads directly from S3, no bandwidth cost on the app server
- **Daily cron** (`0 0 * * *`): finds all ACTIVE subscriptions where `end_date ≤ today`, invoices and renews them
- **Renewal sequence:** invoice completed period first (with actual usage) → roll dates +1 month → reset usage → invalidate Redis cache

### RBAC
- `@Roles('admin')` decorator marks routes as admin-only
- `RolesGuard` performs a DB lookup of `user.role` on every protected request — role changes take effect immediately (not encoded in JWT)
- Routes without `@Roles()` remain open to any authenticated user

### Queue (BullMQ)
- Uses the same Redis instance as rate limiting and subscription caching
- `INVOICE_QUEUE = 'invoice'` defined in `billing.constants.ts` (not in `billing.module.ts`) to prevent circular import
- Failed jobs are retained in Redis for debugging; completed jobs are auto-removed

### AWS S3
- Bucket: `saas-billing-invoices-akash` (eu-north-1), private, SSE-S3 encryption
- S3 key format: `invoices/invoice-{id}.pdf` — deterministic so retried jobs safely overwrite
- Pre-signed URLs expire in 15 minutes; the S3 key is stored permanently on the Invoice row

### Rate Limiting
- Sliding 60s Redis counter per tenant (`x-tenant-id` header)
- Limit sourced from `plan.rate_limit_per_minute` (Redis-cached 5 min), fallback 60 req/min

### Usage Tracking
- Global `UsageInterceptor` fires post-response on every authenticated request
- Increments `current_usage` on the active subscription and writes a `UsageRecord`
- Errors are silently swallowed — never breaks the response

### Idempotency
- `Idempotency-Key` header on `POST /payments/webhook` deduplicates within 24 h via Redis

---

## Getting Started

### Local (without Docker)
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

### Local (with Docker)
```bash
# From repo root — starts app + Redis (MySQL must be running separately)
docker compose up -d --build
```

Swagger UI available at `http://localhost:3000/api/docs`

---

## Docker & Deployment

### How the Container Works

The `backend/Dockerfile` uses a **multi-stage build**:

1. **Builder stage** (`node:20-alpine`): installs all dependencies, generates the Prisma client, and compiles TypeScript to `dist/`
2. **Production stage** (`node:20-alpine`): copies only `dist/`, `node_modules/`, and `prisma/` from the builder — no compiler or dev tools shipped to production (~200 MB vs ~500 MB)

On container start, `prisma migrate deploy` runs automatically against the configured database before the app boots. This is idempotent — safe to run on every restart.

### docker-compose.yml

Defines two services:
- `app` — the NestJS container, reads `.env`, overrides `REDIS_HOST=redis`
- `redis` — Redis 7 Alpine with a healthcheck; `app` waits for it to be healthy before starting

MySQL is **not** in Compose — it runs on AWS RDS. `DATABASE_URL` in `.env` points to the RDS endpoint.

### AWS EC2 Production Deploy

**Prerequisites** (AWS Console — one time):
1. Create EC2 instance: `t2.micro`, Amazon Linux 2023, port 22 + 3000 open in Security Group
2. Create RDS MySQL: `db.t3.micro` free tier, same VPC as EC2, private access only
3. Assign an Elastic IP to the EC2 instance

**Deploy steps** (SSH into EC2):
```bash
# Install Docker
sudo yum install -y docker git
sudo service docker start
sudo usermod -aG docker ec2-user
sudo systemctl enable docker

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
exit && ssh -i saas-billing-key.pem ec2-user@<elastic-ip>

# Clone and configure
git clone https://github.com/aka-0803/saas-billing-engine.git
cd saas-billing-engine
cp .env.example .env
nano .env   # fill in RDS URL, JWT secret, AWS keys

# Start
docker compose up -d --build
docker compose logs -f app
```

Swagger UI available at `http://<elastic-ip>:3000/api/docs`

---

## Environment Variables

```env
DATABASE_URL=mysql://admin:<password>@<rds-endpoint>:3306/billing_db
JWT_SECRET=your-32-plus-char-secret
REDIS_HOST=redis            # set to 'redis' in Docker Compose; 'localhost' for local dev
REDIS_PORT=6379
PORT=3000                   # optional, defaults to 3000

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-north-1
S3_BUCKET_NAME=saas-billing-invoices-akash
```

Copy `.env.example` to `.env` and fill in values before starting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| Database | MySQL (AWS RDS in production) |
| Cache / Rate-limit / Queue storage | Redis (ioredis) |
| Job Queue | BullMQ (`@nestjs/bullmq`) |
| Auth | JWT (`@nestjs/jwt`), bcrypt, passport-jwt |
| RBAC | `RolesGuard` + `@Roles()` decorator |
| Cloud Storage | AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| PDF | pdfkit |
| Scheduler | `@nestjs/schedule` |
| Docs | Swagger (`@nestjs/swagger`) |
| Containers | Docker + Docker Compose |
| Compute | AWS EC2 (t2.micro, Amazon Linux 2023) |

---

## Migrations

| Migration | Description |
|---|---|
| `20260302190356_init` | Initial schema — Tenant, User, Plan, Subscription, UsageRecord, Invoice |
| `20260413190806_add_rate_limit_per_minute_to_plan` | Added `rate_limit_per_minute` to Plan |
| `20260424170007_add_pdf_url_to_invoice` | Added `pdf_url String?` to Invoice for S3 key storage |