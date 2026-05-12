#!/usr/bin/env bash
set -euo pipefail

PORT=4014
LOCK_FILE="/tmp/vaib-api-prestart.lock"
exec 9>"$LOCK_FILE"
flock -w 5 9 || exit 1

list_pids_on_port() {
  ss -ltnp "sport = :${PORT}" 2>/dev/null \
    | grep -oE 'pid=[0-9]+' \
    | cut -d= -f2 \
    | sort -u || true
}

port_busy() {
  ss -ltn "sport = :${PORT}" 2>/dev/null | grep -q LISTEN
}

# Clear stale listener(s) before service start.
mapfile -t PIDS < <(list_pids_on_port)
if ((${#PIDS[@]})); then
  for pid in "${PIDS[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done

  # Give listeners time to drain sockets.
  for _ in {1..20}; do
    port_busy || break
    sleep 0.25
  done

  if port_busy; then
    mapfile -t PIDS < <(list_pids_on_port)
    for pid in "${PIDS[@]}"; do
      kill -KILL "$pid" 2>/dev/null || true
    done
    sleep 0.2
  fi
fi

# If still busy, fail prestart so systemd retries instead of crashing node with EADDRINUSE.
if port_busy; then
  exit 1
fi
