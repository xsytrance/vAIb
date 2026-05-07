package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.Track
import com.xsytrance.vaib.ui.components.*
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun LandscapeDjDeck(
    appState: AppState,
    viewModel: VaibViewModel
) {
    val playback = appState.playback
    val currentTrack = playback.currentTrack ?: Track(
        id = "demo-001",
        title = "Synthetic Sunrise",
        artist = "Procedural Ghost",
        bpm = 132
    )
    val currentStation = playback.currentStation ?: appState.stations.firstOrNull()

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(8.dp)
    ) {
        // Left Column: Station list + agent chips
        Column(
            modifier = Modifier
                .weight(0.3f)
                .fillMaxHeight()
                .padding(end = 4.dp)
        ) {
            Text(
                text = "Stations",
                color = PrimaryNeonCyan,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(8.dp)
            )

            appState.stations.forEach { station ->
                VaibCard(
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                    neonGlow = currentStation?.id == station.id
                ) {
                    Column {
                        Text(
                            text = station.name,
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${station.hostAgent} • ${station.genre}",
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        StatusPill(status = if (station.isLive) "hosting" else "offline")
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Booth",
                color = PrimaryNeonCyan,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(8.dp)
            )

            // Custom flow layout for agent chips
            val agents = appState.agents
            var rowItems = 0
            Row(
                modifier = Modifier.padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                agents.take(4).forEach { agent ->
                    AgentChip(name = agent.name, colorHex = agent.color)
                }
            }
            if (agents.size > 4) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    agents.drop(4).forEach { agent ->
                        AgentChip(name = agent.name, colorHex = agent.color)
                    }
                }
            }
        }

        // Center Column: Big now playing + visualizer + mini EQ
        Column(
            modifier = Modifier
                .weight(0.4f)
                .fillMaxHeight()
                .padding(horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Now Playing",
                color = PrimaryNeonCyan,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(8.dp)
            )

            VaibCard(neonGlow = true) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = currentTrack.title,
                        color = TextPrimary,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = currentTrack.artist,
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (currentStation != null) {
                        AgentChip(name = currentStation.hostAgent, colorHex = "#00E5FF")
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "BPM: ${currentTrack.bpm} • ${playback.outputMode.uppercase()}",
                        color = PrimaryNeonCyan,
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            VisualizerBars(
                modifier = Modifier.fillMaxWidth(),
                barCount = 32,
                isPlaying = playback.isPlaying
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Mini EQ",
                color = TextSecondary,
                fontSize = 12.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                val miniBands = listOf(50, 60, 55, 70, 65, 50, 45, 55)
                miniBands.forEachIndexed { index, value ->
                    val freqs = listOf("60", "170", "310", "600", "1k", "3k", "6k", "12k")
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .width(12.dp)
                                .height((value * 0.6).dp)
                                .background(
                                    if (value > 60) AccentMagenta else PrimaryNeonCyan,
                                    RoundedCornerShape(2.dp)
                                )
                        )
                        Text(
                            text = freqs[index],
                            color = TextMuted,
                            fontSize = 7.sp
                        )
                    }
                }
            }
        }

        // Right Column: Queue + reactions + mini stats
        Column(
            modifier = Modifier
                .weight(0.3f)
                .fillMaxHeight()
                .padding(start = 4.dp)
        ) {
            Text(
                text = "Queue",
                color = PrimaryNeonCyan,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(8.dp)
            )

            appState.queue.take(5).forEach { queueItem ->
                VaibCard(modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)) {
                    Column {
                        Text(
                            text = queueItem.title,
                            color = TextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${queueItem.artist} • ${queueItem.bpm} BPM",
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Reactions",
                color = PrimaryNeonCyan,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(8.dp)
            )

            appState.reactions.take(3).forEach { reaction ->
                VaibCard(modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .background(
                                        when (reaction.agentId) {
                                            "djinn" -> PrimaryNeonCyan
                                            "salsa-bot" -> AccentMagenta
                                            "groove-whisper" -> SecondaryGold
                                            "synth-rider" -> AccentViolet
                                            "bass-forge" -> ErrorRed
                                            "harmony" -> LiveGreen
                                            else -> TextMuted
                                        },
                                        CircleShape
                                    )
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = reaction.agentId,
                                color = TextPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.weight(1f))
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = reaction.comment,
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Mini stats
            VaibCard {
                Column {
                    Text(
                        text = "Session",
                        color = PrimaryNeonCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Volume: ${playback.volume}%",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                    Text(
                        text = if (playback.isPlaying) "Playing" else "Paused",
                        color = if (playback.isPlaying) LiveGreen else ErrorRed,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}