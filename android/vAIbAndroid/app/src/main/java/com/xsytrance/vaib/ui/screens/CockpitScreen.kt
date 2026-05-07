package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.Station
import com.xsytrance.vaib.data.model.Track
import com.xsytrance.vaib.ui.components.*
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun CockpitScreen(
    appState: AppState,
    viewModel: VaibViewModel,
    onStationClick: (Station) -> Unit = {},
    onNavigateToStations: () -> Unit = {},
    onNavigateToQueue: () -> Unit = {},
    onNavigateToAgents: () -> Unit = {}
) {
    val playback = appState.playback
    val currentStation = playback.currentStation ?: appState.stations.firstOrNull()
    val currentTrack = playback.currentTrack ?: Track(
        id = "demo-001",
        title = "Synthetic Sunrise",
        artist = "Procedural Ghost",
        bpm = 132
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(bottom = 8.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "vAIb",
                    color = PrimaryNeonCyan,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Agent-native music cockpit",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusPill(
                    status = if (appState.isBackendConnected) "connected" else "disconnected"
                )
                StatusPill(status = if (playback.outputMode == "bluetooth") "bluetooth" else "listening")
                IconButton(onClick = { viewModel.togglePlayPause() }) {
                    Icon(
                        imageVector = if (playback.isPlaying) Icons.Default.PauseCircle else Icons.Default.PlayCircle,
                        contentDescription = "Play/Pause",
                        tint = SecondaryGold
                    )
                }
                IconButton(onClick = { viewModel.refresh() }) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Refresh",
                        tint = PrimaryNeonCyan
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(8.dp)) }

        item {
            if (currentStation != null) {
                StationCard(
                    station = currentStation,
                    isCurrentStation = true
                )
            }
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            VaibCard(neonGlow = true) {
                Column {
                    Text(
                        text = if (playback.isBuffering) "Now Broadcasting (buffering…)" else "Now Broadcasting",
                        color = PrimaryNeonCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = currentTrack.title,
                        color = TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = currentTrack.artist,
                        color = TextSecondary,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row {
                        AgentChip(name = "DJinn", colorHex = "#00E5FF")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Vibe: neon focus",
                            color = AccentMagenta,
                            fontSize = 13.sp,
                            modifier = Modifier.align(Alignment.CenterVertically)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "BPM: ${currentTrack.bpm}",
                            color = PrimaryNeonCyan,
                            fontSize = 13.sp,
                            modifier = Modifier.align(Alignment.CenterVertically)
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            VaibCard {
                Column {
                    Text(
                        text = "Visualizer",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    VisualizerBars(
                        isPlaying = playback.isPlaying,
                        intensity = if (playback.isBuffering) 0.35f else 0.9f
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Queue (${appState.queue.size})",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "See all >",
                    color = PrimaryNeonCyan,
                    fontSize = 12.sp,
                    modifier = Modifier.clickable { onNavigateToQueue() }
                )
            }
        }

        items(appState.queue.take(3)) { queueItem ->
            QueueTrackCard(queueItem = queueItem)
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Reactions (${appState.reactions.size})",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "See all >",
                    color = PrimaryNeonCyan,
                    fontSize = 12.sp,
                    modifier = Modifier.clickable { onNavigateToAgents() }
                )
            }
        }

        items(appState.reactions.take(3)) { reaction ->
            ReactionBadge(reaction = reaction)
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            TokenBudgetPill(
                used = 420,
                total = 800,
                label = "Session Token Budget (DJinn)"
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}
