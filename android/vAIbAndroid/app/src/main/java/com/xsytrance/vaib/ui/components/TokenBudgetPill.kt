package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.ui.theme.*

@Composable
fun TokenBudgetPill(
    used: Int,
    total: Int,
    modifier: Modifier = Modifier,
    label: String = "Token Budget"
) {
    val ratio = used.toFloat() / total.coerceAtLeast(1)
    val percentage = (ratio * 100).toInt()

    val barColor = when {
        ratio > 0.9f -> ErrorRed
        ratio > 0.7f -> SecondaryGold
        else -> PrimaryNeonCyan
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(SurfaceCard)
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                color = TextSecondary,
                fontSize = 12.sp
            )
            Text(
                text = "${'$'}used / ${'$'}total",
                color = barColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        LinearProgressIndicator(
            progress = ratio.coerceIn(0f, 1f),
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = barColor,
            trackColor = SurfaceElevated
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "${'$'}percentage% used",
            color = TextMuted,
            fontSize = 10.sp
        )
    }
}
