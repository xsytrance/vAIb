package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.*
import kotlin.math.abs

class ChangeFeedEngine {

    fun compute(previous: AppState?, current: AppState, atMillis: Long = System.currentTimeMillis()): List<ChangeEvent> {
        if (previous == null) return emptyList()
        val events = mutableListOf<ChangeEvent>()

        if (previous.queue.firstOrNull()?.id != current.queue.firstOrNull()?.id || previous.queue.size != current.queue.size) {
            events += ChangeEvent(
                id = "chg-queue-$atMillis",
                type = ChangeEventType.QUEUE_UPDATED,
                key = "queue.updated",
                title = "Queue updated",
                detail = "${current.queue.size} tracks queued",
                atMillis = atMillis,
                severity = 1
            )
        }

        val previousAgent = previous.agents.associateBy { it.id }
        current.agents.forEach { agent ->
            val old = previousAgent[agent.id] ?: return@forEach
            if (old.status != agent.status) {
                events += ChangeEvent(
                    id = "chg-agent-${agent.id}-$atMillis",
                    type = ChangeEventType.AGENT_STATUS_CHANGED,
                    key = "agent.status_changed",
                    title = "${agent.name} status changed",
                    detail = "${old.status} → ${agent.status}",
                    atMillis = atMillis,
                    severity = 2
                )
            }
        }

        val prevConn = previous.connectorHealth.associateBy { it.id }
        current.connectorHealth.forEach { conn ->
            val old = prevConn[conn.id] ?: return@forEach
            if (old.status != conn.status && conn.status != ConnectorStatus.ONLINE) {
                events += ChangeEvent(
                    id = "chg-conn-${conn.id}-$atMillis",
                    type = ChangeEventType.CONNECTOR_FAILED,
                    key = "connector.failed",
                    title = "${conn.name} degraded",
                    detail = conn.lastError ?: "Status ${old.status} → ${conn.status}",
                    atMillis = atMillis,
                    severity = 3
                )
            }
            if (old.status != conn.status && old.status != ConnectorStatus.ONLINE && conn.status == ConnectorStatus.ONLINE) {
                events += ChangeEvent(
                    id = "chg-recovered-${conn.id}-$atMillis",
                    type = ChangeEventType.SYNC_RECOVERED,
                    key = "sync.recovered",
                    title = "${conn.name} recovered",
                    detail = "Connection healthy again",
                    atMillis = atMillis,
                    severity = 1
                )
            }
        }

        val prevStations = previous.stations.associateBy { it.id }
        current.stations.forEach { station ->
            val old = prevStations[station.id] ?: return@forEach
            if (station.listeners > old.listeners && abs(station.listeners - old.listeners) >= 12) {
                events += ChangeEvent(
                    id = "chg-station-${station.id}-$atMillis",
                    type = ChangeEventType.STATION_LISTENERS_SPIKE,
                    key = "station.listeners_spike",
                    title = "${station.name} listeners spike",
                    detail = "+${station.listeners - old.listeners} listeners",
                    atMillis = atMillis,
                    severity = 2
                )
            }
        }

        return events
    }
}
