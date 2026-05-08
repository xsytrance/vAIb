package com.xsytrance.vaib.music.source.model

/**
 * Operational context that informs music source selection.
 *
 * PlaybackOrchestrator uses this context to rank candidates across
 * all registered sources. The context captures the current operational
 * state of the system, the agent, and the environment.
 *
 * INERT BY DESIGN — data class only. No computation.
 * Phase A: Defined. Phase F: Operational memory system will produce these.
 * Phase I: Prime Nexus signals will populate systemLoad and agent state.
 *
 * Music sovereignty: PlaybackContext informs selection but never
 * overrides user preference. If the user has queued a track, that
 * request takes precedence over all context signals.
 */
data class PlaybackContext(
    /** Current station ID. Null if no station active. */
    val currentStationId: String? = null,

    /** Currently on-air agent ID. Null if no agent active. */
    val currentAgentId: String? = null,

    /** Current operational emotional state of the active agent. */
    val operationalState: String? = null, // OES name: "focused", "idle", "strained"

    /** Time of day classification. */
    val timeOfDay: TimeOfDay = TimeOfDay.MORNING,

    /** System load 0.0-1.0. From Prime Nexus. Null if unavailable. */
    val systemLoad: Float? = null,

    /** Last N track IDs (for deduplication). Most recent first. */
    val recentTrackIds: List<String> = emptyList(),

    /** Agent taste profile for the active agent. Null if not loaded. */
    val agentTaste: AgentTasteProfile? = null,

    /** User's preferred source layers (ordered). Empty = all layers. */
    val preferredLayers: List<SourceLayer> = emptyList(),

    /** What source layer is currently playing. Null if nothing playing. */
    val currentSourceLayer: SourceLayer? = null
)
