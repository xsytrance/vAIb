package com.xsytrance.vaib.data.model

enum class ConnectorStatus {
    ONLINE,
    DEGRADED,
    OFFLINE
}

data class ConnectorHealth(
    val id: String,
    val name: String,
    val status: ConnectorStatus,
    val lastSyncAtMillis: Long? = null,
    val lastError: String? = null,
    val latencyMs: Long? = null,
    val staleAfterSeconds: Int = 30
)
