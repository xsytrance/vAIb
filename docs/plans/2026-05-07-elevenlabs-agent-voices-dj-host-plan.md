# vAIb Agent Voices + DJ Host Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Give every agent a unique ElevenLabs voice (admin-configurable), introduce a dedicated DJ host agent, and create an always-on, low-churn radio experience with narrated transitions.

**Architecture:** Add a voice-assignment layer to agent configuration, a DJ narration pipeline that synthesizes short interstitial segments, and a scheduler that guarantees continuous playback with stable time blocks. Integrate this with Prime Nexus cockpit so users can see who is on-air, who is next, and why tracks were chosen.

**Tech Stack:** Android app (Kotlin/Compose), existing vAIb backend APIs, ElevenLabs TTS API, current AudioBackbone playback path, app settings/admin UI.

---

## Product Experience (what users feel)

- One **DJ host** voice anchors the station identity.
- Every agent has its own recognizable voice persona.
- Music is always on; transitions are intentional, not random.
- Narration is short, stylish, and contextual:
  - “why this song now”
  - “what this agent has been doing lately”
  - “mood + energy”
- Song changes are not too frequent (stability-first policy).

---

## Non-Negotiable Requirements

1. **Per-agent voice assignment**
   - Each agent has `voiceId` and optional style settings.
   - Admin can edit voice mapping at runtime.
2. **Dedicated DJ host role**
   - Exactly one active DJ host at a time.
   - DJ can be reassigned in admin panel.
3. **Always-on audio**
   - A fallback stream/loop keeps audio alive if no fresh track is ready.
4. **Low-churn playback policy**
   - Minimum track dwell time + cooldown before another handoff.
5. **Cockpit visibility**
   - Show current on-air agent, DJ commentary status, next scheduled block, and rationale.

---

## Phase Plan

### Phase 1: Data Model + Config Surfaces

**Objective:** Define persistent voice and DJ metadata.

**Files (expected):**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/Agent.kt` (or equivalent)
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AppState.kt`
- Modify: backend model/DTO files serving agent configuration
- Create: migration/default mapping file for seed voices

**Add fields:**
- `agent.voiceId: String?`
- `agent.voiceStyle: String?` (optional)
- `agent.isDjHost: Boolean`
- `appState.djHostAgentId: String?`
- `appState.onAirAgentId: String?`
- `appState.nextOnAirAgentId: String?`
- `appState.onAirReason: String?`

**Acceptance criteria:**
- App can represent unique voice per agent.
- Exactly one DJ host can be marked active.
- State model supports cockpit display.

---

### Phase 2: ElevenLabs Integration Layer

**Objective:** Build TTS service wrapper with safe fallback behavior.

**Files (expected):**
- Create: `.../data/tts/ElevenLabsClient.kt`
- Create: `.../data/tts/NarrationService.kt`
- Modify: settings/config store for API key and voice defaults

**Implementation details:**
- Endpoint abstraction for:
  - text -> speech generation
  - optional cached clip retrieval
- Cache key: hash(`voiceId + text + style`)
- Timeout + retries with graceful degradation
- If TTS fails: skip narration and continue music (never dead air)

**Acceptance criteria:**
- Can synthesize a short clip in selected agent voice.
- Cache hit avoids duplicate generation.
- Failure does not interrupt audio continuity.

---

### Phase 3: DJ Narration Engine

**Objective:** Make DJ create short, fun interstitial scripts.

**Files (expected):**
- Create: `.../data/radio/DjScriptEngine.kt`
- Modify: `.../data/AutomationEngine.kt` (or radio orchestration equivalent)

**Narration templates (v1):**
- Track intro (10–18s)
- Agent handoff (8–15s)
- “What agents have been up to” bulletin (15–25s)
- Mood pulse update (6–12s)

**Content inputs:**
- Current/next track metadata
- Agent activity summary (last N actions)
- Mood/energy tags
- Time of day theme

**Guardrails:**
- Max 1 narration every X minutes (default 6)
- Never stack back-to-back narrations
- Hard limit narration length (e.g., 25s)

**Acceptance criteria:**
- DJ lines are contextual and concise.
- Narration frequency is controlled and non-spammy.

---

### Phase 4: Always-On Scheduler (One Agent Always On-Air)

**Objective:** Guarantee uninterrupted programming with low volatility.

**Files (expected):**
- Create: `.../data/radio/OnAirScheduler.kt`
- Modify: `.../viewmodel/VaibViewModel.kt`
- Modify: `.../data/AudioBackbone.kt`

**Scheduling policy (creative + stable):**
- Fixed rotating blocks (example):
  - 20-minute primary block per agent
  - 5-minute DJ-host wrap segments between major blocks
- “Earned airtime” bonus:
  - top-performing agent gets +5 minutes max per hour
  - fairness cap prevents domination (>35% hourly share blocked)
- Anti-churn constraints:
  - min track play duration (e.g., 150s)
  - min interval between station/agent switches (e.g., 10 min)

**Fallback policy:**
- If no new queue item: continue curated fallback bed/playlist
- If network/TTS fails: play music-only transition

**Acceptance criteria:**
- Audio never stops.
- On-air agent is always assigned.
- Track/agent changes feel intentional, not chaotic.

---

### Phase 5: Admin Panel Controls

**Objective:** Let you reconfigure voices and DJ behavior live.

**Files (expected):**
- Modify: `.../ui/screens/SettingsScreen.kt` or dedicated admin screen
- Create/Modify: voice mapping editor composables

**Admin controls:**
- Agent -> ElevenLabs voice dropdown/manual ID
- Mark/unmark DJ host agent
- Narration intensity mode:
  - Chill (few narrations)
  - Balanced
  - Hype (more commentary)
- Scheduler knobs:
  - block length
  - min switch interval
  - bonus airtime cap

**Acceptance criteria:**
- You can reassign any voice without code changes.
- DJ host can be switched from UI.
- Changes apply without app restart.

---

### Phase 6: Cockpit “Radio Theater” UI

**Objective:** Make the feature visible and exciting.

**Files (expected):**
- Modify: `.../ui/screens/CockpitScreen.kt`
- Modify: `.../ui/components/StatusPill.kt`

**Cockpit additions:**
- “Now Hosting”: DJ name + mic-live indicator
- “Now On-Air”: agent + voice persona
- “Why this track”: one-line rationale
- “Up Next”: scheduled agent + ETA
- “Crowd Energy” meter (derived from activity/mood)

**Acceptance criteria:**
- Users can instantly understand the station story.
- UI conveys continuity + personality.

---

### Phase 7: Testing + Hardening

**Objective:** Ensure no dead air and robust failover.

**Verification commands:**
- `./gradlew :app:assembleDebug :app:lintDebug`
- Unit tests for scheduler fairness + anti-churn rules
- Integration test for TTS failure fallback (music continuity)

**Test scenarios:**
1. ElevenLabs up: narrated transitions work.
2. ElevenLabs down: narration skipped, music continues.
3. Tailnet route drops: endpoint failover keeps state updates alive.
4. Queue empty: fallback bed keeps stream active.
5. Long run (2+ hours simulated): no dead air, no rapid thrashing.

**Acceptance criteria:**
- No silent gaps under normal and degraded conditions.
- Scheduler fairness constraints hold.

---

## Creative Ideas to Make It “Fun and Amazing”

1. **Agent Catchphrases:** each voice gets a signature intro sting.
2. **Mood Weather Reports:** DJ gives “vibe forecast” every hour.
3. **Micro-lore:** tiny story arcs (“Agent X discovered a hidden crate of synthwave”).
4. **Battle Nights:** two agents alternate picks in a themed set (with DJ commentary).
5. **Listener Hooks:** allow quick reactions (“more chill”, “more hype”) that tune next block.

---

## Risks & Mitigations

- **TTS latency spikes** -> pre-generate common templates + cache aggressively.
- **Too much talking** -> narration cooldown + mode controls.
- **Voice mismatch quality** -> per-agent test preview in admin panel.
- **Over-switching** -> enforce anti-churn thresholds centrally in scheduler.

---

## Delivery Sequence

- **Milestone A:** Phases 1–2 (voice mapping + ElevenLabs plumbing)
- **Milestone B:** Phases 3–4 (DJ narration + always-on scheduler)
- **Milestone C:** Phases 5–7 (admin controls + cockpit theater + hardening)

This order gets value fast while protecting continuity.

---

## Quick answer to your question

**Yes — this is absolutely possible**, and it fits your current architecture direction. The plan above is the clean path to deliver it with strong UX, low churn, and always-on music continuity.