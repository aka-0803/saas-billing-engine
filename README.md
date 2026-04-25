# SaaS Billing Engine

A production-style multi-tenant SaaS billing backend built with **NestJS**, **Prisma (MySQL)**, **Redis**, and **AWS S3**.

> Portfolio project demonstrating backend architecture, async job queues, cloud storage, and usage-based billing at scale.

---

## Architecture & Request Flow

```
HTTP Request
     ↓
[RateLimitGuard]       ← GLOBAL — per-tenant sliding 60s window (plan-aware, Redis)
     ↓
[JwtAuthGuard]         ← per controller — Bearer token → req.user { userId, tenantId }
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
| POST | `/tenant/create` | JWT | Create tenant |
| GET | `/tenant` | JWT | List active tenants |
| DELETE | `/tenant/:id` | JWT | Soft delete tenant |
| POST | `/plan/create` | JWT | Create plan |
| GET | `/plan` | JWT | List active plans |
| POST | `/subscription/create` | JWT | Create subscription + enqueue initial invoice PDF |
| GET | `/subscription/:id` | JWT | Get subscription (Redis-cached 5 min) |
| POST | `/subscription/increment-usage` | JWT | Manual usage increment |
| POST | `/subscription/renew/:id` | JWT | Invoice period → roll dates → reset usage |
| POST | `/billing/generate-invoice/:subscriptionId` | JWT | Create invoice + enqueue PDF generation job |
| POST | `/billing/run` | JWT | Trigger billing cron manually |
| GET | `/billing/invoice/:id/download` | JWT | Get 15-min pre-signed S3 URL for invoice PDF |
| POST | `/payments/webhook` | JWT | Simulate payment, mark invoice PAID |
| GET | `/users` | JWT | Get users for a tenant |
| POST | `/users` | JWT | Create user (admin) |
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

### Queue (BullMQ)
- Uses the same Redis instance as rate limiting and subscription caching
- `INVOICE_QUEUE = 'invoice'` defined in `billing.constants.ts` (not in `billing.module.ts`) to prevent circular import — `billing.module.ts` imports `BillingService` which imports the queue token; keeping the constant in a neutral file breaks the cycle
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

## Environment Variables

```env
DATABASE_URL=mysql://user:pass@localhost:3306/billing_db
JWT_SECRET=your-secret
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000                    # optional, defaults to 3000

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=your-region
S3_BUCKET_NAME=your-bucket-name
```
---

## Getting Started

```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| Database | MySQL |
| Cache / Rate-limit / Queue storage | Redis (ioredis) |
| Job Queue | BullMQ (`@nestjs/bullmq`) |
| Auth | JWT (`@nestjs/jwt`), bcrypt, passport-jwt |
| Cloud Storage | AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| PDF | pdfkit |
| Scheduler | `@nestjs/schedule` |
| Docs | Swagger (`@nestjs/swagger`) |
| Infra | Docker, AWS EC2 (planned — Phase 6) |

---

## Migrations

| Migration | Description |
|---|---|
| `20260302190356_init` | Initial schema — Tenant, User, Plan, Subscription, UsageRecord, Invoice |
| `20260413190806_add_rate_limit_per_minute_to_plan` | Added `rate_limit_per_minute` to Plan |
| `20260424170007_add_pdf_url_to_invoice` | Added `pdf_url String?` to Invoice for S3 key storage |

---

## What's Pending (Phase 6)

- **Docker Compose** — Dockerfile for the NestJS app + `docker-compose.yml` (app + Redis; MySQL on RDS free tier)
- **RBAC enforcement** — `RolesGuard` + `@Roles('admin')` decorator; `role` field exists in User model but is not yet enforced at the guard level
- **AWS EC2 deploy** — deploy the compose stack with production env vars
