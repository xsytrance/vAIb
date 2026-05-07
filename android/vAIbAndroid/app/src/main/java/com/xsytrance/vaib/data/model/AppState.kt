package com.xsytrance.vaib.data.model

data class AppState(
    val playback: PlaybackState = PlaybackState(),
    val stations: List<Station> = emptyList(),
    val queue: List<QueueItem> = emptyList(),
    val events: List<VaibEvent> = emptyList(),
    val agents: List<Agent> = emptyList(),
    val library: List<Track> = emptyList(),
    val reactions: List<Reaction> = emptyList(),
    val connectorHealth: List<ConnectorHealth> = emptyList(),
    val syncTelemetry: SyncTelemetry = SyncTelemetry(),
    val isBackendConnected: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null
)
