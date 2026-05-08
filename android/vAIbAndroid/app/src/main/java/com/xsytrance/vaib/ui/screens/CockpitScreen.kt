package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.PlaybackState
import com.xsytrance.vaib.ui.components.AgentChip
import com.xsytrance.vaib.ui.components.QueueTrackCard
import com.xsytrance.vaib.ui.components.StatusPill
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.components.VisualizerBars
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

/**
 * CockpitScreen v2 — Visualizer-first music cockpit.
 *
 * Hybrid Safe Slice: visualizer always visible, big Now Playing,
 * minimal metadata, no hardcoded fake entities.
 *
 * Layout (top to bottom):
 *   Pinned: Visualizer strip (36dp, always visible)
 *   LazyColumn:
 *     1. App header ("vAIb" 36sp, no subtitle)
 *     2. Status row (connectivity + play/pause)
 *     3. Now Playing card (L1, neonGlow) — track, artist, agent, bpm/vibe
 *     4. On Air — agent name + show name
 *     5. Queue preview — header + 3 items
 *     6. Bottom spacer (80dp)
 *
 * Removed from v1: route text, connector health, station card,
 *   "Now Broadcasting" label, hardcoded AgentChip("DJinn"),
 *   hardcoded "Vibe: neon focus", reactions preview, token budget.
 */
@Composable
fun CockpitScreen(
    viewModel: VaibViewModel,
    appState: AppState,
    modifier: Modifier = Modifier
) {
    val playback = appState.playback
    val currentStation = appState.stations.find { it.id == playback.currentStation.id }

    // Dynamic agent resolution (no hardcoded "DJinn")
    val onAirAgent = remember(appState.onAirAgentId, appState.agents) {
        appState.agents.firstOrNull { it.id == appState.onAirAgentId }
    }
    val agentName = onAirAgent?.name?.lowercase() ?: appState.onAirAgentId.lowercase()
    val agentColor = onAirAgent?.color ?: PrimaryNeonCyan.toString()

    // Connectivity
    val connectivity = appState.connectivityLabel
    val outputMode = playback.outputMode
    val activeLabel = appState.activeEndpointLabel ?: "no link"
    val attempted = appState.endpointAttempted
    val total = appState.endpointTotal
    val latencyMs = appState.activeEndpointLatencyMs

    Column(modifier = modifier.fillMaxSize()) {
        // === PINNED: Visualizer strip (always visible, NOT in LazyColumn) ===
        // 36dp compact strip at top of screen. Never scrolls away.
        // Height is caller-controlled; default 64dp overridden to 36dp here.
        VisualizerBars(
            modifier = Modifier
                .fillMaxWidth()
                .height(36.dp),
            isPlaying = playback.isPlaying,
            intensity = if (playback.isBuffering) 0.35f else 0.9f
        )

        // === SCROLLABLE: Everything below the visualizer ===
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 8.dp)
        ) {
            // --- 1. App Header ---
            // "vAIb" 36sp Bold Cyan. No subtitle. The app name is enough.
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "vAIb",
                    color = PrimaryNeonCyan,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            // --- 2. Status Row ---
            // Simplified: connectivity pill + play/pause icon only.
            // Route text removed (was 11sp dev telemetry).
            // Refresh icon removed (redundant with pull-to-refresh or automatic).
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Connection status
                    val connectivityColor = when {
                        connectivity.contains("online") -> LiveGreen
                        connectivity.contains("degraded") -> SecondaryGold
                        else -> ErrorRed
                    }
                    StatusPill(
                        label = if (latencyMs != null) "$activeLabel ${latencyMs}ms" else connectivity,
                        color = connectivityColor
                    )

                    // Play / Pause
                    val isActuallyPlaying = playback.isPlaying && !playback.isBuffering
                    IconButton(onClick = { viewModel.togglePlayPause() }) {
                        Text(
                            text = if (isActuallyPlaying) "⏸" else "▶",
                            fontSize = 24.sp,
                            color = PrimaryNeonCyan
                        )
                    }
                }
            }

            // --- 3. Now Playing (L1 Card, neonGlow) ---
            // The most important card on screen. Music is sovereign here.
            // Track title: 20sp Bold (headlineMedium) — largest text below header.
            // Artist: 18sp (headlineSmall)
            // Agent + BPM + Vibe: single line, 13sp, dynamic (no hardcoded values).
            item {
                Spacer(modifier = Modifier.height(20.dp))
                VaibCard(neonGlow = true) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Track title — MUSIC IS SOVEREIGN
                        val trackTitle = playback.currentTrack?.title
                        Text(
                            text = trackTitle ?: "No track playing",
                            color = if (trackTitle != null) TextPrimary else TextMuted,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        // Artist name
                        val artistName = playback.currentTrack?.artist
                        if (artistName != null) {
                            Text(
                                text = artistName,
                                color = TextSecondary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        // Agent + BPM + Vibe — single line, dynamic
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Dynamic agent chip (was hardcoded "DJinn")
                            AgentChip(
                                name = agentName,
                                colorHex = agentColor
                            )

                            // BPM
                            val bpm = playback.currentTrack?.bpm
                            if (bpm != null) {
                                Text(
                                    text = "$bpm BPM",
                                    color = PrimaryNeonCyan,
                                    fontSize = 13.sp
                                )
                            }

                            // Dynamic vibe from station (was hardcoded "neon focus")
                            val vibe = currentStation?.vibe
                            if (!vibe.isNullOrBlank()) {
                                Text(
                                    text = vibe,
                                    color = AccentMagenta,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }
            }

            // --- 4. On Air ---
            // Compact: agent name + show name only (2 lines).
            // Next slot, reason, lineup moved to QueueScreen / AgentsScreen.
            item {
                Spacer(modifier = Modifier.height(4.dp))
                VaibCard {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "On Air: $agentName",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        val showName = appState.onAirShowName
                        if (showName.isNotBlank()) {
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = showName,
                                color = TextSecondary,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            // --- 5. Queue Preview ---
            // Header + first 3 queue items. Unchanged from v1.
            item {
                Spacer(modifier = Modifier.height(16.dp))
                val queue = appState.queue
                if (queue.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Queue (${queue.size})",
                            color = TextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    queue.take(3).forEach { item ->
                        QueueTrackCard(
                            title = item.title,
                            artist = item.artist,
                            requestedBy = item.requestedBy,
                            likes = item.likes,
                            dislikes = item.dislikes
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }

            // --- 6. Bottom Spacer ---
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}
