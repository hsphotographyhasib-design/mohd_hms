#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=2560" bun run dev </dev/null >> /tmp/dev-out.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." >> /tmp/dev-out.log
  sleep 3
done
