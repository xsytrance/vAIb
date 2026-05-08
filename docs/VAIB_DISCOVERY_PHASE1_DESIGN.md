# Discovery Phase 1 — Pre-Implementation Design Document

**Status:** PRE-APPROVAL — No code written yet.
**Branch:** prime-stabilization
**Base:** c7ffc66 (compile-stable: Cockpit v2 + Typography v2 + Music Source Phase A)

---

## 1. Discovery Architecture Map

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ENDPOINT INGESTION                                          │
│  (local config → HTTP API → Tailnet manifest → manual entry) │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  EndpointNode        │  ← URL, type, health, priority
              │  (1..N per user)     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  RuntimeSource       │  ← Hermes, OpenClaw, custom
              │  (1..N per endpoint) │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  AgentPresence       │  ← Real agent with OES + taste
              │  (1..N per runtime)  │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  StationDescriptor   │  ← NATIVE (auto) + DRIFT (user)
              │  (1..N per agent)    │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  AppState (updated)  │
              │  uses real entities  │
              └─────────────────────┘
```

### Discovery Coordinator Lifecycle

```
[App Launch] → DiscoveryCoordinator.refresh()
     │
     ├── No endpoints configured → show empty state (Level 0)
     │
     ├── Endpoints configured → probe each endpoint
     │       ├── REACHABLE → RuntimeDiscoveryAdapter discovers runtimes
     │       │                    └── discovers agents
     │       │                    └── generates native stations
     │       ├── TIMEOUT → mark DEGRADED, use cached state
     │       └── AUTH_REQUIRED → show "Authentication needed" pill
     │
     └── Results → populate AppState with real entities
```

### Integration Points (what touches what)

| New Component | Reads From | Writes To | Replaces |
|---|---|---|---|
| DiscoveryCoordinator | EndpointRegistry | AppState (real entities) | DemoData.getDefaultAppState() |
| EndpointRegistry | SharedPreferences ("vaib_endpoints") | — | Hardcoded Tailnet URLs |
| RuntimeDiscoveryAdapter | HTTP API on endpoint | RuntimeSource list | Nothing (new) |
| AgentPresenceResolver | Runtime API | AgentPresence list | DemoData.agents |
| NativeStationGenerator | AgentPresence | StationDescriptor list | DemoData.stations |
| AppStateProvider | DiscoveryCoordinator output | VaibViewModel._appState | DemoData.getDefaultAppState() |

---

## 2. Canonical Entity Model

### Entity Hierarchy (single source of truth)

```kotlin
// ─── EndpointNode ───
// The network location where runtimes live.
// User-configured or auto-discovered.
data class EndpointNode(
    val id: String,              // UUIDv4 stable ID
    val label: String,           // Display name: "PRIME", "dev-local"
    val url: String,             // Base URL: "https://prime.tailnet.ts.net"
    val type: EndpointType,      // TAILNET_DNS | TAILNET_IP | LOCAL_LAN | CUSTOM
    val health: EndpointHealth,  // HEALTHY | DEGRADED | UNREACHABLE | AUTH_REQUIRED
    val lastSeenAt: Long,        // Unix timestamp
    val priority: Int = 0        // Discovery priority (lower = tried first)
)

enum class EndpointType { TAILNET_DNS, TAILNET_IP, LOCAL_LAN, CUSTOM }
enum class EndpointHealth { HEALTHY, DEGRADED, UNREACHABLE, AUTH_REQUIRED }

// ─── RuntimeSource ───
// A software runtime running on an endpoint.
// Discovered via HTTP probe.
data class RuntimeSource(
    val id: String,              // "{endpointId}/hermes" or "{endpointId}/openclaw"
    val endpointId: String,      // Parent EndpointNode.id
    val runtimeType: RuntimeType,// HERMES | OPENCLAW | CUSTOM
    val label: String,           // "Hermes v3.2", "OpenClaw experimental"
    val version: String?,        // Runtime version string
    val status: RuntimeStatus,   // ACTIVE | IDLE | ERROR
    val capabilities: List<String> // ["agent_management", "streaming", "sync"]
)

enum class RuntimeType { HERMES, OPENCLAW, CUSTOM }
enum class RuntimeStatus { ACTIVE, IDLE, ERROR }

// ─── AgentPresence ───
// A real operational agent living inside a runtime.
// NOT a persona. NOT a character. An operational entity.
data class AgentPresence(
    val id: String,              // "{runtimeId}/vg-god" — functional, lowercase
    val runtimeId: String,       // Parent RuntimeSource.id
    val endpointId: String,      // Grandparent EndpointNode.id
    val displayName: String,     // "vg-god", "picasso" — lowercase, no spaces
    val operationalState: OperationalEmotionalState, // focused, idle, strained...
    val taskCategory: String?,   // "sync", "render", "backup", "idle"
    val recentWorkSummary: String?, // 80-char max operational summary
    val visualSignature: VisualSignature, // Hash-derived geometric glyph
    val lastSeenAt: Long,
    val isOnline: Boolean,
    val musicInfluence: MusicInfluence?,
    val source: EntitySource      // DISCOVERED | CONFIGURED | CACHED
)

enum class OperationalEmotionalState {
    FOCUSED, ENERGIZED, STRAINED, DORMANT, ALERT,
    OVERLOADED, CALM, UNSTABLE, SOCIAL, CURIOUS
}

enum class EntitySource { DISCOVERED, CONFIGURED, CACHED, FALLBACK, DEMO }

// ─── VisualSignature ───
// Deterministic geometric glyph — NOT an avatar, NOT a photo.
// Generated from agent ID hash. Same agent = same glyph always.
data class VisualSignature(
    val sides: Int,              // 6-8 sided polygon
    val primaryColor: String,    // Hex color from agent ID hash
    val secondaryColor: String,  // Complementary color
    val rotation: Float,         // 0-360 degrees, deterministic from hash
    val scale: Float             // 0.8-1.2, deterministic from hash
)

// ─── StationDescriptor ───
// A music station derived from an agent + runtime + endpoint.
// NATIVE = auto-generated from real agent. DRIFT = user creative extension.
data class StationDescriptor(
    val id: String,              // "{agentId}/native" or user-defined
    val name: String,            // "vg-god native" (functional, lowercase)
    val stationType: StationType,// NATIVE | DRIFT
    val sourceAgentId: String,   // Which AgentPresence generates this
    val sourceRuntimeId: String,
    val sourceEndpointId: String,
    val generationRule: GenerationRule,
    val streamUrl: String?,      // HTTP stream endpoint
    val fallbackLocalTrack: String?, // Local file path
    val vibe: String?,           // Derived from agent OES
    val bpmRange: String?,       // Derived from agent musicInfluence
    val isLive: Boolean,         // Agent online?
    val provenance: ProvenanceMarker // Where this came from
)

enum class StationType { NATIVE, DRIFT }
enum class GenerationRule { AGENT_NATIVE, USER_DRIFT, SYSTEM_FALLBACK }

data class ProvenanceMarker(
    val source: EntitySource,
    val discoveredAt: Long,
    val sourceEndpointId: String
)
```

### What These Replace

| Old (DemoData) | New (Discovery) | Notes |
|---|---|---|
| `Agent(id, "DJinn", "Signal Architect", ...)` | `AgentPresence(id, "vg-god", FOCUSED, "sync", ...)` | Functional names, real OES |
| `Station(id, "Prime Pulse", "DJinn", ...)` | `StationDescriptor(id, "vg-god native", NATIVE, "vg-god", ...)` | Auto-generated from agent |
| `Track(id, "Synthetic Sunrise", "Procedural Ghost")` | `PlaybackCandidate` from MusicSource Phase A | Unified with source pipeline |
| Hardcoded `DemoData.getDefaultAppState()` | `DiscoveryCoordinator.populateState()` | Real entities from discovery |

---

## 3. Runtime/Entity Relationship Model

### Relationship Diagram

```
EndpointNode "PRIME" (https://prime.tailnet.ts.net)
├── RuntimeSource "PRIME/hermes" (Hermes v3.2)
│   ├── AgentPresence "PRIME/hermes/vg-god"
│   │   └── StationDescriptor "PRIME/hermes/vg-god/native" (NATIVE)
│   └── AgentPresence "PRIME/hermes/picasso"
│       └── StationDescriptor "PRIME/hermes/picasso/native" (NATIVE)
└── RuntimeSource "PRIME/openclaw" (OpenClaw)
    └── AgentPresence "PRIME/openclaw/index-agent"
        └── StationDescriptor "PRIME/openclaw/index-agent/native" (NATIVE)

EndpointNode "dev-local" (http://localhost:8080)
└── RuntimeSource "dev-local/custom"
    └── AgentPresence "dev-local/custom/test-agent"
        └── StationDescriptor "dev-local/custom/test-agent/native" (NATIVE)
```

### ID Stability Rules

| Entity | ID Format | Example | Stability |
|---|---|---|---|
| EndpointNode | `uuid` | `a1b2c3d4...` | Persistent across restarts |
| RuntimeSource | `{endpointId}/{runtimeType}` | `a1b2/hermes` | Changes if endpoint changes |
| AgentPresence | `{runtimeId}/{agentName}` | `a1b2/hermes/vg-god` | Persistent per runtime |
| StationDescriptor | `{agentId}/native` or user-defined | `a1b2/hermes/vg-god/native` | Auto-generated |

### Cascade Rules

| Parent Changes | Child Effect |
|---|---|
| Endpoint goes UNREACHABLE | All child runtimes marked INACTIVE, agents marked offline, stations marked not-live |
| Runtime goes ERROR | All child agents marked offline, stations marked not-live |
| Agent goes offline | Its native station marked not-live, OES transitions to DORMANT |
| Endpoint comes back | Full re-discovery of runtimes → agents → stations |
| New agent discovered | Native station auto-generated, OES = focused (initial) |
| Agent removed | Native station archived (not deleted — preserves listening history) |

---

## 4. Endpoint Ingestion Strategy

### Phase 1 Sources (in priority order)

| # | Source | Method | Auth | Priority |
|---|---|---|---|---|
| 1 | Manual entry | Settings → "Add Endpoint" → URL input | None (Tailnet handles it) | Highest — user intent |
| 2 | Local config | `SharedPreferences` key `"vaib_endpoints_json"` | None | High — persisted |
| 3 | Tailnet manifest | `GET {endpoint}/.well-known/vaib-manifest.json` | None (Tailnet-protected) | Medium — auto-discovery |

### Phase 2+ Sources (not Phase 1)

| # | Source | Method | Phase |
|---|---|---|---|
| 4 | Tailscale API | Query devices on tailnet | Phase 2 |
| 5 | mDNS/Bonjour | Local network discovery | Phase 3 |
| 6 | QR code scan | Camera scans endpoint URL | Phase 3 |

### Discovery Protocol (HTTP)

```
GET {endpoint_url}/.well-known/vaib-manifest.json

Expected response (200 OK):
{
  "version": "1.0",
  "endpoint": {
    "label": "PRIME",
    "capabilities": ["hermes", "openclaw"]
  },
  "runtimes": [
    {
      "type": "hermes",
      "version": "3.2.1",
      "agents": [
        {"id": "vg-god", "name": "vg-god", "status": "active", "task": "sync"},
        {"id": "picasso", "name": "picasso", "status": "idle", "task": null}
      ]
    }
  ]
}

Error responses:
  401 → EndpointHealth.AUTH_REQUIRED
  404 → No manifest (still usable, manual config needed)
  timeout → EndpointHealth.UNREACHABLE
```

### Discovery Flow (pseudocode)

```kotlin
suspend fun DiscoveryCoordinator.refresh() {
    val endpoints = endpointRegistry.loadAll()
    if (endpoints.isEmpty()) {
        appStateProvider.setEmptyState()  // "No endpoints configured"
        return
    }

    for (endpoint in endpoints) {
        val result = probeEndpoint(endpoint)
        when (result) {
            is ProbeSuccess -> {
                endpointRegistry.updateHealth(endpoint.id, HEALTHY)
                val runtimes = runtimeAdapter.discover(result.manifest)
                val agents = agentResolver.resolve(runtimes)
                val stations = stationGenerator.generate(agents)
                appStateProvider.update(endpoint, runtimes, agents, stations)
            }
            is ProbeTimeout -> {
                endpointRegistry.updateHealth(endpoint.id, UNREACHABLE)
                // Use cached agents/stations if available
            }
            is ProbeAuthRequired -> {
                endpointRegistry.updateHealth(endpoint.id, AUTH_REQUIRED)
            }
        }
    }
}
```

### Rate Limiting

- Max 1 discovery probe per endpoint per 30 seconds
- Max 3 concurrent probes (don't overwhelm network)
- Background discovery uses WorkManager with 15-minute minimum interval
- User-initiated refresh: immediate, but debounced (2s)

---

## 5. Fake/Demo Replacement Strategy

### What Gets Replaced

| Location | Current (Fake) | Replacement |
|---|---|---|
| `VaibViewModel._appState init` | `DemoData.getDefaultAppState()` | `DiscoveryCoordinator.populateState()` |
| `Agent(name="DJinn", role="Signal Architect")` | All DemoData agents | `AgentPresence` from discovery |
| `Station(name="Prime Pulse", hostAgent="DJinn")` | All DemoData stations | `StationDescriptor` from native generation |
| `CockpitScreen AgentChip("DJinn")` | Hardcoded fake | Dynamic `onAirAgentId` → resolved AgentPresence |
| `themedShowName()` | "Neon Drift Hour", "Pulse Cathedral" | Derived: `{agent.displayName} — {station.name}` |
| `reactionVoices` | "Signal goblin approves 💀" | Removed entirely (theatrical) |
| `reactionEmoji` | Per-agent emoji sets | Removed entirely |

### Demo Data Fate

**NOT deleted.** DemoData.kt is preserved but wrapped:

```kotlin
// DemoData.kt — marked clearly as DEMO provenance
object DemoData {
    fun getDefaultAppState(): AppState {
        // All entities carry EntitySource.DEMO
        // All station descriptors carry ProvenanceMarker(DEMO, ...)
    }
}
```

### Empty State (no endpoints configured)

When no endpoints exist, the app shows:

```
[ Visualizer strip — always visible ]
[ "vAIb" 36sp ]
[ "No operational systems detected" 13sp TextMuted ]
[ "Add an endpoint to begin" 12sp TextMuted ]
[ [Add Endpoint] [Use Demo Mode] ]  ← two buttons
```

Demo mode is explicit opt-in with warning dialog:
- Title: "Demo Mode"
- Body: "Demo mode shows simulated agents and stations for testing the UI. These are not real operational entities."
- Actions: "Enable Demo" / "Cancel"
- When enabled: all demo entities carry `EntitySource.DEMO` and show "DEMO" badge

### Gradual Migration Path

```
Step 1: DiscoveryCoordinator produces real entities (side by side with DemoData)
Step 2: AppStateProvider prioritizes real over demo
Step 3: UI shows real entities with provenance indicators
Step 4: When real entities exist, demo entities are hidden (not deleted)
Step 5: User can always enable demo mode via Settings
```

---

## 6. Rollback Plan

### Level 1 — Feature Flag (instant)

```kotlin
// BuildConfig field (already exists)
buildConfigField("boolean", "ENABLE_DISCOVERY", "true")

// Toggle in Settings
Setting: "Discovery System" → ON/OFF

When OFF:
- DiscoveryCoordinator.refresh() returns immediately
n- AppState falls back to DemoData.getDefaultAppState()
- All discovery UI hidden
- Zero runtime impact from discovery code
```

### Level 2 — Code Revert (per commit)

| Commit Scope | Revert Command | Files Affected |
|---|---|---|
| Discovery models | `git revert <commit>` | `discovery/model/*.kt` |
| Discovery coordinator | `git revert <commit>` | `discovery/*.kt` |
| UI changes | `git revert <commit>` | `CockpitScreen.kt`, `VaibNavHost.kt` |
| ViewModel changes | `git revert <commit>` | `VaibViewModel.kt` |

Each commit is self-contained and independently revertable.

### Level 3 — Full Rollback

```bash
git reset --hard c7ffc66  # last compile-stable before Discovery
# OR:
git revert <discovery-merge-commit>  # preserves history
```

### Level 4 — Emergency

```bash
git checkout prime-stabilization
git reset --hard f6572b8  # back to original base
# Then re-apply compile-stable commits selectively
```

### Rollback Test Plan

After each commit in Discovery Phase 1:
1. `./gradlew :app:compileDebugKotlin` must pass
2. `./gradlew assembleDebug` must pass
3. `BuildConfig.ENABLE_DISCOVERY = false` must produce working APK
4. Revert of that commit must restore previous state

---

## 7. Smoke Test Plan

### Test 1: Compilation
```bash
./gradlew :app:compileDebugKotlin
```
**Expected:** Zero errors. Warnings acceptable.

### Test 2: Assembly
```bash
./gradlew assembleDebug
```
**Expected:** APK generated successfully.

### Test 3: Launch — No Endpoints
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
# Launch app
```
**Expected:**
- App opens without crash
- Visualizer strip visible at top (36dp)
- "vAIb" header 36sp visible
- "No operational systems detected" message
- "Add Endpoint" button visible
- Music auto-play does NOT break (still works from Phase 0)

### Test 4: Launch — With Endpoints (if available)
**Precondition:** Configure a real endpoint in Settings
**Expected:**
- Discovery runs (subtle loading indicator)
- Real agents appear in Agents tab
- Real native stations appear in Stations tab
- Station names are functional (lowercase, no theatrical names)
- No "DJinn", "Signal Architect", or theatrical text visible

### Test 5: Cockpit v2 Preservation
**Expected:**
- Visualizer still at top, 36dp, always visible
- Track title 24sp Bold, largest text
- Artist 18sp below
- No hardcoded "DJinn", "neon focus", token budget
- ≤10 text elements on Cockpit
- Music playback works: play, pause, auto-play on startup

### Test 6: Typography v2 Preservation
**Expected:**
- All screen headers use consistent sizes
- No text too small to read
- Track title is always most prominent

### Test 7: Music Safety
**Expected:**
- AudioBackbone.kt untouched
- playStation() untouched
- togglePlayPause() works
- No playback regressions
- No audio glitches

### Test 8: Calmness Check
**Expected:**
- App feels calm (mostly black, minimal text)
- No dashboard clutter
- No new telemetry visible in main UI
- No celebration animations on discovery
- Agents appear naturally (gentle fade, not dramatic entrance)

### Test 9: Demo Mode
**Expected:**
- Settings → "Demo Mode" toggle
- When enabled: entities show "DEMO" badge
- When disabled: demo entities hidden
- Toggle persists across restart

### Test 10: Rollback
```bash
# Set ENABLE_DISCOVERY = false in build.gradle
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```
**Expected:** App works exactly as before Discovery Phase 1.

---

## FILES TO CREATE (Phase 1 scope)

### New files (16):
```
discovery/
  model/
    EndpointNode.kt          — Endpoint entity + enums
    RuntimeSource.kt         — Runtime entity + enums
    AgentPresence.kt         — Agent entity + OES + VisualSignature
    StationDescriptor.kt     — Station entity + GenerationRule
    ProvenanceMarker.kt      — Entity source tracking
    VisualSignature.kt       — Glyph generation from hash
    EntitySource.kt          — Source enum (DISCOVERED/CONFIGURED/CACHED/DEMO)
  endpoint/
    EndpointRegistry.kt      — CRUD for endpoints in SharedPreferences
    EndpointProbe.kt         — HTTP probe with timeout/auth handling
  runtime/
    RuntimeDiscoveryAdapter.kt — Probes endpoints, discovers runtimes
  agent/
    AgentPresenceResolver.kt   — Resolves agents from runtime data
  station/
    NativeStationGenerator.kt  — Auto-generates NATIVE stations from agents
  DiscoveryCoordinator.kt    — Orchestrates full discovery flow
  AppStateProvider.kt        — Bridges discovery output → ViewModel
```

### Files to modify (3):
```
VaibViewModel.kt          — Replace DemoData init with DiscoveryCoordinator
CockpitScreen.kt          — Resolve agents/stations from discovery (no structural change)
SettingsScreen.kt         — Add "Add Endpoint" row + "Demo Mode" toggle
```

### Files NOT touched (protected):
```
AudioBackbone.kt          — Music pipeline protected
Type.kt                   — Typography v2 preserved
VisualizerBars.kt         — Visualizer preserved
All music/source/ files   — Phase A preserved
All navigation            — Bottom nav preserved
```

---

## APPROVAL REQUIRED

Before any code is written, confirm:

1. [ ] Discovery Architecture Map is acceptable
2. [ ] Canonical Entity Model covers all needs
3. [ ] Runtime/Entity relationships are correct
4. [ ] Endpoint ingestion strategy (manual + config + manifest) is sufficient for Phase 1
5. [ ] Fake/demo replacement strategy preserves DemoData while prioritizing real entities
6. [ ] Rollback plan (4 levels) provides adequate safety
7. [ ] Smoke test plan covers all critical paths
8. [ ] File scope (16 new, 3 modified, rest protected) is acceptable

**Say "approved" to begin implementation.**
**Say "revise [section]" to request changes to a specific deliverable.**
**Say nothing and I will wait.**
