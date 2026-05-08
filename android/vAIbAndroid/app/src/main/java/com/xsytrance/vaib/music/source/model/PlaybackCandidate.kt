package com.xsytrance.vaib.music.source.model

/**
 * A single playable track candidate from a [MusicSource].
 *
 * This is the unified representation of a track regardless of its origin.
 * AudioBackbone will eventually consume PlaybackCandidates instead of
 * raw Station objects, enabling the modular source pipeline.
 *
 * INERT BY DESIGN — data class only. PlaybackOrchestrator produces these.
 * Phase A: Defined. Phase J: ViewModel will consume these for playback.
 *
 * Music sovereignty: The [origin] field ensures the user always knows
 * where music comes from. The [resonance] field provides the "why."
 */
data class PlaybackCandidate(
    /** Unique track identifier (stable across sources). */
    val trackId: String,

    /** Track title. Displayed prominently in Now Playing. */
    val title: String,

    /** Track artist. */
    val artist: String,

    /** Playable URI for ExoPlayer. file://, http://, or asset:// */
    val uri: String,

    /** Which concrete source type produced this candidate. */
    val sourceType: SourceType,

    /** Which source layer this came from (determines priority). */
    val sourceLayer: SourceLayer,

    /** Beats per minute. Null if unknown. */
    val bpm: Int? = null,

    /** Genre tag. Null if unknown. */
    val genre: String? = null,

    /** Energy level 0-100. Null if unknown. */
    val energy: Int? = null,

    /** Duration in milliseconds. Null if unknown. */
    val durationMs: Long? = null,

    /** Artwork URI (file:// or http://). Null if no artwork. */
    val artworkUri: String? = null,

    /** Where this track came from — provenance. */
    val origin: TrackOrigin,

    /** "Why this track?" — resonance trace. Null if not computed yet. */
    val resonance: ResonanceMarker? = null,

    /** Operational associations linking this track to agent activity. */
    val operationalAssociations: List<OperationalAssociation> = emptyList(),

    /** Relevance score 0.0-1.0 from PlaybackOrchestrator ranking.
     * Higher = more relevant to current context. */
    val relevanceScore: Float = 0.0f
)
