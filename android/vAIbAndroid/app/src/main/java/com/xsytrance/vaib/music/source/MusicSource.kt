package com.xsytrance.vaib.music.source

import com.xsytrance.vaib.music.source.model.PlaybackCandidate
import com.xsytrance.vaib.music.source.model.PlaybackContext
import com.xsytrance.vaib.music.source.model.SourceLayer
import com.xsytrance.vaib.music.source.model.SourceType

/**
 * Interface for all music sources in the vAIb pipeline.
 *
 * Every source of music — local files, live streams, agent pools,
 * imported history — implements this interface. The [PlaybackOrchestrator]
 * consults all registered sources to select the best playback candidate.
 *
 * INERT BY DESIGN — interface only. No implementations in Phase A.
 * Phase B-E: One concrete adapter per source type.
 *
 * Music sovereignty: Each source declares what it can provide.
 * The orchestrator decides which source to use. No source can
 * force playback — all are advisory.
 */
interface MusicSource {

    /** Unique identifier for this source instance. */
    val sourceId: String

    /** Which source layer this belongs to. Determines priority. */
    val sourceLayer: SourceLayer

    /** Concrete source type. */
    val sourceType: SourceType

    /**
     * Can this source provide a candidate for the given context?
     *
     * STUB — Phase A: returns false. Future phases: actual capability check.
     */
    fun canProvideFor(context: PlaybackContext): Boolean

    /**
     * Get the best candidate for this context.
     *
     * STUB — Phase A: returns null. Future phases: actual candidate selection.
     */
    suspend fun resolveCandidate(context: PlaybackContext): PlaybackCandidate?

    /**
     * Browse all available candidates (for browsing UI, not playback).
     *
     * STUB — Phase A: returns empty list. Future phases: actual browse.
     */
    suspend fun browse(context: PlaybackContext): List<PlaybackCandidate>
}
