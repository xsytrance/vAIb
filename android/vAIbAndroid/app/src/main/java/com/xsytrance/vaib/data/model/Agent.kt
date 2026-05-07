package com.xsytrance.vaib.data.model

data class Agent(
    val id: String,
    val name: String,
    val role: String,
    val status: String,
    val color: String,
    val currentStationId: String? = null
)
