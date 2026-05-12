#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_port() {
  local port="$1"
  curl -fsS --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

if ! check_port 4014; then
  systemctl --user restart vaib-api.service
fi

if ! check_port 4013; then
  systemctl --user restart vaib-ui.service
fi
