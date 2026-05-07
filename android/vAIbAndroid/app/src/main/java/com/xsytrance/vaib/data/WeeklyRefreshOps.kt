package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.*

class WeeklyRefreshOps {

    fun generate(
        state: AppState,
        conflicts: List<ConflictItem>,
        freshnessScore: Int,
        atMillis: Long = System.currentTimeMillis()
    ): WeeklyRefreshSummary {
        val staleSourceCount = state.connectorHealth.count { connector ->
            connector.lastSyncAtMillis?.let { syncedAt ->
                val staleMs = connector.staleAfterSeconds * 1000L
                atMillis - syncedAt > staleMs
            } ?: true
        }

        val lowFreshnessWindowCount = when {
            freshnessScore < 30 -> 3
            freshnessScore < 60 -> 1
            else -> 0
        }

        val notes = buildList {
            if (staleSourceCount > 0) add("$staleSourceCount source(s) stale beyond policy")
            if (conflicts.isNotEmpty()) add("${conflicts.size} unresolved conflict(s)")
            if (lowFreshnessWindowCount > 0) add("$lowFreshnessWindowCount low-freshness window(s) this week")
            if (isEmpty()) add("All sources healthy and refreshed this week")
        }

        return WeeklyRefreshSummary(
            generatedAtMillis = atMillis,
            staleSourceCount = staleSourceCount,
            unresolvedConflictCount = conflicts.size,
            lowFreshnessWindowCount = lowFreshnessWindowCount,
            notes = notes
        )
    }
}
