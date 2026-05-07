package com.xsytrance.vaib.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.xsytrance.vaib.ui.theme.*
import kotlinx.coroutines.delay
import kotlin.random.Random

@Composable
fun VisualizerBars(
    modifier: Modifier = Modifier,
    barCount: Int = 24,
    isPlaying: Boolean = true
) {
    val barHeights = remember { List(barCount) { Random.nextFloat() }.toMutableStateList() }

    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            for (i in barHeights.indices) {
                barHeights[i] = Random.nextFloat()
            }
            delay(120)
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        barHeights.forEachIndexed { index, height ->
            val animatedHeight by animateFloatAsState(
                targetValue = height,
                animationSpec = tween(100, easing = LinearEasing),
                label = "bar_$index"
            )

            val barColor = when {
                animatedHeight > 0.8f -> AccentMagenta
                animatedHeight > 0.5f -> PrimaryNeonCyan
                else -> AccentViolet.copy(alpha = 0.7f)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(animatedHeight.coerceIn(0.1f, 1f))
                    .clip(RoundedCornerShape(2.dp))
                    .background(barColor)
                    .padding(horizontal = 1.dp)
            )
        }
    }
}
