#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="default"
SELECTOR="app in (frontend,backend,postgres)"
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$HOME/Documents/UofT/ECE1779/ECE1779/minikube_logs"
LOG_FILE="$OUT_DIR/app.log"

# Pull only logs from the last 60 seconds to avoid duplicates
kubectl logs -n "$NAMESPACE" \
  -l "$SELECTOR" \
  --all-containers=true \
  --since=10s \
  --timestamps >> "$LOG_FILE"

kubectl top pod -n "$NAMESPACE" \
  -l "$SELECTOR" >> "$LOG_FILE"
# cd cd ..