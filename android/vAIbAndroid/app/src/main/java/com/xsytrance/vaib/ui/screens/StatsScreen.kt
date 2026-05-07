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
                    value = "${'$'}{stats.totalListeningMinutes}m",
                    modifier = Modifier.weight(1f),
                    accentColor = PrimaryNeonCyan
                )
                StatTile(
                    label = "Sessions",
                    value = "${'$'}{stats.sessionsToday}",
                    modifier = Modifier.weight(1f),
                    accentColor = SecondaryGold
                )
                StatTile(
                    label = "Top Station",
                    value = stats.mostPlayedStation,
                    modifier = Modifier.weight(1f),
                    accentColor = AccentMagenta
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
                    label = "Agents",
                    value = "${'$'}{stats.agentLeaderboard.size}",
                    modifier = Modifier.weight(1f),
                    accentColor = LiveGreen
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Text(
                text = "Agent Leaderboard",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

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
                            text = "Avg: ${'$'}{String.format("%.1f", agentStat.averageRating)}",
                            color = SecondaryGold,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Queued: ${'$'}{agentStat.tracksQueued} • Liked: ${'$'}{agentStat.tracksLiked} • Disliked: ${'$'}{agentStat.tracksDisliked}",
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
                        text = "${'$'}{tokenUsage.tokensUsed} / ${'$'}{tokenUsage.tokensBudget}",
                        color = if (tokenUsage.tokensUsed > 400) SecondaryGold else PrimaryNeonCyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                val ratio = tokenUsage.tokensUsed.toFloat() / tokenUsage.tokensBudget
                androidx.compose.material3.LinearProgressIndicator(
                    progress = ratio.coerceIn(0f, 1f),
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
                        text = "${'$'}{stationStat.totalListens} listens",
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
                        text = "${'$'}{String.format("%.0f%%", stationStat.likeRatio * 100)}",
                        color = LiveGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                androidx.compose.material3.LinearProgressIndicator(
                    progress = stationStat.likeRatio.coerceIn(0f, 1f),
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
