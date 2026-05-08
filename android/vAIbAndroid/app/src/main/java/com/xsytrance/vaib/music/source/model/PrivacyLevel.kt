package com.xsytrance.vaib.music.source.model

/**
 * Privacy level for [ResonanceMarker] traces and operational summaries.
 *
 * Controls how much operational detail is exposed to the user
 * in the Resonance Trace bottom sheet ("Why this song?").
 *
 * INERT BY DESIGN — enum only. UI layer respects this level.
 * Phase A: Defined. Phase G: Resonance Trace UI will check this value.
 *
 * Default: SUMMARIZED. User can change in Settings.
 * No raw logs are ever exposed regardless of level.
 */
enum class PrivacyLevel {
    /** Summarized, vague, non-specific. Default.
     * Example: "Selected during a sync operation. Genre: ambient electronic."
     * No agent names, no task details, no timestamps. */
    SUMMARIZED,

    /** More specific but still privacy-safe.
     * Example: "vg-god selected this during sync on PRIME. System load: low."
     * Agent names and task types visible. No raw logs. */
    DETAILED,

    /** Most specific available. Still summarized — raw logs never exposed.
     * Example: "vg-god (Hermes on PRIME) selected this at 02:14 during
     * a 45-minute sync operation. This genre has been selected 12 times
     * during night shifts."
     * Full context but no raw operational data. */
    RAW
}
