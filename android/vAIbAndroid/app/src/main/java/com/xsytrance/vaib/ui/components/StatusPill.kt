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
    val normalized = status.lowercase()
    val (dotColor, labelColor) = when {
        normalized.contains("connected") || normalized == "online" || normalized == "hosting" -> StatusOnline to StatusOnline
        normalized.contains("reconnecting") || normalized.contains("trying") || normalized == "routing" -> StatusRouting to StatusRouting
        normalized.contains("offline") || normalized.contains("disconnected") || normalized == "unstable" -> ErrorRed to ErrorRed
        normalized == "listening" -> Color(0xFFFFD700) to Color(0xFFFFD700)
        normalized == "building" -> StatusBuilding to StatusBuilding
        normalized == "bluetooth" -> Color(0xFF4488FF) to Color(0xFF4488FF)
        else -> TextMuted to TextSecondary
    }

    val displayLabel = when {
        normalized.contains("connected •") -> status
        normalized.contains("reconnecting •") -> status
        normalized.contains("offline •") -> status
        normalized == "online" -> "Online"
        normalized == "hosting" -> "Hosting"
        normalized == "listening" -> "Listening"
        normalized == "unstable" -> "Unstable"
        normalized == "routing" -> "Routing"
        normalized == "building" -> "Building"
        normalized == "offline" -> "Offline"
        normalized == "connected" -> "Connected"
        normalized == "disconnected" -> "Disconnected"
        normalized == "bluetooth" -> "Bluetooth"
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
