#!/bin/bash
# ============================================================================
# Push Schema & Seed Data to Supabase
# ============================================================================
# Usage:
#   chmod +x scripts/push-supabase.sh
#   ./scripts/push-supabase.sh <PROJECT_REF> <ACCESS_TOKEN>
#
# Example:
#   ./scripts/push-supabase.sh abcdefghijklm eyJhbGciOiJIUzI1NiIs...
#
# Where to get credentials:
#   1. PROJECT_REF: From your Supabase dashboard URL
#      e.g. https://abcdefghijklm.supabase.co -> PROJECT_REF = abcdefghijklm
#
#   2. ACCESS_TOKEN: From https://app.supabase.com/account/tokens
#      Click "Generate New Token", give it a name, copy the token
#
# ============================================================================

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "❌ Usage: $0 <PROJECT_REF> <ACCESS_TOKEN>"
  echo ""
  echo "   PROJECT_REF:   Your Supabase project reference (from dashboard URL)"
  echo "   ACCESS_TOKEN:  Management API access token (from supabase.com/account/tokens)"
  echo ""
  echo "   Example: $0 abcdefghijklm eyJhbGciOiJIUzI1NiIs..."
  exit 1
fi

PROJECT_REF="$1"
ACCESS_TOKEN="$2"

echo "🚀 Pushing schema to Supabase project: $PROJECT_REF"
echo "================================================"

# Step 1: Push schema (DDL)
echo ""
echo "📦 Step 1: Pushing schema (89 tables, 174 indexes)..."
SCHEMA_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @<(jq -n --arg sql "$(cat supabase-schema.sql)" '{"query": $sql}'))

SCHEMA_HTTP_CODE=$(echo "$SCHEMA_RESPONSE" | tail -1)
SCHEMA_BODY=$(echo "$SCHEMA_RESPONSE" | sed '$d')

if [ "$SCHEMA_HTTP_CODE" = "200" ] || [ "$SCHEMA_HTTP_CODE" = "201" ]; then
  echo "✅ Schema pushed successfully!"
else
  echo "❌ Schema push failed (HTTP $SCHEMA_HTTP_CODE)"
  echo "$SCHEMA_BODY"
  echo ""
  echo "⚠️  Continuing to seed step anyway..."
fi

# Step 2: Push seed data
echo ""
echo "🌱 Step 2: Pushing seed data..."
SEED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @<(jq -n --arg sql "$(cat supabase-seed.sql)" '{"query": $sql}'))

SEED_HTTP_CODE=$(echo "$SEED_RESPONSE" | tail -1)
SEED_BODY=$(echo "$SEED_RESPONSE" | sed '$d')

if [ "$SEED_HTTP_CODE" = "200" ] || [ "$SEED_HTTP_CODE" = "201" ]; then
  echo "✅ Seed data pushed successfully!"
else
  echo "❌ Seed push failed (HTTP $SEED_HTTP_CODE)"
  echo "$SEED_BODY"
fi

echo ""
echo "================================================"
echo "Done! Check your Supabase dashboard to verify."
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/editor"