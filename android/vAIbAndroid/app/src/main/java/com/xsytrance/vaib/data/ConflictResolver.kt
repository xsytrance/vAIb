package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.*

class ConflictResolver {

    fun detect(state: AppState): List<ConflictItem> {
        val conflicts = mutableListOf<ConflictItem>()

        val dupGroups = state.queue.groupBy { "${it.stationId}|${it.title.lowercase()}|${it.artist.lowercase()}" }
            .filterValues { it.size > 1 }
        dupGroups.forEach { (key, items) ->
            conflicts += ConflictItem(
                id = "dup-$key",
                type = ConflictType.DUPLICATE_QUEUE_ITEM,
                severity = ConflictSeverity.MEDIUM,
                title = "Duplicate queue items",
                detail = "${items.size} duplicates for ${items.first().title} @ ${items.first().stationId}",
                safeFixAvailable = true
            )
        }

        val stationIds = state.stations.map { it.id }.toSet()
        state.agents.forEach { agent ->
            val staleStationRef = agent.currentStationId != null && agent.currentStationId !in stationIds
            val staleStatus = agent.status.isBlank() || agent.status.lowercase() !in setOf("online", "idle", "offline", "live")
            if (staleStationRef || staleStatus) {
                conflicts += ConflictItem(
                    id = "agent-${agent.id}",
                    type = ConflictType.STALE_AGENT_METADATA,
                    severity = ConflictSeverity.LOW,
                    title = "Stale agent metadata",
                    detail = "${agent.name} has stale station reference or unknown status",
                    safeFixAvailable = true
                )
            }
        }

        val telemetry = state.syncTelemetry
        val contradiction = telemetry.lastSuccessfulSyncAtMillis != null &&
            telemetry.lastAttemptAtMillis != null &&
            telemetry.lastAttemptAtMillis < telemetry.lastSuccessfulSyncAtMillis

        if (contradiction) {
            conflicts += ConflictItem(
                id = "sync-contradiction",
                type = ConflictType.CONTRADICTORY_SYNC_TIMESTAMPS,
                severity = ConflictSeverity.HIGH,
                title = "Contradictory sync timestamps",
                detail = "Last attempt is earlier than last successful sync",
                safeFixAvailable = true
            )
        }

        return conflicts
    }

    fun applySafeFixes(state: AppState): AppState {
        val dedupedQueue = state.queue.distinctBy { "${it.stationId}|${it.title.lowercase()}|${it.artist.lowercase()}" }
        val stationIds = state.stations.map { it.id }.toSet()
        val normalizedAgents = state.agents.map { agent ->
            val normalizedStatus = agent.status.lowercase().takeIf {
                it in setOf("online", "idle", "offline", "live")
            } ?: "idle"
            val normalizedStation = agent.currentStationId?.takeIf { it in stationIds }
            agent.copy(status = normalizedStatus, currentStationId = normalizedStation)
        }

        val telemetry = state.syncTelemetry
        val normalizedTelemetry = if (
            telemetry.lastSuccessfulSyncAtMillis != null &&
            telemetry.lastAttemptAtMillis != null &&
            telemetry.lastAttemptAtMillis < telemetry.lastSuccessfulSyncAtMillis
        ) {
            telemetry.copy(lastAttemptAtMillis = telemetry.lastSuccessfulSyncAtMillis)
        } else telemetry

        return state.copy(
            queue = dedupedQueue,
            agents = normalizedAgents,
            syncTelemetry = normalizedTelemetry
        )
    }
}
