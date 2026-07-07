# =============================================================================
# Production Dockerfile for MOHD.HMS (Next.js 16)
# =============================================================================
# Render auto-detects this Dockerfile at the project root.
# Uses bun for fast, reliable dependency installation.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma/ prisma/

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma/ prisma/

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy full source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js standalone output
RUN bun run build

# Copy static assets into standalone directory
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---------------------------------------------------------------------------
# Stage 3: Production
# ---------------------------------------------------------------------------
FROM oven/bun:1-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --ingroup appuser appuser

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma/

# Create required directories
RUN mkdir -p db storage/chunks storage/documents && \
    chown -R appuser:appuser db storage

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["bun", "server.js"]