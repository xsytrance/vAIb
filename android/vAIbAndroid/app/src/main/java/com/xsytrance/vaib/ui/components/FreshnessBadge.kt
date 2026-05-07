package com.xsytrance.vaib.ui.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.ui.theme.*

@Composable
fun FreshnessBadge(score: Int) {
    val color = when {
        score >= 80 -> StatusOnline
        score >= 55 -> SecondaryGold
        else -> ErrorRed
    }
    VaibCard {
        Text(
            text = "Freshness $score/100",
            color = color,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}
