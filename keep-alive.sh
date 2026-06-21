#!/bin/bash
while true; do
  cd /home/z/my-project
  bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done