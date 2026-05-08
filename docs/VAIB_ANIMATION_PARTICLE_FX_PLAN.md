# VAIB Animation & Particle FX System — Technical Plan v3.0

**Branch:** `prime-stabilization`  
**Commit:** `f6572b8` — "feat(android): add isolated app auto-update flow" (2026-05-07)  
**Local Plan Commit:** `4179491` — v2.0 superseded  
**Package:** `com.xsytrance.vaib`  
**Min SDK:** 28 / **Target SDK:** 34 / **Compile SDK:** 34  
**Compose BOM:** 2024.02.00 / **Kotlin:** 1.9.22  
**Status:** FINAL v3.0 — Supreme Commander philosophical refinements applied

---

## 1. Executive Summary

**Mission:** vAIb is a living, network-aware, agent-driven AI music cockpit. The animation, particle, haptic, and sound system is a **data representation layer** — not decoration. It makes invisible app, agent, music, and infrastructure state visible and felt: music playback, agents working, network activity, downloads, updates, installs, backups, user login/logout, restarts, disk pressure, service health, security risks, task success/failure, agent operational emotional state, and human-machine context.

**Scope (In):** `VibeProfile` system; `VaibEvent` / `VaibEventBus` signal layer; `AgentPresence` / `AgentMood` living agents; data-driven color/event mapping; global reactive motion field; AMOLED-native visuals; deterministic particle system; haptics; sound design; `MotionIntensity` rollout control; full rollback strategy with BuildConfig kill switch.

**Scope (Out):** No changes to `AudioBackbone.kt`, `VaibNavHost.kt`, data layer, or navigation. No new screens/routes. No full agent log storage.

**Success Criteria:**
- [ ] Kill switch disables 100% of visual delta within 1 build
- [ ] `VibeProfile` persists, editable in `SettingsScreen`
- [ ] `OFF` strips all animation overhead; `REDUCED` disables particles, limits transitions to 150ms
- [ ] Battery drain delta <= 3%/hour at `STANDARD`
- [ ] `AgentPresence` shows real status with tiny summaries; `AgentMood` derives from context, never random
- [ ] All visuals map to real system state — no decoration
- [ ] No regression in `AudioBackbone` or `strict_broadcast_mode`

---

## 2. North Star

vAIb is a living, music-reactive operational atmosphere layer for agents, networks, systems, and human interaction.

It is not a generic dashboard.  
It is not a visualizer gimmick.  
It is not a fake AI companion app.

It should feel like: music, systems, agents, and operational energy are all resonating together inside one living environment.

**Core pillars:**
- **Music sovereignty** — audio layer is always primary; FX serve the music
- **State-first everything** — every visual/haptic/audio effect answers "what is happening?"
- **Operational Silence** — the absence of signal IS signal; a healthy silence is the user's baseline; deviation is meaningful
- **Global coherence** — the app breathes as one system, not many animated widgets

Everything in this plan serves that single sensation. If a feature does not deepen the feeling of a living, breathing, music-driven operational space, it does not belong.

---

## 3. Product Vision

**Paradigm Shift:** vAIb is a **living network-aware agent music cockpit**. The visual/audio/haptic layer is the app's nervous system.

| Domain | Signals | Visual Response |
|---|---|---|
| **Music** | `PLAYBACK_STARTED/PAUSED`, `TRACK_CHANGED`, `BUFFERING` | Waveform particles, color shifts, card glow, visualizer |
| **Agents** | `AGENT_TASK_*`, `AGENT_CREATED/DELETED` | Presence cards, state colors, particle bursts, haptic cues |
| **Network** | `NETWORK_ACTIVITY_HIGH/LOW` | Subtle flow direction, dot density |
| **Downloads/Updates** | `DOWNLOAD_*`, `UPDATE_*` | Progress streams, gold completion bursts |
| **Backups** | `BACKUP_*` | Cyan activity stream, gold confirmation |
| **User** | `USER_LOGIN/LOGOUT` | Presence transition, field reset |
| **Machine** | `MACHINE_RESTART_*`, `DISK_WARNING` | Red alert overlay, warning pulses |
| **Services** | `SERVICE_HEALTHY/DEGRADED` | Green/amber status tint |
| **Security** | `SECURITY_RISK` | Magenta-red flash, alert overlay |
| **System Vitality** | Aggregate operational state | Ambient field intensity, silence/deviation |

**Core Principle:** STATE FIRST, ATMOSPHERE SECOND. Every particle, glow, haptic pulse answers: *"What is happening right now?"*

**Operational Silence is the inverse.** When nothing is happening, the atmosphere quiets. The absence of signal IS signal. A healthy silence becomes the user's baseline — gradual deviation becomes meaningful. See Section 10.6.

### 3.1 Golden Rule — Sensory Balance

**Animations and effects must never compete with the currently playing music.**

This rule is absolute. The audio layer is sovereign. The visual layer supports it, never vies for attention.

| Music Condition | UI Response |
|---|---|
| Intense, high-energy music | UI becomes calmer, fewer particles, slower ambient drift |
| Ambient, minimal music | UI allowed more breathing motion, richer particle life |
| Heavy operational alerts | Override ambient visuals only when necessary; restore immediately after |

UI motion should support the music, not compete with it. When in doubt, subtract.

---

## 4. Current Repo Findings

### 4.1 Build Context
- HEAD: `f6572b8`, `prime-stabilization`, clean tree
- Min 28 / Target 34 / Compile 34; Compose BOM 2024.02.00
- `AnimatedVisibility`, `animateColorAsState`, `AnimatedContent`, `rememberInfiniteTransition`, `withFrameNanos`, `Canvas`, `BlendMode` all stable
- No new Gradle deps required (except possibly `kotlinx-serialization-json` for profile JSON)

### 4.2 Screen Inventory (14 screens)
| File | Path | Animation Exposure |
|---|---|---|
| `CockpitScreen.kt` | `.../ui/screens/CockpitScreen.kt` | **HIGH** — header, On Air, visualizer, cards, agent panel |
| `LandscapeDjDeck.kt` | `.../ui/screens/LandscapeDjDeck.kt` | **HIGH** — 3-column, visualizer, EQ, session |
| `AgentsScreen.kt` | `.../ui/screens/AgentsScreen.kt` | **MEDIUM** — chip grid, presence cards |
| `SettingsScreen.kt` | `.../ui/screens/SettingsScreen.kt` | **MEDIUM** — FX toggle, profile UI |
| `StationsScreen.kt` | `.../ui/screens/StationsScreen.kt` | LOW |
| `QueueScreen.kt` | `.../ui/screens/QueueScreen.kt` | LOW |
| `MoreScreen.kt` / `StatsScreen.kt` / `EqScreen.kt` | `.../ui/screens/` | LOW |
| `ApiScreen.kt` / `IntegrityScreen.kt` | `.../ui/screens/` | NONE |
| `UpdatesScreen.kt` / `AutomationScreen.kt` | `.../ui/screens/` | LOW |
| `VaibNavHost.kt` | `.../ui/navigation/VaibNavHost.kt` | LOW |

### 4.3 Component Inventory (12 components)
| Component | File | Animation State |
|---|---|---|
| `VisualizerBars` | `VisualizerBars.kt` | **ONLY active animation** — `rememberInfiniteTransition`, 24 bars, 160ms loop |
| `VaibCard` | `VaibCard.kt` | Static — `neonGlow: Boolean` draws border, no animation |
| `StatusPill` | `StatusPill.kt` | Static |
| `StationCard` / `TrackCard` / `QueueTrackCard` | Station/Track/Queue card files | Static |
| `AgentChip` | `AgentChip.kt` | Static |
| `ConnectorHealthCard` / `StatTile` / `EqualizerBand` | Health/Stat/Equalizer files | Static / gesture-only |
| `ReactionBadge` / `TokenBudgetPill` | Reaction/Token files | Static |

### 4.4 Theme Tokens (from `Color.kt`)
```kotlin
val PrimaryNeonCyan      = Color(0xFF00E5FF)  // playback, accents, glow
val SecondaryGold        = Color(0xFFFFD700)  // success, completion
val AccentMagenta        = Color(0xFFFF00FF)  // agent activity
val AccentViolet         = Color(0xFF8B5CF6)  // buffering, transitions
val LiveGreen            = Color(0xFF00FF88)  // healthy, synced
val ErrorRed             = Color(0xFFFF4444)  // warnings, security
val BackgroundAmoled     = Color(0xFF000000)  // TRUE BLACK root
val SurfaceDark          = Color(0xFF0A0A0A)  // screen base
val SurfaceCard          = Color(0xFF111111)  // card fill
val SurfaceElevated      = Color(0xFF1A1A1A)  // elevated
val TextPrimary          = Color.White         // headlines
val TextSecondary        = Color(0xFFAAAAAA)  // body
val TextMuted            = Color(0xFF666666)  // captions
val BorderSubtle         = Color(0xFF222222)  // dividers
```

### 4.5 State Flow
```
AudioBackbone (ExoPlayer)
  -> Player.Listener.onPlaybackStateChanged()
  -> VaibViewModel.syncPlaybackState()
  -> _appState.update { it.copy(playback = newPlayback) }
  -> UI: val state by viewModel.appState.collectAsStateWithLifecycle()
```
- `AppState.playback: PlaybackState` — `isPlaying, isBuffering, currentTrack, progress, volume, outputMode`
- `VaibViewModel._appState: MutableStateFlow<AppState>`
- `VaibViewModel` reads/writes SharedPreferences name `"vaib_state"`
- Existing keys: `strict_broadcast_mode`, `listening_stats_json`, `update_auto_check`, `update_endpoint`
- **No existing animation/FX preference key. No `MotionIntensity` concept. No `VibeProfile` concept.**

---

## 5. Vibe Profile System

### 5.1 Concept
A `VibeProfile` is a user-configurable blend of visual identity traits — the app's "visual DNA." Persisted in SharedPreferences, edited in `SettingsScreen`.

### 5.2 Data Model
```kotlin
// .../ui/theme/VibeProfile.kt
data class VibeProfile(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val musicReactiveWeight: Int = 70,         // 0..100
    val cyberpunkWeight: Int = 20,             // 0..100
    val tacticalWeight: Int = 10,              // 0..100
    val particleDensity: Int = 50,             // 0..100
    val waveformIntensity: Int = 60,           // 0..100
    val glowIntensity: Int = 50,               // 0..100
    val hapticsEnabled: Boolean = true,
    val uiSoundsEnabled: Boolean = true,
    val amoledPurity: Boolean = true,
    val alertSensitivity: Int = 50,            // 0..100
    val agentInfluence: Int = 50,              // 0..100
    val networkInfluence: Int = 30,            // 0..100
    val batterySensitivity: Boolean = true,    // auto-reduce when battery < 20%
    val reducedMotionCompatibility: Boolean = false
)
```

### 5.3 Trait Registry
| Trait | Default | Range | Effect |
|---|---|---|---|
| `musicReactiveWeight` | 70 | 0..100 | Music-driven particle/waveform intensity |
| `cyberpunkWeight` | 20 | 0..100 | Magenta/violet bias, sharper edges |
| `tacticalWeight` | 10 | 0..100 | Cleaner HUD, fewer particles |
| `particleDensity` | 50 | 0..100 | Scales max particles relative to MotionIntensity cap |
| `waveformIntensity` | 60 | 0..100 | Visualizer amplitude |
| `glowIntensity` | 50 | 0..100 | Border glow strength |
| `hapticsEnabled` | true | bool | Master haptics toggle |
| `uiSoundsEnabled` | true | bool | Master UI sound toggle |
| `amoledPurity` | true | bool | True black vs lifted surface |
| `alertSensitivity` | 50 | 0..100 | Warning reactivity |
| `agentInfluence` | 50 | 0..100 | Agent OES visual weight — how strongly agent operational state affects the reactive field |
| `networkInfluence` | 30 | 0..100 | Network activity visual weight |
| `batterySensitivity` | true | bool | Auto-dim FX when battery low |
| `reducedMotionCompatibility` | false | bool | Force `MotionIntensity.REDUCED` |

### 5.4 Default Profile
```kotlin
val DefaultVibeProfile = VibeProfile(
    name = "Neon Oracle", musicReactiveWeight = 70, cyberpunkWeight = 20,
    tacticalWeight = 10, particleDensity = 50, waveformIntensity = 60,
    glowIntensity = 50, hapticsEnabled = true, uiSoundsEnabled = true,
    amoledPurity = true, alertSensitivity = 50, agentInfluence = 50,
    networkInfluence = 30, batterySensitivity = true, reducedMotionCompatibility = false
)
```
Weights need not sum to 100 — they are independent influence sliders normalized at render time.

### 5.5 Auto-Name Generation (Future — Phase 4+)
```kotlin
// .../ui/theme/VibeProfileNameGenerator.kt
// Simple decision tree — no ML.
// 70/20/10 -> Neon Oracle    |  50/25/25 -> Signal Warden
// 80/15/5  -> Pulse Prophet  |  20/60/20 -> Ghost Raver
// 20/20/60 -> Command Deck   |  60/30/10 -> Agent Ravecore
// 10/70/20 -> Network Muse   |  30/50/20 -> AMOLED Shaman
// 50/30/20 -> Bassline Sentinel  |  30/40/30 -> System Siren
```

### 5.6 Persistence
- SharedPreferences key: `"vibe_profile_json"` — JSON via `kotlinx.serialization`
- Read at app startup in `MainActivity`
- Exposed: `VaibViewModel.vibeProfile: StateFlow<VibeProfile>`

### 5.7 UI Placement (`SettingsScreen.kt`)
- Profile name + edit
- Three weight sliders (Music Reactive / Cyberpunk / Tactical)
- Density/Intensity sliders (particle, waveform, glow)
- Switches (haptics, UI sounds, AMOLED purity, battery sensitivity, reduced motion)
- "Reset to Default" button

---

## 6. Event Signal Layer

### 6.1 Design
Lightweight fire-and-forget pub/sub. Subscribers consume via coroutines. No persistence. No ordering beyond timestamp. Universal signal pipe for all FX subsystems.

### 6.2 `VaibEvent.kt`
```kotlin
// .../ui/fx/event/VaibEvent.kt
data class VaibEvent(
    val id: String = UUID.randomUUID().toString(),
    val type: VaibEventType,
    val source: String,                // "AudioBackbone", "AgentManager", etc.
    val timestamp: Long = System.currentTimeMillis(),
    val severity: VaibEventSeverity = VaibEventSeverity.INFO,
    val payload: Map<String, String> = emptyMap()  // max 8 entries, 64 chars each
)

enum class VaibEventType {
    AGENT_TASK_STARTED, AGENT_TASK_PROGRESS, AGENT_TASK_COMPLETED, AGENT_TASK_FAILED,
    AGENT_CREATED, AGENT_DELETED,
    DOWNLOAD_STARTED, DOWNLOAD_COMPLETED,
    UPDATE_AVAILABLE, UPDATE_INSTALLING, UPDATE_COMPLETED,
    BACKUP_STARTED, BACKUP_COMPLETED,
    USER_LOGIN, USER_LOGOUT,
    MACHINE_RESTART_PENDING, MACHINE_RESTARTED, DISK_WARNING,
    SERVICE_HEALTHY, SERVICE_DEGRADED,
    SECURITY_RISK,
    NETWORK_ACTIVITY_HIGH, NETWORK_ACTIVITY_LOW,
    PLAYBACK_STARTED, PLAYBACK_PAUSED, TRACK_CHANGED,
    BUFFERING_STARTED, BUFFERING_ENDED
}

enum class VaibEventSeverity { INFO, SUCCESS, WARNING, CRITICAL }
```

### 6.3 `VaibEventBus.kt`
```kotlin
// .../ui/fx/event/VaibEventBus.kt
class VaibEventBus {
    private val _events = MutableSharedFlow<VaibEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<VaibEvent> = _events.asSharedFlow()
    fun emit(event: VaibEvent) { _events.tryEmit(event) }
}
```
- `extraBufferCapacity = 64` — drops oldest on overflow, never blocks
- Application-scoped singleton
- Subscribers: `GlobalReactiveField`, `AgentMoodEngine`, `VaibHaptics`, `VaibSoundDesign`

### 6.4 Payload Constraint
`payload: Map<String, String>` — max 8 entries, each <= 64 chars. No full logs. Examples:
```kotlin
payload = mapOf("agentId" to "agent-7", "taskType" to "sync", "durationSec" to "12")
payload = mapOf("freePercent" to "8", "threshold" to "10")
```

### 6.5 Signal Priority and Decay

Not all events are equal. The reactive field must respond to significance, not noise.

**Priority Tiers:**

| Tier | Events | Field Influence |
|---|---|---|
| **CRITICAL** | Security risk, repeated agent failures, disk almost full, service outage | Full override — dims ambient, takes visual priority |
| **HIGH** | Update installing, restart pending, heavy operational load | Strong influence — visible pulse, color shift |
| **MEDIUM** | Track changed, agent task completed, playback started | Moderate — brief spike, local microinteraction |
| **LOW** | Passive downloads, idle backups, low-level network chatter | Minimal — subtle ambient drift change only |

**Decay Model:**
- Event influence decays exponentially over time: `influence = base * e^(-lambda * t)`
- Critical events: halflife 8s; High: 4s; Medium: 2s; Low: 1s
- Same event type: rate-limited to once per N seconds (CRITICAL: 3s, HIGH: 5s, MEDIUM: 2s, LOW: 1s)
- Purpose: prevent the reactive field from constantly thrashing due to tiny events

**Vitality Baseline (Operational Silence):**
- When NO events are active above LOW tier, the reactive field enters its **baseline vitality state**
- This is NOT "nothingness" — it is the **healthy default atmosphere** of the app
- Baseline state represents: all systems nominal, music playing (or paused but present), agents idle, network stable
- The user learns what "healthy" feels like through daily use
- Deviations from this baseline — thinning atmosphere, interrupted cadence, reduced particle density — signal degradation without requiring explicit alerts
- True operational silence (total system offline): field goes completely dormant, `BackgroundAmoled` only, zero motion

```kotlin
// .../ui/fx/event/EventInfluenceDecay.kt
class EventInfluenceDecay {
    fun computeCurrentInfluence(eventHistory: List<TimestampedEvent>): Float
    fun isRateLimited(eventType: VaibEventType): Boolean
    fun computeVitalityBaseline(eventHistory: List<TimestampedEvent>): VitalityLevel
}

enum class VitalityLevel { NOMINAL, THINNED, DORMANT, ABSENT }
```

---

## 7. Agent Presence System

### 7.1 Concept
Agents are living UI presences. Created -> appears. Deleted -> fades/archived. Each has a status card showing what it is doing **right now**.

### 7.2 `AgentPresence.kt`
```kotlin
// .../ui/fx/agent/AgentPresence.kt
data class AgentPresence(
    val id: String,
    val displayName: String,
    val persona: AgentPersona,
    val isOnline: Boolean,
    val activityState: AgentActivityState, // ONLINE, OFFLINE, ACTIVE, IDLE, ERROR
    val currentTaskCategory: String,       // "sync", "search", "backup", "idle"
    val recentWorkSummary: String,         // TINY. Max 80 chars. e.g. "Synced 3 stations"
    val mood: AgentMood,
    val musicInfluence: MusicInfluence,
    val visualSignature: VisualSignature,
    val lastSeen: Long,
    val sourceSystem: AgentSource          // HERMES, OPENCLAW, LOCAL_CONFIG
)

enum class AgentActivityState { ONLINE, OFFLINE, ACTIVE, IDLE, ERROR }
enum class AgentSource { HERMES, OPENCLAW, LOCAL_CONFIG }
enum class AgentPersona { ORACLE, SENTINEL, MUSE, WARDEN, SHADOW }
data class VisualSignature(val accentColor: Color, val particleShape: ParticleShape, val glowStyle: GlowStyle)
data class MusicInfluence(val tempoPreference: TempoPreference = TempoPreference.NEUTRAL, val moodAlignment: Boolean = true)
enum class TempoPreference { SLOW, NEUTRAL, UPBEAT }
enum class GlowStyle { SOFT, SHARP, PULSE, STEADY }
```

### 7.3 NO FULL LOGS
`recentWorkSummary` max 80 chars. Updated on task complete/fail. Acceptable: `"Synced 3 stations"`, `"Searching: ambient dub"`, `"Backup complete"`. Not acceptable: log tails, stack traces, PII.

### 7.4 `AgentPresenceCard.kt`
```kotlin
// .../ui/fx/agent/AgentPresenceCard.kt
@Composable
fun AgentPresenceCard(presence: AgentPresence, onClick: () -> Unit, modifier: Modifier = Modifier)
```
- Compact: avatar dot, name, status pill, tiny summary, state indicator
- Glow border from `visualSignature.accentColor`
- Border color: `ACTIVE = AccentMagenta`, `IDLE = TextMuted`, `ERROR = ErrorRed`
- Placed in `CockpitScreen.kt` agent panel and `AgentsScreen.kt`

### 7.5 Lifecycle
- `AGENT_CREATED` -> card appears immediately
- `AGENT_DELETED` -> fade out 300ms, then remove
- `AGENT_TASK_*` -> summary + status refresh in-place
- Source unreachable -> `isOnline = false`, card dims

### 7.6 Agent Tone and Presence

The tone must feel like **intelligent operational entities living inside the network**.

**NOT:** fake anime mascots, gimmicky assistant avatars, artificial personas, illustrated caricatures.

**Agents should feel:** infrastructural, persistent, embedded in the network, operational, system-native.

| Element | Correct | Incorrect |
|---|---|---|
| Names | Functional: "djinn", "sentinel-7", "warden" | Cute: "DJ Sparkles", "BuddyBot" |
| Visual signatures | Minimal geometric, abstract glyphs | Illustrated characters, faces, avatars |
| Summaries | Operational telemetry: "Synced 3 stations" | Diary entries: "I'm feeling sleepy" |
| Presence indicators | Status dots, activity pulses, network bars | Emotional expressions, emoji reactions |
| Communication | State changes, task completion, system events | Greetings, banter, pretend social behavior |

Agents are system components with observable state — not characters. The warmth comes from their responsiveness and integration, not from anthropomorphic theater.

---

## 8. Agent Operational Emotional State (OES)

### 8.1 Concept
Agent Operational Emotional State (OES) emerges naturally from operational context — **not random, not scripted, not decorative.** `AgentMoodEngine` computes state from real inputs. OES influences music selection, FX intensity, glow color, particle behavior, haptic rhythm, and UI ambient response.

State emerges from: workload, success/failure streaks, retries, task duration, network conditions, human interaction frequency, service health, music/activity history, environment context.

### 8.2 `AgentMood.kt`
```kotlin
// .../ui/fx/agent/AgentMood.kt
enum class AgentMood {
    FOCUSED, ENERGIZED, STRAINED, DORMANT, ALERT, OVERLOADED, CALM, UNSTABLE, SOCIAL, CURIOUS
}
```

### 8.3 `AgentMoodEngine.kt`
```kotlin
// .../ui/fx/agent/AgentMoodEngine.kt
class AgentMoodEngine @Inject constructor(private val eventBus: VaibEventBus) {
    fun computeMood(
        taskType: String?, taskDurationSec: Long, successStreak: Int, failureStreak: Int,
        humanInteractionCountRecent: Int, serviceHealth: ServiceHealth,
        isMusicPlaying: Boolean, networkActivityLevel: NetworkLevel, systemAlertCount: Int
    ): AgentMood
}
```

### 8.4 OES Triggers & Outputs
| State | Triggers | Visual | Music Influence |
|---|---|---|---|
| `FOCUSED` | Long task, no errors | Steady cyan pulse | Sustained tempo |
| `ENERGIZED` | Rapid completions (>= 3) | Gold micro-pulses | Upbeat bias |
| `STRAINED` | Failure streak >= 2 | Dim red flicker | Tension hint |
| `DORMANT` | No task > 5 min | Very sparse, muted | Discovery mode |
| `ALERT` | Warning condition | Rapid border flash | No change |
| `OVERLOADED` | Concurrent tasks > 3 | Chaotic red density | No change |
| `CALM` | Idle, all healthy | Minimal violet ambient | Ambient-friendly |
| `UNSTABLE` | Critical failure | Bright red alert pulse | Pause suggestion |
| `SOCIAL` | High human interaction | Warm lateral drift | Collaborative tempo |
| `CURIOUS` | Exploring/searching | Wandering magenta glow | Exploration bias |

### 8.5 Music Integration
When `MusicInfluence.moodAlignment = true`, OES feeds track recommendation weighting as a **hint** — music always comes first. `ENERGIZED` -> slight positive energy boost. `STRAINED` -> slight calming bias. `UNSTABLE` -> pause or ambient suggestion.

### 8.6 Agent Taste Evolution (Future Architecture Hook)

**Phase 4+ only. Architecture hook, not implementation.**

Over long operational history, agents develop taste preferences — not identity mimicry, but **patterned operational preference** derived from correlated outcomes.

**Future inputs:** songs skipped, songs replayed, successful task/music correlations, time of day, vibe profile, workload type, music during successful operations, user interactions, genres associated with task categories.

**Emergent preferences over time:**
- BPM range affinity (narrowing from broad to preferred band)
- Genre weight shifts (electronic vs ambient vs rhythmic)
- Energy level preference (by workload type)
- Visual style gravitation (particle density, glow style)
- Haptic intensity preference (by operational context)
- Ambient field behavior (flow direction, pulse cadence)

```kotlin
// .../ui/fx/agent/AgentTasteProfile.kt (FUTURE — Phase 4+)
data class AgentTasteProfile(
    val agentId: String,
    val bpmRange: ClosedFloatingPointRange<Float> = 80f..140f,
    val genreWeights: Map<String, Float> = emptyMap(),        // normalized 0..1
    val energyPreference: Float = 0.5f,                        // 0=calm .. 1=intense
    val visualStylePreference: VisualStylePreference = VisualStylePreference.BALANCED,
    val hapticIntensityPreference: Float = 0.5f,
    val ambientFlowPreference: FlowDirection = FlowDirection.UPWARD,
    val confidenceScore: Float = 0.0f,                         // increases with data volume
    val lastUpdated: Long = System.currentTimeMillis()
)

enum class VisualStylePreference { MINIMAL, BALANCED, DENSE, ORGANIC, GEOMETRIC }
enum class FlowDirection { UPWARD, LATERAL, RADIAL, ORBITAL }
```

Taste evolution is gradual, transparent, and overrideable. The user always controls the vibe profile; agent taste is a soft influence layer.

---

## 9. Data-Driven FX Philosophy

**STATE FIRST, ATMOSPHERE SECOND.** Every effect maps to a real signal.

| Color | Meaning | Sources |
|---|---|---|
| `PrimaryNeonCyan` (#00E5FF) | Playback, listening | `PLAYBACK_STARTED`, `BUFFERING_ENDED`, `SERVICE_HEALTHY` |
| `SecondaryGold` (#FFD700) | Success, completion | `AGENT_TASK_COMPLETED`, `UPDATE_COMPLETED`, `BACKUP_COMPLETED` |
| `AccentMagenta` (#FF00FF) | Agent activity | `AGENT_TASK_STARTED`, `AGENT_CREATED`, `CURIOUS` state |
| `AccentViolet` (#8B5CF6) | Buffering, transition | `BUFFERING_STARTED`, dormant, loading |
| `LiveGreen` (#00FF88) | Healthy, synced | `SERVICE_HEALTHY`, agent online |
| `ErrorRed` (#FF4444) | Warning, security, restart | `DISK_WARNING`, `SECURITY_RISK`, `MACHINE_RESTART_PENDING` |
| `TextMuted` (#666666) | Inactive, offline | `PLAYBACK_PAUSED`, agent offline, dormant |

**Prohibited:** Random color cycling, rainbow mode, decorative spectrum effects, ambient color with no signal source.

---

## 10. Global Motion Model

The Global Reactive Field is the central nervous system of the app.

**Core doctrine:** Global coherence is more important than local spectacle. The app should feel like **the entire system is breathing** — not like many widgets animating independently.

Four composable layers, bottom to top:

```
Layer 4: Alert Overlays      — warning/security (conditional)
Layer 3: Event Spikes        — brief intense visual on significant events
Layer 2: Local Microinteractions — button presses, card hovers, transitions
Layer 1: Global Ambient Field — cockpit-wide reactive particle/waveform
```

### 10.1 `GlobalReactiveField.kt`
```kotlin
// .../ui/fx/core/GlobalReactiveField.kt
@Composable
fun GlobalReactiveField(
    playbackState: PlaybackState, vibeProfile: VibeProfile,
    agentMoods: List<AgentMood>, networkLevel: NetworkLevel, modifier: Modifier = Modifier
)
```
- Full-screen Canvas at lowest z-index
- Driven by: playback energy + vibe weights + agent OES influence + network activity + system events
- The field reacts to: playback energy, agent activity, downloads, updates, backups, machine health, alerts, network intensity, operational stress, vibe profile, time of day
- The field subtly influences: glow intensity, particle velocity, pulse cadence, waveform movement, saturation, haptic rhythm, UI transition speed
- Intensity scaled by `vibeProfile.particleDensity` and `MotionIntensity`
- `OFF` or `REDUCED` -> returns `Spacer`, zero allocation

### 10.2 Local Microinteractions
- `buttonPressEffect()` — scale + alpha on interactive elements
- `crossfadeSpec()` — track change, content swap
- `slideTransition()` — card entrance, panel reveal
- `animatedCardGlow()` — `VaibCard` pulsing border when active

### 10.3 Event Spikes
- 300-800ms burst on `VaibEvent` — triggered by `AGENT_TASK_COMPLETED`, `UPDATE_COMPLETED`, `TRACK_CHANGED`, `USER_LOGIN`
- Particle burst from event origin, color flash, scale bounce
- Priority-weighted: critical events produce stronger spikes; low-priority events produce minimal ripples
- Never blocks UI, never delays taps

### 10.4 Alert Overlays
- Conditional border overlays: `WARNING` = amber pulse; `CRITICAL` = red + haptic
- Triggered by: `DISK_WARNING`, `SECURITY_RISK`, `SERVICE_DEGRADED`, `MACHINE_RESTART_PENDING`
- Dismisses when condition clears (event-driven)
- Critical alerts temporarily suppress ambient field motion to ensure visibility

### 10.5 Music-Driven UI Rhythm

The app subtly moves **with** the music. Not cheesy beat visualization. A premium, felt synchronization.

| Music Property | UI Response |
|---|---|
| BPM | Transition timing can sync to beat cadence; haptic cadence can align with downbeat |
| Energy | Pulse speed derives from track intensity; particle velocity maps to energy |
| Intensity | Waveform drift follows intensity curves; ambient field speed maps to tempo |
| Dynamics | Quieter passages allow more UI breathing; louder passages tighten UI motion |

**Rule:** UI motion should support the music, not compete with it. The user should feel the synchronization, not see it obviously. If the effect calls attention to itself, it is too much.

### 10.6 Operational Silence

Operational Silence is one of the core emotional pillars of vAIb. The atmosphere layer represents overall ecosystem vitality — and the absence of activity is as meaningful as its presence.

| System State | Atmosphere Response | Description |
|---|---|---|
| **Healthy active systems** | Full ambient field, operational rhythm, musical continuity | The app feels alive. Particles drift at nominal density, waveform pulses gently, glow breathes. This is the "healthy default" the user learns. |
| **Degraded systems** | Thinner atmosphere, interrupted cadence, reduced particle density | Fewer particles, slower pulse, dimmed glow. The app feels "under the weather." The change is felt, not announced. |
| **Widespread outages / failures** | Quiet, dormant, near-silent field | Particles fade to near-zero. Waveform becomes a faint trace. Glow is minimal. The app is still present but unmistakably subdued. |
| **Total system offline** | True silence, dead field, `BackgroundAmoled` only | Zero motion. Zero particles. Pure black. The app exists only as its static UI shell. This is the operational void. |

**What Operational Silence is:**
- **Ambient situational awareness** — the user gradually learns what "healthy" feels like
- **Natural, cold, operational, empty** — no horror aesthetics, no dramatic "system death" theatrics
- **Subtle, restrained, atmospheric, non-gimmicky** — deviation from baseline registers emotionally without demanding attention
- **The inverse of signal** — where events create spikes, their absence creates space

**What Operational Silence is NOT:**
- NOT a log viewer or dashboard
- NOT an alert or notification system
- NOT manipulative emotional framing
- NOT decorative emptiness — it carries operational meaning

**Technical implementation:**
- `GlobalReactiveField` computes a `VitalityLevel` from `EventInfluenceDecay.computeVitalityBaseline()`
- Field intensity multiplies by vitality factor: NOMINAL=1.0, THINNED=0.4, DORMANT=0.1, ABSENT=0.0
- Music playback continues during degraded states — Operational Silence affects FX only, never playback
- Transition between vitality levels is gradual (3-5s crossfade) — never jarring
- No text labels or indicators for vitality state — pure atmosphere

```kotlin
// .../ui/fx/core/GlobalReactiveField.kt
fun computeFieldIntensity(
    playbackState: PlaybackState,
    vitality: VitalityLevel,
    vibeProfile: VibeProfile
): Float {
    val baseIntensity = playbackState.toIntensity() * vibeProfile.particleDensity
    val vitalityMultiplier = vitality.toMultiplier() // NOMINAL=1.0, THINNED=0.4, DORMANT=0.1, ABSENT=0.0
    return baseIntensity * vitalityMultiplier
}
```

**Design principle:** The silence should feel like walking into an empty server room at night — cold, operational, humming with potential but currently still. Not dead. Dormant.

---

## 11. AMOLED Visual Philosophy

**Rules:**
- True black (`#000000`) base. Every pixel off where possible.
- High contrast only: pure black vs saturated neon.
- Glow only where meaningful — glow indicates active state.
- No muddy gradients, no gray-heavy Material look.
- `SurfaceCard` (#111111) is the lightest gray allowed.
- Black space is not empty — it is the canvas.
- **Darkness is part of the design language.**
- **Empty space is not absence — it is the canvas.**
- **Silence is part of the visual language.** The dead field (zero particles, zero glow, pure black) is a valid and meaningful operational state. Not everything needs to glow.

**Hierarchy:** Background (#000000) > Screen base (#0A0A0A) > Card fill (#111111) > Elevated (#1A1A1A). Text: White (headlines) > #AAAAAA (body) > #666666 (captions).

**Neon Discipline:**
- Max 3 neon colors active simultaneously
- Glow pulses should feel like signals, not decoration
- Prohibited: overfilling empty space, too many simultaneous colors, always-on glow spam
- Operational Silence is not a bug: a dead field during system outage is the correct visual response

**Prohibited:** >20% opacity gradients, semi-transparent gray overlays, white backgrounds, colored text on colored backgrounds.

---

## 12. Particle Philosophy

**No complex physics initially.** Prefer:
- Sound-wave-inspired motion (pulsing, flowing)
- Waveform fields (sine-wave column arrangements)
- Orbiting/pulsing dots (simple circular motion)
- Subtle directional flow (playback = upward, network = lateral)
- Deterministic seeded ambient particles

**Avoid:** Heavy physics, collisions, blur per particle, particle storms, laggy recomposition.

```kotlin
// .../ui/fx/particle/Particle.kt
data class Particle(
    val id: Long, val x: Float, val y: Float, val vx: Float, val vy: Float,
    val life: Float, val maxLife: Float, val size: Float, val color: Color,
    val alpha: Float, val shape: ParticleShape, val birthSeed: Long
)
enum class ParticleShape { CIRCLE, DIAMOND, SOFT_GLOW, RING }
```

**Performance:** `ParticleSystem.tick()` from `withFrameNanos`, `dtSeconds` capped at 0.1s, pre-allocated pool, zero allocations per frame steady state. `eventImpulses` allows one-frame injection from `VaibEventBus`.

| Tier | Max Particles | Updates | Spawn Rate |
|---|---|---|---|
| OFF | 0 | N/A | 0 |
| REDUCED | 0 | N/A | 0 |
| STANDARD | 40 | 60fps | 3/sec baseline |
| ENHANCED | 80 | 60fps | 8/sec baseline |

---

## 13. Haptics Plan

Optional, on by default. Subtle. Context-aware. No spam.

| Cue | Trigger | Pattern | Intensity |
|---|---|---|---|
| Play/Pause | `PLAYBACK_STARTED/PAUSED` | Single short tick | LIGHT |
| Track change | `TRACK_CHANGED` | Double tick | LIGHT |
| Agent done | `AGENT_TASK_COMPLETED` | Brief confirmation | LIGHT |
| Warning | `DISK_WARNING`, `SECURITY_RISK` | Sharp buzz | MEDIUM |
| Profile switch | User changes profile | Soft tick | LIGHT |
| Sync complete | `UPDATE_COMPLETED`, `BACKUP_COMPLETED` | Brief positive | LIGHT |
| Button press | Any button tap | Micro-tick | LIGHT |
| Critical | `SERVICE_DEGRADED` CRITICAL | Strong pulse | HEAVY |

**Rules:** Gated by `vibeProfile.hapticsEnabled && MotionIntensity != OFF`. Disabled under battery saver. Disabled when `reducedMotionCompatibility = true`. Never delay UI. Max 1 per 200ms. No background haptics.

```kotlin
// .../ui/fx/feedback/VaibHaptics.kt
@Singleton
class VaibHaptics @Inject constructor(private val vibrator: Vibrator, private val eventBus: VaibEventBus) {
    fun play(cue: HapticCue)
    private fun shouldVibrate(): Boolean
}
enum class HapticCue { PLAY, PAUSE, TRACK_CHANGE, AGENT_DONE, WARNING, PROFILE_SWITCH, SYNC_COMPLETE, BUTTON_PRESS, CRITICAL }
```

---

## 14. Sound Design Plan

Extremely important — must not be cheesy. Optional UI sound cues: futuristic but minimal, musical/synth-based, context-aware, never fights current music.

| Cue | Description | Max Duration |
|---|---|---|
| Play | Soft synth rise | 100ms |
| Pause | Soft synth fall | 80ms |
| Track change | Tiny shimmer | 120ms |
| Agent complete | Subtle bell-chime | 150ms |
| Warning | Low-frequency pulse | 200ms |
| Profile switch | Minimal whoosh | 80ms |
| Critical | Dissonant pulse | 250ms |

**Rules:** Gated by `vibeProfile.uiSoundsEnabled`. Disabled during calls / audio focus loss. Max 250ms. At 30% playback volume when playing, 50% system volume when paused. Lazy-loaded. **If it sounds cheesy -> disabled/omitted.**

```kotlin
// .../ui/fx/feedback/VaibSoundDesign.kt
@Singleton
class VaibSoundDesign @Inject constructor(private val context: Context, private val eventBus: VaibEventBus) {
    fun play(cue: SoundCue, playbackVolume: Float = 0f)
    fun preload(); fun release(); private fun shouldPlay(): Boolean
}
enum class SoundCue { PLAY, PAUSE, TRACK_CHANGE, AGENT_COMPLETE, WARNING, PROFILE_SWITCH, CRITICAL_ALERT }
```

---

## 15. What Must Never Animate

### 15.1 Hard Prohibitions

| Prohibition | Enforcement |
|---|---|
| Body text constantly moving | No text animation except crossfade on content change |
| Screen shaking | Max 2px jitter on alert, never full shake |
| Aggressive infinite glow | Glow pulse period >= 2s |
| Giant particle storms | Hard cap 80 particles, event bursts <= 20 |
| Flashing full-screen alerts | Border overlay only |
| Slow animations delaying taps | Tap feedback < 100ms |
| Blur-heavy overlays | No `BlurEffect`, no backdrop blur |
| Animations on critical controls | Play/pause: press effect only |
| Excessive movement during playback | Global field ambient; spikes brief |
| Warnings unclear | Red alerts: solid borders, never animated text |
| Decorative motion without signal | Every effect requires an event source |

### 15.2 Music-First Guardrails

vAIb can easily spiral into observability suite, AI shell, monitoring platform, social network, dashboard OS, or automation framework. These guardrails exist to prevent that drift.

**vAIb is a music app first. Everything else supports music + vibe + operational atmosphere.**

| Guardrail | Rule |
|---|---|
| Agent panel | Max 20% of `CockpitScreen` |
| Logs | No full log viewers in the app |
| Dashboards | No real-time graph dashboards |
| Notifications | No notification feed as primary surface |
| Music controls | Always visible and prominent |
| General principle | If it doesn't serve the music experience, it doesn't belong in v1 |

**Animations and effects must never compete with the currently playing music.** When music is intense, the UI calms. When music is ambient, the UI breathes. The audio layer is sovereign.

### 15.3 Ambient Situational Awareness

Operational Silence (Section 10.6) provides ambient situational awareness without competing with the music experience.
- During healthy operation: subtle atmospheric field reinforces the music experience
- During degraded operation: thinner atmosphere naturally draws attention to operational issues
- Music playback continues unaffected — Operational Silence modulates FX, never audio
- No explicit indicators, no status labels — pure atmospheric communication
- The user learns the "healthy baseline" through daily use, making deviations self-evident

---

## 16. Revised Phase Plan

### Phase 0 — Foundation / No Visual Change
- `VaibMotion.kt` — `MotionIntensity` enum, `VaibMotionTokens`, `LocalMotionIntensity`
- `VaibMotionController.kt` — stub helpers (identity/no-op)
- `Particle.kt` / `ParticleSystem.kt` / `AmbientParticleLayer.kt` / `rememberParticleSystem.kt` — stubs
- `MainActivity.kt` — `CompositionLocalProvider(LocalMotionIntensity)`
- `VaibViewModel.kt` — `motionIntensity: StateFlow<MotionIntensity>`, SharedPreferences
- `SettingsScreen.kt` — "Motion" 4-segment selector row
- `app/build.gradle.kts` — `ENABLE_FX_SYSTEM` BuildConfig field
- **Exit:** Builds, persists, zero visual change.

### Phase 1 — Vibe Profile + Global Field Stub
- `VibeProfile.kt` — data model + default profile
- `VibeProfileNameGenerator.kt` — stub
- `GlobalReactiveField.kt` — `Spacer` stub
- `LocalVibeProfile.kt` — `staticCompositionLocalOf`
- `VaibViewModel.kt` — `vibeProfile: StateFlow<VibeProfile>`, persist JSON
- `SettingsScreen.kt` — full Vibe Profile UI
- **Exit:** Profile CRUD works, persists across restart.

### Phase 2 — Data-Driven Visual Microinteractions
- `EventColorMapper.kt` — event -> color mapping
- `VaibHaptics.kt` — stub with basic cues
- `CockpitScreen.kt` — On Air card glow, event color overlays
- `VaibCard.kt` — `animatedCardGlow()` when active
- `AgentChip.kt` — basic activity indicator dot
- **Exit:** Cards glow, buttons haptic, track crossfades.

### Phase 3 — Ambient Music-Reactive FX
- `ParticleSystem.kt` — full `tick()` with audio intensity
- `AmbientParticleLayer.kt` — Canvas render loop
- `GlobalReactiveField.kt` — full ambient field with waveform
- `VisualizerBars.kt` — `VaibMotionController` timing, color reactivity
- `CockpitScreen.kt` / `LandscapeDjDeck.kt` — particle integration
- **Exit:** Particles respond to playback, S24 Ultra >= 55 FPS at ENHANCED.

### Phase 4 — Agent Presence + OES Integration
- `VaibEvent.kt` / `VaibEventBus.kt` — event model + bus
- `AgentPresence.kt` / `AgentMood.kt` / `AgentMoodEngine.kt` / `AgentPresenceCard.kt`
- `AgentTasteProfile.kt` — architecture stub only (Section 8.6)
- `VaibViewModel.kt` — agent presence list, state updates, event emission
- `CockpitScreen.kt` / `AgentsScreen.kt` — agent cards
- `AgentChip.kt` — state indicator, glow border
- **Exit:** Agent cards show real status, OES derives from activity. Taste profile stub compiles.

### Phase 5 — Network/System Event Integration
- Full event signal ingestion (download/update/backup/login/restart/disk/service/security)
- `EventInfluenceDecay.kt` — priority + rate limiting (Section 6.5)
- `GlobalReactiveField` / `AgentMoodEngine` / `VaibHaptics` subscribe to events
- `VaibViewModel` emits all event types
- `CockpitScreen.kt` — alert overlays
- **Exit:** All 24 event types produce visible/haptic response. Priority system active.

### Phase 6 — Sound Design + Advanced Haptics
- `VaibSoundDesign.kt` — sound system
- `VaibHaptics.kt` — full cue library, debounce, patterns
- `SettingsScreen.kt` — per-cue sound toggles, haptic preview
- **Exit:** Sounds premium (not cheesy), haptics refined.

### Phase 7 — Advanced Audio-Reactive/Shader Layer
- AGSL `RuntimeShader` exploration for waveform/glow/distortion
- Music-driven UI rhythm implementation (Section 10.5)
- Gated by: 2-week stability, Pixel 6 >= 50 FPS, automatic Canvas fallback
- **Exit:** Shaders optional, fallback always works. UI rhythm system active.

---

## 17. File-by-File Map

### New Files (20)

| # | File Path | Description | Phase |
|---|---|---|---|
| 1 | `.../ui/theme/VaibMotion.kt` | `MotionIntensity`, `VaibMotionTokens`, `LocalMotionIntensity` | 0 |
| 2 | `.../ui/theme/VaibMotionController.kt` | Animation helpers — stubs 0, impl 2+ | 0 |
| 3 | `.../ui/theme/VibeProfile.kt` | `VibeProfile` data model, default, validation | 1 |
| 4 | `.../ui/theme/VibeProfileNameGenerator.kt` | Auto-name from traits — stub 1, impl 4+ | 1 |
| 5 | `.../ui/fx/event/VaibEvent.kt` | `VaibEvent`, `VaibEventType`, `VaibEventSeverity` | 4 |
| 6 | `.../ui/fx/event/VaibEventBus.kt` | Pub/sub bus, `SharedFlow`, buffer 64 | 4 |
| 7 | `.../ui/fx/event/EventInfluenceDecay.kt` | Priority weighting, exponential decay, rate limit | 5 |
| 8 | `.../ui/fx/particle/Particle.kt` | `Particle` data class, `ParticleShape` | 0 |
| 9 | `.../ui/fx/particle/ParticleSystem.kt` | Frame controller, deterministic seed, pool | 0 stub, 3 impl |
| 10 | `.../ui/fx/particle/AmbientParticleLayer.kt` | Canvas overlay — `Spacer` stub, full 3 | 0 stub, 3 |
| 11 | `.../ui/fx/particle/rememberParticleSystem.kt` | `remember()` + cleanup | 0 |
| 12 | `.../ui/fx/core/GlobalReactiveField.kt` | Cockpit-wide field — stub 1, full 3+ | 1 stub, 3+ |
| 13 | `.../ui/fx/core/EventColorMapper.kt` | `VaibEvent` -> `Color` mapping | 2 |
| 14 | `.../ui/fx/agent/AgentPresence.kt` | `AgentPresence`, `AgentActivityState`, `VisualSignature` | 4 |
| 15 | `.../ui/fx/agent/AgentMood.kt` | `AgentMood` enum, influence mapping | 4 |
| 16 | `.../ui/fx/agent/AgentMoodEngine.kt` | OES computation from context | 4 |
| 17 | `.../ui/fx/agent/AgentTasteProfile.kt` | Taste preference stub — future hook | 4 stub |
| 18 | `.../ui/fx/agent/AgentPresenceCard.kt` | Composable presence card | 4 |
| 19 | `.../ui/fx/feedback/VaibHaptics.kt` | `HapticCue`, vibration, debounce | 2 stub, 6 |
| 20 | `.../ui/fx/feedback/VaibSoundDesign.kt` | `SoundCue`, playback, volume ducking | 6 |
| 21 | `.../ui/fx/core/LocalVibeProfile.kt` | `staticCompositionLocalOf<VibeProfile>` | 1 |

### Modified Files (10)

| # | File Path | Change | Phase |
|---|---|---|---|
| 1 | `.../MainActivity.kt` | `CompositionLocalProvider(LocalMotionIntensity, LocalVibeProfile)` | 0, 1 |
| 2 | `.../VaibViewModel.kt` | `motionIntensity`, `vibeProfile`, agent presence, event emission | 0, 1, 4, 5 |
| 3 | `.../ui/screens/SettingsScreen.kt` | Motion selector, Vibe Profile UI, sound/haptic toggles | 0, 1, 6 |
| 4 | `.../ui/screens/CockpitScreen.kt` | GlobalReactiveField, glow, particles, agent panel, alerts | 2-5 |
| 5 | `.../ui/components/VisualizerBars.kt` | MotionController timing, color reactivity, buffering | 3 |
| 6 | `.../ui/components/VaibCard.kt` | `animatedCardGlow()` when `neonGlow=true` | 2 |
| 7 | `.../ui/screens/LandscapeDjDeck.kt` | Particles center column, agent OES ambient, press FX | 3-4 |
| 8 | `.../ui/components/AgentChip.kt` | State indicator, activity glow border | 4 |
| 9 | `.../ui/screens/AgentsScreen.kt` | `AgentPresenceCard` grid | 4 |
| 10 | `app/build.gradle.kts` | `ENABLE_FX_SYSTEM` BuildConfig field | 0 |

### Untouched Files (Confirmed)

| File | Reason |
|---|---|
| `AudioBackbone.kt` | ExoPlayer pipeline — out of scope |
| `VaibNavHost.kt` | Navigation graph — out of scope |
| `StationsScreen.kt` / `QueueScreen.kt` / `MoreScreen.kt` / `StatsScreen.kt` | Low exposure — deferred |
| `EqScreen.kt` / `ApiScreen.kt` / `UpdatesScreen.kt` / `AutomationScreen.kt` / `IntegrityScreen.kt` | Static / no exposure |
| `StatusPill.kt` / `StationCard.kt` / `ConnectorHealthCard.kt` / `TokenBudgetPill.kt` | Modified via parent screens |
| `StatTile.kt` / `ReactionBadge.kt` / `FreshnessBadge.kt` / `RefreshControlCard.kt` / `EqualizerBand.kt` | No changes needed |
| `Color.kt` / `Theme.kt` / `Type.kt` | Existing tokens sufficient |
| All data layer (repositories, DAOs, API interfaces) | Out of scope |

---

## 18. Testing Checklist

### Performance
- [ ] FPS 60s average: S24 Ultra ENHANCED/80 particles >= 55 FPS; Pixel 6 >= 50; Emulator >= 30
- [ ] Zero allocations per frame in `ParticleSystem.tick()` (pre-allocated pool)
- [ ] `AmbientParticleLayer.drawCircle()` not top-3 CPU consumer (flamegraph)
- [ ] No memory leak after 24-hour soak (heap dump)

### Battery
- [ ] 1-hour STANDARD vs OFF: delta <= 3%/hour; ENHANCED vs OFF: delta <= 5%/hour
- [ ] 4-hour FX toggle soak every 15 min: zero ANRs

### Reduced Motion / Accessibility
- [ ] System "Remove animations" ON -> forces `REDUCED`
- [ ] `reducedMotionCompatibility = true` -> all FX disabled
- [ ] REDUCED -> transitions <= 150ms, press = opacity only, visualizer frozen, no particles
- [ ] OFF -> zero `animate*AsState` calls (static analysis validation)
- [ ] TalkBack navigates Settings FX controls correctly

### Playback Regression
- [ ] Toggle FX 10x during playback -> no audio drop
- [ ] Background -> foreground -> particles + playback resume
- [ ] Phone call interrupt -> return -> resume
- [ ] `strict_broadcast_mode` ON + ENHANCED -> no state corruption

### Event / Agent
- [ ] All 24 `VaibEventType` produce correct visual mapping
- [ ] `AgentMoodEngine` correct OES from each trigger set
- [ ] `AgentPresence` card updates < 200ms on event
- [ ] `AGENT_DELETED` -> fade out 300ms then removed
- [ ] Event priority + decay system prevents field thrashing

### Device Matrix
| Device | API | Intensity | Particles | Agents | FPS Target |
|---|---|---|---|---|---|
| Samsung S24 Ultra | 34 | ENHANCED | 80 | 4+ | >= 55 |
| Samsung S24 Ultra | 34 | STANDARD | 40 | 4+ | >= 58 |
| Samsung S24 Ultra | 34 | REDUCED | 0 | static | >= 60 |
| Pixel 6 | 33 | ENHANCED | 80 | 4+ | >= 50 |
| Pixel 6 | 33 | STANDARD | 40 | 4+ | >= 55 |
| Emulator (2GB) | 28 | STANDARD | 40 | 2 | >= 30 |
| Emulator (2GB) | 28 | REDUCED | 0 | static | >= 60 |

---

## 19. Rollback Checklist

### Kill Switch
`ENABLE_FX_SYSTEM` in `app/build.gradle.kts`. When `false`: `LocalMotionIntensity` emits `OFF`, `LocalVibeProfile` emits all-FX-disabled default, all layers no-op. **100% visual delta disabled by flag alone.**

### Rollback Levels
| Level | Action | Files | Time |
|---|---|---|---|
| L1 — Flag | `ENABLE_FX_SYSTEM = false` | 1 | 5 min |
| L2 — Overlay | Delete particle/field from screens | 3-4 | 15 min |
| L3 — Code | Delete 21 new files; revert 10 modified | ~31 | 1 hour |
| L4 — Full | `git revert <merge-commit>` | all | 10 min |

### Per-Phase Revert
| Phase | Revert Action |
|---|---|
| 0 | Remove 6 files + Settings row + ViewModel fields + MainActivity wrapper + BuildConfig |
| 1 | Remove `VibeProfile.kt`, `LocalVibeProfile.kt`; revert Settings + ViewModel |
| 2 | Remove `EventColorMapper.kt`, `VaibHaptics.kt` stub; revert glow + press |
| 3 | Remove particle/field impl; revert `VisualizerBars` |
| 4 | Remove 7 agent/event/taste files; revert agent-related screens |
| 5 | Remove `EventInfluenceDecay.kt`; remove event emission; revert alert overlays |
| 6 | Remove `VaibSoundDesign.kt`; revert haptics full |
| 7 | Remove shader code; revert to Canvas fallback |

### Safety Rules
- Independent PRs per phase — never squash
- Phase N requires Phase N-1 baked >= 48 hours
- Playback regression -> **L1 within 1 hour**
- Each phase passes device matrix before next merges

---

## 20. Revised Risks

| Risk | Sev | Likely | Mitigation |
|---|---|---|---|
| Scope creep (too many subsystems) | HIGH | MED | Phase gates, 48hr bake, kill switch active until Phase 3 |
| Fake OES feels gimmicky | HIGH | MED | OES from real context only. No random. No scripted personas. No caricature. |
| Agent presence not connected to real source | HIGH | HIGH | Stub Phase 4, real integration Phase 5 prerequisite |
| Too much visual noise | MED | HIGH | State-first philosophy. Default 70/20/10. Hard caps. |
| Haptic/sound spam | MED | MED | 200ms debounce, context gating, battery saver disable |
| Performance/battery cost | HIGH | MED | 0/0/40/80 caps, OFF = zero overhead, pre-allocated pools |
| Privacy/logging from summaries | MED | LOW | Summary max 80 chars, no PII, no persistence |
| App becomes dashboard-first | HIGH | MED | Music-first guardrails (Section 15.2). Agent panel <= 20%. |
| Sound design cheesy | MED | MED | Quality bar: cheaper = cut. Disabled by default until approved. |
| Shader regression (Phase 7) | HIGH | LOW | 2-week stability gate, Pixel 6 >= 50 FPS, Canvas fallback |

---

## 21. Open Questions for Supreme Commander

**Q1 — Agent Presence Data Source:** Phase 4 agent cards require agent status metadata. Stub with mock data, or prioritize Hermes/OpenClaw connector integration as prerequisite?

**Q2 — Sound Design Quality Bar:** UI sounds are high-risk for cheesiness. Commission sound designer, use curated synth pack, or defer entirely to post-launch?

**Q3 — Music-First vs Dashboard-First:** Agent + system panels add non-music UI surface. Current guardrails: max 20% of `CockpitScreen` for agent/system panels. Acceptable?

**Q4 — Default Vibe Profile Restraint:** Default is 70/20/10 (music/cyber/tactical). More restrained (50/25/25) or more expressive (80/15/5)?

**Q5 — Phase 7 Shader Gate Condition:** Gated by 2-week zero-crash + Pixel 6 >= 50 FPS + user feedback. Should all three be required, or which single metric suffices?

---

## Appendix A: Dependency Check

No new Gradle deps required. All APIs in Compose BOM 2024.02.00:

| API | Module | Status |
|---|---|---|
| `rememberInfiniteTransition` / `animate*AsState` | `animation-core` | Confirmed |
| `AnimatedVisibility` / `AnimatedContent` | `animation` | Pulled by BOM |
| `withFrameNanos` / `Canvas` / `BlendMode` | `ui` | Confirmed |
| `detectTapGestures` / `LocalAccessibilityManager` | `ui` | Confirmed |
| `LifecycleEventEffect` | `lifecycle-runtime-compose` | Confirmed |
| `SharedFlow` / `MutableSharedFlow` | `kotlinx.coroutines` | Core dependency |
| `kotlinx.serialization` | `kotlinx-serialization-json` | **VERIFY** — needed for profile JSON. Use existing Gson/Moshi if present |
| AGSL / `RuntimeShader` | Android 12+ (API 31) | Phase 7 only, gated by SDK check |
| `Vibrator` / `SoundPool` | Framework (`android.os` / `android.media`) | Confirmed |

---

## Appendix B: Color / Event / Playback Mapping

### Playback -> Color -> Visualizer -> Particles
| State | Dominant | Secondary | Visualizer | Particles |
|---|---|---|---|---|
| Playing high vol | `AccentMagenta` | `PrimaryNeonCyan` | Magenta/Cyan tiers | Waveform, upward drift |
| Playing low vol | `PrimaryNeonCyan` | `AccentViolet` | Cyan/Violet | Gentle pulse, slow orbit |
| Buffering | `AccentViolet` | `SecondaryGold` | All violet | Unison sine pulse |
| Paused/stopped | `TextMuted` | `BorderSubtle` | All muted | Minimal drift |
| Track changed | `SecondaryGold` burst | — | Gold flash 500ms | Gold burst center |

### Event -> Visual / Haptic / Sound
| Event Type | Color | Visual | Haptic | Sound |
|---|---|---|---|---|
| `AGENT_TASK_COMPLETED` | `SecondaryGold` | Burst at card | LIGHT | Bell-chime |
| `AGENT_TASK_FAILED` | `ErrorRed` | Red pulse | MEDIUM | Warning |
| `AGENT_CREATED` | `AccentMagenta` | Fade-in | LIGHT | — |
| `DOWNLOAD_COMPLETED` | `SecondaryGold` | Stream to done | LIGHT | — |
| `UPDATE_COMPLETED` | `SecondaryGold` | Full burst | LIGHT | Confirm |
| `BACKUP_COMPLETED` | `SecondaryGold` | Cyan->gold | LIGHT | — |
| `USER_LOGIN` | `PrimaryNeonCyan` | Field reset pulse | LIGHT | — |
| `MACHINE_RESTART_PENDING` | `ErrorRed` | Alert overlay | HEAVY | Critical |
| `DISK_WARNING` | `ErrorRed` | Border pulse | MEDIUM | Warning |
| `SERVICE_HEALTHY` | `LiveGreen` | Green tint | — | — |
| `SERVICE_DEGRADED` | `ErrorRed` | Amber->red | MEDIUM | Warning |
| `SECURITY_RISK` | `ErrorRed` | Flash + overlay | HEAVY | Critical |
| `NETWORK_ACTIVITY_HIGH` | `PrimaryNeonCyan` | Lateral drift | — | — |
| `PLAYBACK_STARTED` | `PrimaryNeonCyan` | Field activate | LIGHT | Soft rise |
| `PLAYBACK_PAUSED` | `TextMuted` | Field dim | LIGHT | Soft fall |
| `TRACK_CHANGED` | `SecondaryGold` | Gold sweep | LIGHT | Shimmer |
| `BUFFERING_STARTED` | `AccentViolet` | Unison pulse | — | — |
| `BUFFERING_ENDED` | `PrimaryNeonCyan` | Return cyan | — | — |

---

## Appendix C: SharedPreferences Key Registry

| Key | Type | Default | Written By | Read By | Phase |
|---|---|---|---|---|---|
| `motion_intensity` | String | `"STANDARD"` | Settings selector | MainActivity, VaibViewModel | 0 |
| `vibe_profile_json` | String (JSON) | `DefaultVibeProfile` | Settings profile UI | MainActivity, VaibViewModel | 1 |
| `fx_haptics_enabled` | Boolean | `true` | Settings switch | VaibHaptics | 2 |
| `fx_ui_sounds_enabled` | Boolean | `true` | Settings switch | VaibSoundDesign | 6 |
| `fx_sound_cue_*` | Boolean | `true` (each) | Settings per-cue toggle | VaibSoundDesign | 6 |

---

## Appendix D: Vibe Profile Trait Registry

| Trait | Type | Default | Range | Description |
|---|---|---|---|---|
| `musicReactiveWeight` | Int | 70 | 0..100 | Music-driven FX intensity |
| `cyberpunkWeight` | Int | 20 | 0..100 | Magenta/violet, sharper edges |
| `tacticalWeight` | Int | 10 | 0..100 | Clean HUD, fewer particles |
| `particleDensity` | Int | 50 | 0..100 | Scales max particle count |
| `waveformIntensity` | Int | 60 | 0..100 | Visualizer amplitude |
| `glowIntensity` | Int | 50 | 0..100 | Border glow strength |
| `hapticsEnabled` | Boolean | true | — | Master haptics |
| `uiSoundsEnabled` | Boolean | true | — | Master UI sounds |
| `amoledPurity` | Boolean | true | — | True black base |
| `alertSensitivity` | Int | 50 | 0..100 | Warning reactivity |
| `agentInfluence` | Int | 50 | 0..100 | Agent OES visual weight |
| `networkInfluence` | Int | 30 | 0..100 | Network visual weight |
| `batterySensitivity` | Boolean | true | — | Auto-dim when low battery |
| `reducedMotionCompatibility` | Boolean | false | — | Force REDUCED |

---

## Appendix E: Event Type Registry

| Event Type | Source | Severity | Priority | Visual | Haptic | Phase |
|---|---|---|---|---|---|---|
| `AGENT_TASK_STARTED` | AgentManager | INFO | MEDIUM | Magenta pulse | — | 4 |
| `AGENT_TASK_PROGRESS` | AgentManager | INFO | LOW | Border shift | — | 4 |
| `AGENT_TASK_COMPLETED` | AgentManager | SUCCESS | MEDIUM | Gold burst | LIGHT | 4 |
| `AGENT_TASK_FAILED` | AgentManager | WARNING | MEDIUM | Red pulse | MEDIUM | 4 |
| `AGENT_CREATED` | AgentManager | INFO | MEDIUM | Magenta fade-in | LIGHT | 4 |
| `AGENT_DELETED` | AgentManager | INFO | LOW | Gray fade-out | — | 4 |
| `DOWNLOAD_STARTED` | UpdateService | INFO | LOW | Cyan stream | — | 5 |
| `DOWNLOAD_COMPLETED` | UpdateService | SUCCESS | MEDIUM | Gold end | LIGHT | 5 |
| `UPDATE_AVAILABLE` | UpdateService | INFO | LOW | Gold pulse | — | 5 |
| `UPDATE_INSTALLING` | UpdateService | INFO | HIGH | Cyan progress | — | 5 |
| `UPDATE_COMPLETED` | UpdateService | SUCCESS | MEDIUM | Gold burst | LIGHT | 5 |
| `BACKUP_STARTED` | BackupService | INFO | LOW | Cyan stream | — | 5 |
| `BACKUP_COMPLETED` | BackupService | SUCCESS | LOW | Cyan->gold | LIGHT | 5 |
| `USER_LOGIN` | AuthManager | SUCCESS | MEDIUM | Cyan reset | LIGHT | 5 |
| `USER_LOGOUT` | AuthManager | INFO | LOW | Dim gray | — | 5 |
| `MACHINE_RESTART_PENDING` | SystemMonitor | CRITICAL | CRITICAL | Red overlay | HEAVY | 5 |
| `MACHINE_RESTARTED` | SystemMonitor | INFO | MEDIUM | Reinitialize | — | 5 |
| `DISK_WARNING` | SystemMonitor | WARNING | CRITICAL | Red pulse | MEDIUM | 5 |
| `SERVICE_HEALTHY` | HealthMonitor | INFO | LOW | Green tint | — | 5 |
| `SERVICE_DEGRADED` | HealthMonitor | WARNING | HIGH | Amber->red | MEDIUM | 5 |
| `SECURITY_RISK` | SecurityMonitor | CRITICAL | CRITICAL | Red flash | HEAVY | 5 |
| `NETWORK_ACTIVITY_HIGH` | NetworkMonitor | INFO | LOW | Lateral drift | — | 5 |
| `NETWORK_ACTIVITY_LOW` | NetworkMonitor | INFO | LOW | Drift slows | — | 5 |
| `PLAYBACK_STARTED` | AudioBackbone | INFO | MEDIUM | Cyan activate | LIGHT | 0 |
| `PLAYBACK_PAUSED` | AudioBackbone | INFO | LOW | Dim | LIGHT | 0 |
| `TRACK_CHANGED` | AudioBackbone | INFO | MEDIUM | Gold sweep | LIGHT | 2 |
| `BUFFERING_STARTED` | AudioBackbone | INFO | MEDIUM | Violet unison | — | 2 |
| `BUFFERING_ENDED` | AudioBackbone | INFO | LOW | Return cyan | — | 2 |

---

## Appendix F: Agent OES Registry

| State | Triggers | Visual | Music Influence | Haptic |
|---|---|---|---|---|
| `FOCUSED` | Long task, no errors | Steady cyan pulse | Sustained tempo | — |
| `ENERGIZED` | >= 3 rapid completions | Gold micro-pulses | Upbeat bias | LIGHT |
| `STRAINED` | Failure streak >= 2 | Dim red flicker | Tension hint | — |
| `DORMANT` | No task > 5 min | Sparse, muted | Discovery | — |
| `ALERT` | Warning detected | Border flash | No change | MEDIUM |
| `OVERLOADED` | Tasks > 3 concurrent | Chaotic red density | No change | MEDIUM |
| `CALM` | Idle, all healthy | Minimal violet ambient | Ambient-friendly | — |
| `UNSTABLE` | Critical failure | Bright red alert pulse | Pause suggestion | MEDIUM |
| `SOCIAL` | High human interaction | Warm lateral drift | Collaborative tempo | — |
| `CURIOUS` | Exploring, searching | Wandering magenta glow | Exploration bias | — |

---

*End of Document — VAIB Animation & Particle FX System Technical Plan v3.0*  
*Final Revision 2026-05-07 — Supreme Commander Philosophical Refinements Applied*  
*v2.0 (4179491) superseded in full*
eded in full*
