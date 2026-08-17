#!/bin/sh
# MOHD.HMS ENTERPRISE — Render-compatible start script
# Render sets PORT dynamically; this script passes it to uvicorn.
# NOTE: python:3.12-slim has NO bash — must use /bin/sh

PORT="${PORT:-8000}"
exec uvicorn app.main:app --host "0.0.0.0" --port "$PORT"
