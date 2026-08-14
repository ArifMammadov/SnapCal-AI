#!/usr/bin/env bash
set -euo pipefail

RELEASE=${1:-snapcal}
NAMESPACE=${2:-snapcal}
TO_REVISION=${3:-}

if [ -z "$TO_REVISION" ]; then
  echo "Usage: $0 <release> <namespace> <revision|0 for previous>"
  echo "Current revisions:"
  helm history "$RELEASE" -n "$NAMESPACE" --max 10
  exit 1
fi

if [ "$TO_REVISION" == "0" ]; then
  echo "Rolling back $RELEASE to previous revision..."
  helm rollback "$RELEASE" -n "$NAMESPACE"
else
  echo "Rolling back $RELEASE to revision $TO_REVISION..."
  helm rollback "$RELEASE" -n "$NAMESPACE" "$TO_REVISION"
fi

kubectl rollout status "deployment/$RELEASE-api" -n "$NAMESPACE" --timeout=120s
kubectl rollout status "deployment/$RELEASE-ai-agent" -n "$NAMESPACE" --timeout=120s
echo "Rollback complete"
