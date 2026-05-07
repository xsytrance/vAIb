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
import com.xsytrance.vaib.data.model.AgentLiveSignal
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.Agent
import com.xsytrance.vaib.data.model.TasteProfile
import com.xsytrance.vaib.ui.components.*
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun AgentsScreen(
    appState: AppState,
    viewModel: VaibViewModel
) {
    val tasteProfiles by viewModel.tasteProfiles.collectAsState()
    val liveSignals by viewModel.agentLiveSignals.collectAsState()

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
                    text = "Agents",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${appState.agents.size} active agents",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }
        }

        items(appState.agents) { agent ->
            AgentDetailCard(
                agent = agent,
                tasteProfile = tasteProfiles[agent.id],
                liveSignal = liveSignals[agent.id]
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun AgentDetailCard(
    agent: Agent,
    tasteProfile: TasteProfile?,
    liveSignal: AgentLiveSignal?
) {
    VaibCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = agent.name,
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = agent.role,
                        color = TextSecondary,
                        fontSize = 13.sp
                    )
                }
                StatusPill(status = agent.status)
            }

            Spacer(modifier = Modifier.height(8.dp))

            AgentChip(name = agent.name, colorHex = agent.color)

            if (liveSignal != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Workload: ${liveSignal.workload}%",
                    color = SecondaryGold,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                if (liveSignal.moodFromWork.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Work Mood: ${liveSignal.moodFromWork}",
                        color = PrimaryNeonCyan,
                        fontSize = 12.sp
                    )
                }
                if (liveSignal.preferredGenresNow.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Now spinning: ${liveSignal.preferredGenresNow.joinToString(", ")}",
                        color = AccentMagenta,
                        fontSize = 12.sp
                    )
                }
            }

            if (tasteProfile != null) {
                Spacer(modifier = Modifier.height(8.dp))

                if (tasteProfile.favoriteGenres.isNotEmpty()) {
                    Text(
                        text = "Likes: ${tasteProfile.favoriteGenres.joinToString(", ")}",
                        color = LiveGreen,
                        fontSize = 12.sp
                    )
                }

                if (tasteProfile.dislikedGenres.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Dislikes: ${tasteProfile.dislikedGenres.joinToString(", ")}",
                        color = ErrorRed,
                        fontSize = 12.sp
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "BPM: ${tasteProfile.preferredBpmMin}-${tasteProfile.preferredBpmMax} • Energy: ${"%.0f".format(tasteProfile.energyPreference * 100)}%",
                    color = PrimaryNeonCyan,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                TokenBudgetPill(
                    used = tasteProfile.tokenBudgetUsed,
                    total = tasteProfile.tokenBudgetPerSession,
                    label = "${agent.name} Token Budget"
                )

                if (tasteProfile.commentStyle.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Style: ${tasteProfile.commentStyle}",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }

                if (tasteProfile.emojiStyle.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Emojis: ${tasteProfile.emojiStyle.joinToString(", ")}",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
