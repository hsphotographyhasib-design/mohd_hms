#!/usr/bin/env bash
# Dev server watchdog — auto-restarts Next.js when Turbopack crashes
# Usage: bash dev-watchdog.sh

cd /home/z/my-project

# Pre-compile critical routes after server starts
pre_compile() {
  local BASE="${1:-http://127.0.0.1:3000}"
  echo "[Watchdog] Pre-compiling routes..."
  
  # Login API
  curl -4 -s --max-time 15 -o /dev/null -w "  login: %{http_code}\n" \
    -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d '{"email":"a@b.com","password":"x"}' 2>/dev/null
  
  # Get a real token
  TOKEN=$(curl -4 -s --max-time 15 -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@facilitypro.com","password":"Admin@123"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  
  if [ -n "$TOKEN" ]; then
    # Auth/me
    curl -4 -s --max-time 15 -o /dev/null -w "  auth/me: %{http_code}\n" \
      "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null
    # Dashboard
    curl -4 -s --max-time 15 -o /dev/null -w "  dashboard: %{http_code}\n" \
      "$BASE/api/dashboard" -H "Authorization: Bearer $TOKEN" 2>/dev/null
  fi
  
  # CMS landing
  curl -4 -s --max-time 15 -o /dev/null -w "  cms/landing: %{http_code}\n" \
    "$BASE/api/cms/public/landing" 2>/dev/null
  
  echo "[Watchdog] Pre-compilation complete."
}

while true; do
  echo "[$(date '+%H:%M:%S')] Starting dev server..."
  
  rm -f dev.log
  NODE_OPTIONS="--max-old-space-size=6144" npx next dev -p 3000 -H 21.0.9.89 >> dev.log 2>&1 &
  SERVER_PID=$!
  
  # Wait for "Ready"
  for i in $(seq 1 60); do
    if rg -q "Ready" dev.log 2>/dev/null; then break; fi
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[Watchdog] Server failed to start"
      sleep 2
      continue 2
    fi
    sleep 1
  done
  
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[Watchdog] Server crashed during startup"
    sleep 2
    continue
  fi
  
  echo "[$(date '+%H:%M:%S')] Server ready (PID $SERVER_PID). Pre-compiling..."
  pre_compile "http://21.0.9.89:3000"
  
  # Wait for server to die
  echo "[$(date '+%H:%M:%S')] Server running. Watching..."
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 3
  done
  
  echo "[$(date '+%H:%M:%S')] Server crashed! Restarting in 3s..."
  sleep 3
done