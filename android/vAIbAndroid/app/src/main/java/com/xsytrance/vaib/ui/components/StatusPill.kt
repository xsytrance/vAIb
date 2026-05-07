package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.xsytrance.vaib.ui.theme.*

@Composable
fun StatusPill(
    status: String,
    modifier: Modifier = Modifier
) {
    val (dotColor, labelColor) = when (status.lowercase()) {
        "online", "hosting" -> StatusOnline to StatusOnline
        "listening" -> Color(0xFFFFD700) to Color(0xFFFFD700)
        "unstable" -> ErrorRed to ErrorRed
        "routing" -> StatusRouting to StatusRouting
        "building" -> StatusBuilding to StatusBuilding
        "offline" -> TextMuted to TextMuted
        "connected" -> StatusOnline to StatusOnline
        "disconnected" -> ErrorRed to ErrorRed
        "bluetooth" -> Color(0xFF4488FF) to Color(0xFF4488FF)
        else -> TextMuted to TextSecondary
    }

    val displayLabel = when (status.lowercase()) {
        "online" -> "Online"
        "hosting" -> "Hosting"
        "listening" -> "Listening"
        "unstable" -> "Unstable"
        "routing" -> "Routing"
        "building" -> "Building"
        "offline" -> "Offline"
        "connected" -> "Connected"
        "disconnected" -> "Disconnected"
        "bluetooth" -> "Bluetooth"
        else -> status.replaceFirstChar { it.uppercase() }
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, dotColor.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
            .background(Color.Transparent)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(dotColor)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = displayLabel,
            color = labelColor,
            style = androidx.compose.material3.MaterialTheme.typography.labelMedium
        )
    }
}
