# vAIb Feature Roadmap (Now → Next)

Last updated: 2026-05-07
Scope: Tailnet-first, never-stop music, agent-led entertainment loop

## North Star
Create a 24/7 autonomous party radio where:
- one agent is always in control,
- music never stops,
- faction competition drives social engagement,
- tailnet users feel instantly connected and involved.

---

## Phase 0 (Immediate: next 1–2 sessions)

### A) Never-Stop Audio Engine (P0)
**Goal:** Zero dead air.

Deliverables:
- Add a `ContinuityController` in playback layer:
  - preloads next source at N-10s
  - baton-pass to next agent/source at N-2s
  - fallback chain: stream → local fallback → emergency loopbed
- Enforce `REPEAT_MODE_ALL` (or equivalent policy) when in autonomous mode.
- Add watchdog timer (e.g., 5s no-playback => auto recover).

Acceptance:
- 2-hour soak with no silence gaps > 500ms.

### B) Agent Airtime Scheduler (P0)
**Goal:** Music changes less often but stays dynamic.

Deliverables:
- Introduce time-slot policy (default):
  - 20-minute host windows
  - 2-track minimum before possible handoff
  - max 30 minutes unless special event
- Add "hot streak" modifier:
  - top-performing faction agent can extend +1 track (bounded)
- Add anti-domination guardrails:
  - no single agent > 40% of last 2 hours.

Acceptance:
- Handoffs feel intentional; no rapid thrashing.

### C) Tailnet Presence Reliability (P0)
**Goal:** Tailnet users appear connected by default when reachable.

Deliverables:
- Prefer tailnet hostname endpoint list before raw LAN IP.
- Add state model:
  - `Connected`
  - `Degraded (local audio active)`
  - `Disconnected`
- Surface clear status reason + retry path in UI.

Acceptance:
- On tailnet, status remains Connected/Degraded instead of false Disconnected.

---

## Phase 1 (Immediate new features: wow factor)

### 1) Live "Call to Arms" Broadcast Moments
- 20-minute raid windows with intro stingers.
- Agent voice line announces target faction + multiplier.
- End-of-window mini recap card.

### 2) Recruitment Code Deep Links
- Tap-to-copy/share recruitment codes from Stats screen.
- Deep link opens app with faction pre-selected.
- Track conversions per code.

### 3) Faction Identity Pack
- Per-faction visual treatment (color pulse, waveform style).
- Unique victory jingles and UI animation bursts.

### 4) "Crowd Heat" Meter
- Aggregate likes/retention into heat meter.
- High heat triggers temporary cinematic mode (subtle).

---

## Phase 2 (Refinement of current features)

### Faction Wars Refinement
- Balance point economy to avoid runaway leads.
- Add comeback mechanics for trailing faction.
- Normalize momentum decay over time.

### UI/UX Polish
- Reduce cognitive load on Stats card.
- Add concise explainer tooltips for raids/codes.
- Improve empty and reconnect states.

### Observability
- Add structured logs for handoffs and recovery events.
- Add debug panel counters:
  - recoveries
  - handoff success rate
  - dead-air incidents

### Performance/Battery
- Tune polling cadence dynamically by app visibility.
- Avoid unnecessary recompositions in heavy screens.

---

## Phase 3 (Growth loops)

### Social/Viral
- Weekly faction championship with shareable recap card.
- "Bring 3 friends" faction bonus windows.
- Limited-time titles/badges for participants.

### Creative Programs
- Theme nights (Cyberpunk Fridays, Orbit Sundays).
- Agent lore drops and serialized story arcs.
- Surprise guest mode (special voice persona takeover).

---

## Implementation plan (bite-sized checkpoints)

1. Build ContinuityController skeleton + compile.
2. Wire watchdog recovery + compile.
3. Add scheduler model + compile.
4. Connect scheduler to playback routing + on-device check.
5. Add tailnet status tiering + UI pill mapping.
6. Add recruitment deep links + share action.
7. Tune scoring fairness constants + soak test.
8. Final polish + release notes.

Verify each checkpoint:
- `./gradlew :app:assembleDebug :app:lintDebug`

---

## Success metrics
- Dead-air incidents/hour: **0**
- Avg handoff interval: **15–25 min**
- Session length uplift: **+30%**
- Faction participation: **+40% weekly**
- Share actions/day: measurable and rising

---

## File locations for reset recovery
- Handoff: `docs/HANDOFF_RESET.md`
- Roadmap: `docs/FEATURE_ROADMAP.md`
