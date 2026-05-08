package com.xsytrance.vaib.music.source.model

/**
 * An agent's musical taste derived from operational history.
 *
 * "Personality through operational history" — not a fake persona,
 * but a probabilistic preference model built from observed behavior.
 *
 * Taste evolves gradually, transparently, and is always overrideable.
 * The user controls the vibe profile; agent taste is a soft influence layer.
 *
 * INERT BY DESIGN — data class only. Taste engine is stubbed.
 * Phase A: Defined. Phase F: Operational memory engine will populate this.
 *
 * Music sovereignty: Agent taste informs selection but never overrides
 * user requests. The user is always in control.
 */
data class AgentTasteProfile(
    /** Agent ID this profile belongs to. */
    val agentId: String,

    /** Musical influence — genre, BPM, energy preferences. */
    val musicInfluence: MusicInfluence = MusicInfluence(),

    /** Operational context → track ID correlations.
     * Example: {"sync" -> ["track-001", "track-007"]} */
    val operationalMusicCorrelation: Map<String, List<String>> = emptyMap(),

    /** How many associations have formed for this agent.
     * Low count = taste model is immature (random selection dominates).
     * High count = taste model is mature (informed selection dominates). */
    val associationCount: Int = 0,

    /** When this profile was first created. */
    val createdAt: Long = System.currentTimeMillis(),

    /** When this profile was last updated. */
    val lastUpdatedAt: Long = System.currentTimeMillis()
)
