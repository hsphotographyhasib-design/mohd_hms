# MOHD.HMS ENTERPRISE — Production Docker Image
# Python 3.12 slim, non-root user

FROM python:3.12-slim

# Install build deps needed for bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Ensure start script is executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Run as non-root
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os,httpx; r=httpx.get('http://localhost:'+os.environ.get('PORT','8000')+'/health',timeout=5); assert r.status_code==200" || exit 1

# Start
CMD ["/app/start.sh"]
