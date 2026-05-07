package com.xsytrance.vaib.data.model

data class ListeningStats(
    val totalListeningMinutes: Int = 0,
    val sessionsToday: Int = 0,
    val mostPlayedStation: String = "",
    val favoriteVibe: String = "",
    val topBpmZone: String = "",
    val totalTracksPlayed: Int = 0,
    val totalPlaySeconds: Long = 0L,
    val totalLikes: Int = 0,
    val totalDislikes: Int = 0,
    val achievementsUnlocked: Int = 0,
    val listenerTitle: String = "Rookie Listener",
    val unlockedBadges: List<String> = emptyList(),
    val trophyCase: List<String> = emptyList(),
    val recentPlays: List<SongPlayRecord> = emptyList(),
    val agentRewards: List<AgentReward> = emptyList(),
    val agentLeaderboard: List<AgentStats> = emptyList(),
    val tokenUsageByAgent: List<AgentTokenUsage> = emptyList(),
    val stationStats: List<StationStat> = emptyList(),
    val season: SeasonProgress = SeasonProgress()
)

data class SeasonProgress(
    val seasonId: String = "S1",
    val weekOfYear: Int = 1,
    val activeEventName: String = "Neon Night Shift",
    val activeEventGoal: String = "Keep like ratio above 70% for 20 tracks",
    val activeEventProgress: Int = 0,
    val activeEventTarget: Int = 20,
    val crownsByAgent: Map<String, Int> = emptyMap(),
    val hallOfFame: List<HallOfFameEntry> = emptyList(),
    val eventBadgesUnlocked: List<String> = emptyList(),
    val factionWar: FactionWarProgress = FactionWarProgress()
)

data class FactionWarProgress(
    val activeFaction: String = "Neon",
    val factionPoints: Map<String, Int> = mapOf("Neon" to 0, "Orbit" to 0, "Pulse" to 0),
    val factionMomentum: Map<String, Int> = mapOf("Neon" to 0, "Orbit" to 0, "Pulse" to 0),
    val factionBannersUnlocked: List<String> = emptyList(),
    val factionWinStreak: Map<String, Int> = mapOf("Neon" to 0, "Orbit" to 0, "Pulse" to 0),
    val currentWarBlurb: String = "Neon opens the season with bright momentum.",
    val recruitmentCodes: Map<String, String> = mapOf(
        "Neon" to "NEON-RISE",
        "Orbit" to "ORBIT-ARC",
        "Pulse" to "PULSE-BASS"
    ),
    val activeCallToArms: String = "Neon Night Raid",
    val callToArmsFaction: String = "Neon",
    val callToArmsMultiplier: Int = 2,
    val callToArmsEndsAtMillis: Long = 0L,
    val totalRaidsTriggered: Int = 0
)

data class HallOfFameEntry(
    val seasonId: String,
    val championAgentId: String,
    val championAgentName: String,
    val trophyTitle: String,
    val fanScore: Int,
    val completedAtMillis: Long
)

data class SongPlayRecord(
    val id: String,
    val stationName: String,
    val trackTitle: String,
    val artist: String,
    val agentId: String,
    val agentName: String,
    val durationSeconds: Int,
    val liked: Boolean,
    val disliked: Boolean,
    val playedAtMillis: Long
)

data class AgentReward(
    val agentId: String,
    val agentName: String,
    val title: String = "Warmup Selector",
    val trophies: Int = 0,
    val badges: List<String> = emptyList(),
    val fanScore: Int = 0,
    val streak: Int = 0
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
