package com.xsytrance.vaib.music.source.model

/**
 * Concrete source types within the vAIb music pipeline.
 *
 * Each type maps to a specific [MusicSource] adapter implementation.
 * This enum provides type-safe identification for provenance tracking,
 * UI display, and debugging.
 *
 * INERT BY DESIGN — enum only. No runtime behavior.
 * Phase A: Defined. Phase B-E: One adapter per type.
 *
 * Music sovereignty: LOCAL_FILE and BUNDLED_ASSET are the only
 * source types that exist in Phase 0. All others are future architecture.
 */
enum class SourceType {
    /** Local file on device storage. /sdcard/Music/vaib/ or user-selected folder.
     * Phase 0: Already used by AudioBackbone via Station.fallbackLocalTrack.
     * Phase B: PersonalCollectionSource will produce these. */
    LOCAL_FILE,

    /** Bundled asset in APK. asset:///audio/{station.id}.mp3
     * Phase 0: Already used by AudioBackbone as final fallback.
     * No adapter needed — handled natively by ExoPlayer. */
    BUNDLED_ASSET,

    /** Indexed personal collection track. Metadata-enriched local file.
     * Phase B: PersonalCollectionSource produces these with full metadata
     * (BPM, genre, artwork, play count) from Room database. */
    PERSONAL_TRACK,

    /** HTTP live stream. Remote radio or self-hosted stream.
     * Phase C: LiveStreamSource produces these from StreamRegistry.
     * ExoPlayer handles the actual streaming. */
    LIVE_STREAM,

    /** Internet radio station. SomaFM, public broadcast, etc.
     * Phase C: Sub-type of LIVE_STREAM with station metadata. */
    INTERNET_RADIO,

    /** Agent-curated operational context pool.
     * Phase D: AgentCuratedSource produces these from CuratedPool.
     * Selection based on task type, time of day, system load. */
    AGENT_CURATED,

    /** Imported listening history track.
     * Phase E: ImportedHistorySource normalizes these from platform exports.
     * Used for taste profile seeding, not direct playback. */
    IMPORTED_HISTORY
}
