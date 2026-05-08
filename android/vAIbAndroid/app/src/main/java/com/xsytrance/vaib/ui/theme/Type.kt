package com.xsytrance.vaib.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * vAIb Typography v2 — Hybrid Safe Slice (Phase A visual overhaul)
 *
 * Bigger, bolder hierarchy for AMOLED music cockpit.
 * Key changes from v1:
 * - displayLarge: 32→36sp (app title, hero text)
 * - headlineLarge: 28→24sp (screen headers)
 * - headlineMedium: 22→20sp (card titles, station names)
 * - NEW headlineSmall: 18sp Medium (track artist, sub-headers)
 * - titleLarge: 18→16sp (section headers)
 * - bodyLarge: 16→15sp (primary reading — slightly smaller for density)
 * - labelSmall: 10→11sp (minimum indicators — more readable)
 *
 * Design principle: Music title is always the largest, most prominent text.
 * Track title (headlineMedium 20sp Bold) > Artist (headlineSmall 18sp)
 * > Station (bodySmall 13sp) > Metadata (label 11-12sp)
 */
val VaibTypography = Typography(
    // === DISPLAY ===
    // App title, hero moments. Used sparingly.
    displayLarge = TextStyle(
        fontSize = 36.sp,
        fontWeight = FontWeight.Bold,
        color = TextPrimary
    ),

    // === HEADLINES ===
    // Screen headers (Stations, Queue, etc.)
    headlineLarge = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.SemiBold,
        color = TextPrimary
    ),
    // Card titles, station names, track titles
    headlineMedium = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold,
        color = TextPrimary
    ),
    // Track artist, sub-headlines
    headlineSmall = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Medium,
        color = TextPrimary
    ),

    // === TITLES ===
    // Section headers within cards
    titleLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium,
        color = TextPrimary
    ),
    titleMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
        color = TextSecondary
    ),
    titleSmall = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = TextSecondary
    ),

    // === BODY ===
    // Primary reading text
    bodyLarge = TextStyle(
        fontSize = 15.sp,
        color = TextPrimary
    ),
    // Secondary text, descriptions
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        color = TextSecondary
    ),
    // Metadata, station info, subtle details
    bodySmall = TextStyle(
        fontSize = 13.sp,
        color = TextSecondary
    ),

    // === LABELS ===
    // Captions, badges, timestamps
    labelMedium = TextStyle(
        fontSize = 12.sp,
        color = TextMuted
    ),
    // Minimum size indicators only. Avoid for primary info.
    labelSmall = TextStyle(
        fontSize = 11.sp,
        color = TextMuted
    )
)
