#!/bin/bash
# MOHD.HMS ENTERPRISE — Render-compatible start script
# Render sets PORT dynamically; this script passes it to uvicorn.

PORT="${PORT:-8000}"
exec uvicorn app.main:app --host "0.0.0.0" --port "$PORT"