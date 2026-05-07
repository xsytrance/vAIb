package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.ui.theme.*

@Composable
fun EqualizerBand(
    frequency: String,
    value: Int,
    modifier: Modifier = Modifier,
    onValueChange: (Int) -> Unit = {}
) {
    val barHeight = (value.coerceIn(0, 100) / 100f)

    Column(
        modifier = modifier
            .width(40.dp)
            .padding(horizontal = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "$value",
            color = PrimaryNeonCyan,
            fontSize = 10.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        Box(
            modifier = Modifier
                .height(120.dp)
                .width(28.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(SurfaceElevated)
                .pointerInput(Unit) {
                    detectVerticalDragGestures { change, dragAmount ->
                        change.consume()
                        val newValue = (value - dragAmount / 3).coerceIn(0f, 100f).toInt()
                        onValueChange(newValue)
                    }
                },
            contentAlignment = Alignment.BottomCenter
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(barHeight)
                    .clip(RoundedCornerShape(4.dp))
                    .background(
                        if (value > 80) AccentMagenta
                        else if (value > 50) PrimaryNeonCyan
                        else AccentViolet
                    )
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = frequency,
            color = TextSecondary,
            fontSize = 9.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
