package com.xsytrance.vaib.data.model

data class TokenUsage(
    val agentId: String,
    val totalUsed: Int = 0,
    val budget: Int = 800,
    val sessionCount: Int = 0
)
