#!/bin/bash
cd "$(dirname "$0")"
export CHROME_PATH="${CHROME_PATH:-/home/z/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome}"
while true; do
  echo "[$(date)] Starting WhatsApp service..."
  bun run index.ts
  echo "[$(date)] Service exited, restarting in 3s..."
  sleep 3
done
