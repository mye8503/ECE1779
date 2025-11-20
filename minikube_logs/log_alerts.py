#!/usr/bin/env python3
import subprocess
import os
import sys
import platform

CUR_DIR = os.getenv("PWD")
print("Current directory:", CUR_DIR)
LOG_FILE = os.path.join(CUR_DIR, "minikube_logs", "app.log")
print("Log file path:", LOG_FILE)
LINES_TO_CHECK = 500
ERROR_THRESHOLD = 1


def tail_lines(path, n):
    try:
        output = subprocess.check_output(["tail", "-n", str(n), path], text=True)
        return output.splitlines()
    except subprocess.CalledProcessError:
        return []


def send_system_alert(text):
    system = platform.system()

    # macOS: use AppleScript notifications
    if system == "Darwin":
        try:
            subprocess.run(
                [
                    "osascript",
                    "-e",
                    f'display notification "{text}" with title "Kubernetes Log Alert"',
                ],
                check=False,
            )
        except FileNotFoundError:
            print("[ALERT] (osascript not found) ->", text)

    # Linux: use notify-send (libnotify)
    elif system == "Linux":
        try:
            subprocess.run(
                ["notify-send", "Kubernetes Log Alert", text],
                check=False,
            )
        except FileNotFoundError:
            print("[ALERT] (notify-send not found) ->", text)

    # Windows or unknown: just print to stdout
    else:
        print("[ALERT]", text)


def main():
    lines = tail_lines(LOG_FILE, LINES_TO_CHECK)
    if not lines:
        return
    print(f"Checked last {len(lines)} lines of {LOG_FILE}")
    error_lines = [
        l for l in lines
        if "ERROR" in l or " 500 " in l or "InternalServerError" in l or "Sell" in l
    ]

    if len(error_lines) >= ERROR_THRESHOLD:
        msg = (
            f"Found {len(error_lines)} error-ish log lines in the last "
            f"{LINES_TO_CHECK} lines of {LOG_FILE}"
        )
        send_system_alert(msg)


if __name__ == "__main__":
    main()
