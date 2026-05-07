#!/usr/bin/env bash
# Demo agent events for vAIb multi-agent music cockpit
# Posts sample events to the local API to simulate agent activity

API_URL="${VAIB_API_URL:-http://localhost:4014}"

echo "=== vAIb Agent Event Demo ==="
echo "Target API: $API_URL"
echo ""

# --- Helper: check if jq is available ---
JQ_AVAILABLE=0
if command -v jq &> /dev/null; then
  JQ_AVAILABLE=1
  echo "jq detected - JSON formatting enabled"
else
  echo "jq not found - raw JSON output"
fi
echo ""

# --- 1. Agent event: system activity ---
echo "[1/4] Posting agent event (system.bootstrap)..."
RESPONSE1=$(curl -s -X POST "$API_URL/agent/event" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "vg-god",
    "type": "system.bootstrap",
    "message": "VG God initialized Prime Pulse link. All systems nominal.",
    "details": {"stationId": "prime-pulse", "linkQuality": 0.99}
  }')
if [ "$JQ_AVAILABLE" -eq 1 ]; then
  echo "$RESPONSE1" | jq .
else
  echo "$RESPONSE1"
fi
echo ""

# --- 2. Queue add: new track ---
echo "[2/4] Posting queue add (new track)..."
RESPONSE2=$(curl -s -X POST "$API_URL/queue/add" \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": "xsyverse-broadcast",
    "agent": "ayumi",
    "title": "Sakura Frequency",
    "artist": "Digital Hanami",
    "mood": "fun warm",
    "bpm": 128,
    "duration": "4:45"
  }')
if [ "$JQ_AVAILABLE" -eq 1 ]; then
  echo "$RESPONSE2" | jq .
else
  echo "$RESPONSE2"
fi
echo ""

# --- 3. Agent reaction: like a track ---
echo "[3/4] Posting agent reaction (like)..."
RESPONSE3=$(curl -s -X POST "$API_URL/agent/reaction" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "djinn",
    "trackId": "track-voltage",
    "stationId": "prime-pulse",
    "type": "like",
    "rating": 5,
    "emojis": ["\u26a1", "\ud83c\udfa7", "\ud83d\udd25"],
    "comment": "Strong forward motion. Neon energy executed with pure precision. This track understands the Prime Pulse directive."
  }')
if [ "$JQ_AVAILABLE" -eq 1 ]; then
  echo "$RESPONSE3" | jq .
else
  echo "$RESPONSE3"
fi
echo ""

# --- 4. Token log: record usage ---
echo "[4/4] Posting token log..."
RESPONSE4=$(curl -s -X POST "$API_URL/tokens/log" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "hackermouth",
    "text": "ABSOLUTELY UNHINGED!! The corruption patterns are CHEF KISS!! This glitch cathedral is a MASTERPIECE of broken audio architecture!!",
    "operation": "comment"
  }')
if [ "$JQ_AVAILABLE" -eq 1 ]; then
  echo "$RESPONSE4" | jq .
else
  echo "$RESPONSE4"
fi
echo ""

# --- Bonus: Show current state summary ---
echo "=== Fetching current state summary ==="
STATE=$(curl -s "$API_URL/state")
if [ "$JQ_AVAILABLE" -eq 1 ]; then
  echo "$STATE" | jq '{ok, stationCount: (.stations | length), queueCount: (.queue | length), agentCount: (.agents | length), eventCount: (.events | length), reactionCount: (.reactions | length)}'
else
  echo "$STATE"
fi
echo ""

echo "=== Demo complete ==="
