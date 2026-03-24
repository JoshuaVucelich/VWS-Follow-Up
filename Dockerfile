# =============================================================================
# Dockerfile
#
# Multi-stage Docker build for VWS FollowUp.
#
# Stages:
#   1. base         — common Node.js setup
#   2. deps         — install dependencies
#   3. development  — dev server with hot reload (used by docker-compose.yml)
#   4. builder      — production build
#   5. production   — minimal runtime image
#
# Usage:
#
#   Development (via docker-compose):
#     docker compose up app
#
#   Production build:
#     docker build --target production -t vws-followup .
#     docker run -p 3000:3000 --env-file .env vws-followup
#
# For full deployment instructions, see docs/deployment.md and docs/docker.md
# =============================================================================

# --- Stage 1: Base -----------------------------------------------------------
FROM node:20-alpine AS base

# Set timezone (Alpine uses UTC by default, override here or via env)
ENV TZ=UTC

# Install system dependencies needed for Prisma and other native modules
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app


# --- Stage 2: Dependencies ---------------------------------------------------
FROM base AS deps

# Copy package files first (for layer caching — only re-install when these change)
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for the build)
# --legacy-peer-deps allows next-auth beta and nodemailer to coexist
RUN npm ci --legacy-peer-deps


# --- Stage 3: Development ----------------------------------------------------
FROM base AS development

ENV NODE_ENV=development

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Don't copy source files — they'll be mounted as a volume in docker-compose

EXPOSE 3000

# Start Next.js dev server
CMD ["npm", "run", "dev"]


# --- Stage 4: Builder --------------------------------------------------------
FROM base AS builder

ENV NODE_ENV=production

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma client (must run before build)
RUN npx prisma generate

# Build the Next.js application
# DATABASE_URL is needed at build time for Prisma, but use a placeholder —
# the real URL is only needed at runtime
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build


# --- Stage 5: Production -----------------------------------------------------
FROM base AS production

ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy only the built output and necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Copy standalone output (requires `output: "standalone"` in next.config.ts)
# Uncomment these lines and add `output: "standalone"` to next.config.ts for
# a smaller production image:
#
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# For now, copy the full .next directory and node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Push schema to database (creates tables if they don't exist), then start the server
# --skip-generate: Prisma client was already generated during the build stage.
# Regenerating at startup fails because node_modules is owned by root but
# the container runs as the nextjs user (EACCES permission denied).
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node_modules/.bin/next start"]
