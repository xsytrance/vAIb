#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/home/xsyprime/projects/vaiB-x/logs"
mkdir -p "$LOG_DIR"
OUT="$LOG_DIR/federation-watch.log"
TS="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

check_node() {
  local name="$1"
  local url="http://$2:4014"
  local mode="down"
  local code

  code=$(curl -sS -o /tmp/vaib-reg.$$ -w '%{http_code}' --max-time 6 "$url/registry/agents?scope=edge" || true)
  if [[ "$code" == "200" ]]; then
    mode="registry"
  else
    code=$(curl -sS -o /tmp/vaib-ag.$$ -w '%{http_code}' --max-time 6 "$url/agents" || true)
    if [[ "$code" == "200" ]]; then
      mode="legacy"
    fi
  fi

  echo "$TS node=$name mode=$mode" >> "$OUT"
}

check_node prime 127.0.0.1
check_node pluto pluto
check_node vps vps
check_node venus venus
