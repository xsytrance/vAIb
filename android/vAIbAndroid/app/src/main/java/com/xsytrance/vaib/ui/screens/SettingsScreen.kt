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
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

@Composable
fun SettingsScreen(
    viewModel: VaibViewModel
) {
    var backendUrl by remember { mutableStateOf("http://10.0.2.2:4014") }
    var demoMode by remember { mutableStateOf(true) }
    var pollInterval by remember { mutableStateOf(5f) }
    var bluetoothMode by remember { mutableStateOf(true) }
    var tokenCommentLimit by remember { mutableStateOf("280") }
    var maxReactions by remember { mutableStateOf("25") }

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
                    onValueChange = {
                        backendUrl = it
                        viewModel.setBackendUrl(it)
                    },
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

                Text(
                    text = "Poll Interval: ${pollInterval.toInt()}s",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
                Slider(
                    value = pollInterval,
                    onValueChange = {
                        pollInterval = it
                        viewModel.setPollInterval(it.toInt())
                    },
                    valueRange = 1f..10f,
                    steps = 8,
                    colors = SliderDefaults.colors(
                        thumbColor = PrimaryNeonCyan,
                        activeTrackColor = PrimaryNeonCyan,
                        inactiveTrackColor = SurfaceElevated
                    )
                )
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
