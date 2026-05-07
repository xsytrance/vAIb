# Handoff: Backend-API Agent

## Role
API endpoints, data models, persistence strategy, server configuration.

## Current Status

- [ ] All endpoints implemented
- [ ] Data models defined
- [ ] Persistence working
- [ ] API documented
- [ ] Handoff complete

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/queue` | GET | Get current queue | Pending |
| `/api/queue` | POST | Add track to queue | Pending |
| `/api/queue/:id` | DELETE | Remove track from queue | Pending |
| `/api/agents` | GET | List all agents | Pending |
| `/api/agents/:id` | GET | Get agent details | Pending |
| `/api/agents/:id/react` | POST | Submit agent reaction | Pending |
| `/api/events` | GET | Get recent events | Pending |
| `/api/events` | POST | Post new event | Pending |
| `/api/stats` | GET | Get stats summary | Pending |
| `/api/stats/:category` | GET | Get stats by category | Pending |
| `/api/eq/presets` | GET | List EQ presets | Pending |
| `/api/eq/presets` | POST | Save custom preset | Pending |

### Agent Event Types

| Event Type | Payload | Description |
|------------|---------|-------------|
| `agent_message` | `{ agent, message }` | Agent speaks |
| `agent_reaction` | `{ agent, track, emoji, comment }` | Agent reacts to track |
| `queue_add` | `{ agent, track }` | Agent adds track |
| `token_spend` | `{ agent, amount, reason }` | Agent spends tokens |
| `vibe_change` | `{ agent, vibe }` | Station vibe updated |

## Data Models

### Track
```json
{
  "id": "string",
  "title": "string",
  "artist": "string",
  "duration": 0,
  "source": "string",
  "addedBy": "string",
  "addedAt": "ISO-8601"
}
```

### Agent
```json
{
  "id": "string",
  "name": "string",
  "personality": "string",
  "emoji": "string",
  "tokens": 0,
  "status": "string"
}
```

### Event
```json
{
  "id": "string",
  "type": "string",
  "agent": "string",
  "payload": {},
  "timestamp": "ISO-8601"
}
```

## Persistence Strategy

- Primary: JSON files in `data/` directory
- Format: One file per entity type
- Backup: In-memory cache with periodic flush

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `server/api.mjs` | API route definitions | Pending |
| `server/store.mjs` | Data persistence layer | Pending |
| `data/queue.json` | Queue data | Pending |
| `data/agents.json` | Agent data | Pending |
| `data/events.json` | Event log | Pending |
| `data/stats.json` | Statistics | Pending |
| `data/presets.json` | EQ presets | Pending |

## Open Questions

1. WebSocket support for real-time events?
2. Authentication strategy?
3. Rate limiting for agent actions?

## Handoff Notes

<!-- What integration-agent needs to know about API shape -->

## Report

See `swarm/REPORTS/backend-api-report.md` for full progress report.
