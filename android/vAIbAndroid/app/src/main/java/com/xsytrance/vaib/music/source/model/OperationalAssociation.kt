package com.xsytrance.vaib.music.source.model

/**
 * A weak associative bond between a track and an operational context.
 *
 * Associations form when a task completes (successfully or not) while
 * a track is playing. Over time, repeated associations strengthen the bond.
 * Old associations decay naturally.
 *
 * This is NOT an algorithmic recommendation system. It is operational
 * memory — "this track was playing during that kind of work."
 *
 * INERT BY DESIGN — data class only. Association logic is stubbed.
 * Phase A: Defined. Phase F: Association formation/decay engine implemented.
 *
 * Music sovereignty: Associations are operational, not emotional.
 * No "this track makes you happy" — only "this track was playing
 * during sync operations."
 */
data class OperationalAssociation(
    /** Track ID this association links to. */
    val trackId: String,

    /** Broad task type: "sync", "render", "backup", "idle", "discovery", etc. */
    val taskType: String,

    /** Time of day when association formed. */
    val timeOfDay: TimeOfDay,

    /** System load 0.0-1.0 at time of association. */
    val systemLoad: Float,

    /** Bond weight 0.0-1.0. Higher = stronger association.
     * Initial: 0.1. Reinforced: +0.05 per repetition (max 0.9).
     * Failed: -0.02. Decay: *= 0.99 per day. */
    val weight: Float,

    /** Unix timestamp when association was first created. */
    val createdAt: Long,

    /** Unix timestamp when association was last reinforced. */
    val lastReinforcedAt: Long
)
