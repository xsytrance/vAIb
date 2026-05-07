package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.ListeningStats
import com.xsytrance.vaib.ui.components.StatTile
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun StatsScreen(
    appState: AppState,
    viewModel: VaibViewModel
) {
    val stats by viewModel.listeningStats.collectAsState()
    val cockpitPressure by viewModel.cockpitPressure.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "Stats",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Your listening analytics",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatTile(
                    label = "Listen Time",
                    value = "${stats.totalListeningMinutes}m",
                    modifier = Modifier.weight(1f),
                    accentColor = PrimaryNeonCyan
                )
                StatTile(
                    label = "Sessions",
                    value = "${stats.sessionsToday}",
                    modifier = Modifier.weight(1f),
                    accentColor = SecondaryGold
                )
                StatTile(
                    label = "Top Station",
                    value = stats.mostPlayedStation,
                    modifier = Modifier.weight(1f),
                    accentColor = AccentMagenta
                )
                StatTile(
                    label = "Tracks",
                    value = "${stats.totalTracksPlayed}",
                    modifier = Modifier.weight(1f),
                    accentColor = LiveGreen
                )
            }
        }

        item { Spacer(modifier = Modifier.height(8.dp)) }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatTile(
                    label = "Fav Vibe",
                    value = stats.favoriteVibe,
                    modifier = Modifier.weight(1f),
                    accentColor = AccentViolet
                )
                StatTile(
                    label = "Top BPM",
                    value = stats.topBpmZone,
                    modifier = Modifier.weight(1f),
                    accentColor = LiveGreen
                )
                StatTile(
                    label = "Cockpit Pressure",
                    value = cockpitPressure?.let { "$it%" } ?: "--",
                    modifier = Modifier.weight(1f),
                    accentColor = when {
                        (cockpitPressure ?: 0) >= 70 -> ErrorRed
                        (cockpitPressure ?: 0) >= 40 -> SecondaryGold
                        else -> LiveGreen
                    }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            VaibCard {
                Column {
                    Text("Listener Rank: ${stats.listenerTitle}", color = SecondaryGold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Achievements: ${stats.achievementsUnlocked} • Likes: ${stats.totalLikes} • Dislikes: ${stats.totalDislikes}", color = TextSecondary, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Badges: ${if (stats.unlockedBadges.isEmpty()) "none yet" else stats.unlockedBadges.joinToString(" • ")}", color = TextMuted, fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Trophies: ${if (stats.trophyCase.isEmpty()) "none yet" else stats.trophyCase.joinToString(" • ")}", color = TextMuted, fontSize = 11.sp)
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            VaibCard {
                Column {
                    Text("Season ${stats.season.seasonId} • Week ${stats.season.weekOfYear}", color = SecondaryGold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Live Event: ${stats.season.activeEventName}", color = PrimaryNeonCyan, fontSize = 13.sp)
                    Text(stats.season.activeEventGoal, color = TextSecondary, fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    val eventRatio = (stats.season.activeEventProgress.toFloat() / stats.season.activeEventTarget.coerceAtLeast(1)).coerceIn(0f, 1f)
                    androidx.compose.material3.LinearProgressIndicator(
                        progress = { eventRatio },
                        modifier = Modifier.fillMaxWidth().height(5.dp),
                        color = AccentMagenta,
                        trackColor = SurfaceElevated
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${stats.season.activeEventProgress}/${stats.season.activeEventTarget} event points", color = TextMuted, fontSize = 11.sp)
                    if (stats.season.eventBadgesUnlocked.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Event Badges: ${stats.season.eventBadgesUnlocked.joinToString(" • ")}", color = TextMuted, fontSize = 11.sp)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            VaibCard {
                Column {
                    Text("Faction Wars", color = SecondaryGold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Leading Faction: ${stats.season.factionWar.activeFaction}", color = PrimaryNeonCyan, fontSize = 13.sp)
                    Text(stats.season.factionWar.currentWarBlurb, color = TextSecondary, fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    val minsLeft = ((stats.season.factionWar.callToArmsEndsAtMillis - System.currentTimeMillis()) / 60_000L).coerceAtLeast(0)
                    Text(
                        "⚔️ Call to Arms: ${stats.season.factionWar.activeCallToArms} • ${stats.season.factionWar.callToArmsMultiplier}x for ${stats.season.factionWar.callToArmsFaction} • ${minsLeft}m left",
                        color = AccentMagenta,
                        fontSize = 11.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    stats.season.factionWar.factionPoints.entries.sortedByDescending { it.value }.forEach { (name, points) ->
                        val momentum = stats.season.factionWar.factionMomentum[name] ?: 0
                        val streak = stats.season.factionWar.factionWinStreak[name] ?: 0
                        Text("$name • $points pts • momentum $momentum • streak $streak", color = TextMuted, fontSize = 11.sp)
                    }
                    if (stats.season.factionWar.factionBannersUnlocked.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Unlocked Banners: ${stats.season.factionWar.factionBannersUnlocked.joinToString(" • ")}", color = AccentMagenta, fontSize = 11.sp)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Recruitment Codes", color = SecondaryGold, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    stats.season.factionWar.recruitmentCodes.entries.sortedBy { it.key }.forEach { (faction, code) ->
                        Text("$faction: $code", color = TextMuted, fontSize = 11.sp)
                    }
                    Text("Raids triggered: ${stats.season.factionWar.totalRaidsTriggered}", color = TextMuted, fontSize = 11.sp)
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Season Hall of Fame",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        items(stats.season.hallOfFame.take(5)) { hof ->
            VaibCard {
                Column {
                    Text("${hof.championAgentName} • ${hof.trophyTitle}", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.height(3.dp))
                    Text("${hof.seasonId} champion • fan score ${hof.fanScore}", color = TextSecondary, fontSize = 11.sp)
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Agent Titles & Trophy Race",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        items(stats.agentRewards) { reward ->
            VaibCard {
                Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = reward.agentName, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text(text = "${reward.trophies} trophies", color = SecondaryGold, fontSize = 12.sp)
                    }
                    Text(text = reward.title, color = AccentMagenta, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Fan score: ${reward.fanScore} • Streak: ${reward.streak}", color = TextSecondary, fontSize = 11.sp)
                    if (reward.badges.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = reward.badges.joinToString(" • "), color = TextMuted, fontSize = 11.sp)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        items(stats.agentLeaderboard) { agentStat ->
            VaibCard {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = agentStat.agentName,
                            color = TextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "Avg: ${"%.1f".format(agentStat.averageRating)}",
                            color = SecondaryGold,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Queued: ${agentStat.tracksQueued} • Liked: ${agentStat.tracksLiked} • Disliked: ${agentStat.tracksDisliked}",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Token Usage by Agent",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        items(stats.tokenUsageByAgent) { tokenUsage ->
            VaibCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    Text(
                        text = tokenUsage.agentName,
                        color = TextPrimary,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "${tokenUsage.tokensUsed} / ${tokenUsage.tokensBudget}",
                        color = if (tokenUsage.tokensUsed > 400) SecondaryGold else PrimaryNeonCyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                val ratio = tokenUsage.tokensUsed.toFloat() / tokenUsage.tokensBudget
                androidx.compose.material3.LinearProgressIndicator(
                    progress = { ratio.coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp),
                    color = if (ratio > 0.5f) SecondaryGold else PrimaryNeonCyan,
                    trackColor = SurfaceElevated
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Station Statistics",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        items(stats.stationStats) { stationStat ->
            VaibCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    Text(
                        text = stationStat.stationName,
                        color = TextPrimary,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "${stationStat.totalListens} listens",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Like ratio",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                    Text(
                        text = "${"%.0f".format(stationStat.likeRatio * 100)}%",
                        color = LiveGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                androidx.compose.material3.LinearProgressIndicator(
                    progress = { stationStat.likeRatio.coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp),
                    color = LiveGreen,
                    trackColor = SurfaceElevated
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Recent Plays (Agent Log)",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        items(stats.recentPlays.take(20)) { play ->
            VaibCard {
                Column {
                    Text("${play.trackTitle} — ${play.artist}", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.height(3.dp))
                    Text("${play.stationName} • ${play.agentName} • ${play.durationSeconds}s", color = TextSecondary, fontSize = 11.sp)
                    val mood = when {
                        play.liked -> "👍 liked"
                        play.disliked -> "👎 disliked"
                        else -> "➖ neutral"
                    }
                    Text(mood, color = if (play.liked) LiveGreen else if (play.disliked) ErrorRed else TextMuted, fontSize = 11.sp)
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            VaibCard {
                Column {
                    Text(
                        text = "Bluetooth Mode",
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Bluetooth Mode — No data yet",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}
