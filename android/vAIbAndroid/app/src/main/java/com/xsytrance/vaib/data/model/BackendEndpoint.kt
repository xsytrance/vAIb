package com.xsytrance.vaib.data.model

enum class BackendEndpointType {
    TAILNET_DNS,
    TAILNET_IP,
    LOCAL_LAN,
    CUSTOM
}

data class BackendEndpoint(
    val id: String,
    val label: String,
    val baseUrl: String,
    val type: BackendEndpointType,
    val priority: Int
)

data class EndpointHealthResult(
    val endpoint: BackendEndpoint,
    val healthy: Boolean,
    val latencyMs: Long? = null,
    val error: String? = null
)

data class ConnectionConsensus(
    val isConnected: Boolean,
    val activeEndpoint: BackendEndpoint? = null,
    val activeLatencyMs: Long? = null,
    val attempted: Int = 0,
    val healthyCount: Int = 0,
    val results: List<EndpointHealthResult> = emptyList()
)