# vAIb Runtime Discovery Architecture

**Document ID:** VAIB-DISC-ARCH-001
**Status:** PLANNING — AWAITING APPROVAL
**Package:** `com.xsytrance.vaib`

---

## 1. STATUS

| Field | Value |
|---|---|
| **Mission** | Design runtime discovery architecture for vAIb Android |
| **Scope** | Planning only — Kotlin model stubs and interface definitions |
| **Current State** | All entities hardcoded in `DemoData.kt` |
| **Target State** | Runtime discovery of endpoints, runtimes, agents, and presence via pluggable adapters |

---

## 2. FINDINGS

### Finding 1: No Entity Provenance

`Station.kt` and `Agent.kt` have no `source`, `discoveredAt`, or `authenticity` fields. The UI cannot distinguish real from fabricated entities.

**Current models:**
```kotlin
data class Station(val id: String, val name: String, val hostAgent: String, ...)
// hostAgent is a String name — not a validated reference to an actual agent

data class Agent(val id: String, val name: String, val role: String, val status: String, ...)
// role is a free-form string: "Signal Architect", "Signal Goblin"
// status is a free-form string: "online", "hosting", "unstable"
// No concept of where this agent came from or when it was last validated
```

### Finding 2: Demo Data Is the Default State

`VaibViewModel.kt:56`: `_appState = MutableStateFlow(DemoData.getDefaultAppState())`

The `init` block calls `loadDemoData()` unconditionally. The app launches with fabricated entities regardless of network availability. User sees "Prime Pulse" and "DJinn" before any discovery occurs.

### Finding 3: No Discovery Abstraction

Direct coupling: `DemoData.kt` → `VaibViewModel._appState` → UI. No discovery interface, no adapter pattern, no source abstraction. `VaibRepository` exists only for API calls, not entity sourcing.

### Finding 4: Demo Mode Is ON by Default (Repository Level)

`VaibRepository.kt:18`: `var useDemoMode: Boolean = true`

`SettingsScreen.kt:27`: `var demoMode by remember { mutableStateOf(false) }` — local UI state, disconnected from ViewModel state. Three inconsistent sources of truth.

### Finding 5: Agent Personas Violate "Real Operational Entities" Principle

`DemoData.kt` agents: "Signal Goblin", "Signal Architect", "Discovery Host" — theatrical, not infrastructural. Agents have no connection to actual running systems. Roles are creative writing, not operational descriptors.

### Finding 6: Station-to-Agent Binding Is Fictional

`Station.hostAgent` is a plain `String` like "DJinn". No validation that the referenced agent exists, is online, or is associated with that station. Could reference a non-existent agent silently.

### Finding 7: BackendEndpoint Exists but Is Disconnected from Entities

`BackendEndpoint` + `VaibApiClient.checkConnectionAny()` perform health checks (`GET /health`) but never discover runtimes, agents, or operational entities. Endpoints and entities are separate domains with zero linking.

---

## 3. PROPOSED ARCHITECTURE

### 3.1 Core Abstraction Hierarchy

```
EndpointNode → RuntimeSource → AgentPresence → StationDescriptor
```

Each level is independently discoverable, cacheable, and observable. A single endpoint may host multiple runtimes; a single runtime may host multiple agents; each agent generates exactly one Native station.

---

#### EndpointNode

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * A discoverable network endpoint that may host one or more runtimes.
 *
 * @property id Stable ID — hash of baseUrl + endpointType. Survives restarts.
 * @property label Human-readable label for UI, e.g. "PRIME", "dev-local".
 * @property baseUrl Connection URL including protocol and port.
 * @property endpointType Classification determining probing strategy and timeouts.
 * @property priority Discovery order — lower values probed first.
 * @property discoveryStatus Current lifecycle state.
 * @property lastSeenAt Timestamp of last successful contact, or null.
 * @property latencyMs Last measured round-trip latency in ms.
 * @property metadata Capabilities, version info, supported protocols.
 */
data class EndpointNode(
    val id: String,
    val label: String,
    val baseUrl: String,
    val endpointType: EndpointType,
    val priority: Int,
    val discoveryStatus: DiscoveryStatus,
    val lastSeenAt: Long?,
    val latencyMs: Long?,
    val metadata: EndpointMetadata
)

enum class EndpointType {
    TAILNET_DNS,   // MagicDNS hostname — most stable
    TAILNET_IP,    // 100.x.y.z — direct but may change
    LOCAL_LAN,     // Fastest on same network, unreachable remotely
    CUSTOM         // User-configured — highest flexibility
}

enum class DiscoveryStatus {
    DISCOVERING,   // Being probed — no parallel probes
    AVAILABLE,     // Responded successfully — ready for use
    UNREACHABLE,   // Timeout or error
    AUTH_REQUIRED, // Requires credentials
    PENDING        // Known from config/cache, not yet probed this session
}
```

**Rationale:** Replaces `BackendEndpoint` with provenance-aware target abstraction. `DiscoveryStatus` and `metadata` enable capability-based UI feature gating.

---

#### RuntimeSource

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * A runtime/framework discovered on an [EndpointNode].
 *
 * A single endpoint may host multiple runtimes on different ports.
 *
 * @property id Stable ID scoped to the parent endpoint.
 * @property endpointId Parent EndpointNode ID — foreign key.
 * @property runtimeType Classification of the runtime framework.
 * @property label Human-readable, e.g. "Hermes v3.2".
 * @property version Runtime-reported version string, or null.
 * @property discoveryStatus Current lifecycle state.
 * @property capabilities What this runtime can expose — drives UI feature gating.
 * @property lastSeenAt Timestamp of last successful discovery.
 */
data class RuntimeSource(
    val id: String,
    val endpointId: String,
    val runtimeType: RuntimeType,
    val label: String,
    val version: String?,
    val discoveryStatus: DiscoveryStatus,
    val capabilities: RuntimeCapabilities,
    val lastSeenAt: Long?
)

enum class RuntimeType { HERMES, OPENCLAW, CUSTOM, UNKNOWN }

/**
 * Capability flags declared by a runtime during discovery.
 * UI uses these to conditionally enable features.
 */
data class RuntimeCapabilities(
    val exposesAgents: Boolean,
    val exposesStations: Boolean,
    val supportsRealtimeEvents: Boolean,
    val exposesTasteProfiles: Boolean,
    val supportsNarration: Boolean,
    val exposesMetrics: Boolean,
    val protocolVersions: List<String>
)
```

**Rationale:** Introduces the concept that an endpoint hosts software, not just URLs. `RuntimeType.UNKNOWN` provides graceful handling of future runtime types without code changes. `capabilities` enables UI adaptation.

---

#### AgentPresence

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * An operational agent discovered within a [RuntimeSource].
 *
 * Represents a REAL running agent process — not a persona or character.
 * All fields derived from runtime inspection. Display names are functional
 * handles ("vg-god", "picasso") — operational, not theatrical.
 *
 * @property id Runtime-scoped agent ID — container name, process ID, or handle.
 * @property runtimeId Parent RuntimeSource ID.
 * @property endpointId Grandparent EndpointNode ID — denormalized for queries.
 * @property displayName Functional name from runtime, e.g. "vg-god". Never cute.
 * @property operationalState Current condition — derived from runtime telemetry.
 * @property taskCategory Broad task: "sync", "render", "idle". Null if unknown.
 * @property recentWorkSummary 80-char max operational summary. NOT a diary entry.
 * @property visualSignature Minimal geometric identifier — not character art.
 * @property lastSeenAt Timestamp of last presence confirmation.
 * @property isOnline Whether agent responded to last probe.
 * @property musicInfluence How this agent affects station curation — derived.
 */
data class AgentPresence(
    val id: String,
    val runtimeId: String,
    val endpointId: String,
    val displayName: String,
    val operationalState: OperationalState,
    val taskCategory: String?,
    val recentWorkSummary: String?,
    val visualSignature: VisualSignature,
    val lastSeenAt: Long?,
    val isOnline: Boolean,
    val musicInfluence: MusicInfluence?
)

/**
 * Operational condition — MEASURED, not assigned.
 * Runtime reports metrics; adapter maps to thresholds.
 *
 * | State      | Trigger (suggested)                              |
 * |------------|--------------------------------------------------|
 * | FOCUSED    | Active task, steady throughput, no errors        |
 * | ENERGIZED  | High throughput, recent significant work         |
 * | STRAINED   | Elevated errors or resource contention           |
 * | DORMANT    | No active task, minimal resource usage           |
 * | ALERT      | Anomalous pattern — not yet failing              |
 * | OVERLOADED | Resource exhaustion — throttling/dropping        |
 * | CALM       | Steady state, normal throughput, healthy         |
 * | UNSTABLE   | Intermittent failures, oscillating health        |
 * | SOCIAL     | Collaborative multi-agent interaction            |
 * | CURIOUS    | Exploring — low certainty, high diversity        |
 */
enum class OperationalState {
    FOCUSED, ENERGIZED, STRAINED, DORMANT, ALERT,
    OVERLOADED, CALM, UNSTABLE, SOCIAL, CURIOUS
}

/**
 * Minimal geometric visual identifier. NOT character art. NOT an avatar.
 * Reproducible, lightweight, derived from stable agent identity.
 */
data class VisualSignature(
    val shapeType: ShapeType,
    val hue: Float,           // 0-360, derived from agent id hash
    val pulseRate: PulseRate, // Derived from operationalState
    val complexity: Int       // 1 (outline) to 4 (layered)
)

enum class ShapeType { CIRCLE, SQUARE, TRIANGLE, DIAMOND, HEXAGON, OCTAGON }
enum class PulseRate { STATIC, SLOW, MEDIUM, FAST }

/**
 * How an agent's operational context influences station curation.
 * Derived from current task, work patterns, taste hooks — not hardcoded.
 */
data class MusicInfluence(
    val derivedVibe: String,       // e.g. "focused synthesis", "stretched render"
    val bpmInfluence: String,      // "min-max" derived from workload pattern
    val genreBias: List<String>,   // From declared preferences or work context
    val energyLevel: Float         // 0.0-1.0 derived from operational state
)
```

**Rationale:** `AgentPresence` replaces hardcoded `Agent`. Key decisions: functional names, measured states (not free-form strings), geometric visual signatures (not character art), operational summaries (not creative narratives).

---

#### StationDescriptor

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * A station DERIVED from an [AgentPresence] within its runtime context.
 *
 * Does not exist independently in any backend. Created by discovery when
 * an agent is found; destroyed when the agent disappears.
 *
 * @property id Derived: "{endpointId}/{runtimeId}/{agentId}/native"
 * @property name Derived from displayName: "vg-god Native"
 * @property stationType NATIVE (auto-generated) or DRIFT (user-created)
 * @property sourceAgentId Which AgentPresence generates this station
 * @property sourceRuntimeId Which RuntimeSource
 * @property sourceEndpointId Which EndpointNode
 * @property generationRule How this station was created
 * @property isAutoGenerated True for Native, false for Drift
 * @property isLive Whether source agent is currently online
 * @property streamUrl Resolved stream endpoint, or null
 * @property vibe Derived from agent's current operational state
 * @property bpmRange Derived from agent's music influence
 */
data class StationDescriptor(
    val id: String,
    val name: String,
    val stationType: StationType,
    val sourceAgentId: String,
    val sourceRuntimeId: String,
    val sourceEndpointId: String,
    val generationRule: GenerationRule,
    val isAutoGenerated: Boolean,
    val isLive: Boolean,
    val streamUrl: String?,
    val vibe: String?,
    val bpmRange: String?
)

enum class StationType { NATIVE, DRIFT }

enum class GenerationRule {
    AGENT_NATIVE,       // From single discovered agent — updates each cycle
    RUNTIME_AGGREGATE,  // From runtime aggregation
    USER_CREATED,       // Drift station — discovery does not auto-delete
    SYSTEM_FALLBACK     // Empty-state fallback — no fabricated content
}
```

**Rationale:** Agents are ground truth; stations are projections. Inverts the current model where stations are primary and agents are loosely associated. `DRIFT` allows user creativity without polluting the discovered entity space.

---

### 3.2 Entity Provenance System

Every entity carries provenance — non-negotiable invariant.

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * Origin classification for all entities in vAIb.
 * Every entity displayed in the UI MUST carry a ProvenanceMarker.
 */
enum class EntityProvenance {
    DISCOVERED,   // Found via runtime discovery — HIGHEST confidence
    CONFIGURED,   // From local config — user-specified, real but static
    CACHED,       // From previous discovery — may be stale
    FALLBACK,     // Minimal empty state — NO fabricated entities
    DEMO          // EXPLICIT demo mode — SIMULATED, clearly marked
}

/**
 * Provenance metadata attached to every entity. UI uses this for badges,
 * opacity, borders — communicating authenticity to the user.
 */
data class ProvenanceMarker(
    val provenance: EntityProvenance,
    val discoveredAt: Long?,           // Timestamp of discovery, null for FALLBACK
    val sourceEndpointId: String?,     // Which endpoint provided this
    val sourceRuntimeId: String?,      // Which runtime
    val isStale: Boolean               // True if older than staleness threshold
)

/**
 * Wrapper attaching provenance to any entity. UI receives Provenanced<T>
 * and uses [marker] to render appropriately. No entity without provenance.
 */
data class Provenanced<T>(
    val entity: T,
    val marker: ProvenanceMarker
)
```

**Rationale:** Provenance is foundational for trust. `Provenanced<T>` attaches authenticity context without polluting entity data classes. `EntityProvenance.DEMO` is the only provenance permitting fabricated data, and requires explicit user opt-in.

---

### 3.3 The Discovery Coordinator

```kotlin
package com.xsytrance.vaib.discovery

import com.xsytrance.vaib.discovery.model.*
import kotlinx.coroutines.flow.Flow

/**
 * Central orchestrator for runtime discovery. SINGLE ENTRY POINT.
 * No other component probes endpoints directly.
 *
 * Manages adapter registry, triggers discovery cycles, aggregates results,
 * exposes unified snapshot + event stream.
 */
interface DiscoveryCoordinator {

    /**
     * Begin discovery across all configured endpoints. Idempotent — calling
     * while discovery is in-progress does not start a parallel probe.
     *
     * 1. Enumerate EndpointNodes from EndpointRegistry
     * 2. Select RuntimeDiscoveryAdapter per endpoint
     * 3. Probe in priority order
     * 4. Discover runtimes, then agents within each
     * 5. Generate StationDescriptor per AgentPresence
     * 6. Emit DiscoveryEvent per lifecycle change
     */
    suspend fun beginDiscovery()

    /** Point-in-time snapshot — synchronous read, no network ops. */
    fun currentSnapshot(): DiscoverySnapshot

    /** Reactive stream of discovery lifecycle events. */
    fun discoveryFlow(): Flow<DiscoveryEvent>

    /** Force refresh of a specific endpoint. Used for pull-to-refresh. */
    suspend fun refreshEndpoint(endpointId: String)

    /** Register a runtime discovery adapter. First matching adapter wins. */
    fun registerAdapter(adapter: RuntimeDiscoveryAdapter)
}

/**
 * Immutable snapshot of entire discovery state. Used for initial UI render
 * and state persistence across process death.
 */
data class DiscoverySnapshot(
    val endpoints: List<Provenanced<EndpointNode>>,
    val runtimes: List<Provenanced<RuntimeSource>>,
    val agents: List<Provenanced<AgentPresence>>,
    val stations: List<Provenanced<StationDescriptor>>,
    val overallStatus: DiscoveryStatus,
    val lastDiscoveryAt: Long?
)
```

**Rationale:** Centralized entry point ensures consistent endpoint enumeration, adapter selection, error handling, and event emission. `Flow<DiscoveryEvent>` enables reactive UI; `DiscoverySnapshot` provides immediate synchronous access.

---

### 3.4 Runtime Discovery Adapter Interface

```kotlin
package com.xsytrance.vaib.discovery

import com.xsytrance.vaib.discovery.model.*

/**
 * Pluggable adapter for discovering runtimes and agents on an endpoint type.
 * New runtime types are supported by implementing this interface — no changes
 * to DiscoveryCoordinator, ViewModel, or UI required.
 *
 * Selection: coordinator iterates adapters in order, calls canProbe(),
 * first returning true handles the endpoint.
 */
interface RuntimeDiscoveryAdapter {

    /** Primary runtime type this adapter targets. */
    val supportedRuntimeType: RuntimeType

    /**
     * Can this adapter handle the given endpoint? LIGHTWEIGHT — no network calls.
     * Inspect endpoint type, URL pattern, or metadata only.
     */
    suspend fun canProbe(endpoint: EndpointNode): Boolean

    /**
     * Probe endpoint for runtimes. HEAVY — makes network calls.
     * Called only when canProbe() returned true.
     */
    suspend fun discoverRuntimes(endpoint: EndpointNode): List<RuntimeSource>

    /** Discover agents within a runtime. Called after discoverRuntimes(). */
    suspend fun discoverAgents(runtime: RuntimeSource): List<AgentPresence>

    /** Lightweight ping for endpoint classification. Completes in < 1s. */
    suspend fun pingRuntime(endpoint: EndpointNode): RuntimePingResult
}

data class RuntimePingResult(
    val reachable: Boolean,
    val runtimeType: RuntimeType?,
    val version: String?,
    val latencyMs: Long?,
    val requiresAuth: Boolean
)

class DiscoveryProbeException(
    val endpointId: String,
    val operation: String,
    cause: Throwable?
) : Exception("Probe failed on $endpointId during $operation", cause)
```

**Rationale:** Adapter pattern is the core extensibility mechanism. Three-phase design (`canProbe` / `discoverRuntimes` / `discoverAgents`) separates lightweight classification from heavyweight discovery, preventing unnecessary network calls.

---

## 4. ABSTRACTION MODELS

### 4.1 DiscoveryEvent Sealed Class

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * All significant events in the discovery lifecycle.
 * Emitted by DiscoveryCoordinator.discoveryFlow() for reactive UI updates.
 */
sealed class DiscoveryEvent {
    abstract val emittedAt: Long

    // Endpoint lifecycle
    data class EndpointDiscovered(override val emittedAt: Long, val endpoint: Provenanced<EndpointNode>) : DiscoveryEvent()
    data class EndpointLost(override val emittedAt: Long, val endpointId: String, val previousStatus: DiscoveryStatus, val reason: String) : DiscoveryEvent()
    data class EndpointChanged(override val emittedAt: Long, val endpoint: Provenanced<EndpointNode>) : DiscoveryEvent()

    // Runtime lifecycle
    data class RuntimeFound(override val emittedAt: Long, val runtime: Provenanced<RuntimeSource>) : DiscoveryEvent()
    data class RuntimeLost(override val emittedAt: Long, val runtimeId: String, val endpointId: String) : DiscoveryEvent()

    // Agent lifecycle
    data class AgentAppeared(override val emittedAt: Long, val agent: Provenanced<AgentPresence>) : DiscoveryEvent()
    data class AgentDisappeared(override val emittedAt: Long, val agentId: String, val runtimeId: String, val wasOnline: Boolean) : DiscoveryEvent()
    data class AgentStateChanged(override val emittedAt: Long, val agent: Provenanced<AgentPresence>, val previousState: OperationalState) : DiscoveryEvent()

    // Station lifecycle
    data class StationCreated(override val emittedAt: Long, val station: Provenanced<StationDescriptor>) : DiscoveryEvent()
    data class StationDestroyed(override val emittedAt: Long, val stationId: String, val reason: String) : DiscoveryEvent()

    // Discovery cycle
    data class DiscoveryStarted(override val emittedAt: Long, val endpointsToProbe: Int) : DiscoveryEvent()
    data class DiscoveryCompleted(override val emittedAt: Long, val endpointsReached: Int, val endpointsFailed: Int, val runtimesFound: Int, val agentsFound: Int, val durationMs: Long) : DiscoveryEvent()
}
```

**Rationale:** Sealed class enables exhaustive `when` handling. Event taxonomy mirrors entity hierarchy. Each event carries full context — collectors update UI without additional queries.

---

### 4.2 EntityResolver

```kotlin
package com.xsytrance.vaib.discovery

import com.xsytrance.vaib.discovery.model.*

/**
 * Resolves abstract IDs to concrete provenanced entities.
 * Bridges ID-centric Compose UI state with entity-centric discovery.
 */
interface EntityResolver {
    fun resolveEndpoint(endpointId: String): Provenanced<EndpointNode>?
    fun resolveRuntime(runtimeId: String): Provenanced<RuntimeSource>?
    fun resolveAgent(agentId: String): Provenanced<AgentPresence>?
    fun resolveStation(stationId: String): Provenanced<StationDescriptor>?
    fun agentForStation(stationId: String): Provenanced<AgentPresence>?
    fun agentsInRuntime(runtimeId: String): List<Provenanced<AgentPresence>>
    fun runtimesOnEndpoint(endpointId: String): List<Provenanced<RuntimeSource>>
    fun stationsForAgent(agentId: String): List<Provenanced<StationDescriptor>>
}
```

**Rationale:** Formalizes ID-to-entity relationships. Replaces fragile string references (`Station.hostAgent`) with validated lookups. Inverse queries (`agentForStation`, `agentsInRuntime`) support cross-referencing without denormalized data.

---

### 4.3 EndpointMetadata

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * Capabilities and version info discovered about an endpoint.
 * Populated on first successful probe, updated on subsequent probes.
 */
data class EndpointMetadata(
    val serverSoftware: String?,              // e.g. "nginx/1.24", "hermes-gateway/3.2"
    val supportedApiVersions: List<String>,
    val supportedDiscoveryVersions: List<String>,
    val authRequired: Boolean,
    val authMethods: List<String>,            // "bearer", "api-key", etc.
    val maxProtocolVersion: String
)
```

---

### 4.4 AppOperatingMode

```kotlin
package com.xsytrance.vaib.discovery.model

/**
 * Three mutually exclusive operating modes. Determined at startup by
 * AppModeDecider. Transitions are explicit and logged.
 */
enum class AppOperatingMode {
    /** Discovery active — entities from real endpoints. No demo personas. */
    LIVE,
    /** Explicit opt-in — all entities carry DEMO provenance, "DEMO" badges shown. */
    DEMO,
    /** Discovery failed, demo OFF — empty state with retry/configure/demo options. */
    FALLBACK
}

/**
 * Decides initial AppOperatingMode at startup. Encapsulated for testability.
 *
 * Decision order:
 * 1. User enabled demo mode → DEMO
 * 2. Endpoints configured + discovery succeeds → LIVE
 * 3. Endpoints configured + discovery fails → FALLBACK
 * 4. No endpoints configured → FALLBACK (with setup prompt)
 */
interface AppModeDecider {
    suspend fun decideMode(
        isDemoModeExplicitlyEnabled: Boolean,
        configuredEndpoints: List<EndpointNode>,
        discoveryCoordinator: DiscoveryCoordinator
    ): AppOperatingMode
}
```

---

## 5. DISCOVERY STRATEGY OPTIONS

| Strategy | Phase | Name | Description |
|----------|-------|------|-------------|
| A | 1 | Static Configuration | JSON config file, user-editable endpoint list |
| B | 2 | HTTP API Polling | Poll `/discovery`, `/runtimes`, parse JSON |
| C | 2+ | JSON Manifest | `.well-known/vaib-manifest.json` capability ads |
| D | 3 | Tailscale Discovery | Query Tailscale API for visible machines |
| E | 4 | WebSocket Feed | Real-time push-based presence updates |

---

### Strategy A: Static Configuration (Phase 1)

`StaticConfigDiscoveryAdapter` — reads `vaib-config.json` from assets or local storage. No network calls. Provides baseline entities from manual config.

| Advantage | Disadvantage |
|-----------|-------------|
| No network deps, works offline | Requires manual user configuration |
| Predictable, fast (local I/O) | Doesn't reflect runtime reality |
| Enables architecture without backend changes | Must be manually updated |

**When:** Phase 1 — first implemented adapter. Migration path from `DemoData` to user-configured entities.

---

### Strategy B: HTTP API Polling (Phase 2)

`HttpDiscoveryAdapter` — extends `VaibApiClient`. New endpoints: `GET /discovery`, `GET /runtimes`, `GET /runtimes/{id}/agents`. Parses JSON into discovery models.

| Advantage | Disadvantage |
|-----------|-------------|
| Uses existing `VaibApiClient` | Requires backend implementing API |
| Simple standard HTTP polling | Polling latency — changes between polls missed |
| Works with any HTTP endpoint | Battery impact from repeated calls |

**When:** Phase 2 — enables real discovery against running backends. Coexists with Strategy A.

---

### Strategy C: JSON Manifest Discovery (Phase 2+)

Endpoints serve `GET /.well-known/vaib-manifest.json` — self-describing capabilities, runtime list, version info. Adapter reads manifest once, then uses Strategy B endpoints for ongoing queries.

| Advantage | Disadvantage |
|-----------|-------------|
| Standardized, self-describing | Requires backend support |
| Single call to understand capabilities | Manifest may become stale |

**When:** Phase 2+ — enhancement to Strategy B. Manifest as capability advertisement.

---

### Strategy D: Tailscale-Aware Discovery (Phase 3)

`TailscaleDiscoveryAdapter` — queries Tailscale local API for visible machines. Filters by tags (e.g., `tag:vaib-host`). Auto-populates endpoint registry.

| Advantage | Disadvantage |
|-----------|-------------|
| Auto-discovery — no manual config | Requires Tailscale integration |
| Endpoints auto-populate on join | Network-dependent |

**When:** Phase 3 — when Tailscale integration is prioritized. Reduces setup friction.

---

### Strategy E: WebSocket/Event Feed (Phase 4)

`RealtimeEventTransport` — NOT a RuntimeDiscoveryAdapter. Complementary push layer subscribing to runtime event feeds after initial discovery.

| Advantage | Disadvantage |
|-----------|-------------|
| Real-time sub-second updates | Complex — WebSocket, reconnect, heartbeat |
| Eliminates polling battery drain | Requires backend WebSocket support |

**When:** Phase 4 — optimization after polling is stable. Not required for functionality.

---

## 6. LIVE VS DEMO STRATEGY

### 6.1 Strict Separation

```
[App Launch]
    │
    ├── User enabled demo? ──→ DEMO mode
    │
    ├── Endpoints configured? ──→ Run discovery
    │       ├── Success ──→ LIVE mode
    │       └── Failure ──→ FALLBACK mode
    │
    └── No endpoints ──→ FALLBACK mode (setup prompt)
```

### 6.2 Mode Definitions

**LIVE Mode:**
- Entities carry `DISCOVERED` or `CONFIGURED` provenance
- Stations are NATIVE — auto-generated from discovered agents
- Agent names are functional ("vg-god") — no theatrical personas
- `DemoData.getDefaultAppState()` is NEVER called

**DEMO Mode:**
- Explicit opt-in via Settings toggle with warning dialog
- All entities carry `DEMO` provenance — "DEMO" badge on every card
- Demo agents have sanitized, operational role strings
- Entities from `DemoData` wrapped with DEMO provenance

**FALLBACK Mode:**
- Discovery failed, demo OFF, no cached entities
- UI: "No systems detected" with three actions: Retry Discovery / Enter Demo / Configure Endpoints
- Entities carry `FALLBACK` provenance — minimal, non-fabricated
- NEVER silently falls back to demo data

### 6.3 Provenance UI Requirements

| Provenance | Visual Indicator |
|------------|-----------------|
| `DISCOVERED` | No badge (default — real needs no disclaimer) |
| `CONFIGURED` | Small "CONFIG" chip |
| `CACHED` | "CACHED" chip + timestamp, 80% opacity |
| `FALLBACK` | "SETUP REQUIRED" prominent badge |
| `DEMO` | "DEMO" badge in accent color, ALWAYS visible |

---

## 7. ROADMAP RECOMMENDATION

| Phase | Name | Content | Status |
|-------|------|---------|--------|
| 0 | Foundation | `MotionIntensity`, core models, settings, update system | **COMPLETE** |
| 0.5 | Verification | Build verification, smoke test, CI baseline | PENDING |
| **1** | **Discovery Architecture** | **`EndpointNode`, `RuntimeSource`, `AgentPresence`, `StationDescriptor`. Static config (Strategy A). `ProvenanceMarker`. Abstract `AppState` from `DemoData`. `DiscoveryCoordinator`, `RuntimeDiscoveryAdapter`, mode state machine.** | **PROPOSED** |
| 2 | Discovery Implementation | HTTP polling (Strategy B), JSON manifest (Strategy C) | NOT STARTED |
| 3 | Native Stations | Auto-generate NATIVE stations from agents. `EntityResolver`. LIVE/DEMO/FALLBACK enforcement. | NOT STARTED |
| 4 | Agent Presence | `AgentPresence` UI, `OperationalState` viz, `VisualSignature`, `recentWorkSummary`, taste hooks | NOT STARTED |
| 5 | Network Events | `DiscoveryEvent` reactive UI, vitality-based atmosphere triggers | NOT STARTED |
| 6 | Vibe Profile + Sound | `VibeProfile`, sound design, haptics from real state changes | NOT STARTED |
| 7 | Advanced Atmosphere | Particles from real presence, waveform field, AGSL shaders | NOT STARTED |

### Rationale for Reordering

**Atmosphere FX reacting to fake entities is worse than no FX at all.** When particles swirl around "DJinn" the "Signal Architect," the user watches fiction respond to fiction.

The corrected ordering ensures: (1) Real entities exist before atmosphere reacts, (2) Agent presence is meaningful (measured states, not hardcoded), (3) Native stations are the default (auto-generated from real agents).

**Authenticity > effects.** Real presence plumbing must precede atmosphere systems.

---

## 8. RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing UI depending on `DemoData` | **HIGH** | Gradual migration: new models in separate package, old models stay until UI ready. `EntityResolver` bridges old→new. |
| Discovery network calls → battery impact | **MEDIUM** | Configurable poll interval, exponential backoff on failure, respect doze mode. Strategy E eventually eliminates polling. |
| Users see empty state (no endpoints) | **MEDIUM** | Excellent empty state: explanation, setup wizard, offer demo mode. Pre-populate Tailscale patterns if detected. |
| Backends don't implement discovery API | **LOW** | Graceful degradation to Strategy A (static config). No discovery endpoint = manual configuration. |
| Adapter pattern complexity | **MEDIUM** | Start with exactly 2 adapters: `StaticConfigDiscoveryAdapter` + `HttpDiscoveryAdapter`. ~150 lines each. |
| Real system agent names not display-friendly | **LOW** | Sanitization in adapter: trim, lowercase, replace underscores. Fix at runtime if ugly. User aliases later. |

---

## 9. RECOMMENDATION

### **APPROVE** this discovery architecture as the new Phase 1.

### Rationale

1. **Authenticity is the product.** Hardcoded entities ("DJinn," "Signal Goblin") harm identity. This ensures every entity carries provenance — real or clearly marked simulated.
2. **Real presence must precede atmosphere.** Current roadmap plans FX reacting to `DemoData` — fiction on fiction. Discovery first means every atmosphere system reacts to genuine signals.
3. **Adapter pattern enables future integrations.** New runtimes = one interface implementation. No ViewModel or UI changes.
4. **No big-bang migration.** Old models stay in place. New models in separate package. `DemoData` wrapped with `DEMO` provenance, not deleted.
5. **Failure modes are designed.** Three-mode state machine handles every scenario. No silent demo data. No empty screens without guidance.

### Next Steps (Post-Approval)

1. Review this document (48-hour window)
2. **Explicit go/no-go decision**
3. Implement core models: `EndpointNode`, `RuntimeSource`, `AgentPresence`, `StationDescriptor`, `ProvenanceMarker`, `DiscoveryEvent`, `DiscoverySnapshot`
4. Build `StaticConfigDiscoveryAdapter` (Strategy A — no network code)
5. Implement `DiscoveryCoordinator` + `AppModeDecider`
6. Decouple `AppState` from `DemoData` — init empty or from cache, `loadDemoData()` only in DEMO mode
7. Add `ProvenanceIndicator` composable to UI

### **DO NOT BEGIN until explicit approval.**

---

## APPENDIX A: Model Package Layout

```
com.xsytrance.vaib.discovery.model/
    EndpointNode.kt              — EndpointNode, EndpointType, DiscoveryStatus
    RuntimeSource.kt             — RuntimeSource, RuntimeType, RuntimeCapabilities
    AgentPresence.kt             — AgentPresence, OperationalState, VisualSignature,
                                   MusicInfluence, ShapeType, PulseRate
    StationDescriptor.kt         — StationDescriptor, StationType, GenerationRule
    ProvenanceMarker.kt          — EntityProvenance, ProvenanceMarker, Provenanced
    DiscoveryEvent.kt            — DiscoveryEvent sealed class
    DiscoverySnapshot.kt         — DiscoverySnapshot
    EndpointMetadata.kt          — EndpointMetadata
    AppOperatingMode.kt          — AppOperatingMode, AppModeDecider
    RuntimePingResult.kt         — RuntimePingResult

com.xsytrance.vaib.discovery/
    DiscoveryCoordinator.kt      — DiscoveryCoordinator interface
    RuntimeDiscoveryAdapter.kt   — RuntimeDiscoveryAdapter interface + RuntimePingResult
    EntityResolver.kt            — EntityResolver interface
    DiscoveryProbeException.kt   — DiscoveryProbeException

com.xsytrance.vaib.discovery.adapter/
    StaticConfigDiscoveryAdapter.kt
    HttpDiscoveryAdapter.kt
    ManifestDiscoveryAdapter.kt
    TailscaleDiscoveryAdapter.kt
```

## APPENDIX B: File Path References

| File | Path | Role |
|------|------|------|
| `DemoData.kt` | `.../vaib/data/DemoData.kt` | Hardcoded entities — stays, wrapped with DEMO provenance |
| `Station.kt` | `.../vaib/data/model/Station.kt` | Current station — deprecated, migrate to `StationDescriptor` |
| `Agent.kt` | `.../vaib/data/model/Agent.kt` | Current agent — deprecated, migrate to `AgentPresence` |
| `AppState.kt` | `.../vaib/data/model/AppState.kt` | App state — stays, fields migrate to discovery entities |
| `BackendEndpoint.kt` | `.../vaib/data/model/BackendEndpoint.kt` | Current endpoint — superseded by `EndpointNode` |
| `VaibRepository.kt` | `.../vaib/data/VaibRepository.kt` | Repository — `useDemoMode` moves to `AppModeDecider` |
| `VaibViewModel.kt` | `.../vaib/viewmodel/VaibViewModel.kt` | ViewModel — init changes, `loadDemoData()` guarded by mode |
| `SettingsScreen.kt` | `.../vaib/ui/screens/SettingsScreen.kt` | Settings — demo toggle reads actual state, shows warning |
