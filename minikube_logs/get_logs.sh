#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="default"
SELECTOR="app in (frontend,backend,postgres)"
OUT_DIR="$HOME/Desktop/ECE1779/minikube_logs"
LOG_FILE="$OUT_DIR/app.log"

# Pull only logs from the last 60 seconds to avoid duplicates
kubectl logs -n "$NAMESPACE" \
  -l "$SELECTOR" \
  --all-containers=true \
  --since=10s \
  --timestamps >> "$LOG_FILE"
