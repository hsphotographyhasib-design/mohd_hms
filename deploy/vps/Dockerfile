# =============================================================================
# Multi-stage Dockerfile for Next.js 16 App (Production)
# =============================================================================
# Usage: docker build -f deploy/Dockerfile -t my-app:latest .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and lock file
COPY package.json bun.lock ./

# Copy Prisma schema so prisma generate can run (if needed during install)
COPY prisma/ prisma/

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || \
    npm install --production --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./
COPY prisma/ prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm install --ignore-scripts

# Copy full source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js standalone output
RUN npm run build

# Copy static assets and public into the standalone directory (standalone output)
# This matches the project build script:
#   next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---------------------------------------------------------------------------
# Stage 3: Production
# ---------------------------------------------------------------------------
FROM node:20-slim AS production

# Install system dependencies required by Puppeteer/Chromium and Xvfb
# for the WhatsApp mini-service (runs as part of this container)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    xvfb \
    libxss1 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    fonts-liberation \
    fonts-noto-color-emoji \
    libappindicator3-1 \
    xdg-utils \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"
ENV STORAGE_ROOT="/app/storage"
ENV CHROME_PATH="/usr/bin/chromium"
ENV DISPLAY=":99"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Create non-root user for security
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./

# Copy Prisma schema for potential migrations
COPY --from=builder /app/prisma ./prisma/

# Create required directories and set ownership
RUN mkdir -p db storage/chunks storage/documents \
    mini-services/whatsapp-service/storage/sessions \
  && chown -R appuser:appuser db storage mini-services

# Copy WhatsApp mini-service source
COPY --from=builder /app/mini-services/whatsapp-service ./mini-services/whatsapp-service/
COPY --from=builder /app/mini-services/whatsapp-service/package.json ./mini-services/whatsapp-service/package.json

# Install WhatsApp service dependencies
RUN cd mini-services/whatsapp-service && \
    npm install --omit=dev --ignore-scripts && \
    chown -R appuser:appuser /app/mini-services

# Switch to non-root user
USER appuser

# Expose the main app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the Next.js app
CMD ["node", "server.js"]