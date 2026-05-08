package com.xsytrance.vaib.music.source.orchestration

import com.xsytrance.vaib.music.source.MusicSource
import com.xsytrance.vaib.music.source.model.PlaybackCandidate
import com.xsytrance.vaib.music.source.model.PlaybackContext
import com.xsytrance.vaib.music.source.model.SourceLayer

/**
 * Central orchestrator for the vAIb music source pipeline.
 *
 * Manages all registered [MusicSource] adapters and selects the best
 * [PlaybackCandidate] for a given [PlaybackContext].
 *
 * INERT BY DEFAULT — `isActive = false` means the orchestrator does
 * nothing. The existing `applyPresencePulse()` in ViewModel continues
 * to handle playback. When `isActive = true`, the orchestrator takes
 * over candidate selection.
 *
 * Phase A: Skeleton with stub methods. No source registration.
 * Phase B: PersonalCollectionSource registered.
 * Phase C: LiveStreamSource registered.
 * Phase D: AgentCuratedSource registered.
 * Phase E: ImportedHistorySource registered.
 * Phase J: ViewModel switches from `applyPresencePulse()` to orchestrator.
 *
 * Music sovereignty:
 * - Orchestrator advises; never forces playback.
 * - User-queued tracks bypass orchestrator entirely.
 * - Source switching rate-limited (1 per 15 min, 30s minimum listen).
 * - L1_PERSONAL always highest priority.
 */
class PlaybackOrchestrator {

    /**
     * Whether the orchestrator is active.
     *
     * When false (default): orchestrator does nothing. Existing
     * ViewModel `applyPresencePulse()` handles playback unchanged.
     *
     * When true: orchestrator selects candidates from registered sources.
     * Set to true only after Phase J integration and thorough testing.
     */
    var isActive: Boolean = false

    /** Registered music sources, ordered by layer priority. */
    private val sources: MutableList<MusicSource> = mutableListOf()

    /** Timestamp of last source switch. Used for rate limiting. */
    private var lastSwitchAt: Long = 0L

    /** Minimum milliseconds between source switches (15 minutes). */
    private val minSwitchIntervalMs: Long = 15 * 60 * 1000L

    /** Minimum listen time in ms before allowing a switch (30 seconds). */
    private val minListenTimeMs: Long = 30 * 1000L

    /**
     * Register a music source.
     *
     * Phase A: Inert. Sources are registered but never consulted
     * because `isActive = false`.
     */
    fun registerSource(source: MusicSource) {
        sources.add(source)
        // Sort by layer priority (lower priority number = higher rank)
        sources.sortBy { it.sourceLayer.priority }
    }

    /**
     * Unregister a music source by ID.
     */
    fun unregisterSource(sourceId: String) {
        sources.removeAll { it.sourceId == sourceId }
    }

    /**
     * Select the best candidate for the given context.
     *
     * STUB — Phase A: returns null (orchestrator inactive).
     * Phase J: Consults all registered sources, ranks candidates,
     * applies rate limiting, returns best match.
     */
    suspend fun selectCandidate(context: PlaybackContext): PlaybackCandidate? {
        if (!isActive) return null

        // STUB: Phase J will implement:
        // 1. Ask each source if it canProvideFor(context)
        // 2. Call resolveCandidate() on willing sources
        // 3. Rank candidates by relevanceScore
        // 4. Apply rate limiting (canSwitchSource check)
        // 5. Return best candidate

        return null
    }

    /**
     * Get candidates from all applicable sources, sorted by relevance.
     *
     * STUB — Phase A: returns empty list.
     */
    suspend fun selectCandidates(context: PlaybackContext): List<PlaybackCandidate> {
        if (!isActive) return emptyList()

        // STUB: Phase J will implement.
        return emptyList()
    }

    /**
     * Check if switching from one source layer to another is allowed.
     *
     * Rate-limited: max 1 switch per 15 minutes.
     * Grace period: 30s minimum listen time.
     */
    fun canSwitchSource(from: SourceLayer, to: SourceLayer): Boolean {
        if (!isActive) return false

        val now = System.currentTimeMillis()
        val timeSinceLastSwitch = now - lastSwitchAt

        // Rate limit: max 1 switch per 15 minutes
        if (timeSinceLastSwitch < minSwitchIntervalMs) return false

        // Grace period: must have listened for 30s minimum
        if (timeSinceLastSwitch < minListenTimeMs) return false

        return true
    }

    /**
     * Get a snapshot of registered sources for debugging.
     * Phase A: always empty. Phase B+: shows registered sources.
     */
    fun registeredSources(): List<MusicSource> = sources.toList()

    /**
     * Reset rate limiting state.
     * For testing and user-initiated resets only.
     */
    fun resetRateLimit() {
        lastSwitchAt = 0L
    }
}
