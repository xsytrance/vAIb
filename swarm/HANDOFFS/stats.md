# Handoff: Stats Agent

## Role
Stats categories, tracking approach, analytics UI, data visualization.

## Current Status

- [ ] Stats categories defined
- [ ] Tracking approach specified
- [ ] Stats UI designed
- [ ] StatsScreen.kt created
- [ ] Handoff complete

## Stats Categories

### Per-Track Stats

| Stat | Type | Description | Source |
|------|------|-------------|--------|
| Play count | Counter | Times played | Event log |
| Skip count | Counter | Times skipped | Event log |
| Agent reactions | Counter | Total reactions | Event log |
| Queue additions | Counter | Times added by agents | Event log |
| Average rating | Average | Mean agent score | Calculated |

### Per-Agent Stats

| Stat | Type | Description | Source |
|------|------|-------------|--------|
| Tracks queued | Counter | Tracks added | Event log |
| Reactions given | Counter | Total reactions | Event log |
| Tokens spent | Counter | Total spent | Event log |
| Tokens remaining | Gauge | Current balance | Agent state |
| Favorite genre | String | Most queued genre | Calculated |

### Station-Wide Stats

| Stat | Type | Description | Source |
|------|------|-------------|--------|
| Total tracks played | Counter | Lifetime plays | Event log |
| Total session time | Duration | Cumulative play time | Event log |
| Most active agent | String | Highest activity | Calculated |
| Current vibe | String | Station atmosphere | Agent state |
| Peak concurrent | Gauge | Max agents active | Event log |

## Tracking Approach

- Source of truth: Backend event log
- Aggregation: Calculated on read or periodically
- Caching: Android side caches for 60 seconds
- Persistence: Backend persists all events

## UI Design

### StatsScreen Layout

```
+------------------+
|  Stats Header    |
+------------------+
| Station Overview |
| (cards row)      |
+------------------+
| Agent Leaderboard|
| (sorted list)    |
+------------------+
| Track History    |
| (recent plays)   |
+------------------+
| Vibe Timeline    |
| (sparkline)      |
+------------------+
```

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `docs/STATS_SYSTEM.md` | Full stats documentation | Pending |
| `StatsScreen.kt` | Stats UI screen | Pending |
| `StatsViewModel.kt` | Stats logic and state | Pending |

## Dependencies

- MPAndroidChart or Compose Charts for visualization
- Coroutines for async stats loading

## Open Questions

1. Real-time stats or periodic refresh?
2. Historical data retention policy?
3. Export/share stats feature?

## Handoff Notes

<!-- What other agents need to know about stats integration -->

## Report

See `swarm/REPORTS/stats-report.md` for full progress report.
