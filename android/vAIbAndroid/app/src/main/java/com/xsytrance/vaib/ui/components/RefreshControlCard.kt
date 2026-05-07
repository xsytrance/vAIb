package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.RefreshMode
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan
import com.xsytrance.vaib.ui.theme.SurfaceElevated
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun RefreshControlCard(
    refreshMode: RefreshMode,
    pollInterval: Float,
    nextRefreshAtMillis: Long?,
    onRefreshModeChange: (RefreshMode) -> Unit,
    onPollIntervalChange: (Float) -> Unit
) {
    VaibCard {
        Column {
            Text(
                text = "Refresh Controls",
                color = PrimaryNeonCyan,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                RefreshMode.entries.forEach { mode ->
                    FilterChip(
                        selected = refreshMode == mode,
                        onClick = { onRefreshModeChange(mode) },
                        label = { Text(modeLabel(mode), fontSize = 11.sp) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = if (refreshMode == RefreshMode.MANUAL) "Manual mode: refresh only on demand" else "Base refresh interval: ${pollInterval.toInt()}s",
                color = TextSecondary,
                fontSize = 12.sp
            )
            Slider(
                value = pollInterval,
                onValueChange = onPollIntervalChange,
                valueRange = 2f..30f,
                steps = 27,
                enabled = refreshMode != RefreshMode.MANUAL,
                colors = SliderDefaults.colors(
                    thumbColor = PrimaryNeonCyan,
                    activeTrackColor = PrimaryNeonCyan,
                    inactiveTrackColor = SurfaceElevated
                )
            )
            Text(
                text = nextRefreshAtMillis?.let { "Next scheduled refresh: ${relativeAge(it)}" } ?: "Next scheduled refresh: --",
                color = TextPrimary,
                fontSize = 11.sp
            )
        }
    }
}

private fun modeLabel(mode: RefreshMode): String = when (mode) {
    RefreshMode.AGGRESSIVE -> "Aggressive"
    RefreshMode.BALANCED -> "Balanced"
    RefreshMode.BATTERY_SAVER -> "Saver"
    RefreshMode.MANUAL -> "Manual"
}

private fun relativeAge(targetMillis: Long): String {
    val delta = ((targetMillis - System.currentTimeMillis()) / 1000L).coerceAtLeast(0)
    return when {
        delta < 60 -> "in ${delta}s"
        delta < 3600 -> "in ${delta / 60}m"
        else -> "in ${delta / 3600}h"
    }
}
