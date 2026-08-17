# MOHD.HMS ENTERPRISE — Production Docker Image
# python:3.12-slim has NO bash — start.sh uses /bin/sh

FROM python:3.12-slim

# Install build deps needed for bcrypt (libffi) + gcc
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install Python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Ensure start script is executable
RUN chmod +x start.sh

EXPOSE 8000

USER appuser

CMD ["/app/start.sh"]
