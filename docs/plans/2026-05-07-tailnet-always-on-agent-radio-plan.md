# vAIb Tailnet + Always-On Agent Radio Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make vAIb reachable to any Tailscale node, eliminate dead air entirely, and introduce fun agent-driven programming blocks that keep music stable (not changing too often) while feeling alive.

**Architecture:** Add a Tailscale-aware connectivity layer (MagicDNS + direct URL override + health consensus), then redesign playback as a scheduler with a single active "host agent" slot at all times. Agent handoffs happen on controlled slot boundaries with anti-churn guardrails. Add creative social/game loops (live host persona, crowd voting windows, streaks, station rituals) on top.

**Tech Stack:** Android (Kotlin, Compose), ExoPlayer/Media3, ViewModel + StateFlow, existing vAIb repository/polling model, Tailscale tailnet DNS/IP.

---

## Product Direction (creative concept)

### Core experience: "vAIb FM — The Agent Residency"
- Exactly one agent is "On Air" at any moment.
- Agents get scheduled residency blocks (ex: 20–45 min).
- During a block, no hard station swaps unless safety fallback triggers.
- "Handoff moments" are ceremonial: stinger text, visual flare, short host intro.

### Social hooks to get people interested
- **Host Score Streaks:** each agent earns streaks for smooth blocks (no drops, strong engagement).
- **Crowd Pulse Windows:** once per block, listeners vote mood (Focus / Hype / Night Drive) for *next* block only.
- **Rare Events:** occasional themed takeovers ("Midnight Glitch", "Sunrise Protocol").
- **Weekly Poster:** auto-generated "Residency Lineup" card users share.
- **Tailnet Rooms:** each tailnet subgroup can have its own schedule/personality pack.
- **Prime Nexus Cockpit Link:** live "On Air" state and schedule mirrored into Prime Nexus cockpit so ops + audience see the same truth.
- **Earned Airtime:** hardest-working agent gets bonus minutes in next cycle (bounded so no one dominates forever).

### "Don’t change too often" policy
- Minimum block duration: 20 min default.
- Preferred duration: 30 min.
- Hard anti-churn cooldown: no new host switch within 12 min unless stream failure.
- Mid-block track updates allowed, but station identity remains stable.

---

## Phase 0: Discovery + Guardrails

### Task 0.1: Baseline current connectivity + playback behavior
**Objective:** Capture current behavior before changes.

**Files:**
- Read: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Read: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/AudioBackbone.kt`
- Read: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/VaibApiClient.kt`

**Steps:**
1. Confirm where `isBackendConnected` is set.
2. Confirm how URIs are resolved (`local/stream/asset`).
3. Document current stop conditions (end-of-media, errors, reconnect).

**Verification:**
- Build notes with exact line references.

**Commit:**
- `docs: add baseline notes for tailnet and always-on playback`

---

## Phase 1: Tailnet-First Connectivity (any tailnet device = connected)

### Task 1.1: Add tailnet endpoint config model
**Objective:** Support multiple backend endpoints with priority.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/BackendEndpoint.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/VaibApiClient.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`

**Implementation notes:**
- Add endpoint types: `TAILNET_DNS`, `TAILNET_IP`, `LOCAL_LAN`, `CUSTOM`.
- Add priority list + active endpoint selection.

### Task 1.2: Implement health consensus instead of single URL truth
**Objective:** Top status should show connected when *any* valid tailnet endpoint is healthy.

**Files:**
- Modify: `.../VaibApiClient.kt`
- Modify: `.../VaibRepository.kt`
- Modify: `.../VaibViewModel.kt`

**Implementation notes:**
- Add `checkConnectionAny(endpoints)`.
- `isBackendConnected = true` if at least one endpoint responds `/health`.
- Track active endpoint + latency for UI diagnostics.

### Task 1.3: Settings UI for tailnet onboarding
**Objective:** Let user set MagicDNS name once and auto-build endpoint list.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`

**Implementation notes:**
- Inputs: tailnet hostname (e.g. `vaib-host.tailnet-name.ts.net`), port.
- Button: "Test all tailnet routes".
- Save active endpoint in state.

### Task 1.4: Connectivity UX polish
**Objective:** Make status understandable + confidence inspiring.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/StatusPill.kt`

**Implementation notes:**
- Replace blunt disconnected with nuanced states:
  - `Connected • Tailnet`
  - `Reconnecting • trying 2/4`
  - `Offline • no endpoint healthy`

**Phase 1 verification commands:**
- `./gradlew :app:assembleDebug`
- `./gradlew :app:lintDebug`

**Phase 1 checkpoint commit:**
- `phase-1: tailnet multi-endpoint connectivity + health consensus`

---

## Phase 2: Never-Stop Playback Engine

### Task 2.1: Add Always-On playback policy model
**Objective:** Centralize non-stop playback rules.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/PlaybackPolicy.kt`
- Modify: `.../data/model/PlaybackState.kt`

**Implementation notes:**
- Fields: `alwaysOn=true`, `fallbackLoopEnabled=true`, `maxSilenceMs=1500`, `minHostSlotMinutes=20`.

### Task 2.2: Harden AudioBackbone against end-of-media silence
**Objective:** Auto-continue or loop; never remain stopped.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/AudioBackbone.kt`

**Implementation notes:**
- Handle `Player.STATE_ENDED`: enqueue next track or loop fallback stream.
- Add error listener with source failover order.
- Use `setHandleAudioBecomingNoisy`, wake mode, and retry backoff for stream failures.

### Task 2.3: Add fallback continuity ring
**Objective:** Guarantee audio continuity even if current source fails.

**Files:**
- Modify: `.../AudioBackbone.kt`
- Modify: `.../DemoData.kt`

**Implementation notes:**
- Define continuity fallback set (stable streams/local buffers).
- If host source fails, transiently use continuity stream, then restore host identity when recovered.

**Phase 2 verification commands:**
- `./gradlew :app:testDebugUnitTest`
- `./gradlew :app:assembleDebug`

**Phase 2 checkpoint commit:**
- `phase-2: always-on playback with end/error failover`

---

## Phase 3: Agent Time-Slot Scheduler (one host always live)

### Task 3.1: Add schedule and host-slot models
**Objective:** Represent daily lineups and active host ownership.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AgentSlot.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/ResidencySchedule.kt`
- Modify: `.../data/model/AppState.kt`

### Task 3.2: Build Host Residency Engine
**Objective:** Determine active host by clock + anti-churn policies.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/ResidencyEngine.kt`
- Modify: `.../viewmodel/VaibViewModel.kt`

**Implementation notes:**
- Inputs: current time, schedule, fallback health, cooldown state.
- Output: active host, next handoff ETA, allowed actions.
- Enforce:
  - one host always active,
  - min slot duration,
  - no rapid host flipping.

### Task 3.3: Controlled handoff choreography
**Objective:** Make changes feel intentional and exciting.

**Files:**
- Modify: `.../ui/screens/CockpitScreen.kt`
- Modify: `.../ui/components/StationCard.kt`
- Modify: `.../viewmodel/VaibViewModel.kt`

**Implementation notes:**
- Add 10-second pre-handoff banner.
- Trigger host intro text line and visual accent.
- Delay station/source swap until handoff boundary.

**Phase 3 verification commands:**
- `./gradlew :app:testDebugUnitTest`
- `./gradlew :app:assembleDebug`

**Phase 3 checkpoint commit:**
- `phase-3: residency scheduler with single active host`

---

## Phase 4: Engagement Layer (fun + shareable)

### Task 4.1: Crowd Pulse voting window
**Objective:** Let listeners influence the *next* slot without chaotic real-time switching.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/CrowdPulse.kt`
- Modify: `.../viewmodel/VaibViewModel.kt`
- Modify: `.../ui/screens/AgentsScreen.kt`

### Task 4.2: Host streaks + rituals
**Objective:** Build identity and retention.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/HostStreak.kt`
- Modify: `.../data/ChangeFeedEngine.kt`
- Modify: `.../ui/screens/UpdatesScreen.kt`

### Task 4.3: Weekly residency poster export
**Objective:** Give users something cool to share.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/ResidencyPosterRenderer.kt`
- Modify: `.../ui/screens/StatsScreen.kt`

**Phase 4 verification commands:**
- `./gradlew :app:assembleDebug`
- Manual QA: verify vote affects next slot only; no mid-slot chaos.

**Phase 4 checkpoint commit:**
- `phase-4: crowd pulse, host streaks, weekly poster`

---

## Phase 5: Reliability, Metrics, and Launch Readiness

### Task 5.1: Add playback uptime telemetry
**Objective:** Prove "never stop" with metrics.

**Files:**
- Modify: `.../data/model/SyncTelemetry.kt`
- Modify: `.../viewmodel/VaibViewModel.kt`
- Modify: `.../ui/screens/StatsScreen.kt`

**Metrics:**
- continuous play uptime %
- host handoff success rate
- mean recovery time after source failure

### Task 5.2: Launch presets for different vibes
**Objective:** Instantly delightful onboarding.

**Files:**
- Modify: `.../DemoData.kt`
- Modify: `.../ui/screens/SettingsScreen.kt`

**Presets:**
- Focus Workday (long calm slots)
- Night Drive (cinematic handoffs)
- Chaos Weekend (shorter but guarded slots)

**Phase 5 verification commands:**
- `./gradlew :app:testDebugUnitTest`
- `./gradlew :app:lintDebug`
- `./gradlew :app:assembleDebug`

**Phase 5 checkpoint commit:**
- `phase-5: uptime telemetry + launch presets`

---

## Test Strategy (TDD-first for core logic)

### Unit tests to add
- `ResidencyEngineTest.kt`
  - one host always selected
  - minimum slot duration enforced
  - anti-churn cooldown enforced
- `AudioBackboneContinuityTest.kt`
  - end-of-media transitions to next source
  - source failure triggers fallback
- `TailnetHealthConsensusTest.kt`
  - any healthy endpoint -> connected
  - all down -> offline

### Integration/QA scenarios
- Tailnet reachable from second device: UI stays connected.
- Kill current stream mid-slot: audio recovers within max silence target.
- 3-hour run: no dead air, controlled host handoffs only.

---

## Rollout Plan

1. Ship behind feature flags:
   - `tailnetConnectivityV2`
   - `alwaysOnPlayback`
   - `agentResidencyScheduler`
2. Dogfood with your own tailnet first.
3. Enable scheduler + engagement features after 24h stability.

---

## Risks + Mitigations

- **Risk:** Aggressive endpoint switching causes UI flapping.
  - **Mitigation:** sticky active endpoint + cooldown before endpoint swap.
- **Risk:** Always-on fallback masks real stream issues.
  - **Mitigation:** visible "continuity mode" badge + error logs.
- **Risk:** Host schedule feels rigid.
  - **Mitigation:** allow Crowd Pulse to steer next slot mood.

---

## Acceptance Criteria

- Any device on tailnet can connect via configured tailnet endpoint set.
- Top status reads connected when at least one endpoint is healthy.
- Audio never remains stopped after end/error beyond `maxSilenceMs` budget.
- Exactly one host agent is active at all times.
- Host changes happen at slot boundaries except explicit failure fallback.
- Default user experience feels stable, fun, and share-worthy.

---

## Execution Handoff

Plan complete and saved. Ready to execute in phases with checkpoint commits and test gates.

If you approve, I’ll start with **Phase 1 (Tailnet connectivity)**, then **Phase 2 (never-stop audio)**, then **Phase 3 (agent residency scheduler)**.