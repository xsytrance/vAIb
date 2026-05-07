package com.xsytrance.vaib.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.xsytrance.vaib.ui.theme.AccentMagenta
import com.xsytrance.vaib.ui.theme.AccentViolet
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

@Composable
fun VisualizerBars(
    modifier: Modifier = Modifier,
    barCount: Int = 24,
    isPlaying: Boolean = true,
    intensity: Float = 0.75f
) {
    val barHeights = remember(barCount) { List(barCount) { 0.28f + Random.nextFloat() * 0.3f }.toMutableStateList() }

    val transition = rememberInfiniteTransition(label = "visualizer_phase")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )

    LaunchedEffect(isPlaying, barCount) {
        while (true) {
            if (isPlaying) {
                for (i in barHeights.indices) {
                    val wave = ((sin(phase + (i * 0.35f)) + 1f) / 2f).coerceIn(0f, 1f)
                    val jitter = Random.nextFloat() * 0.12f
                    val target = (0.14f + (wave * 0.62f) + jitter) * intensity.coerceIn(0.2f, 1f)
                    val prev = barHeights[i]
                    barHeights[i] = (prev * 0.66f + target * 0.34f).coerceIn(0.08f, 1f)
                }
            } else {
                for (i in barHeights.indices) {
                    barHeights[i] = (barHeights[i] * 0.82f).coerceAtLeast(0.08f)
                }
            }
            delay(160)
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        barHeights.forEachIndexed { index, height ->
            val animatedHeight by animateFloatAsState(
                targetValue = height,
                animationSpec = tween(220, easing = FastOutSlowInEasing),
                label = "bar_$index"
            )

            val barColor = when {
                animatedHeight > 0.78f -> AccentMagenta
                animatedHeight > 0.46f -> PrimaryNeonCyan
                else -> AccentViolet.copy(alpha = 0.72f)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(animatedHeight.coerceIn(0.08f, 1f))
                    .clip(RoundedCornerShape(2.dp))
                    .background(barColor)
            )
        }
    }
}
