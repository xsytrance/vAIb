package com.xsytrance.vaib.data.model

data class VaibEvent(
    val id: String,
    val type: String,
    val description: String,
    val stationId: String = "",
    val agentId: String = "",
    val trackTitle: String = "",
    val artist: String = "",
    val createdAt: String = ""
)
