package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.ConnectorStatus

class FreshnessScorer {
    fun score(state: AppState, nowMillis: Long = System.currentTimeMillis()): Int {
        val telemetry = state.syncTelemetry
        var score = 100

        val successAgeMs = telemetry.lastSuccessfulSyncAtMillis?.let { nowMillis - it } ?: 120_000L
        score -= (successAgeMs / 5000L).toInt().coerceAtMost(35)

        val degradedPenalty = state.connectorHealth.count { it.status == ConnectorStatus.DEGRADED } * 10
        val offlinePenalty = state.connectorHealth.count { it.status == ConnectorStatus.OFFLINE } * 20
        score -= (degradedPenalty + offlinePenalty)

        score -= (telemetry.consecutiveFailures * 6).coerceAtMost(24)
        if (state.error != null) score -= 10

        return score.coerceIn(0, 100)
    }
}
