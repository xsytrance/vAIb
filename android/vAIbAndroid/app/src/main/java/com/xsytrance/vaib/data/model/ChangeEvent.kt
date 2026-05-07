package com.xsytrance.vaib.data.model

enum class ChangeEventType {
    QUEUE_UPDATED,
    AGENT_STATUS_CHANGED,
    CONNECTOR_FAILED,
    STATION_LISTENERS_SPIKE,
    SYNC_RECOVERED
}

data class ChangeEvent(
    val id: String,
    val type: ChangeEventType,
    val key: String,
    val title: String,
    val detail: String,
    val atMillis: Long,
    val severity: Int = 1
)