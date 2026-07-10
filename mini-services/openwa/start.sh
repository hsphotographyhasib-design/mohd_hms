#!/bin/bash
# OpenWA Mini-Service Start Script
# Runs the pre-built NestJS server

cd "$(dirname "$0")"

# Ensure data directory exists
mkdir -p data

exec node dist/main.js