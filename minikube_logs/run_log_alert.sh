#!/usr/bin/env bash
set -euo pipefail

# Paths to your scripts
SHELL_SCRIPT="./minikube_logs/get_logs.sh"        # run every 10s
PYTHON_SCRIPT="./minikube_logs/log_alerts.py"         # run every 20s

# Loop 1: run shell script every 10 seconds
while true; do
  "$SHELL_SCRIPT"
  sleep 10
done &   # run in background

# Loop 2: run python script every 20 seconds
while true; do
  python3 "$PYTHON_SCRIPT"
  sleep 20
done &   # run in background

# Keep the main script alive so Ctrl+C stops everything
wait
