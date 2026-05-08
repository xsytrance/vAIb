package com.xsytrance.vaib.music.source.model

/**
 * Time-of-day classification for operational context and music selection.
 *
 * Used by [PlaybackContext] to inform source selection and
 * [AgentTasteProfile] to track time-based preferences.
 *
 * INERT BY DESIGN — enum only. Computed from system clock.
 * Phase A: Defined. Phase F: Used by operational memory association formation.
 *
 * Boundaries (local time):
 * - MORNING: 06:00 - 11:59
 * - AFTERNOON: 12:00 - 16:59
 * - EVENING: 17:00 - 21:59
 * - NIGHT: 22:00 - 05:59
 */
enum class TimeOfDay {
    MORNING, AFTERNOON, EVENING, NIGHT
}
