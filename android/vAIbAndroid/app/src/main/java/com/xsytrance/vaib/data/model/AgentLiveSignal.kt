package com.xsytrance.vaib.data.model

data class AgentLiveSignal(
    val moodFromWork: String = "",
    val workload: Int = 0,
    val preferredGenresNow: List<String> = emptyList()
)
