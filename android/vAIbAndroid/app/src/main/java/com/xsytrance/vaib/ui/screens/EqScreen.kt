package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.ui.components.EqualizerBand
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*

@Composable
fun EqScreen(
    outputMode: String = "bluetooth"
) {
    var bandValues by remember {
        mutableStateOf(listOf(50, 45, 55, 60, 50, 65, 70, 55, 45, 40))
    }

    val frequencies = listOf("60Hz", "170Hz", "310Hz", "600Hz", "1kHz", "3kHz", "6kHz", "12kHz", "14kHz", "16kHz")

    val presets = listOf(
        "Flat" to { List(10) { 50 } },
        "Bass Command" to { listOf(80, 75, 70, 55, 50, 45, 40, 35, 30, 30) },
        "Neon Clarity" to { listOf(40, 45, 50, 55, 60, 65, 70, 65, 60, 55) },
        "Vocal Focus" to { listOf(35, 40, 55, 70, 75, 65, 50, 45, 40, 35) },
        "Lo-Fi Warmth" to { listOf(60, 65, 60, 50, 45, 40, 35, 30, 25, 25) },
        "Cyber Salsa" to { listOf(50, 55, 65, 75, 65, 55, 50, 60, 55, 50) },
        "Night Drive" to { listOf(65, 60, 50, 45, 55, 65, 75, 70, 65, 60) },
        "Bluetooth Punch" to { listOf(75, 70, 60, 55, 50, 55, 60, 55, 50, 45) }
    )

    var bassBoost by remember { mutableStateOf(false) }
    var spatialMode by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Equalizer",
                color = TextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "10-band EQ \u2022 ${outputMode.uppercase()} output",
                color = TextSecondary,
                fontSize = 14.sp
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            presets.forEach { (name, factory) ->
                val isSelected = bandValues == factory()
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) PrimaryNeonCyan else SurfaceElevated)
                        .clickable { bandValues = factory() }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = name,
                        color = if (isSelected) Color.Black else TextPrimary,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            frequencies.forEachIndexed { index, freq ->
                EqualizerBand(
                    frequency = freq,
                    value = bandValues[index],
                    onValueChange = { newValue ->
                        bandValues = bandValues.toMutableList().apply { set(index, newValue) }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        VaibCard {
            Column {
                Text(
                    text = "Audio Effects",
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Bass Boost",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Switch(
                        checked = bassBoost,
                        onCheckedChange = { bassBoost = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = PrimaryNeonCyan,
                            checkedTrackColor = PrimaryNeonCyan.copy(alpha = 0.4f)
                        )
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Spatial / Wide Mode",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                    Switch(
                        checked = spatialMode,
                        onCheckedChange = { spatialMode = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = AccentMagenta,
                            checkedTrackColor = AccentMagenta.copy(alpha = 0.4f)
                        )
                    )
                }
            }
        }

        if (outputMode == "bluetooth") {
            Spacer(modifier = Modifier.height(8.dp))
            VaibCard(neonGlow = true) {
                Column {
                    Text(
                        text = "Bluetooth Mode Active",
                        color = PrimaryNeonCyan,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "EQ optimized for wireless output. Reduced low-end latency.",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}
)
}
