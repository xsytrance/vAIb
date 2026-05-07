package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.ConnectorHealth
import com.xsytrance.vaib.data.model.ConnectorStatus
import com.xsytrance.vaib.ui.theme.AccentMagenta
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan
import com.xsytrance.vaib.ui.theme.SecondaryGold
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun ConnectorHealthCard(connector: ConnectorHealth) {
    VaibCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = connector.name, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    text = connector.status.name.lowercase(),
                    color = statusColor(connector.status),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Latency:", color = TextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = connector.latencyMs?.let { "${it}ms" } ?: "--", color = TextPrimary, fontSize = 12.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Text(text = "Last sync:", color = TextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = connector.lastSyncAtMillis?.let { relativeAge(it) } ?: "never",
                    color = TextPrimary,
                    fontSize = 12.sp
                )
            }
            if (!connector.lastError.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = connector.lastError, color = AccentMagenta, fontSize = 11.sp)
            }
        }
    }
}

private fun statusColor(status: ConnectorStatus) = when (status) {
    ConnectorStatus.ONLINE -> PrimaryNeonCyan
    ConnectorStatus.DEGRADED -> SecondaryGold
    ConnectorStatus.OFFLINE -> AccentMagenta
}

private fun relativeAge(timestampMillis: Long): String {
    val seconds = ((System.currentTimeMillis() - timestampMillis) / 1000).coerceAtLeast(0)
    return when {
        seconds < 5 -> "just now"
        seconds < 60 -> "${seconds}s ago"
        seconds < 3600 -> "${seconds / 60}m ago"
        else -> "${seconds / 3600}h ago"
    }
}
