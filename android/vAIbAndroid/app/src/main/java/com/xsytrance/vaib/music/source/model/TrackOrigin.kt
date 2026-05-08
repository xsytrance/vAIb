package com.xsytrance.vaib.music.source.model

/**
 * Provenance metadata for a track — where it came from and how it was discovered.
 *
 * Every [PlaybackCandidate] carries a TrackOrigin so the system and user
 * always know the source of music. This is the provenance layer for
 * trust and authenticity.
 *
 * INERT BY DESIGN — data class only. No runtime behavior.
 * Phase A: Defined. Phase B-E: Each MusicSource adapter populates this.
 *
 * Music sovereignty: origin.sourceLayer reveals whether the user owns
 * this track (L1_PERSONAL) or it's from an external source. This
 * information drives UI treatment and user trust.
 */
data class TrackOrigin(
    /** Unique identifier of the MusicSource that provided this track. */
    val sourceId: String,

    /** Which source layer this track belongs to. */
    val sourceLayer: SourceLayer,

    /** Concrete source type. */
    val sourceType: SourceType,

    /** When this track was first discovered by the system. Unix timestamp. */
    val discoveredAt: Long,

    /** Absolute file path for local files. Null for streams and assets. */
    val filePath: String? = null,

    /** HTTP URL for stream sources. Null for local files and assets. */
    val streamUrl: String? = null,

    /** Asset path for bundled tracks (e.g., "audio/station-1.mp3"). */
    val assetName: String? = null
)
