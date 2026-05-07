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
    val connectivityLabel: String = "Offline • no endpoint healthy",
    val activeEndpointLabel: String? = null,
    val endpointAttempted: Int = 0,
    val endpointTotal: Int = 0,
    val activeEndpointLatencyMs: Long? = null,
    val djHostAgentId: String? = null,
    val onAirAgentId: String? = null,
    val nextOnAirAgentId: String? = null,
    val onAirReason: String? = null,
    val onAirShowName: String? = null,
    val tonightLineup: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)
