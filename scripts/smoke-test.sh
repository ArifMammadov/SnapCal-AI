#!/usr/bin/env bash
set -euo pipefail

API_URL=${API_URL:-https://snapcal.health/api}
AI_URL=${AI_URL:-https://snapcal.health/ai}
TIMEOUT=${TIMEOUT:-30}

echo "Smoke testing $API_URL ..."

curl -fsS --max-time "$TIMEOUT" "$API_URL/health" > /dev/null || {
  echo "FAIL: API /health unreachable"
  exit 1
}

echo "API /health OK"

# Optional: test AI agent health if AI_URL is set and not the same ingress path
if [[ "$AI_URL" != "$API_URL" ]]; then
  curl -fsS --max-time "$TIMEOUT" "$AI_URL/health" > /dev/null || {
    echo "FAIL: AI agent /health unreachable"
    exit 1
  }
  echo "AI agent /health OK"
fi

echo "All smoke tests passed"
