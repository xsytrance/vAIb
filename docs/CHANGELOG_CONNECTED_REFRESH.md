# vAIb Connected Refresh Changelog

## 2026-05-07

### Phase 1 — Connector Health + Sync Telemetry
- Added connector health domain model and sync telemetry.
- Surfaced connector status in Cockpit.
- Added degraded/offline handling path for sync failures.
- Commit: `78850b2`

### Phase 2 — Refresh Policies + Scheduler
- Added policy-driven refresh modes and scheduler (aggressive/balanced/battery/manual).
- Added jitter/backoff behavior and Settings controls for refresh strategy.
- Commit: `f14dfc3`

### Phase 3 — Change Feed + Freshness Score
- Added snapshot-delta change feed engine.
- Added computed freshness score and Updates timeline UI.
- Added bounded feed behavior to avoid unbounded growth.
- Commit: `411bd41`

### Phase 4 — Automation Rules (MVP)
- Added automation rules (trigger/action) and evaluation engine.
- Added automation audit log and toggles in UI.
- Integrated rule evaluation into snapshot publication.
- Commit: `c76b00d`

### Phase 5 — Conflict Detection + Weekly Refresh Ops
- Added conflict domain model and deterministic conflict resolver.
- Added weekly refresh summary generation.
- Added Integrity UI with safe-fix action.
- Commit: `df45f37`

### Final Polish
- Resolved deprecated icon usage in navigation (`QueueMusic`, `ArrowBack`) via `Icons.AutoMirrored.Filled`.
- Added this changelog for phase-by-phase traceability.
