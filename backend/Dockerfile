# ── Stage 1: Builder ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifest first — cached layer, only reruns if package.json changes
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# Copy source and compile TypeScript → dist/
COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Only copy what the app needs to run — no compiler, no source, no dev tools
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma
COPY package*.json ./
# prisma.config.ts provides DATABASE_URL to the Prisma CLI (Prisma 7 config-file approach)
COPY prisma.config.ts ./

EXPOSE 3000

# Run pending migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
