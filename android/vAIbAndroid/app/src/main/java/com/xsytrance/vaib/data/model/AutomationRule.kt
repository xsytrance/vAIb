package com.xsytrance.vaib.data.model

enum class AutomationTriggerType {
    CONNECTOR_OFFLINE,
    FRESHNESS_BELOW_THRESHOLD,
    REACTION_BURST
}

enum class AutomationActionType {
    LOCAL_NOTIFICATION,
    PIN_UPDATE,
    FORCE_REFRESH
}

data class AutomationRule(
    val id: String,
    val name: String,
    val enabled: Boolean,
    val trigger: AutomationTriggerType,
    val action: AutomationActionType,
    val freshnessThreshold: Int = 45,
    val reactionBurstThreshold: Int = 3
)

data class AutomationDecision(
    val ruleId: String,
    val ruleName: String,
    val trigger: AutomationTriggerType,
    val action: AutomationActionType,
    val detail: String,
    val atMillis: Long
)
