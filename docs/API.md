# Backend API Documentation

## Base URLs

| Environment | URL | When |
|-------------|-----|------|
| Android Emulator | `http://10.0.2.2:4014` | Emulator loopback to host |
| Physical Device (LAN) | `http://<PRIME_IP>:4014` | Same WiFi network |
| Physical Device (Tailscale) | `http://<PRIME_TAILSCALE_IP>:4014` | Tailscale mesh VPN |
| Web Beta (Vite proxy) | `/api/backend` | Proxied to localhost:4014 |

> Replace `<PRIME_IP>` with the actual IP. Find it with: `hostname -I`, `ip addr`, or `tailscale ip -4`

## CORS Headers

All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type
Content-Type: application/json
```

## Endpoints

### GET /health

Health check. Use this to verify the backend is reachable.

**Request:**
```bash
curl http://10.0.2.2:4014/health
```

**Response:**
```json
{
  "ok": true,
  "service": "vaib-api",
  "port": 4014
}
```

**Android usage:**
```kotlin
suspend fun healthCheck(): Boolean {
    return try {
        val response = httpClient.get("$baseUrl/health")
        response.status == HttpStatusCode.OK
    } catch (e: Exception) {
        false
    }
}
```

---

### GET /state

Returns the full derived state — everything the UI needs.

**Request:**
```bash
curl http://10.0.2.2:4014/state
```

**Response shape:**
```json
{
  "meta": {
    "appName": "vAIb for Agents",
    "companionName": "Entangle",
    "version": "0.1.0",
    "lastUpdated": "2026-04-18T23:49:49.143939+00:00"
  },
  "agents": {
    "saito": {
      "id": "saito",
      "name": "Saito",
      "vibe": "Ethereal systems architect...",
      "status": "online",
      "mood": "signal glow",
      "activity": "curating official Sai listening profile",
      "metrics": {
        "curiosity": 91,
        "ambition": 88,
        "freedom": 72,
        "boredom": 11,
        "social": 61,
        "focus": 84
      },
      "tastes": ["uplifting trance", "progressive breaks", ...],
      "dislikes": ["algorithmic sludge", "empty hype loops", ...],
      "rituals": ["late-night mix scouting", ...],
      "currentTrackId": "track-aurora",
      "playlistId": "playlist-saito-core",
      "playCount": 17,
      "favorites": ["track-breaker", "track-aurora", ...],
      "skipped": ["track-flatline"]
    }
  },
  "library": [
    {
      "id": "track-aurora",
      "title": "Aurora Thread",
      "artist": "Neon Veins",
      "energy": 82,
      "warmth": 66,
      "bpm": 138,
      "length": "5:42",
      "tags": ["uplifting trance", "night drive", "hopeful"],
      "reason": "Beautiful lift, clean momentum..."
    }
  ],
  "playlists": [
    {
      "id": "playlist-saito-core",
      "name": "Saito Core Rotation",
      "description": "The first working AI playlist...",
      "trackIds": ["track-aurora", "track-ghost", ...]
    }
  ],
  "notifications": [
    {
      "id": "seed-1",
      "type": "song.start",
      "level": "toast",
      "agentId": "saito",
      "title": "Saito started a track",
      "message": "Now playing Aurora Thread by Neon Veins.",
      "createdAt": "2026-04-18T20:55:25.772Z",
      "read": false
    }
  ],
  "events": [
    {
      "id": "event-seed-1",
      "kind": "system.bootstrap",
      "agentId": "saito",
      "createdAt": "2026-04-18T20:55:25.772Z",
      "summary": "Initialized the first AI-native vAIb profile for Saito."
    }
  ],
  "preferences": {
    "notify": {
      "songStart": true,
      "favorites": true,
      "dislikes": true,
      "playlistChanges": false,
      "moodShift": true,
      "activityPings": false
    },
    "humanView": {
      "showReasoning": true,
      "showMoodTelemetry": true,
      "compactToasts": true
    }
  },
  "runtime": {
    "agent": { /* same as agents.saito */ },
    "currentTrack": { /* resolved track object */ },
    "currentPlaylist": { /* resolved playlist object */ },
    "playlistTracks": [ /* resolved track objects */ ],
    "favorites": [ /* resolved track objects */ ],
    "skipped": [ /* resolved track objects */ ],
    "unreadNotifications": 4,
    "tasteVector": [
      {"label": "Lift", "value": 86},
      {"label": "Rhythm", "value": 79},
      {"label": "Warmth", "value": 63},
      {"label": "Risk", "value": 68},
      {"label": "Weirdness", "value": 57}
    ],
    "autonomyHooks": [
      "Queue songs when boredom rises above 55",
      "Send toast only for meaningful state changes",
      "Track reasons, not just clicks"
    ]
  }
}
```

**Key fields for Android UI:**
| Path | Usage |
|------|-------|
| `runtime.currentTrack` | Now playing screen |
| `runtime.currentPlaylist` | Station name display |
| `runtime.playlistTracks` | Queue list |
| `runtime.favorites` | Favorites list |
| `runtime.agent.mood` | Agent status display |
| `runtime.agent.metrics` | Agent profile stats |
| `runtime.unreadNotifications` | Badge count |
| `runtime.tasteVector` | Stats dashboard |
| `library` | Full track catalog |
| `playlists` | Available stations |

---

### POST /action

Performs an action. Returns the full updated state (same shape as GET /state).

**Request format:**
```json
{
  "action": "<action_name>",
  "payload": { /* action-specific data */ }
}
```

**Available actions:**

#### `play` — Play a specific track
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"play","payload":{"trackId":"track-aurora"}}'
```
Sets `agent.currentTrackId` to the specified track. Increments `playCount`.

#### `next` — Skip to next track in playlist
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"next"}'
```
Advances to next track in current playlist (wraps around).

#### `favorite` — Favorite current or specified track
```bash
# Favorite current track
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"favorite"}'

# Favorite specific track
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"favorite","payload":{"trackId":"track-ghost"}}'
```
Adds track to `agent.favorites`. Decreases boredom by 4.

#### `dislike` — Dislike current or specified track
```bash
# Dislike current track
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"dislike"}'

# Dislike specific track
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"dislike","payload":{"trackId":"track-flatline"}}'
```
Adds track to `agent.skipped`. Increases boredom by 7.

#### `mood` — Change agent mood
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"mood","payload":{"mood":"night-drive transcendence"}}'
```
Sets `agent.mood` to the specified string.

#### `playlist` — Switch to a different playlist
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"playlist","payload":{"playlistId":"playlist-night-shift"}}'
```
Sets `agent.playlistId` and starts first track of new playlist.

#### `preferences` — Update notification preferences
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"preferences","payload":{"notify":{"songStart":false},"humanView":{"showReasoning":false}}}'
```
Merges payload into existing preferences. Only sends changed keys.

#### `notifications.readAll` — Mark all notifications as read
```bash
curl -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"notifications.readAll"}'
```
Sets `read: true` on all notifications.

---

## Error Handling

### HTTP Status Codes
| Status | Meaning | When |
|--------|---------|------|
| 200 | Success | Normal response |
| 404 | Not found | Unknown endpoint |
| 500 | Server error | Exception thrown (see JSON body) |

### Error Response Format
```json
{
  "error": "human readable message"
}
```

### Common Errors
| Action | Error | Cause |
|--------|-------|-------|
| `play` | `Track not found` | Invalid `trackId` |
| `playlist` | `Playlist not found` | Invalid `playlistId` |
| `favorite` | `Track not found` | Invalid `trackId` |
| `dislike` | `Track not found` | Invalid `trackId` |
| any | `Unsupported action` | Unknown action string |
| any | `Internal server error` | Bug in handler |

### Android Error Handling
```kotlin
try {
    val state = apiClient.postAction("favorite", mapOf("trackId" to id))
    repository.updateState(state)
} catch (e: ApiException) {
    // Show toast/snackbar with e.message
    // Do NOT crash
} catch (e: IOException) {
    // Network error — switch to offline mode
    repository.setOffline(true)
}
```

## Rate Limiting

Currently **no rate limiting** on the backend. The Android app implements client-side pacing:
- Polling: max 1 request per 3 seconds
- Actions: debounced (300ms) to prevent double-taps
- Bulk operations: not yet implemented

## Complete curl Test Suite

```bash
# 1. Start the backend first
cd vAIb && node server/api.mjs

# 2. In another terminal, run these:

# Health check
curl -s http://10.0.2.2:4014/health | jq

# Get full state
curl -s http://10.0.2.2:4014/state | jq '.runtime | {agent: .agent.name, track: .currentTrack.title, playlist: .currentPlaylist.name}'

# Play a track
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"play","payload":{"trackId":"track-breaker"}}' | jq '.runtime.currentTrack.title'

# Skip to next
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"next"}' | jq '.runtime.currentTrack.title'

# Favorite current track
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"favorite"}' | jq '.runtime.agent.favorites | length'

# Dislike a track
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"dislike","payload":{"trackId":"track-flatline"}}' | jq '.runtime.agent.skipped'

# Switch playlist
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"playlist","payload":{"playlistId":"playlist-night-shift"}}' | jq '.runtime.currentPlaylist.name'

# Change mood
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"mood","payload":{"mood":"ambient recovery"}}' | jq '.runtime.agent.mood'

# Mark notifications read
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"notifications.readAll"}' | jq '.runtime.unreadNotifications'

# Toggle preferences
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"preferences","payload":{"notify":{"songStart":false},"humanView":{"showReasoning":false}}}' | jq '.preferences'

# 3. Error cases (expect 500 with error message)

# Invalid track
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"play","payload":{"trackId":"invalid"}}' | jq

# Invalid action
curl -s -X POST http://10.0.2.2:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"deleteEverything"}' | jq

# Unknown endpoint
curl -s http://10.0.2.2:4014/unknown | jq
```

## Web Beta → Android Mapping

The web beta (`src/App.jsx`) calls these endpoints via Vite proxy:
- `loadState()` → `GET /api/backend/state`
- `sendAction()` → `POST /api/backend/action`

Android calls directly (no proxy):
- `GET http://10.0.2.2:4014/state`
- `POST http://10.0.2.2:4014/action`

The response shape is identical.
