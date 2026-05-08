package com.xsytrance.vaib.music.source

import com.xsytrance.vaib.music.source.model.PlaybackCandidate
import com.xsytrance.vaib.music.source.model.PlaybackContext
import com.xsytrance.vaib.music.source.model.SourceLayer
import com.xsytrance.vaib.music.source.model.SourceType

/**
 * Inert placeholder implementation of [MusicSource].
 *
 * Used as a template for future source adapters and as a null-safe
 * fallback. All methods return empty/null. Zero runtime impact.
 *
 * INERT BY DESIGN — all methods return identity values.
 * Phase A: Exists as template. Phase B-E: Replaced by real adapters.
 *
 * Music sovereignty: This source never provides candidates.
 * It exists only as a structural placeholder.
 *
 * Future adapters will follow this pattern:
 * ```kotlin
 * class PersonalCollectionSource(
 *     private val dao: LocalCollectionDao
 * ) : MusicSource {
 *     override val sourceId = "personal-collection"
 *     override val sourceLayer = SourceLayer.L1_PERSONAL
 *     override val sourceType = SourceType.PERSONAL_TRACK
 *     override fun canProvideFor(context: PlaybackContext) = true
 *     override suspend fun resolveCandidate(context: PlaybackContext) = ...
 *     override suspend fun browse(context: PlaybackContext) = ...
 * }
 * ```
 */
class StubMusicSource(
    override val sourceId: String = "stub",
    override val sourceLayer: SourceLayer = SourceLayer.L4_IMPORTED,
    override val sourceType: SourceType = SourceType.IMPORTED_HISTORY
) : MusicSource {

    /**
     * STUB: Always returns false.
     * Real adapters check their capability against context.
     */
    override fun canProvideFor(context: PlaybackContext): Boolean {
        // STUB: Phase B-E will implement actual capability checks.
        return false
    }

    /**
     * STUB: Always returns null.
     * Real adapters search their collection and return best match.
     */
    override suspend fun resolveCandidate(context: PlaybackContext): PlaybackCandidate? {
        // STUB: Phase B-E will implement actual candidate resolution.
        return null
    }

    /**
     * STUB: Always returns empty list.
     * Real adapters return their full browseable collection.
     */
    override suspend fun browse(context: PlaybackContext): List<PlaybackCandidate> {
        // STUB: Phase B-E will implement actual browse.
        return emptyList()
    }
}
