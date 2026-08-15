#!/bin/bash
set -euo pipefail

REPO_DIR=/opt/snapcal-main
BRANCH=main

cd "$REPO_DIR"

echo "=== Pulling latest code ==="
git fetch origin
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== Generating database client ==="
pnpm --filter @snapcal/database generate

echo "=== Building packages and apps ==="
pnpm --filter @snapcal/shared build
pnpm --filter @snapcal/api build
pnpm --filter @snapcal/ai-agent build
pnpm --filter @snapcal/telegram-bot build
pnpm --filter @snapcal/admin build
pnpm --filter @snapcal/mobile build

echo "=== Restarting services ==="
systemctl restart snapcal-api-main snapcal-ai-main snapcal-telegram-bot-main || true

echo "=== Health checks ==="
sleep 3
curl -sf http://localhost:4000/health || (echo "API health failed"; exit 1)
curl -sf http://localhost:4001/health || (echo "AI agent health failed"; exit 1)

echo "=== Deploy complete ==="
