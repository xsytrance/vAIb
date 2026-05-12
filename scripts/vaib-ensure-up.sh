#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/vaib-probe.lock"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

log(){ logger -t vaib-probe "$*"; }

port_listening() {
  local port="$1"
  ss -ltn "sport = :${port}" | grep -q LISTEN
}

http_reachable() {
  local url="$1"
  # Reachability check only; don't fail on 404.
  curl -sS --max-time 3 -o /dev/null "$url"
}

if ! port_listening 4014 || ! http_reachable "http://127.0.0.1:4014/agents"; then
  log "API unhealthy on :4014, restarting vaib-api.service"
  systemctl --user restart vaib-api.service
fi

if ! port_listening 4013 || ! http_reachable "http://127.0.0.1:4013/"; then
  log "UI unhealthy on :4013, restarting vaib-ui.service"
  systemctl --user restart vaib-ui.service
fi

# Federation visibility heartbeat (best effort, never fail the health guard)
if [[ -x "/home/xsyprime/projects/vaiB-x/scripts/vaib-federation-watch.sh" ]]; then
  /home/xsyprime/projects/vaiB-x/scripts/vaib-federation-watch.sh || log "federation watch probe failed"
fi
