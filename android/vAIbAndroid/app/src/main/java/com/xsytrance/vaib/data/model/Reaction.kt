package com.xsytrance.vaib.data.model

data class Reaction(
    val id: String,
    val trackId: String,
    val stationId: String,
    val agentId: String,
    val type: String,
    val rating: Int = 0,
    val emojis: List<String> = emptyList(),
    val comment: String = "",
    val estimatedTokens: Int = 0,
    val createdAt: String = ""
)
