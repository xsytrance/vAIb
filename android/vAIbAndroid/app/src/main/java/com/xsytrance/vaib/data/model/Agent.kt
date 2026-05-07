package com.xsytrance.vaib.data.model

data class Agent(
    val id: String,
    val name: String,
    val role: String,
    val status: String,
    val color: String,
    val currentStationId: String? = null,
    val voiceId: String? = null,
    val voiceStyle: String? = null,
    val isDjHost: Boolean = false
)
