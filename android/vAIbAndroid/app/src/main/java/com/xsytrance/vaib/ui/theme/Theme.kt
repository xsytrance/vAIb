package com.xsytrance.vaib.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val VaibDarkColorScheme = darkColorScheme(
    primary = PrimaryNeonCyan,
    secondary = SecondaryGold,
    tertiary = AccentMagenta,
    background = BackgroundAmoled,
    surface = SurfaceCard,
    surfaceVariant = SurfaceElevated,
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = ErrorRed,
    onError = Color.White
)

@Composable
fun VaibTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = VaibDarkColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = VaibTypography,
        content = content
    )
}
