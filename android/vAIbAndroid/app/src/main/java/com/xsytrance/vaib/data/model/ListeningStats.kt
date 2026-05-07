package com.xsytrance.vaib.data.model

data class ListeningStats(
    val totalListeningMinutes: Int = 0,
    val sessionsToday: Int = 0,
    val mostPlayedStation: String = "",
    val favoriteVibe: String = "",
    val topBpmZone: String = "",
    val agentLeaderboard: List<AgentStats> = emptyList(),
    val tokenUsageByAgent: List<AgentTokenUsage> = emptyList(),
    val stationStats: List<StationStat> = emptyList()
)

data class AgentStats(
    val agentId: String,
    val agentName: String,
    val tracksQueued: Int = 0,
    val tracksLiked: Int = 0,
    val tracksDisliked: Int = 0,
    val averageRating: Float = 0f
)

data class AgentTokenUsage(
    val agentId: String,
    val agentName: String,
    val tokensUsed: Int = 0,
    val tokensBudget: Int = 800
)

data class StationStat(
    val stationId: String,
    val stationName: String,
    val totalListens: Int = 0,
    val likeRatio: Float = 0f
)
