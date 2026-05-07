package com.xsytrance.vaib.data.model

enum class ConflictType {
    DUPLICATE_QUEUE_ITEM,
    STALE_AGENT_METADATA,
    CONTRADICTORY_SYNC_TIMESTAMPS
}

enum class ConflictSeverity {
    LOW,
    MEDIUM,
    HIGH
}

data class ConflictItem(
    val id: String,
    val type: ConflictType,
    val severity: ConflictSeverity,
    val title: String,
    val detail: String,
    val safeFixAvailable: Boolean = true
)

data class WeeklyRefreshSummary(
    val generatedAtMillis: Long,
    val staleSourceCount: Int,
    val unresolvedConflictCount: Int,
    val lowFreshnessWindowCount: Int,
    val notes: List<String>
)
