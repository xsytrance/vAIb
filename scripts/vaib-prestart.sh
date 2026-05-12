#!/usr/bin/env bash
# Pre-start port cleaner for vAIb-X
# Kills any process holding port 4014 or 4013 before our service starts

cleanup_port() {
    local port=$1
    local pid=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
    if [ -n "$pid" ]; then
        echo "Port $port occupied by PID $pid, killing..."
        kill -9 "$pid" 2>/dev/null
        sleep 0.5
        # Double-check
        if ss -tlnp | grep -q ":$port "; then
            kill -9 "$pid" 2>/dev/null
            sleep 0.5
        fi
    fi
}

cleanup_port 4014
cleanup_port 4013

