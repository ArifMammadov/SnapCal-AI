#!/usr/bin/env bash
# Auto-rollback triggered by Alertmanager webhook or GitHub Actions dispatch.
set -euo pipefail

NAMESPACE=${NAMESPACE:-snapcal}
RELEASE=${RELEASE:-snapcal}
PREVIOUS_REVISION=${PREVIOUS_REVISION:-0}

echo "Auto-rollback $RELEASE in $NAMESPACE to revision $PREVIOUS_REVISION"
helm rollback "$RELEASE" "$PREVIOUS_REVISION" -n "$NAMESPACE"

kubectl rollout status "deployment/$RELEASE-api" -n "$NAMESPACE" --timeout=120s
kubectl rollout status "deployment/$RELEASE-ai-agent" -n "$NAMESPACE" --timeout=120s

echo "Auto-rollback complete"
