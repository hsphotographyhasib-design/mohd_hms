# MOHD.HMS ENTERPRISE — Production Docker Image
# Python 3.12 slim, non-root user

FROM python:3.12-slim AS base

# Build stage — install dependencies
FROM base AS builder

WORKDIR /install

# Install build deps and Python packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Production stage
FROM base AS production

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appuser . .

# Expose port (static — actual port set via PORT env var at runtime)
EXPOSE 8000

# Health check — use shell form so $PORT expands at runtime
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:' + __import__('os').environ.get('PORT', '8000') + '/health', timeout=5); assert r.status_code == 200"

# Copy and set up entrypoint script
COPY --chown=appuser:appuser start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Run as non-root
USER appuser

# Start with entrypoint script that reads PORT env var
CMD ["/app/start.sh"]
