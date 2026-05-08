package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.RefreshMode
import com.xsytrance.vaib.ui.components.RefreshControlCard
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.ui.fx.core.MotionIntensity
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun SettingsScreen(
    viewModel: VaibViewModel
) {
    val backendUrl by viewModel.backendUrlState.collectAsState()
    val tailnetHostname by viewModel.tailnetHostnameState.collectAsState()
    val tailnetPort by viewModel.tailnetPortState.collectAsState()
    var demoMode by remember { mutableStateOf(false) }
    var pollInterval by remember { mutableStateOf(6f) }
    var bluetoothMode by remember { mutableStateOf(true) }
    var tokenCommentLimit by remember { mutableStateOf("280") }
    var maxReactions by remember { mutableStateOf("25") }
    var djScriptDraft by remember { mutableStateOf("Tonight's vibe is adaptive, hypnotic, and collaborative. Our agents are flowing between deep focus and pulse-driving grooves.") }

    val appState by viewModel.appState.collectAsState()
    val voiceSaveState by viewModel.voiceSaveState.collectAsState()
    val agentVoiceDrafts by viewModel.agentVoiceDrafts.collectAsState()
    val djHostAgentId by viewModel.djHostAgentId.collectAsState()
    val elevenLabsApiKey by viewModel.elevenLabsApiKeyState.collectAsState()
    val djNarrationPreviewState by viewModel.djNarrationPreviewState.collectAsState()
    val strictBroadcastMode by viewModel.strictBroadcastModeState.collectAsState()
    val refreshMode by viewModel.refreshMode.collectAsState()
    val nextRefreshAtMillis by viewModel.nextRefreshAtMillis.collectAsState()
    val updateUiState by viewModel.updateUiState.collectAsState()
    val motionIntensity by viewModel.motionIntensity.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Settings",
                color = TextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Configure vAIb",
                color = TextSecondary,
                fontSize = 14.sp
            )
        }

        VaibCard {
            Column {
                Text(
                    text = "Connection",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = backendUrl,
                    onValueChange = { viewModel.setBackendUrl(it) },
                    label = { Text("Backend URL", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = tailnetHostname,
                    onValueChange = { viewModel.setTailnetHostname(it) },
                    label = { Text("Tailnet MagicDNS Host", color = TextMuted) },
                    placeholder = { Text("vaib-host.tailnet-name.ts.net", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = tailnetPort,
                    onValueChange = { viewModel.setTailnetPort(it) },
                    label = { Text("Tailnet Port", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = { viewModel.testAllTailnetRoutes() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PrimaryNeonCyan,
                        contentColor = BackgroundAmoled
                    )
                ) {
                    Text("Test all tailnet routes")
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Demo Mode",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Switch(
                        checked = demoMode,
                        onCheckedChange = {
                            demoMode = it
                            viewModel.setDemoMode(it)
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = PrimaryNeonCyan,
                            checkedTrackColor = PrimaryNeonCyan.copy(alpha = 0.4f)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                RefreshControlCard(
                    refreshMode = refreshMode,
                    pollInterval = pollInterval,
                    nextRefreshAtMillis = nextRefreshAtMillis,
                    onRefreshModeChange = { mode -> viewModel.setRefreshMode(mode) },
                    onPollIntervalChange = {
                        pollInterval = it
                        viewModel.setPollInterval(it.toInt())
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        VaibCard {
            Column {
                Text(
                    text = "App Updates",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = updateUiState.endpoint,
                    onValueChange = { viewModel.setUpdateEndpoint(it) },
                    label = { Text("Update feed URL", color = TextMuted) },
                    placeholder = { Text("https://.../latest.json", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Auto-check updates", color = TextSecondary, fontSize = 14.sp)
                    Switch(
                        checked = updateUiState.autoCheckEnabled,
                        onCheckedChange = { viewModel.setAutoUpdateCheckEnabled(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = PrimaryNeonCyan,
                            checkedTrackColor = PrimaryNeonCyan.copy(alpha = 0.4f)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { viewModel.checkForAppUpdates() }) {
                        Text(if (updateUiState.checking) "Checking..." else "Check now")
                    }
                    if (updateUiState.availableUpdate != null) {
                        OutlinedButton(onClick = { viewModel.downloadAvailableUpdate() }) {
                            Text("Download APK")
                        }
                        OutlinedButton(onClick = { viewModel.dismissAvailableUpdate() }) {
                            Text("Dismiss")
                        }
                    }
                }

                updateUiState.availableUpdate?.let { update ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Available: ${update.versionName}", color = TextPrimary, fontSize = 13.sp)
                    update.releaseNotes?.takeIf { it.isNotBlank() }?.let {
                        Text(it, color = TextMuted, fontSize = 11.sp)
                    }
                }

                updateUiState.message?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(it, color = TextMuted, fontSize = 11.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        VaibCard {
            Column {
                Text(
                    text = "Audio",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Bluetooth Mode",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Switch(
                        checked = bluetoothMode,
                        onCheckedChange = { bluetoothMode = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = AccentMagenta,
                            checkedTrackColor = AccentMagenta.copy(alpha = 0.4f)
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        VaibCard {
            Column {
                Text(
                    text = "Motion",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Animation Level",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Text(
                        text = motionIntensity.name,
                        color = PrimaryNeonCyan,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    MotionIntensity.values().forEach { level ->
                        val selected = motionIntensity == level
                        TextButton(
                            onClick = { viewModel.setMotionIntensity(level) }
                        ) {
                            Text(
                                text = level.name,
                                color = if (selected) PrimaryNeonCyan else TextMuted,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = when (motionIntensity) {
                        MotionIntensity.OFF -> "All animation and FX disabled. Maximum battery."
                        MotionIntensity.REDUCED -> "Minimal transitions. No particles. No glow."
                        MotionIntensity.STANDARD -> "Balanced animation. Subtle particles when active."
                        MotionIntensity.ENHANCED -> "Full expression. Rich particles and glow."
                    },
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
        }
        VaibCard {
            Column {
                Text(
                    text = "Agent Settings",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = tokenCommentLimit,
                    onValueChange = { tokenCommentLimit = it.filter { c -> c.isDigit() } },
                    label = { Text("Token Comment Limit (chars)", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = maxReactions,
                    onValueChange = { maxReactions = it.filter { c -> c.isDigit() } },
                    label = { Text("Max Reactions Shown", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = elevenLabsApiKey,
                    onValueChange = { viewModel.setElevenLabsApiKey(it) },
                    label = { Text("ElevenLabs API Key (runtime)", color = TextMuted) },
                    placeholder = { Text("sk_...", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = PrimaryNeonCyan,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Strict Broadcast Mode", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(
                            if (strictBroadcastMode)
                                "Blocks risky DJ scripts and uses a canned safe station-ID message."
                            else
                                "Balanced mode redacts sensitive fragments while preserving safe context.",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                    Switch(
                        checked = strictBroadcastMode,
                        onCheckedChange = { viewModel.setStrictBroadcastMode(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = AccentMagenta,
                            checkedTrackColor = AccentMagenta.copy(alpha = 0.4f)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text("Agent Voice Assignments", color = TextSecondary, fontSize = 13.sp)
                Spacer(modifier = Modifier.height(8.dp))

                appState.agents.forEach { agent ->
                    val isDj = agent.id == djHostAgentId
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isDj) "🎧 ${agent.name} (DJ Host)" else agent.name,
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = if (isDj) FontWeight.Bold else FontWeight.Normal
                        )
                        TextButton(onClick = { viewModel.setDjHostAgent(agent.id) }) {
                            Text(if (isDj) "DJ Selected" else "Make DJ")
                        }
                    }

                    OutlinedTextField(
                        value = agentVoiceDrafts[agent.id] ?: agent.voiceId.orEmpty(),
                        onValueChange = { viewModel.setAgentVoiceDraft(agent.id, it) },
                        label = { Text("${agent.name} Voice ID", color = TextMuted) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = PrimaryNeonCyan,
                            unfocusedBorderColor = BorderSubtle,
                            focusedContainerColor = SurfaceElevated,
                            unfocusedContainerColor = SurfaceElevated
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                OutlinedTextField(
                    value = djScriptDraft,
                    onValueChange = { djScriptDraft = it },
                    label = { Text("DJ Narration Preview Script", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentMagenta,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = SurfaceElevated,
                        unfocusedContainerColor = SurfaceElevated
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { viewModel.generateDjNarrationPreview(djScriptDraft) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AccentMagenta,
                            contentColor = BackgroundAmoled
                        )
                    ) {
                        Text("Preview DJ")
                    }

                    Button(
                        onClick = { viewModel.saveAgentVoiceAssignments() },
                        enabled = voiceSaveState != "saving",
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PrimaryNeonCyan,
                            contentColor = BackgroundAmoled
                        )
                    ) {
                        Text(if (voiceSaveState == "saving") "Saving..." else "Save Voice Roster")
                    }
                }

                if (voiceSaveState == "saved") {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Voice roster saved", color = PrimaryNeonCyan, fontSize = 12.sp)
                } else if (voiceSaveState == "error") {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Failed to save voice roster", color = AccentMagenta, fontSize = 12.sp)
                }

                if (djNarrationPreviewState != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("DJ preview: ${djNarrationPreviewState}", color = TextSecondary, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        VaibCard {
            Column {
                Text(
                    text = "App Info",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Version", color = TextSecondary, fontSize = 14.sp)
                    Text(text = "0.2.0", color = TextPrimary, fontSize = 14.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Package", color = TextSecondary, fontSize = 14.sp)
                    Text(text = "com.xsytrance.vaib", color = TextPrimary, fontSize = 14.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Build", color = TextSecondary, fontSize = 14.sp)
                    Text(text = "1", color = TextPrimary, fontSize = 14.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Min SDK", color = TextSecondary, fontSize = 14.sp)
                    Text(text = "28 (Android 9)", color = TextPrimary, fontSize = 14.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Target SDK", color = TextSecondary, fontSize = 14.sp)
                    Text(text = "34 (Android 14)", color = TextPrimary, fontSize = 14.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}
