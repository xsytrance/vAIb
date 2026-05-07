# vAIb Connected Refresh System — Phased Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to execute phase-by-phase with commit checkpoint after each phase.

**Goal:** Make vAIb continuously connected, up to date, and auto-refreshed with reliable sync, freshness scoring, and actionable change intelligence.

**Architecture:** Add a sync-control domain to the Android app with connector health, refresh scheduler, and change feed generated from state deltas. Start with local-first capabilities (works with existing `state.json` and repository fetches), then layer rules/automation and conflict resolution.

**Tech Stack:** Kotlin, Coroutines/Flow, existing `VaibRepository`, `VaibViewModel`, Jetpack Compose UI, optional WorkManager for background refresh.

---

## Phase 0: Baseline + Guardrails

**Objective:** Establish branch, baseline, and measurable checkpoints.

**Files:**
- Create: `docs/plans/2026-05-07-vaib-connected-refresh-roadmap.md`
- Create: `docs/architecture/connected-refresh.md`
- Modify: `.gitignore` (if needed for generated debug artifacts)

**Steps:**
1. Create feature branch `feat/connected-refresh-core`.
2. Record current behavior (polling interval, backend status behavior, demo mode behavior).
3. Add architecture note with domain objects and event flow.
4. Ensure build artifacts are not tracked.

**Commit checkpoint:**
- `chore: baseline docs and architecture for connected-refresh roadmap`

---

## Phase 1: Connector Health + Sync Telemetry

**Objective:** Introduce a normalized connector health model and live sync telemetry in app state.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/ConnectorHealth.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/SyncTelemetry.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AppState.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/VaibRepository.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/ConnectorHealthCard.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt`

**Implementation notes:**
- Add per-connector fields: `id`, `name`, `status` (online/degraded/offline), `lastSyncAt`, `lastError`, `latencyMs`, `staleAfterSeconds`.
- Add telemetry fields: `lastSuccessfulSyncAt`, `lastAttemptAt`, `consecutiveFailures`, `avgLatencyMs`.
- Populate from existing polling/repository paths; fallback safe defaults in demo mode.

**Verification:**
- Build passes.
- Cockpit shows at least backend + local-state connectors.
- Forced backend failure marks degraded/offline state and increments failure counts.

**Commit checkpoint:**
- `feat(sync): add connector health and sync telemetry domain + cockpit visibility`

---

## Phase 2: Refresh Policies + Scheduler

**Objective:** Control refresh cadence by policy instead of fixed-only polling.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/RefreshPolicy.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/RefreshScheduler.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/RefreshControlCard.kt`

**Implementation notes:**
- Policy modes: `aggressive`, `balanced`, `battery_saver`, `manual`.
- Replace ad-hoc timing checks with scheduler decisions (`nextEligibleRefreshAt`).
- Add jitter/backoff for repeated failures.
- Expose refresh mode + interval controls in Settings.

**Verification:**
- Switching policy changes refresh cadence.
- Backoff applies after repeated failures.
- Manual mode triggers only on user refresh.

**Commit checkpoint:**
- `feat(refresh): add policy-driven scheduler with backoff and settings controls`

---

## Phase 3: Change Feed + Freshness Score

**Objective:** Make updates legible with a “what changed” feed and freshness metric.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/ChangeEvent.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/ChangeFeedEngine.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/FreshnessScorer.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/UpdatesScreen.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/VaibNavHost.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/FreshnessBadge.kt`

**Implementation notes:**
- Compute state deltas from last successful snapshot.
- Emit events like `queue.updated`, `agent.status_changed`, `connector.failed`, `station.listeners_spike`.
- Freshness score (0–100): decay by staleness + connector health + error debt.

**Verification:**
- Updates screen shows chronological change cards.
- Freshness score changes as sync succeeds/fails.
- Feed remains bounded (ring buffer) to avoid memory growth.

**Commit checkpoint:**
- `feat(updates): add change feed timeline and computed freshness score`

---

## Phase 4: Automation Rules (MVP)

**Objective:** Add no-code-ish rules to trigger actions from change events.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AutomationRule.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/AutomationEngine.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/AutomationScreen.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/VaibNavHost.kt`

**Implementation notes:**
- Start with 3 triggers: connector offline, freshness below threshold, high-priority agent reaction burst.
- Start with 3 actions: local notification, pin update, force refresh.
- Rule evaluation should be deterministic and auditable (event-in, action-out log).

**Verification:**
- Create rule in UI, simulate event, observe action execution.
- Rule logs visible in-app for debugging.

**Commit checkpoint:**
- `feat(automation): add event rules with trigger-action MVP and audit log`

---

## Phase 5: Conflict Detection + Weekly Refresh Ops

**Objective:** Detect data conflicts and automate cleanup cadence.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/ConflictItem.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/ConflictResolver.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/WeeklyRefreshOps.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/IntegrityScreen.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/VaibNavHost.kt`

**Implementation notes:**
- Conflict types: duplicate queue items, stale agent metadata, contradictory status/timestamps.
- Weekly job compiles summary: stale sources, unresolved conflicts, low-freshness windows.
- Add one-click “apply safe fixes”.

**Verification:**
- Synthetic conflict test data produces deterministic suggestions.
- Weekly report generated and viewable in app.

**Commit checkpoint:**
- `feat(integrity): add conflict detection and weekly refresh ops summary`

---

## Cross-Phase Standards

- Keep feature flags around new modules until Phase 3 stabilizes.
- Use bounded in-memory structures for feeds/logs; persist only required state.
- Keep UI light and legible; avoid clutter.
- Treat backend/network failures as normal path; degrade gracefully.

## Suggested Commit Discipline

After each phase:
1. `git status` clean check.
2. Build: `./gradlew :app:assembleDebug` (inside `android/vAIbAndroid`).
3. Smoke run in emulator/device.
4. Commit with phase-specific message above.
5. Tag checkpoint: `phase-1-sync-health`, etc.

## Rollout Sequence

- Ship internal alpha after Phase 2.
- Ship pilot after Phase 3.
- Enable automation defaults after Phase 4.
- Promote conflict auto-fixes from “suggest-only” to “apply-safe-fixes” after Phase 5 validation.
