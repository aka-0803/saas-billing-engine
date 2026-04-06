# SaaS Billing Engine

A production-style multi-tenant SaaS billing backend built with NestJS, Prisma, and MySQL. Supports subscription plans, usage metering, invoice generation, and payment processing.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS (modular architecture) |
| ORM | Prisma |
| Database | MariaDB (MySQL-compatible) |
| Cache / Rate Limit | Redis (ioredis) |
| Scheduler | @nestjs/schedule (cron) |
| PDF Generation | pdfkit |
| API Docs | Swagger (`/api/docs`) |

---

## Features Implemented

### Tenant Management
- Create tenants
- List all active tenants
- Soft delete (data never lost)

### Plan Management
- Create billing plans with name, price, and usage limit
- List all plans

### Subscription Lifecycle
- Create subscriptions (auto-generates initial invoice)
- Track current usage in real time
- Cache subscription data in Redis (300s TTL)
- **Renew subscriptions** (industry-standard: invoice completed period → roll dates → reset usage)

### Billing System
- `generateInvoice(subscriptionId)` — reusable core method
  - Base price + overage charges (`$2/unit` over limit)
  - Creates `PENDING` invoice with billing period dates
- `processRenewal(subscriptionId)` — full renewal flow:
  1. Invoice with actual usage from completed period
  2. Roll `start_date` / `end_date` forward by 1 month
  3. Reset `current_usage = 0`
- **Daily billing cron** (`0 0 * * *`) — processes all subscriptions where `end_date <= today`
  - Industry-standard approach (vs fixed 1st-of-month): handles mid-month signups correctly
- Manual trigger: `POST /billing/run`
- **PDF invoice download**: `GET /billing/invoice/:id/download`

### Payment Processing
- Webhook simulation: `POST /payments/webhook`
- Marks invoice as `PAID`
- **Idempotent**: duplicate calls return existing result without double-updating

### Infrastructure
- Redis-backed rate limiting (100 req/60s per tenant via `x-tenant-id` header)
- Swagger docs at `/api/docs`

---

## Architecture

```
Client
  │
  ▼
NestJS API (port 3000)
  ├── TenantModule      → Tenant CRUD
  ├── PlanModule        → Plan CRUD
  ├── SubscriptionModule → Subscription lifecycle
  │     └── calls BillingService.generateInvoice() on create/renew
  ├── BillingModule     → Invoice generation, renewal, PDF export
  │     └── Daily cron: processRenewal() for due subscriptions
  └── PaymentsModule    → Webhook handler (mark invoice PAID)
        │
        ▼
  PrismaService → MySQL
        │
  RedisService  → Redis (cache + rate limiting)
```

**Dependency flow (no circular deps):**
```
SubscriptionService → BillingService → PrismaService
BillingController   → BillingService
PaymentsService     → PrismaService
```

---

## Data Models

| Model | Key Fields |
|-------|-----------|
| `Tenant` | id, name, is_deleted |
| `Plan` | id, name, price, usage_limit |
| `Subscription` | id, tenant_id, plan_id, start_date, end_date, status, current_usage |
| `Invoice` | id, tenant_id, subscription_id, amount, billing_period_start/end, status |
| `UsageRecord` | id, tenant_id, subscription_id, usage_count, recorded_at |
| `User` | id, email, password, role, tenant_id |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tenants` | Create a tenant |
| `GET` | `/tenants` | List all tenants |
| `POST` | `/tenants/:id` | Soft delete a tenant |
| `POST` | `/plans` | Create a plan |
| `GET` | `/plans` | List all plans |
| `POST` | `/subscription/create` | Create subscription (auto-generates invoice) |
| `POST` | `/subscription/increment-usage` | Add usage units |
| `POST` | `/subscription/renew/:id` | Renew subscription + generate invoice |
| `GET` | `/subscription/:id` | Get subscription (Redis-cached) |
| `POST` | `/billing/run` | Manually trigger billing cycle |
| `GET` | `/billing/invoice/:id/download` | Download invoice as PDF |
| `POST` | `/payments/webhook` | Mark invoice as PAID (idempotent) |

---

## Billing Logic

```
Invoice Amount = plan.price + (overage_units × $2.00)

where:
  overage_units = max(0, current_usage - plan.usage_limit)
```

### Renewal Sequence (Industry Standard)
```
1. Generate invoice for completed period (using actual usage + old dates)
2. Update subscription:
   - start_date = old end_date
   - end_date   = old end_date + 1 month
   - current_usage = 0   ← critical: resets for new billing period
3. Cron runs daily → picks up any subscription where end_date <= today
```

---

## Setup

```bash
# Install dependencies
cd backend && npm install

# Set up environment
cp .env.example .env
# Edit DATABASE_URL in .env

# Run Prisma migrations
npx prisma migrate dev

# Start development server
npm run start:dev

# Swagger docs
open http://localhost:3000/api/docs
```

---

## Next Steps

- [ ] Redis caching layer improvements (cache invalidation on plan changes)
- [ ] BullMQ job queue (async invoice processing, retry on failure)
- [ ] Auth (JWT + role-based guards)
- [ ] Subscription status transitions: `PAYMENT_DUE` → `SUSPENDED` → `CANCELLED`
- [ ] Email notifications (invoice generated, payment due)
- [ ] Docker + docker-compose setup
- [ ] Deployment pipeline (CI/CD)
