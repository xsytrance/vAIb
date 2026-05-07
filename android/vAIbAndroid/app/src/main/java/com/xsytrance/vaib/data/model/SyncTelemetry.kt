package com.xsytrance.vaib.data.model

data class SyncTelemetry(
    val lastSuccessfulSyncAtMillis: Long? = null,
    val lastAttemptAtMillis: Long? = null,
    val consecutiveFailures: Int = 0,
    val avgLatencyMs: Long? = null
)
