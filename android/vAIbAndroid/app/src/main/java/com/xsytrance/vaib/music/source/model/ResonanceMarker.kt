package com.xsytrance.vaib.music.source.model

/**
 * A privacy-safe explanation of why a particular track is playing.
 *
 * Displayed in the Resonance Trace bottom sheet ("Why this song?").
 * Summarized, non-creepy, operational context only.
 *
 * INERT BY DESIGN — data class only. Trace generation is stubbed.
 * Phase A: Defined. Phase G: Resonance Trace generator will produce these.
 *
 * Music sovereignty: The user always knows why music is playing.
 * No opaque algorithmic decisions. No "trust us, it's good."
 *
 * Privacy: Default is SUMMARIZED. No raw logs. No creepy specificity.
 * User can disable Resonance Trace entirely in Settings.
 */
data class ResonanceMarker(
    /** Track ID this marker explains. */
    val trackId: String,

    /** Human-readable summary. 1-3 lines, 80-200 characters.
     * Examples:
     * - "Selected during a sync operation. Genre: ambient electronic."
     * - "vg-god selected this during low-load night shift."
     * - "User request via QueueScreen. Added 12 minutes ago."
     * - "Auto-selected from station pool. Genre match: 87%."
     * - "Random fallback — no strong associations found."
     * - "Imported from Spotify history. Played 23 times during evening."
     */
    val summary: String,

    /** Where the trace came from. */
    val source: ResonanceSource,

    /** How confident the explanation is. 0.0-1.0.
     * High = strong operational association.
     * Low = random or weak association. */
    val confidence: Float,

    /** Privacy level controls detail exposure. */
    val privacyLevel: PrivacyLevel = PrivacyLevel.SUMMARIZED
)

/** Where a ResonanceMarker came from. */
enum class ResonanceSource {
    AGENT_TASTE,         // Agent taste profile (genre/BPM preferences)
    OPERATIONAL_CONTEXT, // Task type + time of day association
    USER_REQUEST,        // Explicitly queued by user
    IMPORTED_HISTORY,    // From listening history import
    STATION_POOL,        // Selected from curated pool
    LIVE_STREAM,         // Currently tuned live stream
    RANDOM_FALLBACK      // No strong associations — random selection
}
