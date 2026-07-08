#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=2560"
exec bun run dev > /tmp/dev-stdout.log 2> /tmp/dev-stderr.log
