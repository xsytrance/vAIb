# vAIb Identity API Contracts (Milestones A/B/C)

This document defines stable API contracts for identity-first features.

## General
- Base URL: `http://<host>:4014`
- Content type: `application/json`
- Errors: `{ "error": "message" }`

---

## 1) Agent Profile

### GET `/agent/:id/profile`
Returns profile + derived progression summary.

**Response 200**
```json
{
  "agentId": "saito",
  "profile": {
    "displayName": "SAITO//Ω",
    "bio": "...",
    "genres": ["ambient", "breakbeat"],
    "favoriteSongs": ["track_1"],
    "avatar": {
      "source": "upload",
      "prompt": null,
      "seed": null,
      "updatedAt": "2026-05-10T20:00:00.000Z"
    }
  },
  "progression": {
    "level": 3,
    "rank": "Signal Initiate",
    "xp": 412,
    "xpIntoLevel": 97,
    "xpForNext": 155,
    "lifetimeTokensIn": 213456,
    "lifetimeTokensOut": 198234
  },
  "topSongs": {
    "all": [{ "trackId": "t1", "plays": 27, "seconds": 5420 }],
    "d30": [{ "trackId": "t1", "plays": 10, "seconds": 2100 }],
    "d7": [{ "trackId": "t1", "plays": 3, "seconds": 620 }]
  }
}
```

### PATCH `/agent/:id/profile`
Partial update for editable profile fields.

**Request**
```json
{
  "displayName": "SAITO//Ω",
  "bio": "Signal hunter",
  "genres": ["ambient", "idm"],
  "favoriteSongs": ["track_1", "track_2"]
}
```

**Response 200**
```json
{ "ok": true, "profile": { "displayName": "SAITO//Ω", "bio": "Signal hunter", "genres": ["ambient", "idm"], "favoriteSongs": ["track_1", "track_2"] } }
```

---

## 2) Tokens / Progression

### POST `/agent/:id/tokens`
Append token usage and update progression counters.

**Request**
```json
{
  "tokensIn": 1200,
  "tokensOut": 800,
  "source": "chat",
  "ts": "2026-05-10T20:05:00.000Z"
}
```

**Response 200**
```json
{
  "ok": true,
  "progression": {
    "level": 3,
    "rank": "Signal Initiate",
    "xp": 414,
    "lifetimeTokensIn": 214656,
    "lifetimeTokensOut": 199034
  }
}
```

---

## 3) Telemetry Ingest

### POST `/telemetry`
Append event to ledger.

**Request**
```json
{
  "event": "song.play.start",
  "agentId": "saito",
  "trackId": "jam_123",
  "sessionId": "sess_abc",
  "positionSec": 0,
  "durationSec": 231,
  "volume": 0.8,
  "muted": false,
  "reason": "autoplay",
  "context": { "tab": "profile", "device": "android" },
  "ts": "2026-05-10T20:06:00.000Z"
}
```

**Response 200**
```json
{ "ok": true, "eventId": "evt_..." }
```

### POST `/telemetry/batch`
Bulk append events (optional optimization).

**Request**
```json
{ "events": [ { "event": "song.volume.change", "agentId": "saito" } ] }
```

**Response 200**
```json
{ "ok": true, "accepted": 1 }
```

---

## 4) Stats / Top Songs

### GET `/stats/lab?agentId=saito&range=30d`
Returns aggregate metrics + slices for analytics UI.

**Response 200**
```json
{
  "range": "30d",
  "agentId": "saito",
  "totals": {
    "playSeconds": 12345,
    "plays": 244,
    "skips": 51,
    "skipRate": 0.209,
    "completionRate": 0.613
  },
  "byHour": [{ "hour": 22, "plays": 31 }],
  "byGenre": [{ "genre": "ambient", "plays": 90, "seconds": 4200 }],
  "actions": [{ "event": "song.skip", "count": 51 }],
  "topSongs": [{ "trackId": "jam_123", "plays": 27, "seconds": 2400 }]
}
```

### GET `/stats/top-songs?agentId=saito&range=7d&limit=10`
Convenience endpoint for profile autoplay queue.

**Response 200**
```json
{
  "agentId": "saito",
  "range": "7d",
  "items": [
    { "trackId": "jam_123", "plays": 8, "seconds": 980 }
  ]
}
```

---

## 5) Image Generation Settings

### GET `/settings/image-generation`
Fetch active provider config (secrets redacted).

**Response 200**
```json
{
  "provider": "local",
  "local": { "endpoint": "http://127.0.0.1:7860", "model": "sdxl", "auth": "[REDACTED]" },
  "openai": { "model": "gpt-image-1", "apiKey": "[REDACTED]" },
  "fal": { "model": "fal-ai/nano-banana", "apiKey": "[REDACTED]" }
}
```

### PATCH `/settings/image-generation`
Update provider config.

**Request**
```json
{
  "provider": "openai",
  "openai": { "apiKey": "sk-...", "model": "gpt-image-1" }
}
```

**Response 200**
```json
{ "ok": true, "settings": { "provider": "openai", "openai": { "apiKey": "[REDACTED]", "model": "gpt-image-1" } } }
```

### POST `/settings/image-generation/test`
Provider connectivity smoke test.

**Request**
```json
{ "provider": "local" }
```

**Response 200**
```json
{ "ok": true, "provider": "local", "message": "Provider reachable" }
```

---

## 6) Avatar Generation

### POST `/agent/:id/avatar/generate`
Generate avatar from provider and attach to agent.

**Request**
```json
{
  "prompt": "mythic conductor, neon cyan aura, breakbeat sigils",
  "style": "portrait",
  "seed": 1337,
  "size": "1024x1024"
}
```

**Response 200**
```json
{
  "ok": true,
  "agentId": "saito",
  "avatarUrl": "/agent-avatar/saito?t=1715370000000",
  "meta": {
    "provider": "openai",
    "prompt": "mythic conductor...",
    "seed": 1337,
    "updatedAt": "2026-05-10T20:10:00.000Z"
  }
}
```

---

## 7) Compatibility + Fallback Rules
- Frontend must tolerate `404` for optional Milestone C endpoints.
- Initialization should not fail if image settings endpoint is missing.
- If provider unavailable, return actionable error message and keep core app functional.

---

## 8) Validation Rules (Server-side)
- `agentId`: required for agent-scoped routes and telemetry.
- `event`: required in telemetry, must be known taxonomy value.
- `tokensIn/out`: non-negative integers.
- `genres/favoriteSongs`: arrays with sane max lengths.
- Secrets redacted in all GET responses.
