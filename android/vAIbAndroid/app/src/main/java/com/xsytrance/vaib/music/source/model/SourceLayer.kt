package com.xsytrance.vaib.music.source.model

/**
 * Priority-ordered source layers for the vAIb music pipeline.
 *
 * Higher-priority layers (lower ordinal) are consulted first when selecting
 * playback candidates. If a higher layer cannot provide music, the
 * orchestrator falls back to the next layer.
 *
 * INERT BY DESIGN — this enum exists as a type-safe priority system only.
 * No runtime behavior is attached. PlaybackOrchestrator uses these values
 * for candidate ranking in future phases.
 *
 * Phase A: Enum defined, no consumers yet.
 * Phase B: L1_PERSONAL — PersonalCollectionSource will register at this layer.
 * Phase C: L2_LIVE_STREAM — LiveStreamSource will register at this layer.
 * Phase D: L3_AGENT_CURATED — AgentCuratedSource will register at this layer.
 * Phase E: L4_IMPORTED — ImportedHistorySource will register at this layer.
 *
 * Music sovereignty: L1 (user-owned collection) always takes priority.
 * The user owns their music. Everything else is supplementary.
 */
enum class SourceLayer(val priority: Int) {
    /** User-owned local collection — highest priority.
     * Personal FLAC/MP3/WAV files, ambient loops, archived sets.
     * The user owns this music. It is sovereign.
     * Phase B: PersonalCollectionSource registers here. */
    L1_PERSONAL(1),

    /** Internet radio / live broadcasts — opportunistic.
     * SomaFM, Tailnet self-hosted streams, public radio.
     * Never interrupts L1 playback. Only used when L1 is empty
     * or user explicitly enables stream tuning.
     * Phase C: LiveStreamSource registers here. */
    L2_LIVE_STREAM(2),

    /** Agent-curated operational context pools.
     * "Night shift", "sync recovery", "deep focus" pools.
     * Tied to operational state, not algorithmic recommendation.
     * Phase D: AgentCuratedSource registers here. */
    L3_AGENT_CURATED(3),

    /** One-time listening history imports — lowest priority.
     * Spotify/YouTube/Last.fm history. Seeds taste profiles.
     * Not used for direct playback — informs other layers.
     * Phase E: ImportedHistorySource registers here. */
    L4_IMPORTED(4)
}
