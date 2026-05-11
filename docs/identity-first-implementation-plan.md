# vAIb Identity-First Implementation Plan

## 0) Baseline and Goal
vAIb already has:
- Agent discovery (`/agents`)
- Per-agent avatar upload endpoint
- Event + notification persistence (`data/state.json`)

This round focuses on **agent identity as first-class product surface**:
- Rich per-agent profiles
- Long-term progression (tokens → XP → levels/ranks)
- Full listening telemetry and deep analytics
- Pluggable image generation (local + API providers)

---

## 1) Identity System v1

### 1.1 Data Model (per agent)
Add identity/progression fields:
- `displayName` (stylized editable name)
- `rank` (derived title)
- `level`
- `xp`
- `lifetimeTokensIn`
- `lifetimeTokensOut`
- `genres[]`
- `favoriteSongs[]`
- `topSongs[]` (derived)
- `avatar` metadata (`source`, `prompt`, `seed`, `updatedAt`)

### 1.2 Rank Ladder
Example rank titles:
- L1–4: Signal Initiate
- L5–9: Pulse Adept
- L10–14: Resonant Operator
- L15–19: Echo Architect
- L20+: Mythic Conductor

### 1.3 Progression Curve
Token-to-XP and XP-to-level:
- `xp = floor((tokensIn + tokensOut) / 1000)`
- Cumulative requirement grows non-linearly:
  - `xpNeeded(level) = floor(100 * level^1.45)`

This creates early momentum and slower climb at high levels.

---

## 2) Agent Profile Page (`/agent/:id`)

### 2.1 Sections
- **Hero:** avatar, stylized name, rank badge, level ring, XP bar
- **Bio:** role/vibe/personality
- **Music DNA:** favorite genres, top songs (7d/30d/all), skip/completion ratios
- **Progression:** token totals, milestones, streaks
- **Behavior score:** reward/punish aggregate

### 2.2 Playback Behavior
On profile open:
- Auto-load agent top-song queue
- Attempt autoplay (muted-first for policy compatibility)
- If blocked, show explicit “Tap to tune in” CTA

---

## 3) Full Telemetry Pipeline

### 3.1 Storage
Use append-only event ledger:
- `data/telemetry.ndjson`

Later optional migration path:
- SQLite for larger datasets / indexed queries

### 3.2 Event Taxonomy
Capture at minimum:
- `song.play.start`
- `song.play.end`
- `song.pause`
- `song.resume`
- `song.skip`
- `song.mute`
- `song.unmute`
- `song.volume.change`
- `song.seek`
- `song.favorite`
- `song.dislike`
- `song.queue.add`
- `song.queue.remove`

### 3.3 Event Fields
Each record should include:
- `eventId`
- `ts`
- `agentId`
- `trackId`
- `sessionId`
- `positionSec`
- `durationSec`
- `volume`
- `muted`
- `reason` (optional)
- `context` (`tab`, `page`, `device`, etc.)

### 3.4 Derived Metrics
Compute rollups for:
- Playtime by agent / track / genre / time-of-day
- Completion rate, skip latency distribution
- Mute frequency, volume-change volatility
- Preference drift over time

---

## 4) Stats Lab (`/stats/lab`)

Power-user analytics page for deep exploration:
- Event timeline scrubber / replay
- Heatmaps (hour × genre, early-skip probability)
- Flow views (track → action → next track)
- Agent comparison panels
- Filters (agent, date range, event type, genre, source)
- Export (CSV, JSON)

Design intent: keep main UX clean while retaining full forensic depth.

---

## 5) Reward/Punish Mechanics (Identity Consequences)

### 5.1 Resonance Score
Weighted signal from telemetry:

Positive contributors:
- Full listens
- Repeat favorites across sessions
- Healthy diversity inside preferred genres

Negative contributors:
- Early skips (<20s)
- Mute spikes
- Volume thrashing
- Repeated dislikes in same cluster

### 5.2 Effects
Resonance influences:
- Rank flavor text / profile aura
- Recommendation weighting nudges
- Cosmetic unlocks (frames, traits, waveform skins)

Use as soft steering, not hard lockout.

---

## 6) Image Generation Integration (Settings-driven)

### 6.1 Settings UI
Create **Identity & Generation** settings section:
- Provider select: `disabled | local | openai | fal`
- Provider-specific config:
  - Local: endpoint URL, model, optional auth header
  - OpenAI: API key, model/style/size
  - FAL: API key, model route/options
- Test button
- “Generate avatar from identity prompt” action

### 6.2 Provider Adapters
Normalized backend interface:
- `generateIdentityImage({ agentId, prompt, style, seed }) -> { imageUrl|buffer, mimeType, meta }`

Adapters:
- Local HTTP generator (ComfyUI / SD WebUI / local service)
- OpenAI Images API
- FAL endpoint

### 6.3 Prompting
Identity-derived prompt template uses:
- Stylized name
- Rank/level tone
- Mood and genre DNA
- Color palette and symbolism

Store prompt+seed for reproducibility and regeneration.

---

## 7) Required Backend Refactor
Before adding more features, remove single-agent assumptions:
- Replace hardcoded `state.agents.saito` usage with `state.agents[agentId]`
- Include `agentId` across action and telemetry APIs
- Ensure event recorder and derivations are agent-agnostic
- Add telemetry rollup jobs and profile derivation helpers

This is prerequisite for real multi-agent identity.

---

## 8) Recommended Build Order
1. Schema migration + multi-agent refactor
2. Telemetry capture (append-only + initial rollups)
3. Profile page + progression UI
4. Autoplay/top songs behavior
5. Settings + image provider adapters
6. Stats Lab page
7. Reward/punish tuning + cosmetic identity unlocks

---

## 9) Identity-Forward Extras (Optional)
- Stable agent color constellation from deterministic ID hash
- Two signature tracks per agent: Anthem + Focus Loop
- Identity drift logs (monthly genre evolution)
- “Era” badges (e.g. Ambient Winter, Breakbeat Arc)

---

## 10) Acceptance Criteria
A milestone is complete when:
- Any discovered agent can open a full profile with progression metrics
- Token totals deterministically update XP/level/rank
- All required playback interaction events are persisted
- Stats Lab can query and visualize telemetry
- Avatar generation works from selected provider via settings
- App remains functional when optional providers/endpoints are unavailable
