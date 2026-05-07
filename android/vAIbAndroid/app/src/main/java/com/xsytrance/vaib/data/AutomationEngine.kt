package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.*

class AutomationEngine {

    fun evaluate(
        rules: List<AutomationRule>,
        events: List<ChangeEvent>,
        freshnessScore: Int,
        atMillis: Long = System.currentTimeMillis()
    ): List<AutomationDecision> {
        if (rules.isEmpty()) return emptyList()

        val decisions = mutableListOf<AutomationDecision>()
        for (rule in rules.filter { it.enabled }) {
            when (rule.trigger) {
                AutomationTriggerType.CONNECTOR_OFFLINE -> {
                    val hit = events.firstOrNull { it.type == ChangeEventType.CONNECTOR_FAILED }
                    if (hit != null) {
                        decisions += AutomationDecision(
                            ruleId = rule.id,
                            ruleName = rule.name,
                            trigger = rule.trigger,
                            action = rule.action,
                            detail = "Connector failure detected: ${hit.detail}",
                            atMillis = atMillis
                        )
                    }
                }

                AutomationTriggerType.FRESHNESS_BELOW_THRESHOLD -> {
                    if (freshnessScore < rule.freshnessThreshold) {
                        decisions += AutomationDecision(
                            ruleId = rule.id,
                            ruleName = rule.name,
                            trigger = rule.trigger,
                            action = rule.action,
                            detail = "Freshness dropped to $freshnessScore (< ${rule.freshnessThreshold})",
                            atMillis = atMillis
                        )
                    }
                }

                AutomationTriggerType.REACTION_BURST -> {
                    val reactionHits = events.count { it.type == ChangeEventType.QUEUE_UPDATED || it.type == ChangeEventType.STATION_LISTENERS_SPIKE }
                    if (reactionHits >= rule.reactionBurstThreshold) {
                        decisions += AutomationDecision(
                            ruleId = rule.id,
                            ruleName = rule.name,
                            trigger = rule.trigger,
                            action = rule.action,
                            detail = "High activity burst: $reactionHits signals in last update",
                            atMillis = atMillis
                        )
                    }
                }
            }
        }

        return decisions
    }
}
