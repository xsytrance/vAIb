package com.xsytrance.vaib.music.source.model

/**
 * How an agent's operational state and taste influence music selection.
 *
 * Attached to [AgentTasteProfile], this captures the agent's
 * musical preferences derived from operational history.
 *
 * INERT BY DESIGN — data class only. No computation.
 * Phase A: Defined. Phase F: Association engine will populate this.
 */
data class MusicInfluence(
    /** Preferred genres with preference scores 0.0-1.0.
     * Example: {"ambient electronic" to 0.8, "synthwave" to 0.4} */
    val genreWeights: Map<String, Float> = emptyMap(),

    /** Preferred BPM range. Null if no preference established. */
    val preferredBpmRange: IntRange? = null,

    /** Preferred energy level 0-100. Null if no preference. */
    val preferredEnergy: Int? = null,

    /** Time-of-day genre preferences.
     * Example: {NIGHT -> ["ambient", "drone"], MORNING -> ["synthwave"]} */
    val timeOfDayPreferences: Map<TimeOfDay, List<String>> = emptyMap()
)
