# vAIB Music Source Architecture

> Document: `VAIB_MUSIC_SOURCE_ARCHITECTURE.md`
> Scope: Music source abstraction, local collection indexing, stream orchestration, operational memory
> Branch: `prime-stabilization`
> Status: PLANNING — Architecture document with Kotlin model stubs. No implementation.
> Cross-references: `VAIB_DISCOVERY_ARCHITECTURE.md`, `VAIB_MUSIC_COCKPIT_UX_PLAN.md`, `AudioBackbone.kt`
> Effort: 37-50h across 10 phases (see Section 12)

---

## Table of Contents

1. [STATUS](#1-status)
2. [CORE ARCHITECTURE](#2-core-architecture)
3. [SOURCE LAYERS](#3-source-layers)
4. [ABSTRACTION MODELS](#4-abstraction-models)
5. [PERSONAL COLLECTION SYSTEM](#5-personal-collection-system)
6. [LIVE STREAM / BROADCAST STRATEGY](#6-live-stream--broadcast-strategy)
7. [OPERATIONAL MEMORY STRATEGY](#7-operational-memory-strategy)
8. [IMPORT / INGESTION STRATEGY](#8-import--ingestion-strategy)
9. [PRIME NEXUS RELATIONSHIP](#9-prime-nexus-relationship)
10. [STATS + MEMORY ARCHITECTURE](#10-stats--memory-architecture)
11. [ANTI-PATTERNS](#11-anti-patterns)
12. [IMPLEMENTATION PHASES](#12-implementation-phases)
13. [RISKS](#13-risks)
14. [RECOMMENDATION](#14-recommendation)

---

## 1. STATUS

**Mission.** Design a modular, privacy-first music source architecture for vAIB that replaces the current hardcoded track pool with a layered, context-aware source abstraction. AudioBackbone shall eventually consume `PlaybackCandidate` objects produced by a `PlaybackOrchestrator`, not raw `Station` objects. The system must support: (a) user-owned local music collections, (b) live stream opportunism, (c) operational context-aware curation, (d) listening history imports for taste seeding, and (e) "Resonance Trace" transparency — all without algorithmic recommendation addiction, engagement loops, or streaming-service-clone behavior.

**Scope.** This document covers source abstraction interfaces, four source layers (L1-L4), local collection indexing, live stream tuning, operational memory formation, history import/ingestion, Prime Nexus integration, and stats/memory architecture. It does NOT cover: UI implementation (see `VAIB_MUSIC_COCKPIT_UX_PLAN.md`), audio rendering (AudioBackbone.kt is PROTECTED), discovery pipeline (see `VAIB_DISCOVERY_ARCHITECTURE.md`), or TTS narration systems.

**Current Problem.** The existing system in `AudioBackbone.kt` resolves playback via a hardcoded priority chain (`fallbackLocalTrack` → `streamUrl` → `bundled asset`) and the ViewModel selects tracks via `applyPresencePulse()` which picks randomly from a hardcoded pool with no context, no operational memory, and no source abstraction. There is no personal collection integration, no live stream opportunism, no operational memory, and no transparency about why a track was selected.

**Branch Target.** `prime-stabilization`. All changes are additive behind the `MusicSource` interface. AudioBackbone.kt remains untouched until Phase J.

**Design Principles.**

| Principle | Rationale |
|-----------|-----------|
| Source-agnostic playback | AudioBackbone should not know where music comes from |
| Privacy-first local processing | No cloud, no upload, no API calls for music data |
| Operational, not theatrical | Music serves calm operational aesthetics, not fake AI personalities |
| Layered priority | Clear precedence: personal > live > curated > imported |
| Transparency via Resonance Trace | User always knows why a track is playing |
| Rate-limited adaptation | System adapts slowly; no hyperactive switching |
| Configurable, not opinionated | Pools and preferences are configured, not algorithmically forced |

---

## 2. CORE ARCHITECTURE

### 2.1 Design Rationale

The current `AudioBackbone` couples playback logic to `Station` objects and resolves URIs via a simple `when` expression. This works for the MVP but cannot support:

- Multiple local folders with indexed metadata
- Opportunistic stream selection across a registry of live sources
- Operational context-aware track selection (e.g., "sync operations prefer ambient")
- Cross-layer fallback (stream dies → seamlessly fall back to local collection)
- Transparency about why a track was chosen

The solution is a two-layer abstraction:

1. **`MusicSource` interface** — every source of music implements this. It exposes capabilities, not implementation.
2. **`PlaybackOrchestrator`** — holds all registered sources, evaluates `PlaybackContext`, and returns the best `PlaybackCandidate`.

`AudioBackbone` receives a `PlaybackCandidate` and plays it. It never sees a `Station`, a `MusicSource`, or a source layer. This is the clean separation: **sources produce candidates; the backbone plays candidates; the orchestrator matches context to candidates.**

### 2.2 MusicSource Interface

```kotlin
/**
 * The playback engine's ONLY interface to music sources.
 *
 * Every source of music in vAIB — local files, live streams, curated pools,
 * imported history — implements this interface. The [PlaybackOrchestrator]
 * delegates to registered sources and selects the best candidate based on
 * context and layer priority.
 *
 * AudioBackbone should eventually consume [PlaybackCandidate] objects,
 * not raw [Station] objects. See Phase J (Playback Integration).
 *
 * @see PlaybackOrchestrator
 * @see PlaybackCandidate
 * @see PlaybackContext
 */
interface MusicSource {

    /** Unique identifier for this source instance. Example: "local-collection-main" */
    val sourceId: String

    /** Which source layer this source belongs to. Determines fallback priority. */
    val sourceLayer: SourceLayer

    /** What kind of source this is. Determines URI construction and metadata handling. */
    val sourceType: SourceType

    /**
     * Can this source provide music for the given context?
     *
     * Returns true if the source has at least one track/stream/pool that matches
     * the context's constraints (station, agent, time of day, operational state).
     * This is a fast check; it does not construct candidates.
     *
     * @param context The current playback context
     * @return true if this source can resolve a candidate for the context
     */
    fun canProvideFor(context: PlaybackContext): Boolean

    /**
     * Get the single best candidate for this context.
     *
     * Returns the highest-relevance track/stream from this source, or null if
     * no match exists. The orchestrator compares candidates across sources.
     *
     * @param context The current playback context
     * @return The best [PlaybackCandidate] from this source, or null
     */
    suspend fun resolveCandidate(context: PlaybackContext): PlaybackCandidate?

    /**
     * Get all available candidates from this source (for browsing, not playback).
     *
     * Returns a list of candidates suitable for display in a browse UI.
     * Not sorted by relevance — the caller handles sorting/filtering.
     *
     * @param context The current playback context
     * @return All [PlaybackCandidate] objects this source can provide
     */
    suspend fun browse(context: PlaybackContext): List<PlaybackCandidate>
}
```

### 2.3 PlaybackOrchestrator

```kotlin
/**
 * Orchestrates across all registered [MusicSource] instances.
 *
 * The orchestrator is the single point where context meets sources.
 * It evaluates all registered sources against the current [PlaybackContext],
 * collects candidates, scores them, and returns the best match.
 *
 * Source switching is guarded by [canSwitchSource] to prevent hyperactive
 * hopping between layers. Rate limits and grace periods are enforced here.
 *
 * Thread-safe. All public methods are suspend functions.
 *
 * @see MusicSource
 * @see PlaybackContext
 * @see PlaybackCandidate
 */
class PlaybackOrchestrator {

    private val sources: MutableList<MusicSource> = mutableListOf()

    /** Lock for thread-safe source registration/unregistration */
    private val sourceLock = Any()

    /** Timestamp of last source layer switch (for rate limiting) */
    private var lastSwitchAtMs: Long = 0L

    /** Source layer currently playing (for switch guard) */
    private var currentLayer: SourceLayer? = null

    /** Minimum time between source layer switches (15 minutes) */
    private val switchCooldownMs: Long = 15 * 60 * 1000L

    /** Minimum listen time before a switch is allowed (30 seconds) */
    private val gracePeriodMs: Long = 30 * 1000L

    /**
     * Register a music source with the orchestrator.
     *
     * Sources are evaluated in registration order within the same layer.
     * Layer priority ([SourceLayer.priority]) takes precedence over registration order.
     *
     * @param source The [MusicSource] to register
     */
    fun registerSource(source: MusicSource) {
        synchronized(sourceLock) {
            sources.removeAll { it.sourceId == source.sourceId }
            sources.add(source)
            sources.sortBy { it.sourceLayer.priority }
        }
    }

    /**
     * Unregister a music source by its sourceId.
     *
     * @param sourceId The unique identifier of the source to remove
     */
    fun unregisterSource(sourceId: String) {
        synchronized(sourceLock) {
            sources.removeAll { it.sourceId == sourceId }
        }
    }

    /**
     * Main entry point: given context, return the best candidate.
     *
     * Evaluates all registered sources that [canProvideFor] the context,
     * collects their best candidates, scores them, and returns the highest-scoring
     * candidate. Returns null if no source can provide.
     *
     * Respects source layer priority: L1 (Personal) > L2 (Live Stream) >
     * L3 (Agent Curated) > L4 (Imported). Within a layer, the highest-relevance
     * candidate wins.
     *
     * @param context The current playback context
     * @return The best [PlaybackCandidate], or null if none available
     */
    suspend fun selectCandidate(context: PlaybackContext): PlaybackCandidate? {
        val candidates = selectCandidates(context)
        return candidates.firstOrNull()
    }

    /**
     * Get candidates from all applicable sources, sorted by relevance.
     *
     * Returns candidates from ALL sources that can provide for the context,
     * sorted by (layer priority DESC, relevanceScore DESC). This is useful
     * for browsing UIs that want to show options across all layers.
     *
     * @param context The current playback context
     * @return All applicable [PlaybackCandidate] objects, sorted
     */
    suspend fun selectCandidates(context: PlaybackContext): List<PlaybackCandidate> {
        val applicableSources = synchronized(sourceLock) {
            sources.filter { it.canProvideFor(context) }
        }

        val candidates = applicableSources.mapNotNull { source ->
            try {
                source.resolveCandidate(context)?.let { candidate ->
                    // Annotate with source metadata for transparency
                    candidate.copy(
                        origin = candidate.origin.copy(
                            sourceId = source.sourceId,
                            sourceLayer = source.sourceLayer,
                            sourceType = source.sourceType
                        )
                    )
                }
            } catch (e: Exception) {
                // Log but don't crash — a failing source shouldn't break playback
                null
            }
        }

        return candidates.sortedWith(
            compareByDescending<PlaybackCandidate> { it.sourceLayer.priority }
                .thenByDescending { it.relevanceScore }
        )
    }

    /**
     * Source switching guard: prevents hyperactive hopping between source layers.
     *
     * Returns true if switching from [from] layer to [to] layer is allowed.
     * Enforces cooldown periods and grace periods. Always allows switching
     * to a higher-priority layer (e.g., L2 → L1) regardless of cooldown.
     *
     * @param from The current source layer
     * @param to The proposed source layer
     * @return true if the switch is permitted
     */
    fun canSwitchSource(from: SourceLayer, to: SourceLayer): Boolean {
        // Always allow switching UP in priority (e.g., stream → local file)
        if (to.priority < from.priority) return true

        val now = System.currentTimeMillis()
        val timeSinceLastSwitch = now - lastSwitchAtMs

        // Enforce cooldown between same-priority or lower-priority switches
        if (timeSinceLastSwitch < switchCooldownMs) return false

        // Enforce grace period (minimum listen time)
        if (timeSinceLastSwitch < gracePeriodMs) return false

        return true
    }

    /**
     * Record that a source layer switch occurred.
     * Call this after a successful layer transition.
     *
     * @param layer The new source layer
     */
    fun recordSwitch(layer: SourceLayer) {
        lastSwitchAtMs = System.currentTimeMillis()
        currentLayer = layer
    }

    /** Get all currently registered source IDs (for diagnostics). */
    fun registeredSourceIds(): List<String> {
        return synchronized(sourceLock) {
            sources.map { it.sourceId }
        }
    }
}
```

### 2.4 SourceLayer

```kotlin
/**
 * Source layer priority enumeration.
 *
 * Determines fallback precedence across music sources. Lower [priority] values
 * indicate higher precedence. The orchestrator always prefers candidates from
 * higher-priority layers unless explicitly configured otherwise.
 *
 * | Layer | Priority | Description |
 * |-------|----------|-------------|
 * | L1_PERSONAL | 1 | User-owned local collection — highest priority |
 * | L2_LIVE_STREAM | 2 | Internet radio / live broadcasts |
 * | L3_AGENT_CURATED | 3 | Operational context pools |
 * | L4_IMPORTED | 4 | One-time history imports — lowest priority |
 */
enum class SourceLayer(val priority: Int, val description: String) {
    /** User-owned local collection — FLAC, MP3, WAV, ambient loops, archived sets.
     *  Highest priority because user explicitly put these files on their device.
     *  Never interrupted by lower layers unless user explicitly switches. */
    L1_PERSONAL(1, "User-owned local collection — highest priority"),

    /** Internet radio / live broadcasts — SomaFM, self-hosted streams, ambient stations.
     *  Opportunistic: tuned when context matches and no L1 candidate is available.
     *  Rate-limited: max 1 switch per 15 minutes, 30s grace period. */
    L2_LIVE_STREAM(2, "Internet radio / live broadcasts"),

    /** Operational context pools — "night shift", "sync recovery", "deep focus".
     *  Agent-curated but not algorithmically generated. Pools are configured
     *  with genre weights, BPM ranges, and task associations. */
    L3_AGENT_CURATED(3, "Operational context pools"),

    /** One-time history imports — Spotify, YouTube Music, Last.fm.
     *  Lowest priority. Used primarily for taste profile seeding, not direct playback.
     *  Tracks here are informational; actual playback comes from L1-L3. */
    L4_IMPORTED(4, "One-time history imports — lowest priority")
}
```

### 2.5 SourceType

```kotlin
/**
 * Source type enumeration.
 *
 * Describes the physical origin and access mechanism of a music source.
 * Used by the orchestrator and AudioBackbone to determine how to construct
 * playable URIs and handle metadata.
 *
 * Note: [PERSONAL_TRACK] and [IMPORTED_HISTORY] are new additions planned
 * in this architecture. [LOCAL_FILE] and [BUNDLED_ASSET] are existing types
 * currently used by AudioBackbone.kt.
 */
enum class SourceType {
    /** Local file system path — /sdcard/Music/vaib/ or user-selected folder.
     *  URI format: `file:///path/to/track.mp3` */
    LOCAL_FILE,

    /** Bundled Android asset — shipped inside the APK.
     *  URI format: `asset:///audio/station_id.mp3` */
    BUNDLED_ASSET,

    /** Indexed personal collection track — stored in Room DB, referenced by file path.
     *  Differs from [LOCAL_FILE] in that it has full metadata index and
     *  operational associations. URI format: `file:///path/to/track.mp3` */
    PERSONAL_TRACK,

    /** HTTP/HTTPS live stream URL.
     *  URI format: `http://stream.example.com:8000/stream.mp3` */
    LIVE_STREAM,

    /** Internet radio station — broader than [LIVE_STREAM], includes station metadata,
     *  reliability scores, and genre tags. URI format: stream URL. */
    INTERNET_RADIO,

    /** Agent-curated operational pool — tracks selected based on task context.
     *  URIs may reference L1 or L3 tracks (indirection through pool). */
    AGENT_CURATED,

    /** Imported listening history — tracks from external platforms (Spotify, YouTube, Last.fm).
     *  Not directly playable; used for taste profile seeding. */
    IMPORTED_HISTORY
}
```

---

## 3. SOURCE LAYERS

### 3.1 Layer 1 — Personal Collection (Highest Priority)

**Purpose.** User-owned music files on the device. These are files the user has explicitly placed on their device — FLAC rips, MP3 collections, ambient loop packs, archived DJ sets, niche genre collections. This layer has the highest priority because the user has already expressed intent by owning the files.

**Concrete Examples.**
- `/sdcard/Music/vaib/` — default vAIB music folder
- User-selected SAF folder — `content://com.android.externalstorage.documents/tree/...`
- Ambient loop collections — 30-60 min seamless ambient recordings
- Archived live sets — downloaded SoundCloud/Bandcamp sets
- Personal rips — CD rips, Bandcamp purchases, personal recordings

**Integration with PlaybackOrchestrator.**
- `PersonalCollectionSource` implements `MusicSource`, sourceLayer = `L1_PERSONAL`
- Reads from Room DB (`LocalCollectionDao`) for fast queries
- `canProvideFor()` checks if any indexed track matches the context's genre/BPM/energy
- `resolveCandidate()` queries the DAO with context constraints, returns best match
- `browse()` returns all indexed tracks (paginated) for browsing UI

**Privacy Considerations.**
- All processing is local. No cloud upload, no API calls.
- Metadata extracted locally via `MediaMetadataRetriever`.
- File paths stored in Room DB; never transmitted.
- User can delete the entire index at any time (clear app data → index rebuilds on next scan).
- No analytics about what music the user owns.

**Model:**

```kotlin
/**
 * Represents a single track in the user's personal local collection.
 *
 * Stored in Room database. Extracted from audio files via
 * [MediaMetadataRetriever] during indexing. Supports deduplication
 * via content hash.
 *
 * @property id Unique track ID (UUID generated on index)
 * @property filePath Absolute path to the audio file
 * @property contentHash SHA-256 hash of file content (for dedup)
 * @property title Track title (from ID3 tag or filename)
 * @property artist Track artist (from ID3 tag)
 * @property album Album name (from ID3 tag)
 * @property durationMs Track duration in milliseconds
 * @property bpm Beats per minute (from ID3 tag if present, null otherwise)
 * @property genre Genre tag (from ID3 tag, normalized)
 * @property energy Energy level 0-100 (inferred from BPM + genre if not tagged)
 * @property artworkUri URI to embedded artwork or folder.jpg
 * @property addedAt Timestamp when track was first indexed
 * @property lastPlayedAt Timestamp of last playback (null if never played)
 * @property playCount Number of times this track has been played
 * @property fileSizeBytes Size of the audio file on disk
 * @property format File format: "mp3", "flac", "wav", "ogg", "m4a"
 * @property bitrateKbps Bitrate in kbps (if available from metadata)
 */
data class PersonalTrack(
    val id: String,
    val filePath: String,
    val contentHash: String,
    val title: String,
    val artist: String,
    val album: String,
    val durationMs: Long,
    val bpm: Int?,
    val genre: String?,
    val energy: Int?,
    val artworkUri: String?,
    val addedAt: Long,
    val lastPlayedAt: Long?,
    val playCount: Int,
    val fileSizeBytes: Long,
    val format: String,
    val bitrateKbps: Int?
)
```

**Indexer and Scanner:**

```kotlin
/**
 * Scans configured music folders and indexes tracks into Room DB.
 *
 * Uses [MediaMetadataRetriever] to extract metadata from audio files.
 * Supports MP3, FLAC, WAV, OGG, M4A formats. Runs as a WorkManager
 * periodic task (every 6 hours) or on-demand via user request.
 *
 * @see CollectionScanner
 * @see LocalCollectionDao
 */
class CollectionIndexer(
    private val context: Context,
    private val dao: LocalCollectionDao
) {

    /**
     * Scan a folder and index all supported audio files.
     *
     * @param folderUri The SAF URI of the folder to scan
     * @return Number of new tracks indexed
     */
    suspend fun scanFolder(folderUri: Uri): Int

    /**
     * Extract metadata from a single audio file.
     *
     * @param file The audio file to analyze
     * @return [PersonalTrack] with extracted metadata, or null if unsupported
     */
    suspend fun extractMetadata(file: File): PersonalTrack?

    /**
     * Check if a file has changed since last index (by hash comparison).
     *
     * @param filePath Path to the audio file
     * @return true if the file needs re-indexing
     */
    suspend fun needsReindex(filePath: String): Boolean
}
```

```kotlin
/**
 * Room DAO for the personal collection.
 *
 * Provides fast queries for the [PlaybackOrchestrator] to find tracks
 * matching context constraints (genre, BPM range, energy).
 */
@Dao
interface LocalCollectionDao {

    @Query("SELECT * FROM personal_tracks ORDER BY title")
    suspend fun getAll(): List<PersonalTrack>

    @Query("SELECT * FROM personal_tracks WHERE genre = :genre ORDER BY playCount DESC")
    suspend fun getByGenre(genre: String): List<PersonalTrack>

    @Query("SELECT * FROM personal_tracks WHERE bpm BETWEEN :minBpm AND :maxBpm")
    suspend fun getByBpmRange(minBpm: Int, maxBpm: Int): List<PersonalTrack>

    @Query("SELECT * FROM personal_tracks WHERE energy BETWEEN :minEnergy AND :maxEnergy")
    suspend fun getByEnergyRange(minEnergy: Int, maxEnergy: Int): List<PersonalTrack>

    @Query("SELECT * FROM personal_tracks WHERE title LIKE :query OR artist LIKE :query")
    suspend fun search(query: String): List<PersonalTrack>

    @Query("SELECT * FROM personal_tracks WHERE contentHash = :hash LIMIT 1")
    suspend fun findByHash(hash: String): PersonalTrack?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(track: PersonalTrack)

    @Delete
    suspend fun delete(track: PersonalTrack)

    @Query("SELECT COUNT(*) FROM personal_tracks")
    suspend fun count(): Int

    @Query("DELETE FROM personal_tracks WHERE filePath = :filePath")
    suspend fun deleteByPath(filePath: String)
}
```

### 3.2 Layer 2 — Live Streams / Internet Radio

**Purpose.** Opportunistic live stream and internet radio integration. When no personal collection track matches the context (or the user has no personal collection), the system can tune into live ambient/synthwave/jazz streams for atmosphere. This is atmosphere, not content delivery — the goal is calm operational background, not endless discovery.

**Concrete Examples.**
- SomaFM: Drone Zone, Groove Salad, Secret Agent, Space Station Soma, Lush
- Public ambient streams: DI.fm ambient channels, AmbientRadio.org
- Self-hosted streams: Tailnet-accessible Icecast servers, personal radio
- Community streams: university radio, local community stations

**Integration with PlaybackOrchestrator.**
- `LiveStreamSource` implements `MusicSource`, sourceLayer = `L2_LIVE_STREAM`
- `StreamRegistry` holds all known streams (pre-loaded + user-added)
- `StreamTuner` filters and scores streams based on context
- `canProvideFor()` checks if any stream matches the context's genre preference
- `resolveCandidate()` calls `StreamTuner.opportunisticTune(context)`
- `PlaybackOrchestrator.canSwitchSource()` prevents hyperactive stream switching

**Privacy Considerations.**
- Stream URLs are public; no authentication required for pre-loaded streams
- No listening data sent to stream providers (just HTTP GET for audio)
- `StreamReliabilityTracker` stores metrics locally; never transmitted
- User-added streams are stored locally only
- No analytics about what streams are listened to

**Model:**

```kotlin
/**
 * Represents a single internet radio stream or live broadcast source.
 *
 * Stored locally in Room DB. Pre-loaded streams ship with the app;
 * user-added streams are persisted across sessions.
 *
 * @property id Unique stream ID
 * @property name Human-readable stream name (e.g., "SomaFM Drone Zone")
 * @property streamUrl HTTP/HTTPS URL for the audio stream
 * @property genreTags List of genre tags for matching (e.g., ["ambient", "electronic", "drone"])
 * @property format Audio format: "mp3", "aac", "ogg", "opus"
 * @property bitrateKbps Nominal bitrate in kbps
 * @property reliabilityScore 0-1, computed by [StreamReliabilityTracker]
 * @property isPreloaded true if this stream ships with the app
 * @property isUserAdded true if the user manually added this stream
 * @property timeOfDayPreferences Optional time-of-day preference for this stream
 * @property addedAt Timestamp when this stream was added to the registry
 * @property lastPlayedAt Timestamp of last playback (null if never played)
 * @property playCount Number of times this stream has been played
 * @property description Human-readable description of the stream
 * @property websiteUrl URL to the stream's website (for attribution)
 */
data class StreamSource(
    val id: String,
    val name: String,
    val streamUrl: String,
    val genreTags: List<String>,
    val format: String,
    val bitrateKbps: Int,
    val reliabilityScore: Float,
    val isPreloaded: Boolean,
    val isUserAdded: Boolean,
    val timeOfDayPreferences: List<TimeOfDay>,
    val addedAt: Long,
    val lastPlayedAt: Long?,
    val playCount: Int,
    val description: String,
    val websiteUrl: String?
)
```

**Stream Tuner:**

```kotlin
/**
 * Opportunistically selects the best live stream for the current context.
 *
 * Filters streams by genre match, scores by time-of-day preference and
 * reliability, and returns the best match. Respects rate limiting via
 * [PlaybackOrchestrator.canSwitchSource].
 *
 * @see StreamSource
 * @see PlaybackContext
 */
class StreamTuner(
    private val streamRegistry: StreamRegistry,
    private val reliabilityTracker: StreamReliabilityTracker
) {

    /**
     * Select the best stream for the given context.
     *
     * Algorithm:
     * 1. Filter streams by genre match to context
     * 2. Score each stream: genre match (0.4) + time-of-day match (0.3) + reliability (0.3)
     * 3. Return highest scoring stream as a [PlaybackCandidate]
     * 4. If no match, return null (orchestrator will fall back to L3)
     *
     * @param context The current playback context
     * @return [PlaybackCandidate] for the best stream, or null
     */
    suspend fun opportunisticTune(context: PlaybackContext): PlaybackCandidate?
}
```

**Pre-loaded Streams:**

| Station | Genre | URL | Format |
|---------|-------|-----|--------|
| SomaFM Drone Zone | Ambient/Drone | `http://ice1.somafm.com/dronezone-128-mp3` | MP3 |
| SomaFM Groove Salad | Chill/Downtempo | `http://ice1.somafm.com/groovesalad-128-mp3` | MP3 |
| SomaFM Secret Agent | Lounge/Jazz | `http://ice1.somafm.com/secretagent-128-mp3` | MP3 |
| SomaFM Space Station Soma | Space/Ambient | `http://ice1.somafm.com/spacestation-128-mp3` | MP3 |
| SomaFM Lush | Female Vocal Chill | `http://ice1.somafm.com/lush-128-mp3` | MP3 |

### 3.3 Layer 3 — Agent-Curated Pools

**Purpose.** Operational context pools that map music to tasks and states. These are not algorithmically generated "playlists" — they are configured mappings between operational contexts ("sync recovery", "deep focus", "night shift") and music characteristics (genre weights, BPM ranges, energy levels). The system picks from these pools when no personal collection or live stream is available.

**Concrete Examples.**
- "sync recovery" pool: ambient electronic, low BPM (60-90), low energy (10-30)
- "deep focus" pool: instrumental, no vocals, mid BPM (80-120), mid energy (40-60)
- "night shift" pool: dark ambient, synthwave, low BPM (70-100), low energy (20-40)
- "maintenance" pool: minimal techno, steady BPM (120-130), mid energy (50-70)
- "system idle" pool: nature sounds, field recordings, no BPM, very low energy (5-15)

**Integration with PlaybackOrchestrator.**
- `AgentCuratedSource` implements `MusicSource`, sourceLayer = `L3_AGENT_CURATED`
- `CuratedPool` defines each pool's parameters
- `canProvideFor()` checks if any pool matches the current operational state
- `resolveCandidate()` selects from the matching pool based on context
- Pools reference tracks from L1 (personal collection) when available, or fall back to L2 (streams)
- If a pool's tracks are all from L1 and L1 is empty, the pool produces no candidate

**Privacy Considerations.**
- Pools are configured, not learned from behavior
- No external data sources for pool construction
- Pool definitions are stored locally
- Operational state association is local-only

**Model:**

```kotlin
/**
 * Defines an operational context pool — a configured mapping between
 * a task/state and preferred music characteristics.
 *
 * Pools are static configuration, not algorithmically generated.
 * They are defined in code or local config files, not learned from behavior.
 *
 * @property id Unique pool ID
 * @property name Human-readable pool name (e.g., "Deep Focus")
 * @property description What this pool is for
 * @property genreWeights Map of genre → weight (0-1). Higher weight = more likely to select.
 * @property bpmRange Preferred BPM range (inclusive)
 * @property energyRange Preferred energy range 0-100 (inclusive)
 * @property timeOfDayPreferences Which times of day this pool is active for
 * @property taskTypeAssociations Which task types trigger this pool (e.g., ["sync", "render"])
 * @property sourceLayerPreference Prefer tracks from this layer if available (default L1)
 * @property isEnabled Whether this pool is currently active
 */
data class CuratedPool(
    val id: String,
    val name: String,
    val description: String,
    val genreWeights: Map<String, Float>,
    val bpmRange: IntRange,
    val energyRange: IntRange,
    val timeOfDayPreferences: List<TimeOfDay>,
    val taskTypeAssociations: List<String>,
    val sourceLayerPreference: SourceLayer = SourceLayer.L1_PERSONAL,
    val isEnabled: Boolean = true
)
```

**Default Pools:**

```kotlin
object DefaultCuratedPools {

    val SYNC_RECOVERY = CuratedPool(
        id = "pool-sync-recovery",
        name = "Sync Recovery",
        description = "Calm ambient for data synchronization and recovery operations",
        genreWeights = mapOf("ambient" to 0.9f, "electronic" to 0.5f, "drone" to 0.7f),
        bpmRange = 60..90,
        energyRange = 10..30,
        timeOfDayPreferences = TimeOfDay.values().toList(),
        taskTypeAssociations = listOf("sync", "backup", "restore")
    )

    val DEEP_FOCUS = CuratedPool(
        id = "pool-deep-focus",
        name = "Deep Focus",
        description = "Instrumental focus music for complex cognitive tasks",
        genreWeights = mapOf("instrumental" to 0.9f, "ambient" to 0.6f, "classical" to 0.4f),
        bpmRange = 80..120,
        energyRange = 40..60,
        timeOfDayPreferences = listOf(TimeOfDay.MORNING, TimeOfDay.AFTERNOON),
        taskTypeAssociations = listOf("render", "compile", "analysis")
    )

    val NIGHT_SHIFT = CuratedPool(
        id = "pool-night-shift",
        name = "Night Shift",
        description = "Dark ambient and synthwave for overnight operations",
        genreWeights = mapOf("dark ambient" to 0.8f, "synthwave" to 0.6f, "ambient" to 0.5f),
        bpmRange = 70..100,
        energyRange = 20..40,
        timeOfDayPreferences = listOf(TimeOfDay.NIGHT, TimeOfDay.EVENING),
        taskTypeAssociations = listOf("monitor", "idle", "maintenance")
    )

    val SYSTEM_MAINTENANCE = CuratedPool(
        id = "pool-maintenance",
        name = "Maintenance",
        description = "Steady minimal techno for system maintenance tasks",
        genreWeights = mapOf("minimal techno" to 0.8f, "techno" to 0.5f, "electronic" to 0.3f),
        bpmRange = 120..130,
        energyRange = 50..70,
        timeOfDayPreferences = TimeOfDay.values().toList(),
        taskTypeAssociations = listOf("maintenance", "update", "cleanup")
    )

    val SYSTEM_IDLE = CuratedPool(
        id = "pool-idle",
        name = "System Idle",
        description = "Nature sounds and field recordings when system is at rest",
        genreWeights = mapOf("nature" to 0.9f, "field recording" to 0.7f, "ambient" to 0.4f),
        bpmRange = 0..60,
        energyRange = 5..15,
        timeOfDayPreferences = TimeOfDay.values().toList(),
        taskTypeAssociations = listOf("idle", "standby")
    )

    val ALL = listOf(SYNC_RECOVERY, DEEP_FOCUS, NIGHT_SHIFT, SYSTEM_MAINTENANCE, SYSTEM_IDLE)
}
```

### 3.4 Layer 4 — Listening History Imports

**Purpose.** One-time imports of listening history from external platforms (Spotify, YouTube Music, Last.fm). These imports are used to seed agent taste profiles and build initial operational associations — they are NOT used for direct playback. This layer has the lowest priority because imported tracks may not exist on the device.

**Concrete Examples.**
- Spotify Extended Streaming History ZIP (from Spotify Privacy Dashboard)
- YouTube Music watch-history.json (from Google Takeout)
- Last.fm scrobble export CSV
- Custom JSON format for manual imports

**Integration with PlaybackOrchestrator.**
- `ImportedHistorySource` implements `MusicSource`, sourceLayer = `L4_IMPORTED`
- `canProvideFor()` almost always returns false (imports are not directly playable)
- When it does return a candidate, the candidate's URI references a local file that matches the imported track (by title/artist match against L1 collection)
- Primary purpose: update `AgentTasteProfile` via [HistoryImporter] implementations
- `ImportRegistry` tracks what has been imported, prevents duplicates

**Privacy Considerations.**
- All processing is local. No API calls, no OAuth, no data leaves the device.
- Import files are parsed and then can be deleted by the user.
- Imported data is stored in Room DB; user can clear it at any time.
- Opt-in per platform — user must explicitly select the import file.
- No analytics about what platforms were imported from.

**Model:**

```kotlin
/**
 * Represents a single track from an external platform import.
 *
 * Stored in Room DB. Used to seed [AgentTasteProfile] and build
 * initial genre/taste preferences. Not directly playable — the system
 * attempts to match imported tracks to [PersonalTrack] entries in L1.
 *
 * @property id Unique imported track ID
 * @property originalId ID from the source platform (e.g., Spotify track ID)
 * @property title Track title
 * @property artist Track artist
 * @property album Album name (may be null if not provided by platform)
 * @property playCount How many times this track was played on the source platform
 * @property lastPlayedAt Timestamp of last play on the source platform
 * @property sourcePlatform Which platform this came from: "spotify", "youtube", "lastfm", "custom"
 * @property importBatchId Identifier for the import batch this track belongs to
 * @property importedAt Timestamp when this track was imported
 * @property normalizedGenre Normalized genre string (after genre mapping)
 * @property matchedLocalTrackId ID of matching [PersonalTrack] in L1, or null
 * @property sourcePlatformData Raw JSON string of additional platform-specific data
 */
data class ImportedTrack(
    val id: String,
    val originalId: String,
    val title: String,
    val artist: String,
    val album: String?,
    val playCount: Int,
    val lastPlayedAt: Long,
    val sourcePlatform: String,
    val importBatchId: String,
    val importedAt: Long,
    val normalizedGenre: String?,
    val matchedLocalTrackId: String?,
    val sourcePlatformData: String?
)
```

---

## 4. ABSTRACTION MODELS

### 4.1 PlaybackCandidate

```kotlin
/**
 * A playable music candidate produced by a [MusicSource] and consumed by
 * [AudioBackbone] (via [PlaybackOrchestrator]).
 *
 * This is the universal data object that crosses the source-playback boundary.
 * It contains everything AudioBackbone needs to play the track: URI, metadata,
 and provenance information for the Resonance Trace feature.
 *
 * @property trackId Unique track identifier (stable across sources)
 * @property title Track title for display
 * @property artist Track artist for display
 * @property uri Playable URI for ExoPlayer (file://, http://, asset://)
 * @property sourceType What kind of source produced this candidate
 * @property sourceLayer Which source layer this candidate belongs to
 * @property bpm Beats per minute (null if unknown or not applicable, e.g., streams)
 * @property genre Primary genre tag (null if unknown)
 * @property energy Energy level 0-100 (null if unknown)
 * @property durationMs Track duration in milliseconds (null for streams)
 * @property artworkUri URI to artwork image (null if no artwork)
 * @property origin Provenance: where this candidate came from
 * @property resonance Resonance trace: why this candidate was selected (null if unavailable)
 * @property operationalAssociations Operational associations for this track
 * @property relevanceScore 0-1, computed relevance to the current context
 */
data class PlaybackCandidate(
    val trackId: String,
    val title: String,
    val artist: String,
    val uri: String,
    val sourceType: SourceType,
    val sourceLayer: SourceLayer,
    val bpm: Int?,
    val genre: String?,
    val energy: Int?,
    val durationMs: Long?,
    val artworkUri: String?,
    val origin: TrackOrigin,
    val resonance: ResonanceMarker?,
    val operationalAssociations: List<OperationalAssociation>,
    val relevanceScore: Float
)
```

### 4.2 TrackOrigin

```kotlin
/**
 * Provenance information for a [PlaybackCandidate].
 *
 * Records exactly where a candidate came from: which source, which layer,
 * when it was discovered, and the original file/stream/asset path. This
 * powers the Resonance Trace feature ("Where did this track come from?").
 *
 * @property sourceId Which [MusicSource] provided this candidate
 * @property sourceLayer Which [SourceLayer] this candidate belongs to
 * @property sourceType Which [SourceType] produced this candidate
 * @property discoveredAt Timestamp when this candidate was first discovered/indexed
 * @property filePath For local files: absolute file path (null otherwise)
 * @property streamUrl For streams: the stream URL (null otherwise)
 * @property assetName For bundled assets: the asset path (null otherwise)
 */
data class TrackOrigin(
    val sourceId: String,
    val sourceLayer: SourceLayer,
    val sourceType: SourceType,
    val discoveredAt: Long,
    val filePath: String?,
    val streamUrl: String?,
    val assetName: String?
)
```

### 4.3 PlaybackContext

```kotlin
/**
 * The complete context used by [PlaybackOrchestrator] to select music.
 *
 * Captures everything the orchestrator needs to make an informed decision:
 * current station, active agent, operational state, time of day, system load,
 * recent playback history, agent taste preferences, and user layer preferences.
 *
 * This object is constructed by the ViewModel and passed to the orchestrator
 * on every track selection request. It is immutable — changes require a new instance.
 *
 * @property currentStationId Currently playing station ID (null if none)
 * @property currentAgentId Currently active agent ID (null if none)
 * @property operationalState Current operational state from Prime Nexus (null if unknown)
 * @property timeOfDay Current time of day category
 * @property systemLoad Current system load 0-1 (from Prime Nexus, null if unknown)
 * @property recentTrackIds Last N track IDs played (for deduplication, most recent first)
 * @property agentTaste The active agent's taste profile (null if not yet built)
 * @property preferredLayers User-preferred source layers (empty = no preference)
 * @property currentSourceLayer Which source layer is currently playing (null if stopped)
 */
data class PlaybackContext(
    val currentStationId: String?,
    val currentAgentId: String?,
    val operationalState: OperationalState?,
    val timeOfDay: TimeOfDay,
    val systemLoad: Float?,
    val recentTrackIds: List<String>,
    val agentTaste: AgentTasteProfile?,
    val preferredLayers: List<SourceLayer>,
    val currentSourceLayer: SourceLayer?
)
```

### 4.4 TimeOfDay

```kotlin
/**
 * Time-of-day classification for context-aware music selection.
 *
 * Used by [CuratedPool], [StreamSource], and [AgentTasteProfile] to
 * express time-based preferences. Categories are coarse by design —
 * no need for minute-level granularity.
 */
enum class TimeOfDay {
    /** 06:00 - 12:00. Prefer energizing, clarifying music. */
    MORNING,

    /** 12:00 - 18:00. Prefer focused, steady music. */
    AFTERNOON,

    /** 18:00 - 22:00. Prefer relaxed, unwinding music. */
    EVENING,

    /** 22:00 - 06:00. Prefer calm, minimal, ambient music. */
    NIGHT
}
```

### 4.5 OperationalState

```kotlin
/**
 * Represents the current operational state of the system.
 *
 * Provided by Prime Nexus via [NexusSignalAdapter]. Used by the
 * orchestrator to match tracks to the current task context.
 *
 * @property taskType The type of task currently running (e.g., "sync", "render", "idle")
 * @property taskStatus Current status: "running", "completed", "failed", "idle"
 * @property endpointStatus Map of endpoint ID → status ("online", "offline", "degraded")
 * @property activeEndpointCount Number of currently active endpoints
 */
data class OperationalState(
    val taskType: String,
    val taskStatus: String,
    val endpointStatus: Map<String, String>,
    val activeEndpointCount: Int
)
```

### 4.6 ResonanceMarker

```kotlin
/**
 * "Why this song?" — the Resonance Trace.
 *
 * Provides a human-readable explanation of why a particular track was selected.
 * Powers the bottom sheet UI described in `VAIB_MUSIC_COCKPIT_UX_PLAN.md`.
 *
 * Privacy-controlled via [PrivacyLevel] — default is SUMMARIZED, which shows
 * general reasons without creepy specificity. User can toggle to DETAILED or RAW
 * if they want more information.
 *
 * @property trackId The track this resonance marker describes
 * @property summary 3-5 line human-readable explanation
 * @property source Which system component generated this marker:
 *   "agent_taste" — selected based on agent taste profile
 *   "operational_context" — selected based on task context
 *   "user_request" — explicitly requested by user
 *   "random" — randomly selected from available pool
 *   "stream_tuner" — selected by live stream opportunism
 * @property confidence 0-1, how confident the system is in this explanation
 * @property privacyLevel How much detail to show (default: SUMMARIZED)
 *
 * @see PrivacyLevel
 */
data class ResonanceMarker(
    val trackId: String,
    val summary: String,
    val source: String,
    val confidence: Float,
    val privacyLevel: PrivacyLevel
)

/**
 * Privacy level for Resonance Trace display.
 *
 * | Level | Description |
 * |-------|-------------|
 * | SUMMARIZED | General reason, no raw logs, no specificity (default) |
 * | DETAILED | More context, includes specific associations |
 * | RAW | Full technical detail, all associations visible |
 */
enum class PrivacyLevel {
    /** Default: shows general reason only. "Selected during sync. Genre: ambient." */
    SUMMARIZED,

    /** Shows specific associations. "Selected during sync (weight 0.45). Genre match: 87%." */
    DETAILED,

    /** Shows raw data. "OperationalAssociation(trackId=xyz, taskType=sync, weight=0.45, reinforced 3 times)." */
    RAW
}
```

### 4.7 OperationalAssociation

```kotlin
/**
 * Links a track to an operational context — forming "music as operational memory."
 *
 * Associations form when a task completes while a track is playing.
 * They are reinforced by repetition and decay over time. The weight
 * determines how strongly the association influences future track selection.
 *
 * @property trackId The track associated with the operational context
 * @property taskType The type of task (e.g., "sync", "render", "backup", "idle")
 * @property timeOfDay Time of day when the association was formed
 * @property systemLoad System load (0-1) at the time of association
 * @property weight Association strength 0-1. Reinforced by repetition, decays over time.
 * @property createdAt Timestamp when this association was first formed
 * @property lastReinforcedAt Timestamp of last reinforcement
 *
 * @see AgentTasteProfile
 * @see ResonanceMarker
 */
data class OperationalAssociation(
    val trackId: String,
    val taskType: String,
    val timeOfDay: TimeOfDay,
    val systemLoad: Float,
    val weight: Float,
    val createdAt: Long,
    val lastReinforcedAt: Long
)
```

### 4.8 AgentTasteProfile

```kotlin
/**
 * Represents an agent's music taste, built from operational history
 * and optional import data.
 *
 * Taste profiles are local-only, formed through operational associations
 * and listening history. They are not theatrical "personalities" — they
 * are practical preference maps that help select appropriate music for tasks.
 *
 * @property agentId The agent this taste profile belongs to
 * @property genreWeights Map of genre → preference score (0-1). Higher = preferred.
 * @property bpmRange Preferred BPM range (null if no preference yet)
 * @property energyPreference Preferred energy level 0-100 (null if no preference)
 * @property timeOfDayPreferences Map of time-of-day → list of preferred genres
 * @property operationalMusicCorrelation Map of task type → list of frequently associated track IDs
 * @property associationCount Total number of operational associations formed
 */
data class AgentTasteProfile(
    val agentId: String,
    val genreWeights: Map<String, Float>,
    val bpmRange: IntRange?,
    val energyPreference: Int?,
    val timeOfDayPreferences: Map<TimeOfDay, List<String>>,
    val operationalMusicCorrelation: Map<String, List<String>>,
    val associationCount: Int
)
```

### 4.9 MusicInfluence

```kotlin
/**
 * Music influence descriptor attached to an [AgentPresence] (from Discovery architecture).
 *
 * Cross-references `VAIB_DISCOVERY_ARCHITECTURE.md` — this model is used
 * by the discovery system to communicate music preferences between agents
 * and the music pipeline.
 *
 * @property preferredGenres List of genres this agent prefers
 * @property preferredBpmRange Preferred BPM range
 * @property preferredEnergy Preferred energy level 0-100
 * @property avoidGenres List of genres to avoid
 * @property influenceStrength 0-1, how strongly this influence should affect selection
 */
data class MusicInfluence(
    val preferredGenres: List<String>,
    val preferredBpmRange: IntRange?,
    val preferredEnergy: Int?,
    val avoidGenres: List<String>,
    val influenceStrength: Float
)
```

### 4.10 ListeningSession

```kotlin
/**
 * Records a single listening session for stats and memory.
 *
 * A session starts when playback begins and ends when playback stops
 * or switches to a different track. Tracks what was playing, when, under
 * what operational context — supporting the "music as memory" concept.
 *
 * @property id Unique session ID
 * @property trackId What track was played
 * @property trackTitle Track title (denormalized for queries)
 * @property trackArtist Track artist (denormalized for queries)
 * @property stationId Which station was active (null if none)
 * @property agentId Which agent was active (null if none)
 * @property sourceLayer Which source layer provided the track
 * @property sourceType Which source type provided the track
 * @property startedAt Session start timestamp
 * @property endedAt Session end timestamp (null if still playing)
 * @property durationMs Actual listening duration in milliseconds
 * @property taskType Operational task type during this session
 * @property timeOfDay Time of day classification
 * @property systemLoadAvg Average system load during the session
 */
data class ListeningSession(
    val id: String,
    val trackId: String,
    val trackTitle: String,
    val trackArtist: String,
    val stationId: String?,
    val agentId: String?,
    val sourceLayer: SourceLayer,
    val sourceType: SourceType,
    val startedAt: Long,
    val endedAt: Long?,
    val durationMs: Long,
    val taskType: String,
    val timeOfDay: TimeOfDay,
    val systemLoadAvg: Float
)
```

### 4.11 GenreAffinity

```kotlin
/**
 * Aggregated genre preference data.
 *
 * Computed from listening sessions. Used by [AgentTasteProfile] and
 * for stats queries ("What do I listen to during sync?").
 *
 * @property genre Genre name
 * @property totalPlayCount Total number of plays
 * @property totalDurationMs Total listening time in milliseconds
 * @property timeOfDayBreakdown Play count per time of day
 * @property taskTypeBreakdown Play count per task type
 * @property lastPlayedAt Timestamp of last play
 * @property firstPlayedAt Timestamp of first play
 */
data class GenreAffinity(
    val genre: String,
    val totalPlayCount: Int,
    val totalDurationMs: Long,
    val timeOfDayBreakdown: Map<TimeOfDay, Int>,
    val taskTypeBreakdown: Map<String, Int>,
    val lastPlayedAt: Long,
    val firstPlayedAt: Long
)
```

---

## 5. PERSONAL COLLECTION SYSTEM

### 5.1 Overview

The Personal Collection System is Layer 1 of the music source architecture. It indexes audio files from user-selected folders into a Room database, extracting metadata via Android's `MediaMetadataRetriever`. The indexed collection is then queryable by the `PlaybackOrchestrator` for context-aware track selection.

**Key Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `PersonalTrack` | Model | Data class for indexed tracks |
| `LocalCollectionDao` | Room DAO | Database access for tracks |
| `CollectionIndexer` | Service | Metadata extraction from audio files |
| `CollectionScanner` | WorkManager | Periodic background scanning |
| `CollectionWatcher` | ContentObserver | Real-time change detection |
| `FolderSelectionActivity` | Activity | SAF folder picker UI |
| `PersonalCollectionSource` | MusicSource | Bridges DAO to orchestrator |

### 5.2 PersonalTrack (Detailed)

See Section 3.1 for the data class. Additional notes:

- **ID Generation:** UUID v4, generated at index time. Stable across re-scans (matched by `contentHash`).
- **Content Hash:** SHA-256 of the first 1MB + last 1MB of file content (fast, collision-resistant for audio files).
- **BPM Extraction:** Read from ID3 `TBPM` frame if present. If absent, attempt estimation from audio analysis (Phase B stretch goal). If still absent, null.
- **Genre Normalization:** Map raw ID3 genres to canonical names via a normalization table (e.g., "(24)" → "Soundtrack", "Ambient Electronic" → "ambient electronic").
- **Energy Inference:** If no energy tag present, infer from BPM + genre via a lookup table (e.g., ambient + low BPM = low energy, techno + high BPM = high energy).
- **Artwork Priority:** (1) Embedded artwork from `MediaMetadataRetriever`, (2) `folder.jpg`/`cover.jpg` in the same directory, (3) null.

### 5.3 LocalCollectionDao (Detailed)

```kotlin
/**
 * Room DAO for the personal collection database.
 *
 * All queries are suspend functions for coroutine compatibility.
 * Full-text search is enabled via Room FTS (Phase B).
 *
 * @see PersonalTrack
 */
@Dao
interface LocalCollectionDao {

    /** Get all tracks ordered by title. */
    @Query("SELECT * FROM personal_tracks ORDER BY title COLLATE NOCASE")
    suspend fun getAll(): List<PersonalTrack>

    /** Get tracks by genre, ordered by play count (most played first). */
    @Query("SELECT * FROM personal_tracks WHERE genre = :genre ORDER BY playCount DESC, title COLLATE NOCASE")
    suspend fun getByGenre(genre: String): List<PersonalTrack>

    /** Get tracks within a BPM range. */
    @Query("SELECT * FROM personal_tracks WHERE bpm BETWEEN :minBpm AND :maxBpm ORDER BY bpm")
    suspend fun getByBpmRange(minBpm: Int, maxBpm: Int): List<PersonalTrack>

    /** Get tracks within an energy range. */
    @Query("SELECT * FROM personal_tracks WHERE energy BETWEEN :minEnergy AND :maxEnergy")
    suspend fun getByEnergyRange(minEnergy: Int, maxEnergy: Int): List<PersonalTrack>

    /** Full-text search across title and artist. */
    @Query("SELECT * FROM personal_tracks WHERE title LIKE '%' || :query || '%' OR artist LIKE '%' || :query || '%' ORDER BY title COLLATE NOCASE")
    suspend fun search(query: String): List<PersonalTrack>

    /** Find track by content hash (for deduplication). */
    @Query("SELECT * FROM personal_tracks WHERE contentHash = :hash LIMIT 1")
    suspend fun findByHash(hash: String): PersonalTrack?

    /** Find track by file path. */
    @Query("SELECT * FROM personal_tracks WHERE filePath = :path LIMIT 1")
    suspend fun findByPath(path: String): PersonalTrack?

    /** Insert or replace a track. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(track: PersonalTrack)

    /** Insert multiple tracks in a transaction. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tracks: List<PersonalTrack>)

    /** Delete a track. */
    @Delete
    suspend fun delete(track: PersonalTrack)

    /** Delete track by file path (e.g., when file is removed). */
    @Query("DELETE FROM personal_tracks WHERE filePath = :filePath")
    suspend fun deleteByPath(filePath: String)

    /** Get total track count. */
    @Query("SELECT COUNT(*) FROM personal_tracks")
    suspend fun count(): Int

    /** Get all unique genres in the collection. */
    @Query("SELECT DISTINCT genre FROM personal_tracks WHERE genre IS NOT NULL ORDER BY genre")
    suspend fun getAllGenres(): List<String>

    /** Get recently played tracks. */
    @Query("SELECT * FROM personal_tracks WHERE lastPlayedAt IS NOT NULL ORDER BY lastPlayedAt DESC LIMIT :limit")
    suspend fun getRecentlyPlayed(limit: Int): List<PersonalTrack>

    /** Get most played tracks. */
    @Query("SELECT * FROM personal_tracks WHERE playCount > 0 ORDER BY playCount DESC LIMIT :limit")
    suspend fun getMostPlayed(limit: Int): List<PersonalTrack>

    /** Update play count and last played timestamp. */
    @Query("UPDATE personal_tracks SET playCount = playCount + 1, lastPlayedAt = :timestamp WHERE id = :trackId")
    suspend fun recordPlay(trackId: String, timestamp: Long)
}
```

### 5.4 CollectionIndexer

```kotlin
/**
 * Extracts metadata from audio files and produces [PersonalTrack] objects.
 *
 * Uses [MediaMetadataRetriever] for standard metadata (title, artist, album,
 * duration, genre). Computes content hash for deduplication. Handles artwork
 * extraction from embedded tags or folder images.
 *
 * @param context Application context for MediaMetadataRetriever
 * @param dao Room DAO for persisting indexed tracks
 */
class CollectionIndexer(
    private val context: Context,
    private val dao: LocalCollectionDao
) {

    companion object {
        /** Supported audio file extensions */
        val SUPPORTED_FORMATS = setOf("mp3", "flac", "wav", "ogg", "m4a", "aac")

        /** Number of bytes to hash from start and end of file for dedup */
        private const val HASH_SAMPLE_BYTES = 1024 * 1024 // 1MB
    }

    /**
     * Scan a folder (via SAF URI) and index all supported audio files.
     *
     * Steps:
     * 1. Walk the folder tree recursively
     * 2. For each audio file: check if already indexed (by path or hash)
     * 3. If new or changed: extract metadata, compute hash, insert into DB
     * 4. Remove DB entries for files that no longer exist
     *
     * @param folderUri SAF tree URI for the folder to scan
     * @return [ScanResult] with counts of new, updated, removed, and failed tracks
     */
    suspend fun scanFolder(folderUri: Uri): ScanResult

    /**
     * Extract metadata from a single audio file.
     *
     * @param file The audio file
     * @return [PersonalTrack] with full metadata, or null if unsupported or unreadable
     */
    suspend fun extractMetadata(file: File): PersonalTrack?

    /**
     * Compute a content hash for deduplication.
     *
     * Uses SHA-256 of first 1MB + last 1MB for performance on large files.
     * Collisions are extremely unlikely for audio files.
     *
     * @param file The audio file
     * @return Hex-encoded SHA-256 hash string
     */
    suspend fun computeContentHash(file: File): String

    /**
     * Check if a file needs re-indexing (hash changed or not in DB).
     *
     * @param filePath Absolute file path
     * @return true if the file should be re-indexed
     */
    suspend fun needsReindex(filePath: String): Boolean

    /**
     * Extract artwork URI from an audio file.
     *
     * Priority: (1) embedded artwork tag, (2) folder.jpg/cover.jpg in same dir,
     * (3) null.
     *
     * @param file The audio file
     * @return URI string for artwork, or null
     */
    suspend fun extractArtworkUri(file: File): String?

    /**
     * Normalize a raw genre string to a canonical genre name.
     *
     * @param rawGenre Raw genre from ID3 tag
     * @return Normalized genre string, or null if unrecognizable
     */
    fun normalizeGenre(rawGenre: String?): String?

    /**
     * Infer energy level from BPM and genre.
     *
     * @param bpm Beats per minute (null if unknown)
     * @param genre Normalized genre (null if unknown)
     * @return Energy level 0-100, or null if cannot infer
     */
    fun inferEnergy(bpm: Int?, genre: String?): Int?

    /** Result of a folder scan operation. */
    data class ScanResult(
        val newTracks: Int,
        val updatedTracks: Int,
        val removedTracks: Int,
        val failedTracks: Int,
        val totalTracks: Int
    )
}
```

### 5.5 CollectionScanner (WorkManager)

```kotlin
/**
 * WorkManager periodic worker that scans configured music folders.
 *
 * Runs every 6 hours (configurable) when the device is charging and
 * on WiFi. Uses [CollectionIndexer] to detect new, changed, and removed
 * tracks. Low battery impact due to WorkManager constraints.
 *
 * @see CollectionIndexer
 */
class CollectionScanner(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        /** Unique work name for WorkManager */
        const val WORK_NAME = "vaib_collection_scan"

        /** Default scan interval: 6 hours */
        val SCAN_INTERVAL = Duration.ofHours(6)

        /** Schedule periodic scans with WorkManager constraints. */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiresCharging(true)
                .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                .build()

            val request = PeriodicWorkRequestBuilder<CollectionScanner>(SCAN_INTERVAL)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofMinutes(10))
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        /** Cancel all scheduled scans. */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }

    override suspend fun doWork(): Result
}
```

### 5.6 CollectionWatcher (ContentObserver)

```kotlin
/**
 * ContentObserver that watches configured music folders for real-time changes.
 *
 * Triggers incremental re-indexing when files are added, modified, or deleted.
 * Less thorough than [CollectionScanner] but provides near-instant updates.
 *
 * @param context Application context
 * @param indexer The [CollectionIndexer] to use for re-indexing
 */
class CollectionWatcher(
    private val context: Context,
    private val indexer: CollectionIndexer
) : ContentObserver(Handler(Looper.getMainLooper())) {

    /** Start watching a folder for changes. */
    fun watchFolder(folderUri: Uri)

    /** Stop watching all folders. */
    fun stopWatching()

    override fun onChange(selfChange: Boolean, uri: Uri?)
}
```

### 5.7 Folder Selection (SAF)

```kotlin
/**
 * Activity for selecting music folders via Android Storage Access Framework.
 *
 * Uses [Intent.ACTION_OPEN_DOCUMENT_TREE] to let the user pick a folder.
 * Persisted URI permission allows ongoing access across app restarts.
 * Selected folders are stored in SharedPreferences and scanned immediately.
 */
class FolderSelectionActivity : AppCompatActivity() {

    companion object {
        /** Request code for SAF folder picker */
        const val REQUEST_CODE_OPEN_TREE = 1001

        /** SharedPreferences key for stored folder URIs */
        const val PREFS_KEY_FOLDERS = "vaib_music_folders"
    }

    /** Launch the SAF folder picker. */
    fun openFolderPicker()

    /** Handle the folder selection result. */
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?)

    /** Persist URI permission for ongoing access. */
    private fun persistUriPermission(uri: Uri)

    /** Get all configured folder URIs. */
    fun getConfiguredFolders(): List<Uri>
}
```

### 5.8 PersonalCollectionSource (MusicSource Implementation)

```kotlin
/**
 * Bridges the personal collection Room DB to the [PlaybackOrchestrator].
 *
 * Implements [MusicSource] with sourceLayer = [SourceLayer.L1_PERSONAL].
 * Queries [LocalCollectionDao] to find tracks matching the current context.
 * This is the highest-priority source — user-owned files always win.
 *
 * @param dao Room DAO for personal collection
 * @see MusicSource
 * @see LocalCollectionDao
 */
class PersonalCollectionSource(
    private val dao: LocalCollectionDao
) : MusicSource {

    override val sourceId: String = "personal-collection"
    override val sourceLayer: SourceLayer = SourceLayer.L1_PERSONAL
    override val sourceType: SourceType = SourceType.PERSONAL_TRACK

    override fun canProvideFor(context: PlaybackContext): Boolean {
        // Can provide if the collection has at least one track
        // (actual matching happens in resolveCandidate)
        return runBlocking { dao.count() > 0 }
    }

    override suspend fun resolveCandidate(context: PlaybackContext): PlaybackCandidate? {
        // Build query from context:
        // 1. Filter by genre from agent taste
        // 2. Filter by BPM range from station/agent context
        // 3. Filter by energy from system load
        // 4. Exclude recently played tracks
        // 5. Score remaining by relevance, return highest
        TODO("Implemented in Phase B")
    }

    override suspend fun browse(context: PlaybackContext): List<PlaybackCandidate> {
        // Return all tracks as candidates (for browsing UI)
        TODO("Implemented in Phase B")
    }
}
```

### 5.9 Large Library Handling

For collections of 10,000+ tracks:

- **Lazy Loading:** `LocalCollectionDao.getAll()` returns all tracks; UI pagination uses `LIMIT`/`OFFSET` queries
- **Background Indexing:** `CollectionScanner` runs on a background thread pool; UI shows progress
- **Incremental Updates:** `CollectionWatcher` handles single-file changes without full re-scan
- **Room FTS:** Full-text search via Room FTS4 virtual table (not `LIKE` queries) for sub-100ms search
- **Memory Management:** `PlaybackCandidate` objects are lightweight; artwork is loaded on-demand via Coil
- **Indexing Progress:** Scan result includes `totalTracks` for progress reporting

---

## 6. LIVE STREAM / BROADCAST STRATEGY

### 6.1 Overview

Layer 2 provides opportunistic live stream integration. When no personal collection track matches the context, the system can tune into internet radio streams for atmosphere. Stream selection is context-aware (genre, time of day) but rate-limited to prevent chaotic switching.

**Key Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `StreamSource` | Model | Data class for stream definitions |
| `StreamRegistry` | Service | Holds all known streams |
| `StreamTuner` | Service | Context-aware stream selection |
| `StreamReliabilityTracker` | Service | Tracks stream uptime/failure rate |
| `LiveStreamSource` | MusicSource | Bridges streams to orchestrator |

### 6.2 StreamRegistry

```kotlin
/**
 * Registry of all known internet radio streams.
 *
 * Contains pre-loaded streams (shipped with the app) and user-added streams
 * (persisted in Room DB). Provides query methods for the [StreamTuner].
 *
 * @param context Application context for Room DB access
 * @param preloadedStreams List of pre-loaded [StreamSource] instances
 */
class StreamRegistry(
    context: Context,
    private val preloadedStreams: List<StreamSource> = DefaultStreams.ALL
) {

    /** Get all enabled streams (pre-loaded + user-added, not disabled). */
    suspend fun getAllEnabled(): List<StreamSource>

    /** Get streams matching a genre tag. */
    suspend fun getByGenre(genre: String): List<StreamSource>

    /** Get streams matching time-of-day preferences. */
    suspend fun getByTimeOfDay(timeOfDay: TimeOfDay): List<StreamSource>

    /** Add a user-defined stream. */
    suspend fun addUserStream(stream: StreamSource)

    /** Remove a user-defined stream (cannot remove pre-loaded). */
    suspend fun removeUserStream(streamId: String)

    /** Disable a pre-loaded stream (stored in user prefs). */
    suspend fun disableStream(streamId: String)

    /** Enable a previously disabled stream. */
    suspend fun enableStream(streamId: String)

    /** Update reliability score for a stream. */
    suspend fun updateReliability(streamId: String, score: Float)
}
```

**Default Pre-loaded Streams:**

```kotlin
object DefaultStreams {

    val SOMAFM_DRONE_ZONE = StreamSource(
        id = "somafm-drone-zone",
        name = "SomaFM Drone Zone",
        streamUrl = "http://ice1.somafm.com/dronezone-128-mp3",
        genreTags = listOf("ambient", "drone", "electronic", "experimental"),
        format = "mp3",
        bitrateKbps = 128,
        reliabilityScore = 0.95f,
        isPreloaded = true,
        isUserAdded = false,
        timeOfDayPreferences = listOf(TimeOfDay.NIGHT, TimeOfDay.EVENING),
        addedAt = 0L,
        lastPlayedAt = null,
        playCount = 0,
        description = "Served best chilled, safe with most medications. Atmospheric textures from SomaFM.",
        websiteUrl = "https://somafm.com/dronezone/"
    )

    val SOMAFM_GROOVE_SALAD = StreamSource(
        id = "somafm-groove-salad",
        name = "SomaFM Groove Salad",
        streamUrl = "http://ice1.somafm.com/groovesalad-128-mp3",
        genreTags = listOf("chill", "downtempo", "ambient", "electronic"),
        format = "mp3",
        bitrateKbps = 128,
        reliabilityScore = 0.95f,
        isPreloaded = true,
        isUserAdded = false,
        timeOfDayPreferences = listOf(TimeOfDay.AFTERNOON, TimeOfDay.EVENING),
        addedAt = 0L,
        lastPlayedAt = null,
        playCount = 0,
        description = "A nicely chilled plate of ambient and downtempo beats.",
        websiteUrl = "https://somafm.com/groovesalad/"
    )

    val SOMAFM_SECRET_AGENT = StreamSource(
        id = "somafm-secret-agent",
        name = "SomaFM Secret Agent",
        streamUrl = "http://ice1.somafm.com/secretagent-128-mp3",
        genreTags = listOf("lounge", "jazz", "instrumental", "chill"),
        format = "mp3",
        bitrateKbps = 128,
        reliabilityScore = 0.95f,
        isPreloaded = true,
        isUserAdded = false,
        timeOfDayPreferences = listOf(TimeOfDay.MORNING, TimeOfDay.AFTERNOON),
        addedAt = 0L,
        lastPlayedAt = null,
        playCount = 0,
        description = "The soundtrack for a stylish spy adventure. Lounge and jazz.",
        websiteUrl = "https://somafm.com/secretagent/"
    )

    val SOMAFM_SPACE_STATION = StreamSource(
        id = "somafm-space-station",
        name = "SomaFM Space Station Soma",
        streamUrl = "http://ice1.somafm.com/spacestation-128-mp3",
        genreTags = listOf("space", "ambient", "electronic", "downtempo"),
        format = "mp3",
        bitrateKbps = 128,
        reliabilityScore = 0.95f,
        isPreloaded = true,
        isUserAdded = false,
        timeOfDayPreferences = listOf(TimeOfDay.NIGHT, TimeOfDay.EVENING),
        addedAt = 0L,
        lastPlayedAt = null,
        playCount = 0,
        description = "Tune in, turn on, space out. Spaced-out ambient and mid-tempo electronica.",
        websiteUrl = "https://somafm.com/spacestation/"
    )

    val SOMAFM_LUSH = StreamSource(
        id = "somafm-lush",
        name = "SomaFM Lush",
        streamUrl = "http://ice1.somafm.com/lush-128-mp3",
        genreTags = listOf("female vocal", "chill", "downtempo", "electronic"),
        format = "mp3",
        bitrateKbps = 128,
        reliabilityScore = 0.95f,
        isPreloaded = true,
        isUserAdded = false,
        timeOfDayPreferences = listOf(TimeOfDay.EVENING, TimeOfDay.NIGHT),
        addedAt = 0L,
        lastPlayedAt = null,
        playCount = 0,
        description = "Sensuous female vocals and downbeat electronic grooves.",
        websiteUrl = "https://somafm.com/lush/"
    )

    val ALL = listOf(
        SOMAFM_DRONE_ZONE,
        SOMAFM_GROOVE_SALAD,
        SOMAFM_SECRET_AGENT,
        SOMAFM_SPACE_STATION,
        SOMAFM_LUSH
    )
}
```

### 6.3 StreamTuner

```kotlin
/**
 * Opportunistically selects the best live stream for the current context.
 *
 * The tuning algorithm:
 * 1. Filter streams by genre match to context's preferred genres
 * 2. Score each matching stream by weighted factors:
 *    - Genre match (0.4): how many genre tags overlap with context
 *    - Time-of-day match (0.3): does the stream prefer this time of day
 *    - Reliability (0.3): stream uptime score from [StreamReliabilityTracker]
 * 3. Return highest scoring stream as a [PlaybackCandidate]
 * 4. If no match, return null (orchestrator falls back to L3)
 *
 * Rate limiting is enforced by [PlaybackOrchestrator.canSwitchSource],
 * not by the tuner itself.
 *
 * @param streamRegistry Registry of available streams
 * @param reliabilityTracker Reliability scores for each stream
 */
class StreamTuner(
    private val streamRegistry: StreamRegistry,
    private val reliabilityTracker: StreamReliabilityTracker
) {

    companion object {
        /** Weight for genre match in scoring (0.0 - 1.0) */
        const val GENRE_WEIGHT = 0.4f

        /** Weight for time-of-day match in scoring */
        const val TIME_WEIGHT = 0.3f

        /** Weight for reliability score in scoring */
        const val RELIABILITY_WEIGHT = 0.3f
    }

    /**
     * Select the best stream for the given context.
     *
     * @param context The current playback context
     * @return [PlaybackCandidate] for the best stream, or null
     */
    suspend fun opportunisticTune(context: PlaybackContext): PlaybackCandidate? {
        val streams = streamRegistry.getAllEnabled()
        if (streams.isEmpty()) return null

        // Get preferred genres from agent taste or station context
        val preferredGenres = context.agentTaste?.genreWeights?.keys ?: emptySet()

        // Score and rank streams
        val scoredStreams = streams.mapNotNull { stream ->
            val score = scoreStream(stream, context, preferredGenres)
            if (score > 0) stream to score else null
        }.sortedByDescending { it.second }

        // Return best match as PlaybackCandidate
        return scoredStreams.firstOrNull()?.let { (stream, score) ->
            PlaybackCandidate(
                trackId = stream.id,
                title = stream.name,
                artist = stream.description,
                uri = stream.streamUrl,
                sourceType = SourceType.INTERNET_RADIO,
                sourceLayer = SourceLayer.L2_LIVE_STREAM,
                bpm = null, // Streams don't have BPM
                genre = stream.genreTags.firstOrNull(),
                energy = null,
                durationMs = null, // Streams are continuous
                artworkUri = null,
                origin = TrackOrigin(
                    sourceId = "stream-registry",
                    sourceLayer = SourceLayer.L2_LIVE_STREAM,
                    sourceType = SourceType.INTERNET_RADIO,
                    discoveredAt = stream.addedAt,
                    filePath = null,
                    streamUrl = stream.streamUrl,
                    assetName = null
                ),
                resonance = ResonanceMarker(
                    trackId = stream.id,
                    summary = "Auto-tuned to ${stream.name} based on ${context.timeOfDay.name.lowercase()} context.",
                    source = "stream_tuner",
                    confidence = score,
                    privacyLevel = PrivacyLevel.SUMMARIZED
                ),
                operationalAssociations = emptyList(),
                relevanceScore = score
            )
        }
    }

    /**
     * Score a stream against the current context.
     *
     * @return Score 0-1, or 0 if stream doesn't match
     */
    private suspend fun scoreStream(
        stream: StreamSource,
        context: PlaybackContext,
        preferredGenres: Set<String>
    ): Float {
        // Genre match score
        val genreOverlap = stream.genreTags.intersect(preferredGenres).size
        val genreScore = if (preferredGenres.isNotEmpty()) {
            genreOverlap.toFloat() / preferredGenres.size.coerceAtLeast(1)
        } else {
            0.5f // Neutral if no genre preference
        }

        // Time-of-day match
        val timeScore = if (stream.timeOfDayPreferences.contains(context.timeOfDay)) 1.0f else 0.2f

        // Reliability score (from tracker, fallback to stream's own score)
        val reliability = reliabilityTracker.getScore(stream.id) ?: stream.reliabilityScore

        return (genreScore * GENRE_WEIGHT) +
               (timeScore * TIME_WEIGHT) +
               (reliability * RELIABILITY_WEIGHT)
    }
}
```

### 6.4 StreamReliabilityTracker

```kotlin
/**
 * Tracks stream uptime, latency, and failure rate for each stream.
 *
 * Stores metrics locally in Room DB. Updated on each stream connection
 * attempt (success or failure). Provides reliability scores for the
 * [StreamTuner] scoring algorithm.
 *
 * Privacy: All data is local-only. No metrics leave the device.
 */
class StreamReliabilityTracker(
    private val dao: StreamMetricsDao
) {

    /**
     * Record a successful stream connection.
     *
     * @param streamId The stream that connected successfully
     * @param connectTimeMs Time to establish connection in milliseconds
     */
    suspend fun recordSuccess(streamId: String, connectTimeMs: Long)

    /**
     * Record a failed stream connection.
     *
     * @param streamId The stream that failed
     * @param errorType Type of failure: "timeout", "http_error", "io_error", "unknown"
     */
    suspend fun recordFailure(streamId: String, errorType: String)

    /**
     * Get the current reliability score for a stream.
     *
     * @param streamId The stream to query
     * @return Reliability score 0-1, or null if no data
     */
    suspend fun getScore(streamId: String): Float?

    /**
     * Get all streams sorted by reliability (most reliable first).
     */
    suspend fun getReliableStreams(): List<StreamMetric>
}

/** Room entity for stream reliability metrics. */
@Entity(tableName = "stream_metrics")
data class StreamMetric(
    @PrimaryKey val streamId: String,
    val successCount: Int,
    val failureCount: Int,
    val avgConnectTimeMs: Long,
    val lastSuccessAt: Long?,
    val lastFailureAt: Long?,
    val lastFailureType: String?,
    val reliabilityScore: Float // Computed: successCount / (successCount + failureCount)
)
```

### 6.5 Graceful Fallback

When a live stream fails:

1. **Immediate:** `AudioBackbone` reports playback error via `Player.Listener`
2. **Notification:** `PlaybackOrchestrator` is notified of the failure
3. **Fallback:** Orchestrator attempts to select from L1 (Personal Collection)
4. **If L1 empty:** Falls back to L3 (Agent Curated pools)
5. **Resonance update:** Resonance marker updated: "Stream failed. Fell back to [source]."
6. **Stream blacklisted:** Failed stream is temporarily deprioritized (30 minutes)

### 6.6 Rate Limiting

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max switches per 15 min | 1 | Prevents chaotic stream hopping |
| Grace period | 30s | Minimum listen time before switching |
| Cooldown after failure | 30 min | Failed streams temporarily deprioritized |
| User override | Always allowed | User can always manually switch streams |
| Disable opportunism | Available | User can turn off auto stream tuning entirely |

---

## 7. OPERATIONAL MEMORY STRATEGY

### 7.1 Philosophy

Music becomes operational memory when tracks are consistently associated with specific tasks, times, and states. The system forms weak bonds between tracks and operational contexts, then reinforces those bonds through repetition. Over time, the agent develops a "memory" of what music works for what operations — not through algorithmic recommendation, but through lived experience encoded as weighted associations.

This is not "AI that knows your music taste." This is "the system remembers that ambient tracks work well during sync operations because that's what happened."

### 7.2 Association Formation

Associations form through a reinforcement learning-inspired process:

```
Event: Task completes successfully while Track X is playing
  → Weak bond forms: weight = 0.1

Event: Same Track X + same Task Type occurs again
  → Bond reinforced: weight += 0.05 (max 0.9)

Event: Task fails while Track X is playing
  → Bond weakened: weight -= 0.02 (min 0.0)

Decay: Every day, all associations
  → weight *= 0.99 (gradual fade)
```

**Association Formation Algorithm:**

```kotlin
/**
 * Forms and reinforces operational associations between tracks and tasks.
 *
 * Called by the ViewModel when a task status changes while music is playing.
 * Creates new associations or reinforces existing ones based on outcomes.
 *
 * @property dao Room DAO for association storage
 * @see OperationalAssociation
 */
class AssociationEngine(
    private val dao: OperationalAssociationDao
) {

    companion object {
        /** Initial weight for a new association */
        const val INITIAL_WEIGHT = 0.1f

        /** Weight increment for reinforcement */
        const val REINFORCEMENT_DELTA = 0.05f

        /** Maximum association weight */
        const val MAX_WEIGHT = 0.9f

        /** Weight decrement for negative outcomes */
        const val NEGATIVE_DELTA = 0.02f

        /** Daily decay factor (weight *= DECAY_FACTOR per day) */
        const val DECAY_FACTOR = 0.99f

        /** Minimum weight before association is pruned */
        const val PRUNE_THRESHOLD = 0.01f
    }

    /**
     * Record a task completion event and update associations.
     *
     * @param trackId The track that was playing when the task completed
     * @param taskType The type of task that completed (e.g., "sync", "render")
     * @param timeOfDay Current time of day
     * @param systemLoad Current system load 0-1
     * @param success Whether the task completed successfully
     */
    suspend fun recordTaskCompletion(
        trackId: String,
        taskType: String,
        timeOfDay: TimeOfDay,
        systemLoad: Float,
        success: Boolean
    ) {
        val existing = dao.findAssociation(trackId, taskType)

        if (existing != null) {
            // Reinforce or weaken existing association
            val newWeight = if (success) {
                (existing.weight + REINFORCEMENT_DELTA).coerceAtMost(MAX_WEIGHT)
            } else {
                (existing.weight - NEGATIVE_DELTA).coerceAtLeast(0f)
            }
            dao.updateWeight(
                trackId = trackId,
                taskType = taskType,
                newWeight = newWeight,
                lastReinforcedAt = System.currentTimeMillis()
            )
        } else if (success) {
            // Create new association on success only
            val association = OperationalAssociation(
                trackId = trackId,
                taskType = taskType,
                timeOfDay = timeOfDay,
                systemLoad = systemLoad,
                weight = INITIAL_WEIGHT,
                createdAt = System.currentTimeMillis(),
                lastReinforcedAt = System.currentTimeMillis()
            )
            dao.insert(association)
        }
    }

    /**
     * Apply daily decay to all associations.
     *
     * Should be called once per day (e.g., via WorkManager).
     * Prunes associations below [PRUNE_THRESHOLD].
     */
    suspend fun applyDecay() {
        val allAssociations = dao.getAll()
        val now = System.currentTimeMillis()

        for (assoc in allAssociations) {
            val daysSinceReinforced = (now - assoc.lastReinforcedAt) / (24 * 60 * 60 * 1000)
            val decayedWeight = assoc.weight * Math.pow(DECAY_FACTOR.toDouble(), daysSinceReinforced.toDouble()).toFloat()

            if (decayedWeight < PRUNE_THRESHOLD) {
                dao.delete(assoc)
            } else {
                dao.updateWeight(assoc.trackId, assoc.taskType, decayedWeight, assoc.lastReinforcedAt)
            }
        }
    }

    /**
     * Get the strongest associations for a given task type.
     *
     * @param taskType The task type to query
     * @param limit Maximum number of associations to return
     * @return List of associations sorted by weight (strongest first)
     */
    suspend fun getAssociationsForTask(taskType: String, limit: Int = 10): List<OperationalAssociation> {
        return dao.getByTaskType(taskType, limit)
    }
}
```

### 7.3 AgentTasteProfile Construction

The taste profile aggregates all operational associations into a coherent preference map:

```kotlin
/**
 * Builds and maintains [AgentTasteProfile] from operational associations.
 *
 * The taste profile is a derived view — it summarizes associations into
 * actionable preferences (genre weights, BPM range, energy preference).
 * It is rebuilt periodically when associations change.
 *
 * @param associationDao DAO for operational associations
 * @param sessionDao DAO for listening sessions
 */
class TasteProfileBuilder(
    private val associationDao: OperationalAssociationDao,
    private val sessionDao: ListeningSessionDao
) {

    /**
     * Build a taste profile for the given agent.
     *
     * Aggregates:
     * - Genre weights from play count + association weights
     * - BPM range from most-played tracks
     * - Energy preference from average energy of played tracks
     * - Time-of-day preferences from session data
     * - Task-type correlations from operational associations
     *
     * @param agentId The agent to build a profile for
     * @return [AgentTasteProfile], or a default profile if no data
     */
    suspend fun buildProfile(agentId: String): AgentTasteProfile {
        val associations = associationDao.getAllForAgent(agentId)
        val sessions = sessionDao.getSessionsForAgent(agentId)

        // Build genre weights from play frequency + association strength
        val genreWeights = buildGenreWeights(sessions, associations)

        // Compute BPM range from session tracks
        val bpmRange = computeBpmRange(sessions)

        // Compute energy preference
        val energyPreference = computeEnergyPreference(sessions)

        // Build time-of-day preferences
        val timeOfDayPreferences = buildTimeOfDayPreferences(sessions)

        // Build task-type correlations
        val taskCorrelations = buildTaskCorrelations(associations)

        return AgentTasteProfile(
            agentId = agentId,
            genreWeights = genreWeights,
            bpmRange = bpmRange,
            energyPreference = energyPreference,
            timeOfDayPreferences = timeOfDayPreferences,
            operationalMusicCorrelation = taskCorrelations,
            associationCount = associations.size
        )
    }

    private fun buildGenreWeights(
        sessions: List<ListeningSession>,
        associations: List<OperationalAssociation>
    ): Map<String, Float> {
        // Count plays per genre, weighted by recency
        val genrePlayCounts = mutableMapOf<String, Float>()
        val now = System.currentTimeMillis()

        for (session in sessions) {
            val genre = session.trackArtist // TODO: need genre in session
            val recencyWeight = 1.0f - ((now - session.startedAt) / (30L * 24 * 60 * 60 * 1000)).coerceIn(0f, 1f)
            genrePlayCounts[genre] = genrePlayCounts.getOrDefault(genre, 0f) + recencyWeight
        }

        // Normalize to 0-1
        val maxCount = genrePlayCounts.values.maxOrNull() ?: 1f
        return genrePlayCounts.mapValues { it.value / maxCount }
    }

    private fun computeBpmRange(sessions: List<ListeningSession>): IntRange? {
        TODO("Compute from session track metadata")
    }

    private fun computeEnergyPreference(sessions: List<ListeningSession>): Int? {
        TODO("Compute average energy of played tracks")
    }

    private fun buildTimeOfDayPreferences(
        sessions: List<ListeningSession>
    ): Map<TimeOfDay, List<String>> {
        TODO("Group genres by time of day from session data")
    }

    private fun buildTaskCorrelations(
        associations: List<OperationalAssociation>
    ): Map<String, List<String>> {
        // Group track IDs by task type, sorted by association weight
        return associations
            .groupBy { it.taskType }
            .mapValues { entry ->
                entry.value
                    .sortedByDescending { it.weight }
                    .map { it.trackId }
                    .distinct()
            }
    }
}
```

### 7.4 Resonance Marker Generation

```kotlin
/**
 * Generates human-readable Resonance Markers for the "Why this song?" feature.
 *
 * Creates privacy-appropriate explanations based on the selection source
 * and available context. Respects [PrivacyLevel] settings.
 *
 * @see ResonanceMarker
 * @see PrivacyLevel
 */
class ResonanceMarkerGenerator {

    /**
     * Generate a resonance marker for a selected track.
     *
     * @param trackId The selected track
     * @param source What selected the track: "agent_taste", "operational_context", "user_request", "random", "stream_tuner"
     * @param context The playback context
     * @param associations Operational associations for this track (if any)
     * @param privacyLevel How much detail to include
     * @return [ResonanceMarker] with human-readable explanation
     */
    fun generate(
        trackId: String,
        source: String,
        context: PlaybackContext,
        associations: List<OperationalAssociation>,
        privacyLevel: PrivacyLevel = PrivacyLevel.SUMMARIZED
    ): ResonanceMarker {
        val summary = when (source) {
            "agent_taste" -> generateAgentTasteSummary(trackId, context, associations, privacyLevel)
            "operational_context" -> generateOperationalSummary(trackId, context, associations, privacyLevel)
            "user_request" -> "User request via QueueScreen. Added ${formatTimeAgo(context)}."
            "stream_tuner" -> generateStreamSummary(trackId, context, privacyLevel)
            "random" -> "Auto-selected from station queue. Genre match: ${computeGenreMatch(context)}%."
            else -> "Selected by $source."
        }

        return ResonanceMarker(
            trackId = trackId,
            summary = summary,
            source = source,
            confidence = computeConfidence(associations, context),
            privacyLevel = privacyLevel
        )
    }

    private fun generateAgentTasteSummary(
        trackId: String,
        context: PlaybackContext,
        associations: List<OperationalAssociation>,
        privacyLevel: PrivacyLevel
    ): String {
        val agentName = context.currentAgentId ?: "the agent"
        return when (privacyLevel) {
            PrivacyLevel.SUMMARIZED ->
                "$agentName selected this track based on genre preferences."
            PrivacyLevel.DETAILED -> {
                val topGenre = context.agentTaste?.genreWeights?.maxByOrNull { it.value }?.key ?: "unknown"
                "$agentName selected this track. Top genre preference: $topGenre. ${associations.size} operational associations."
            }
            PrivacyLevel.RAW ->
                "$agentName selected this track. Taste profile: ${context.agentTaste}. Associations: $associations"
        }
    }

    private fun generateOperationalSummary(
        trackId: String,
        context: PlaybackContext,
        associations: List<OperationalAssociation>,
        privacyLevel: PrivacyLevel
    ): String {
        val taskType = context.operationalState?.taskType ?: "current task"
        val topAssociation = associations.maxByOrNull { it.weight }
        return when (privacyLevel) {
            PrivacyLevel.SUMMARIZED ->
                "Selected during $taskType. ${associations.size} task associations on record."
            PrivacyLevel.DETAILED -> {
                val weight = topAssociation?.let { "%.0f".format(it.weight * 100) } ?: "unknown"
                "Selected during $taskType. Strongest association weight: ${weight}%."
            }
            PrivacyLevel.RAW ->
                "Selected during $taskType. All associations: $associations"
        }
    }

    private fun generateStreamSummary(
        trackId: String,
        context: PlaybackContext,
        privacyLevel: PrivacyLevel
    ): String {
        val timeOfDay = context.timeOfDay.name.lowercase()
        return when (privacyLevel) {
            PrivacyLevel.SUMMARIZED ->
                "Auto-tuned to live stream for $timeOfDay context."
            PrivacyLevel.DETAILED ->
                "Auto-tuned based on $timeOfDay preference and genre matching."
            PrivacyLevel.RAW ->
                "Stream tuner selected based on context: $context"
        }
    }

    private fun computeGenreMatch(context: PlaybackContext): Int {
        // Placeholder: actual implementation computes overlap between
        // context agent taste and selected track genre
        return 87
    }

    private fun computeConfidence(
        associations: List<OperationalAssociation>,
        context: PlaybackContext
    ): Float {
        // Higher confidence with more associations and stronger agent taste
        val associationConfidence = associations.maxOfOrNull { it.weight } ?: 0f
        val tasteConfidence = if (context.agentTaste != null) 0.7f else 0.3f
        return (associationConfidence * 0.5f + tasteConfidence * 0.5f).coerceIn(0f, 1f)
    }

    private fun formatTimeAgo(context: PlaybackContext): String {
        // Format relative time (e.g., "12 minutes ago")
        return "recently"
    }
}
```

### 7.5 Example Resonance Traces

| Scenario | Privacy Level | Trace |
|----------|--------------|-------|
| Track selected during sync, has associations | SUMMARIZED | "Selected during sync operation. 3 task associations on record." |
| Track selected during sync, has associations | DETAILED | "Selected during sync. Strongest association weight: 65%. Genre match: 87%." |
| Track selected by agent taste | SUMMARIZED | "vg-god selected this track based on genre preferences." |
| Auto-selected from queue | SUMMARIZED | "Auto-selected from station queue. Genre match: 87%. Previous track: similar BPM." |
| User request | SUMMARIZED | "User request via QueueScreen. Added 12 minutes ago." |
| Stream tuned | SUMMARIZED | "Auto-tuned to SomaFM Drone Zone for night context." |

---

## 8. IMPORT / INGESTION STRATEGY

### 8.1 Overview

Layer 4 supports one-time imports of listening history from external music platforms. The purpose is taste profile seeding — imported data helps build initial genre preferences and operational correlations. Imported tracks are NOT directly played; the system attempts to match them to tracks in L1 (Personal Collection) and uses the metadata to inform agent taste.

**Key Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `HistoryImporter` | Interface | Generic import contract |
| `SpotifyExtendedHistoryImporter` | Service | Parses Spotify streaming_history.json |
| `YouTubeMusicImporter` | Service | Parses YouTube Music watch-history.json |
| `LastFmImporter` | Service | Parses Last.fm CSV export |
| `LocalJsonImporter` | Service | Parses custom JSON format |
| `ImportRegistry` | Service | Tracks import batches, prevents duplicates |
| `ImportCoordinator` | Service | Orchestrates the ingestion pipeline |

### 8.2 HistoryImporter Interface

```kotlin
/**
 * Generic interface for importing listening history from external platforms.
 *
 * Each platform implementation handles a specific file format. The
 * [ImportCoordinator] auto-detects the correct importer by calling
 * [canParse] on each registered importer.
 *
 * All processing is local. No API calls. No OAuth. No data leaves the device.
 *
 * @see ImportCoordinator
 * @see ImportedTrack
 */
interface HistoryImporter {

    /** Human-readable platform name (e.g., "Spotify", "YouTube Music") */
    val platformName: String

    /**
     * Check if this importer can parse the given file.
     *
     * @param file The import file (ZIP, CSV, or JSON)
     * @return true if this importer recognizes the file format
     */
    suspend fun canParse(file: File): Boolean

    /**
     * Parse the import file into a list of [ImportedTrack] objects.
     *
     * @param file The import file
     * @return List of imported tracks (may be empty if parsing fails)
     */
    suspend fun parse(file: File): List<ImportedTrack>

    /**
     * Normalize imported tracks.
     *
     * Steps: unify artist names, deduplicate, normalize genres, remove
     * tracks with insufficient data.
     *
     * @param tracks Raw imported tracks from [parse]
     * @return Normalized and cleaned track list
     */
    suspend fun normalize(tracks: List<ImportedTrack>): List<ImportedTrack>
}
```

### 8.3 Implementation Details

**SpotifyExtendedHistoryImporter:**

```kotlin
/**
 * Imports Spotify Extended Streaming History.
 *
 * Parses `Streaming_History_Audio_XXXX-XXXX_X.json` files from the
 * Spotify Privacy Data export ZIP. These files contain:
 * - track name, artist name, album name
 * - timestamp of play
 * - ms played (for skip detection)
 *
 * @see HistoryImporter
 */
class SpotifyExtendedHistoryImporter : HistoryImporter {

    override val platformName: String = "Spotify"

    override suspend fun canParse(file: File): Boolean {
        // Check if ZIP contains Streaming_History_Audio_*.json files
        return file.extension == "zip" && try {
            ZipFile(file).entries().asSequence().any {
                it.name.startsWith("Streaming_History_Audio_")
            }
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun parse(file: File): List<ImportedTrack> {
        // Extract ZIP, parse JSON arrays, convert to ImportedTrack
        TODO("Phase E implementation")
    }

    override suspend fun normalize(tracks: List<ImportedTrack>): List<ImportedTrack> {
        // Filter: skip tracks where msPlayed < 30000 (30 seconds = skipped)
        // Deduplicate: same artist+title within 1 hour = same play session
        // Normalize genres: use Spotify's genre API data (not available in export, skip)
        TODO("Phase E implementation")
    }
}
```

**YouTubeMusicImporter:**

```kotlin
/**
 * Imports YouTube Music watch history.
 *
 * Parses `watch-history.json` from Google Takeout. Contains video titles
 * that need heuristic parsing to extract artist and track name.
 *
 * Note: YouTube Music history is less structured than Spotify. Some entries
 * may not be music (podcasts, videos). Heuristic filtering is applied.
 */
class YouTubeMusicImporter : HistoryImporter {

    override val platformName: String = "YouTube Music"

    override suspend fun canParse(file: File): Boolean {
        return file.name == "watch-history.json" && file.exists()
    }

    override suspend fun parse(file: File): List<ImportedTrack> {
        TODO("Phase E implementation")
    }

    override suspend fun normalize(tracks: List<ImportedTrack>): List<ImportedTrack> {
        TODO("Phase E implementation")
    }
}
```

**LastFmImporter:**

```kotlin
/**
 * Imports Last.fm scrobble history.
 *
 * Parses CSV export from Last.fm. Standard columns:
 * uts, utc_time, artist, artist_mbid, album, album_mbid,
 * track, track_mbid, timestamp
 */
class LastFmImporter : HistoryImporter {

    override val platformName: String = "Last.fm"

    override suspend fun canParse(file: File): Boolean {
        return file.extension == "csv" && file.readLines().firstOrNull()?.contains("uts,utc_time,artist") == true
    }

    override suspend fun parse(file: File): List<ImportedTrack> {
        TODO("Phase E implementation")
    }

    override suspend fun normalize(tracks: List<ImportedTrack>): List<ImportedTrack> {
        TODO("Phase E implementation")
    }
}
```

**LocalJsonImporter:**

```kotlin
/**
 * Imports from a custom local JSON format.
 *
 * Expected format:
 * ```json
 * [
 *   {
 *     "title": "Track Name",
 *     "artist": "Artist Name",
 *     "album": "Album Name",
 *     "playCount": 42,
 *     "lastPlayedAt": 1700000000000,
 *     "genre": "ambient"
 *   }
 * ]
 * ```
 */
class LocalJsonImporter : HistoryImporter {

    override val platformName: String = "Custom JSON"

    override suspend fun canParse(file: File): Boolean {
        return file.extension == "json" && try {
            val json = file.readText()
            json.trimStart().startsWith("[")
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun parse(file: File): List<ImportedTrack> {
        TODO("Phase E implementation")
    }

    override suspend fun normalize(tracks: List<ImportedTrack>): List<ImportedTrack> {
        TODO("Phase E implementation")
    }
}
```

### 8.4 ImportCoordinator (Ingestion Pipeline)

```kotlin
/**
 * Orchestrates the complete ingestion pipeline.
 *
 * Steps:
 * 1. User selects file via SAF
 * 2. Auto-detect format (try each importer's canParse())
 * 3. Parse into ImportedTrack list
 * 4. Normalize (unify artist names, deduplicate, normalize genres)
 * 5. Store in ImportRegistry (prevents re-import of same batch)
 * 6. Update agent taste profiles with imported preferences
 * 7. Show import summary (N tracks, M artists, K genres)
 *
 * @param importers List of registered [HistoryImporter] implementations
 * @param importRegistry Registry for tracking import batches
 * @param tasteProfileBuilder For updating agent taste after import
 */
class ImportCoordinator(
    private val importers: List<HistoryImporter>,
    private val importRegistry: ImportRegistry,
    private val tasteProfileBuilder: TasteProfileBuilder
) {

    /**
     * Import a file auto-detecting the format.
     *
     * @param file The import file selected by the user
     * @return [ImportResult] with summary statistics
     */
    suspend fun import(file: File): ImportResult {
        // 1. Auto-detect format
        val importer = importers.firstOrNull { it.canParse(file) }
            ?: throw ImportException("Unsupported file format. Supported: Spotify ZIP, YouTube JSON, Last.fm CSV, custom JSON")

        // 2. Check if already imported
        val batchId = computeBatchId(file)
        if (importRegistry.isImported(batchId)) {
            return ImportResult(
                success = false,
                totalTracks = 0,
                newTracks = 0,
                duplicateTracks = 0,
                artists = 0,
                genres = 0,
                message = "This file has already been imported."
            )
        }

        // 3. Parse
        val rawTracks = importer.parse(file)

        // 4. Normalize
        val normalizedTracks = importer.normalize(rawTracks)

        // 5. Store
        importRegistry.recordBatch(batchId, importer.platformName, normalizedTracks)

        // 6. Update taste profiles
        tasteProfileBuilder.updateFromImports(normalizedTracks)

        // 7. Summary
        return ImportResult(
            success = true,
            totalTracks = rawTracks.size,
            newTracks = normalizedTracks.size,
            duplicateTracks = rawTracks.size - normalizedTracks.size,
            artists = normalizedTracks.map { it.artist }.distinct().size,
            genres = normalizedTracks.mapNotNull { it.normalizedGenre }.distinct().size,
            message = "Imported ${normalizedTracks.size} tracks from ${importer.platformName}"
        )
    }

    /** Compute a batch ID from file content hash (for duplicate detection). */
    private fun computeBatchId(file: File): String {
        // SHA-256 of file content, truncated
        return MessageDigest.getInstance("SHA-256")
            .digest(file.readBytes())
            .take(8)
            .joinToString("") { "%02x".format(it) }
    }

    /** Result of an import operation. */
    data class ImportResult(
        val success: Boolean,
        val totalTracks: Int,
        val newTracks: Int,
        val duplicateTracks: Int,
        val artists: Int,
        val genres: Int,
        val message: String
    )

    /** Exception for import failures. */
    class ImportException(message: String) : Exception(message)
}
```

### 8.5 ImportRegistry

```kotlin
/**
 * Tracks import batches to prevent duplicate imports.
 *
 * Stores batch metadata in Room DB. User can view import history
 * and delete imported data at any time.
 */
class ImportRegistry(
    private val dao: ImportBatchDao
) {

    /** Check if a batch has already been imported. */
    suspend fun isImported(batchId: String): Boolean

    /** Record a new import batch. */
    suspend fun recordBatch(batchId: String, platform: String, tracks: List<ImportedTrack>)

    /** Get all import batches. */
    suspend fun getAllBatches(): List<ImportBatch>

    /** Delete an import batch and all associated tracks. */
    suspend fun deleteBatch(batchId: String)

    /** Delete ALL imported data. */
    suspend fun deleteAll()
}

/** Room entity for import batch tracking. */
@Entity(tableName = "import_batches")
data class ImportBatch(
    @PrimaryKey val batchId: String,
    val platform: String,
    val importedAt: Long,
    val trackCount: Int,
    val artistCount: Int
)
```

### 8.6 Privacy Summary

| Aspect | Guarantee |
|--------|-----------|
| Data location | Local-only, Room DB |
| API calls | None. File is parsed locally. |
| OAuth | Not required. Uses platform data exports. |
| Data deletion | User can delete individual batches or all data |
| Opt-in | Required. User must explicitly select the import file. |
| Analytics | None. No data about imports leaves the device. |
| Network | No network access during import. |

---

## 9. PRIME NEXUS RELATIONSHIP

### 9.1 Overview

The music source architecture receives signals from Prime Nexus via a unidirectional adapter. Nexus signals affect music selection indirectly — by updating the `PlaybackContext` that the orchestrator evaluates. There is no bidirectional communication: music selection does not send data back to Nexus.

### 9.2 NexusSignalAdapter

```kotlin
/**
 * Converts Prime Nexus signals into [PlaybackContext] updates.
 *
 * Receives [NexusSignal] objects from the Prime Nexus event bus and
 * translates them into context changes that affect music selection.
 * This is a pure adapter — it contains no selection logic.
 *
 * Unidirectional: Nexus → vAIB only. No feedback loop.
 *
 * @see PlaybackContext
 * @see OperationalState
 */
class NexusSignalAdapter(
    private val onContextUpdate: (PlaybackContext) -> Unit
) {

    /**
     * Handle a Nexus signal and update playback context.
     *
     * Signal types handled:
     * - SYSTEM_LOAD_CHANGED → updates systemLoad in context
     * - AGENT_TASK_STARTED → updates operationalState.taskType
     * - AGENT_TASK_COMPLETED → updates operationalState.taskStatus
     * - ENDPOINT_STATUS_CHANGED → updates endpointStatus map
     * - ENDPOINT_OFFLINE → may deprioritize L2 (live streams need network)
     *
     * @param signal The Nexus signal to process
     */
    fun onNexusSignal(signal: NexusSignal) {
        when (signal.type) {
            "SYSTEM_LOAD_CHANGED" -> {
                val load = signal.payload["load"] as? Float
                updateContext { it.copy(systemLoad = load) }
            }
            "AGENT_TASK_STARTED" -> {
                val taskType = signal.payload["taskType"] as? String ?: "unknown"
                val currentState = getCurrentContext().operationalState
                updateContext {
                    it.copy(
                        operationalState = currentState?.copy(
                            taskType = taskType,
                            taskStatus = "running"
                        ) ?: OperationalState(
                            taskType = taskType,
                            taskStatus = "running",
                            endpointStatus = emptyMap(),
                            activeEndpointCount = 0
                        )
                    )
                }
            }
            "AGENT_TASK_COMPLETED" -> {
                val success = signal.payload["success"] as? Boolean ?: true
                val currentState = getCurrentContext().operationalState
                updateContext {
                    it.copy(
                        operationalState = currentState?.copy(
                            taskStatus = if (success) "completed" else "failed"
                        )
                    )
                }
            }
            "ENDPOINT_STATUS_CHANGED" -> {
                @Suppress("UNCHECKED_CAST")
                val status = signal.payload["status"] as? Map<String, String> ?: emptyMap()
                val currentState = getCurrentContext().operationalState
                updateContext {
                    it.copy(
                        operationalState = currentState?.copy(
                            endpointStatus = status,
                            activeEndpointCount = status.count { it.value == "online" }
                        )
                    )
                }
            }
            else -> {
                // Unknown signal type — ignore
            }
        }
    }

    private fun getCurrentContext(): PlaybackContext {
        // Access current context from ViewModel
        TODO("Phase I implementation")
    }

    private fun updateContext(transform: (PlaybackContext) -> PlaybackContext) {
        val updated = transform(getCurrentContext())
        onContextUpdate(updated)
    }
}

/** Signal from Prime Nexus (placeholder — actual definition in Nexus module). */
data class NexusSignal(
    val type: String,
    val timestamp: Long,
    val payload: Map<String, Any>
)
```

### 9.3 Signal Mapping

| Nexus Signal | PlaybackContext Field | Effect on Music Selection |
|-------------|----------------------|---------------------------|
| SYSTEM_LOAD_CHANGED | `systemLoad` | High load → lower energy preference |
| AGENT_TASK_STARTED | `operationalState.taskType` | Task type → operational associations |
| AGENT_TASK_COMPLETED | `operationalState.taskStatus` | Success → reinforce association |
| ENDPOINT_STATUS_CHANGED | `operationalState.endpointStatus` | Offline endpoints → deprioritize L2 |
| ENDPOINT_OFFLINE | `operationalState.activeEndpointCount` | No endpoints → prefer calm music |

### 9.4 Privacy

- **No raw logs:** Only summarized signals are processed (e.g., "load: 0.7" not raw system metrics)
- **No telemetry soup:** No signal aggregation for analytics
- **Local-only:** All context processing happens on-device
- **Unidirectional:** Nexus signals flow into vAIB, but music selection data does not flow back

---

## 10. STATS + MEMORY ARCHITECTURE

### 10.1 Philosophy

Stats and memory exist to support identity, atmosphere, and operational context. They answer questions like "what do I listen to during sync operations?" and "which genres dominate my night shift?" They do NOT exist to drive engagement, optimize retention, or gamify listening.

### 10.2 What We Track

| Metric | Model | Purpose | Query Example |
|--------|-------|---------|---------------|
| ListeningSession | `ListeningSession` | When, what, where (station), operational context | "What was playing during the last sync?" |
| GenreAffinity | `GenreAffinity` | Genre preference over time | "What genres do I prefer in the morning?" |
| OperationalMusicCorrelation | Derived from associations | Task type → music correlation | "What music works best for render tasks?" |
| StationLoyalty | Derived from sessions | Time spent per station | "How much time on vg-god vs drift stations?" |
| ReplayPattern | Derived from sessions | Tracks replayed within 24h | "Which tracks do I replay most?" |
| DriftVsNativeBalance | Derived from sessions | Ratio of drift to native listening | "Am I drifting more this week?" |

### 10.3 What We DON'T Track

| Anti-Pattern | Reason |
|-------------|--------|
| Streaks / achievements | Gamification contradicts calm operational aesthetics |
| Social features | No sharing, no leaderboards, no friend activity |
| "Top 1% of listeners" | Manipulative, engagement-driven |
| Addictive notifications | No "you haven't listened today" triggers |
| Endless autoplay optimization | Not optimizing for listen time |
| Skip prediction | Not predicting user behavior for manipulation |
| Mood inference | No "you seem sad, here's happy music" |
| Demographic profiling | No age/gender/location-based recommendations |

### 10.4 Storage and Retention

```kotlin
/**
 * Room DAO for listening session storage.
 *
 * Supports the stats and memory queries. Sessions are retained for
 * 90 days by default (configurable). Old sessions are pruned by
 * [SessionRetentionWorker].
 */
@Dao
interface ListeningSessionDao {

    @Insert
    suspend fun insert(session: ListeningSession)

    @Query("SELECT * FROM listening_sessions ORDER BY startedAt DESC LIMIT :limit")
    suspend fun getRecent(limit: Int): List<ListeningSession>

    @Query("SELECT * FROM listening_sessions WHERE taskType = :taskType ORDER BY startedAt DESC")
    suspend fun getByTaskType(taskType: String): List<ListeningSession>

    @Query("SELECT * FROM listening_sessions WHERE timeOfDay = :timeOfDay ORDER BY startedAt DESC")
    suspend fun getByTimeOfDay(timeOfDay: TimeOfDay): List<ListeningSession>

    @Query("SELECT * FROM listening_sessions WHERE startedAt >= :since ORDER BY startedAt DESC")
    suspend fun getSince(since: Long): List<ListeningSession>

    @Query("SELECT genre, COUNT(*) as playCount, SUM(durationMs) as totalDuration FROM listening_sessions GROUP BY genre ORDER BY playCount DESC")
    suspend fun getGenreBreakdown(): List<GenreStat>

    @Query("DELETE FROM listening_sessions WHERE startedAt < :cutoff")
    suspend fun pruneOlderThan(cutoff: Long)

    @Query("SELECT * FROM listening_sessions WHERE agentId = :agentId")
    suspend fun getSessionsForAgent(agentId: String): List<ListeningSession>
}

/** Pruned genre stat (not the full GenreAffinity model). */
data class GenreStat(
    val genre: String,
    val playCount: Int,
    val totalDuration: Long
)
```

**Retention Policy:**
- Default: 90 days
- Configurable: user can set 30/60/90/180/365 days or unlimited
- Pruning: WorkManager daily task removes sessions older than retention period
- Purpose queries only: stats are for personal insight, not for system optimization

### 10.5 Example Queries

```kotlin
// "What do I listen to during sync operations?"
sessionDao.getByTaskType("sync")
    .groupBy { it.genre }
    .mapValues { it.value.sumOf { s -> s.durationMs } }
    .toList()
    .sortedByDescending { it.second }

// "What genres dominate my night shift?"
sessionDao.getByTimeOfDay(TimeOfDay.NIGHT)
    .groupBy { it.genre }
    .mapValues { it.value.size }

// "Am I drifting more this week?"
val thisWeekDrift = sessionDao.getSince(weekAgo).count { it.stationId?.startsWith("drift") == true }
val thisWeekTotal = sessionDao.getSince(weekAgo).size
val driftRatio = thisWeekDrift.toFloat() / thisWeekTotal.coerceAtLeast(1)
```

---

## 11. ANTI-PATTERNS

The following patterns are explicitly banned from this architecture. They represent the antithesis of vAIB's design philosophy.

### 11.1 Banned Behaviors

| Anti-Pattern | Why Banned | What We Do Instead |
|-------------|-----------|-------------------|
| **Spotify clone behavior** | Endless autoplay, recommendation addiction, "discover weekly" | Operational context selection with explicit associations |
| **Algorithmic feed optimization** | Maximizing listen time, engagement metrics | Select based on context + associations, not engagement |
| **Fake AI DJ chatter** | Theatrical "personalities" that announce tracks | Resonance Trace — factual, minimal, user-requested |
| **Fake emotional manipulation** | "You seem sad, here's a happy song" | No mood inference. Context comes from tasks, not emotions. |
| **Hyperactive source switching** | Rapidly switching between sources | Rate-limited: max 1 switch per 15 min, 30s grace |
| **Giant telemetry dashboards** | Massive analytics UIs in main flow | Minimal stats, purpose-driven queries only |
| **TikTok music brain** | Short-form, rapid switching, dopamine loops | Full-track playback, calm transitions, no rapid cuts |
| **Gamification** | Streaks, achievements, levels, badges | None. Listening is its own reward. |
| **Social features** | Sharing, leaderboards, friend activity | None. Private by design. |
| **Engagement metrics** | Listen time optimization, retention optimization | No metrics collection for optimization |
| **Creepy specificity** | "You listened to ambient at 3:47am on Tuesday" | Summarized traces by default, no raw logs |
| **Mood-based recommendations** | Inferring emotional state from behavior | Task-based context only, no mood inference |
| **Collaborative filtering** | "Users who liked X also liked Y" | No user similarity, no collaborative data |
| **Attention hijacking** | Push notifications about music | No music-related notifications |

### 11.2 Design Decisions That Prevent Anti-Patterns

1. **SourceLayer priority** ensures personal collection always wins over algorithmic suggestions
2. **Rate limiting** prevents hyperactive switching that feels chaotic
3. **PrivacyLevel.SUMMARIZED** default prevents creepy specificity
4. **No network calls** in the music pipeline prevent telemetry exfiltration
5. **Operational (not emotional) context** prevents mood manipulation
6. **Resonance Trace instead of AI DJ** provides transparency without theatricality
7. **No gamification hooks** in any data model
8. **Local-only storage** prevents data aggregation for engagement optimization

---

## 12. IMPLEMENTATION PHASES

### 12.1 Phase Summary

| Phase | Name | Scope | Files | Effort |
|-------|------|-------|-------|--------|
| A | Core Abstractions | MusicSource interface, PlaybackOrchestrator, PlaybackCandidate, PlaybackContext, enums | 8 model files | 3-4h |
| B | Personal Collection | PersonalTrack, LocalCollectionDao, CollectionIndexer, FolderSelection, Scanner | 6 files + Room | 6-8h |
| C | Live Stream | StreamRegistry, StreamTuner, StreamReliabilityTracker, 5 pre-loaded streams | 4 files | 3-4h |
| D | Agent Curated | CuratedPool model, AgentCuratedSource, 5 operational pools | 3 files | 2-3h |
| E | History Import | HistoryImporter interface, Spotify/YouTube/Last.fm importers, ImportRegistry | 5 files | 4-6h |
| F | Operational Memory | OperationalAssociation, AgentTasteProfile, association formation/decay | 4 files | 4-6h |
| G | Resonance Trace | ResonanceMarker, trace generation, bottom sheet UI | 3 files | 3-4h |
| H | Stats | ListeningSession, GenreAffinity, correlation queries | 4 files | 3-4h |
| I | Nexus Integration | NexusSignalAdapter, PlaybackContext updates | 2 files | 2-3h |
| J | Playback Integration | Wire Orchestrator into ViewModel (replace applyPresencePulse) | ViewModel.kt | 3-4h |

**Total: 37-50h across 10 phases.**

### 12.2 Phase A: Core Abstractions (3-4h)

**Goal:** Establish the interface layer that everything else builds on.

**Files:**
- `model/source/MusicSource.kt` — interface
- `model/source/PlaybackOrchestrator.kt` — orchestrator
- `model/source/PlaybackCandidate.kt` — candidate data class
- `model/source/PlaybackContext.kt` — context data class
- `model/source/TrackOrigin.kt` — origin data class
- `model/source/SourceLayer.kt` — enum
- `model/source/SourceType.kt` — enum
- `model/source/TimeOfDay.kt` — enum

**Deliverables:**
- All interfaces and data classes compile
- Unit tests for PlaybackOrchestrator scoring logic
- No integration with existing code (pure models)

**Reversibility:** 100%. Just delete the files.

### 12.3 Phase B: Personal Collection (6-8h)

**Goal:** Index and query user's local music files.

**Files:**
- `model/collection/PersonalTrack.kt` — data class + Room entity
- `data/dao/LocalCollectionDao.kt` — Room DAO
- `service/CollectionIndexer.kt` — metadata extraction
- `service/CollectionScanner.kt` — WorkManager periodic scan
- `service/CollectionWatcher.kt` — ContentObserver
- `source/PersonalCollectionSource.kt` — MusicSource implementation

**Deliverables:**
- User can select music folders via SAF
- Folder contents are indexed into Room DB
- Periodic background scanning (6h, charging-only)
- PersonalCollectionSource registered with orchestrator
- Browse UI can query indexed collection

**Reversibility:** High. Disable PersonalCollectionSource registration.

### 12.4 Phase C: Live Stream (3-4h)

**Goal:** Opportunistic live stream tuning with rate limiting.

**Files:**
- `model/stream/StreamSource.kt` — data class + Room entity
- `service/StreamRegistry.kt` — stream storage
- `service/StreamTuner.kt` — context-aware stream selection
- `service/StreamReliabilityTracker.kt` — uptime tracking
- `source/LiveStreamSource.kt` — MusicSource implementation

**Deliverables:**
- 5 pre-loaded SomaFM streams
- Stream tuner selects streams by genre + time + reliability
- Rate limiting enforced (1 switch per 15 min)
- Graceful fallback on stream failure
- User can disable opportunistic tuning

**Reversibility:** High. Disable LiveStreamSource registration.

### 12.5 Phase D: Agent Curated (2-3h)

**Goal:** Operational context pools for task-aware selection.

**Files:**
- `model/pool/CuratedPool.kt` — data class
- `source/AgentCuratedSource.kt` — MusicSource implementation
- `config/DefaultCuratedPools.kt` — 5 default pool definitions

**Deliverables:**
- 5 default pools (sync recovery, deep focus, night shift, maintenance, idle)
- Pool selection based on task type + time of day
- Pools reference L1 tracks when available

**Reversibility:** High. Disable AgentCuratedSource registration.

### 12.6 Phase E: History Import (4-6h)

**Goal:** One-time imports from external platforms.

**Files:**
- `model/import/ImportedTrack.kt` — data class + Room entity
- `import/HistoryImporter.kt` — interface
- `import/SpotifyExtendedHistoryImporter.kt` — Spotify parser
- `import/YouTubeMusicImporter.kt` — YouTube parser
- `import/LastFmImporter.kt` — Last.fm parser
- `import/ImportRegistry.kt` — batch tracking
- `import/ImportCoordinator.kt` — pipeline orchestration

**Deliverables:**
- Auto-detect format from file extension/content
- Parse and normalize imported tracks
- Store in ImportRegistry with dedup
- Update agent taste profiles
- Import summary UI

**Reversibility:** High. Delete import database.

### 12.7 Phase F: Operational Memory (4-6h)

**Goal:** Association formation, reinforcement, and decay.

**Files:**
- `model/memory/OperationalAssociation.kt` — data class + Room entity
- `model/memory/AgentTasteProfile.kt` — data class
- `service/AssociationEngine.kt` — formation/reinforcement/decay
- `service/TasteProfileBuilder.kt` — profile construction
- `data/dao/OperationalAssociationDao.kt` — Room DAO

**Deliverables:**
- Associations form on task completion
- Reinforcement increases weight (+0.05)
- Decay reduces weight daily (0.99x)
- Pruning removes associations below threshold
- Taste profiles summarize associations into preferences

**Reversibility:** Medium. Disable association recording; existing associations remain but stop updating.

### 12.8 Phase G: Resonance Trace (3-4h)

**Goal:** "Why this song?" transparency feature.

**Files:**
- `model/resonance/ResonanceMarker.kt` — data class
- `model/resonance/PrivacyLevel.kt` — enum
- `service/ResonanceMarkerGenerator.kt` — trace generation
- `ui/ResonanceBottomSheet.kt` — bottom sheet UI (Phase G+)

**Deliverables:**
- Resonance markers generated for every track selection
- Three privacy levels (SUMMARIZED/DETAILED/RAW)
- Human-readable summaries (3-5 lines)
- Confidence scoring

**Reversibility:** High. Resonance markers are optional display data.

### 12.9 Phase H: Stats (3-4h)

**Goal:** Listening history and preference statistics.

**Files:**
- `model/stats/ListeningSession.kt` — data class + Room entity
- `model/stats/GenreAffinity.kt` — data class
- `data/dao/ListeningSessionDao.kt` — Room DAO
- `service/StatsAggregator.kt` — query aggregation
- `service/SessionRetentionWorker.kt` — pruning

**Deliverables:**
- Session recording on play/stop/switch
- Genre affinity aggregation
- Task-type music correlation queries
- 90-day retention with configurable period

**Reversibility:** High. Stop recording sessions.

### 12.10 Phase I: Nexus Integration (2-3h)

**Goal:** Wire Prime Nexus signals into PlaybackContext.

**Files:**
- `nexus/NexusSignalAdapter.kt` — signal → context mapping
- `nexus/NexusSignal.kt` — signal data class (or reference)

**Deliverables:**
- System load updates energy preference
- Task start/end updates operational state
- Endpoint status affects source layer priority
- Unidirectional only

**Reversibility:** High. Disconnect adapter.

### 12.11 Phase J: Playback Integration (3-4h)

**Goal:** Replace hardcoded track selection with orchestrator.

**Files:**
- `viewmodel/MusicViewModel.kt` — modified to use orchestrator

**Changes:**
- Replace `applyPresencePulse()` random selection with orchestrator
- Construct PlaybackContext from current state
- Feed PlaybackCandidate to AudioBackbone
- Handle source switching via orchestrator

**Reversibility:** Low. This is the integration point. Revert to previous ViewModel commit.

---

## 13. RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Personal collection indexing drains battery | Medium | WorkManager with constraints (charging-only, 6h interval). Incremental scanning. |
| Live stream switching feels chaotic | Medium | Rate limiting (1 switch per 15 min), grace period (30s), user can disable. |
| Imported data reveals listening habits if device compromised | Low | Local-only, no cloud, user can delete, opt-in per platform. Data is no more sensitive than the audio files themselves. |
| Operational associations feel creepy | Medium | PrivacyLevel.SUMMARIZED default, no raw logs in traces, user can disable association formation. |
| Large personal library (10K+ tracks) causes UI lag | Medium | Lazy loading, pagination, Room FTS, background indexing, Coil for artwork. |
| PlaybackOrchestrator adds latency to track selection | Low | Cache candidates, async resolution, pre-warm on app launch, L1 queries are indexed. |
| Source switching interrupts playback with gap | Medium | Crossfade between sources (300ms), only switch on track boundary, not mid-track. |
| Music sovereignty violation (music interrupts operation) | Low | Architecture ensures playback is always subordinate to operations. Music never interrupts tasks. |
| Room DB migration complexity | Medium | Each phase adds its own entities. Migrations are additive and independent. |
| SAF permission revocation breaks collection | Low | Graceful handling of permission loss — show user a re-authorization prompt. |
| Stream reliability tracking privacy concern | Low | All metrics local-only. No transmission. Uptime data is not personally identifiable. |
| Taste profile becomes stale over time | Low | Daily decay prevents staleness. Profiles rebuild from fresh associations. |

---

## 14. RECOMMENDATION

### 14.1 Phase A Should Be First

**Phase A (Core Abstractions) must be the first implementation slice.**

**Why:**
- **Interface contract:** Establishes `MusicSource`, `PlaybackOrchestrator`, `PlaybackCandidate`, and `PlaybackContext` — the contracts that all subsequent phases depend on.
- **Zero playback risk:** Models only, no behavior changes. Can be developed and merged without touching existing playback code.
- **Parallel development:** Once Phase A is merged, Phases B through I can be developed in parallel by different contributors (each phase implements `MusicSource` or consumes `PlaybackOrchestrator`).
- **Abstraction validation:** Proves the design works before investing in complex features like indexing and import parsing.
- **Reversible:** Pure addition of interfaces and data classes. Zero risk to existing functionality.

### 14.2 Recommended Implementation Order

```
Phase A (Core Abstractions)
    ↓
Phase B (Personal Collection) — highest priority per mission
    ↓
Phase C (Live Stream) — adds atmosphere
    ↓
Phase F (Operational Memory) — the emotional core
    ↓
Phase G (Resonance Trace) — transparency layer
    ↓
Phase J (Playback Integration) — wires it all together
    ↓
Phase D (Agent Curated) — extends operational pools
    ↓
Phase E (History Import) — taste seeding
    ↓
Phase H (Stats) — supporting infrastructure
    ↓
Phase I (Nexus Integration) — signal wiring
```

### 14.3 Rationale

1. **Personal Collection (B)** is highest priority because it directly addresses the mission of music sovereignty. Users should be able to play their own music first.
2. **Live Stream (C)** follows because it's the next most impactful feature — it adds atmosphere when personal collection doesn't match.
3. **Operational Memory (F)** and **Resonance Trace (G)** are the emotional core — they make the system feel intentional rather than random.
4. **Playback Integration (J)** comes after the core features are built. This is the point where existing code changes.
5. **Agent Curated (D)** and **History Import (E)** follow — they extend the system's capabilities.
6. **Stats (H)** and **Nexus Integration (I)** are supporting infrastructure that can come last.

### 14.4 Success Criteria

The architecture is successful when:

- [ ] `AudioBackbone` receives `PlaybackCandidate` instead of `Station` (Phase J)
- [ ] User can select a music folder and hear their own tracks (Phase B)
- [ ] System auto-tunes to SomaFM when no local match exists (Phase C)
- [ ] "Why this song?" bottom sheet shows a human-readable reason (Phase G)
- [ ] Task completion reinforces track associations (Phase F)
- [ ] No source switching more than once per 15 minutes without user action
- [ ] All data is local — no music metadata leaves the device
- [ ] System remains calm — no hyperactive switching, no gamification, no manipulation

---

## Appendix A: File Structure (Planned)

```
app/src/main/java/com/vaib/music/
├── model/
│   ├── source/
│   │   ├── MusicSource.kt              # Phase A
│   │   ├── PlaybackOrchestrator.kt     # Phase A
│   │   ├── PlaybackCandidate.kt        # Phase A
│   │   ├── PlaybackContext.kt          # Phase A
│   │   ├── TrackOrigin.kt              # Phase A
│   │   ├── SourceLayer.kt              # Phase A
│   │   ├── SourceType.kt               # Phase A
│   │   └── TimeOfDay.kt                # Phase A
│   ├── collection/
│   │   └── PersonalTrack.kt            # Phase B
│   ├── stream/
│   │   └── StreamSource.kt             # Phase C
│   ├── pool/
│   │   └── CuratedPool.kt              # Phase D
│   ├── import/
│   │   └── ImportedTrack.kt            # Phase E
│   ├── memory/
│   │   ├── OperationalAssociation.kt   # Phase F
│   │   └── AgentTasteProfile.kt        # Phase F
│   ├── resonance/
│   │   ├── ResonanceMarker.kt          # Phase G
│   │   └── PrivacyLevel.kt             # Phase G
│   ├── stats/
│   │   ├── ListeningSession.kt         # Phase H
│   │   └── GenreAffinity.kt            # Phase H
│   └── nexus/
│       └── NexusSignal.kt              # Phase I (or reference)
├── data/
│   ├── dao/
│   │   ├── LocalCollectionDao.kt       # Phase B
│   │   ├── StreamMetricsDao.kt         # Phase C
│   │   ├── OperationalAssociationDao.kt # Phase F
│   │   ├── ListeningSessionDao.kt      # Phase H
│   │   └── ImportBatchDao.kt           # Phase E
│   └── database/
│       └── VaibMusicDatabase.kt        # Room database (Phases B-H)
├── service/
│   ├── CollectionIndexer.kt            # Phase B
│   ├── CollectionScanner.kt            # Phase B
│   ├── CollectionWatcher.kt            # Phase B
│   ├── StreamRegistry.kt               # Phase C
│   ├── StreamTuner.kt                  # Phase C
│   ├── StreamReliabilityTracker.kt     # Phase C
│   ├── AssociationEngine.kt            # Phase F
│   ├── TasteProfileBuilder.kt          # Phase F
│   ├── ResonanceMarkerGenerator.kt     # Phase G
│   ├── StatsAggregator.kt              # Phase H
│   └── SessionRetentionWorker.kt       # Phase H
├── source/
│   ├── PersonalCollectionSource.kt     # Phase B
│   ├── LiveStreamSource.kt             # Phase C
│   ├── AgentCuratedSource.kt           # Phase D
│   └── ImportedHistorySource.kt        # Phase E
├── import/
│   ├── HistoryImporter.kt              # Phase E
│   ├── SpotifyExtendedHistoryImporter.kt # Phase E
│   ├── YouTubeMusicImporter.kt         # Phase E
│   ├── LastFmImporter.kt               # Phase E
│   ├── LocalJsonImporter.kt            # Phase E
│   ├── ImportRegistry.kt               # Phase E
│   └── ImportCoordinator.kt            # Phase E
├── nexus/
│   └── NexusSignalAdapter.kt           # Phase I
├── config/
│   └── DefaultCuratedPools.kt          # Phase D
└── ui/                                 # (UI components reference only)
    └── ResonanceBottomSheet.kt         # Phase G+
```

## Appendix B: Cross-Reference Matrix

| This Document | References | Referenced By |
|--------------|------------|---------------|
| `MusicSource` | Discovery: `AgentPresence.musicInfluence` | All source implementations |
| `PlaybackOrchestrator` | — | `MusicViewModel` (Phase J) |
| `PlaybackCandidate` | `TrackOrigin`, `ResonanceMarker` | `AudioBackbone` (Phase J) |
| `PlaybackContext` | `AgentTasteProfile`, `OperationalState` | `PlaybackOrchestrator` |
| `AgentTasteProfile` | Discovery: `AgentTasteProfile` (Phase 4+) | `PlaybackContext`, `TasteProfileBuilder` |
| `MusicInfluence` | Discovery: `AgentPresence` | `PlaybackContext` construction |
| `ResonanceMarker` | UX: `Resonance Trace` bottom sheet | `PlaybackCandidate`, UI |
| `OperationalAssociation` | Discovery: `OperationalAssociation` | `AssociationEngine`, `AgentTasteProfile` |
| `SourceLayer` | — | All `MusicSource` implementations |
| `SourceType` | — | URI construction, metadata handling |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **MusicSource** | Interface that every music source implements. The contract between sources and the orchestrator. |
| **PlaybackOrchestrator** | Central component that selects the best music candidate from all registered sources. |
| **PlaybackCandidate** | A playable track/stream with full metadata and provenance. The universal object crossing the source-playback boundary. |
| **PlaybackContext** | Complete context for music selection: station, agent, task, time, load, history, taste. |
| **SourceLayer** | Priority tier (L1-L4) determining fallback order across sources. |
| **Resonance Trace** | "Why this song?" — human-readable explanation of track selection rationale. |
| **OperationalAssociation** | Weighted link between a track and an operational context (task, time, load). |
| **AssociationEngine** | Component that forms, reinforces, and decays operational associations. |
| **StreamTuner** | Context-aware stream selector for live radio opportunism. |
| **HistoryImporter** | Parses external platform exports (Spotify, YouTube, Last.fm) into local format. |
| **SAF** | Storage Access Framework — Android API for user-selected folder access. |
| **MediaMetadataRetriever** | Android API for extracting metadata from audio files. |

---

> End of document. This is a planning-only architecture document. No implementation code is contained herein. See Section 12 for implementation phase ordering and Section 14 for the recommended first slice.
