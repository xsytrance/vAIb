#!/usr/bin/env bash
set -euo pipefail

PORT=4013
# Only clear this service port if something else is holding it.
pid="$(ss -ltnp 2>/dev/null | awk -v p=":${PORT}" '$4 ~ p { if (match($0,/pid=[0-9]+/)) {print substr($0,RSTART+4,RLENGTH-4); exit} }')"
if [[ -n "${pid:-}" ]]; then
  kill -TERM "$pid" 2>/dev/null || true
  sleep 0.7
  ss -ltnp 2>/dev/null | grep -q ":${PORT} " && kill -KILL "$pid" 2>/dev/null || true
fi
