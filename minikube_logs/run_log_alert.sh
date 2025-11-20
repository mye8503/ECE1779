#!/usr/bin/env bash
set -euo pipefail

SHELL_SCRIPT="./minikube_logs/get_logs.sh"        # run every 10s
PYTHON_SCRIPT="./minikube_logs/log_alerts.py"     # run every 20s

pids=()

cleanup() {
  echo "Stopping log alert loops..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}

# Handle Ctrl+C (INT) and kill signals (TERM)
trap cleanup INT TERM

# Loop 1: run shell script every 10 seconds
while true; do
  "$SHELL_SCRIPT"
  sleep 10
done &
pids+=($!)   # save PID of background job

# Loop 2: run python script every 20 seconds
while true; do
  python3 "$PYTHON_SCRIPT"
  sleep 20
done &
pids+=($!)

# Wait for both loops; Ctrl+C will trigger cleanup()
wait "${pids[@]}"
