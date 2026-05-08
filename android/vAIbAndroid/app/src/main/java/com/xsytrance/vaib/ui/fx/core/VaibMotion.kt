package com.xsytrance.vaib.ui.fx.core

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.animation.core.*
import androidx.compose.ui.unit.dp

/**
 * MotionIntensity controls the global level of animation and FX in the vAIb app.
 *
 * This is the foundational enum for the entire operational atmosphere system.
 * Future phases (1-7) will check this value before activating any visual,
 * haptic, or audio effects.
 *
 * DESIGN PRINCIPLE: This system is inert by design during Phase 0.
 * Only the enum, tokens, and CompositionLocal exist. No consumer code
 * references them yet. This ensures zero runtime impact while establishing
 * the architecture for future atmosphere work.
 *
 * | Level | Particles | Transitions | Visualizer | Glow | Haptics | Sound | Atmosphere |
 * |-------|-----------|-------------|------------|------|---------|-------|------------|
 * | OFF   | 0         | 0ms (none)  | Frozen     | None | None    | None  | Disabled   |
 * | REDUCED | 0       | <= 150ms    | Frozen     | None | Minimal | None  | Minimal    |
 * | STANDARD | 40     | 300ms       | Animated   | Subtle | On   | On    | Full       |
 * | ENHANCED | 80     | 500ms       | Animated   | Full   | On   | On    | Maximum    |
 *
 * Phase 0: Enum and CompositionLocal only. No consumers yet.
 * Phase 1: VibeProfile will reference this for default initialization.
 * Phase 2+: All animation/FX systems check this before activating.
 */
enum class MotionIntensity {
    /** Clean music app mode. All atmosphere systems disabled.
     * No particles, no reactive motion, no haptics, no sound cues,
     * no atmosphere modulation. Pure music playback.
     *
     * Zero allocation path: AmbientParticleLayer returns Spacer,
     * no animate*AsState calls, no recomposition loops.
     * For users who want maximum battery and absolute calm. */
    OFF,

    /** Minimal motion. No particles. Transitions capped at 150ms opacity-only.
     * Visualizer frozen. No glow effects. Haptics minimal.
     * For reduced-motion accessibility preference or low-end devices. */
    REDUCED,

    /** Default balanced experience. 40 particles max. Full transitions.
     * Animated visualizer. Subtle glow. Full haptics and sound (if enabled).
     * The vAIb "whisper" — atmosphere present but never competing with music.
     * Target: <= 3% battery delta per hour vs OFF. */
    STANDARD,

    /** Maximum expression. 80 particles. Rich transitions. Full glow.
     * For premium devices (S24 Ultra class) where user wants full atmosphere.
     * Still restrained — atmosphere enhances, never dominates.
     * Target: <= 5% battery delta per hour vs OFF. */
    ENHANCED
}

/**
 * Timing, easing, and transition constants for the vAIb motion system.
 *
 * All values are indexed by [MotionIntensity] so consumers can look up
 * appropriate defaults without hardcoding phase-specific logic.
 *
 * INERT BY DESIGN: This object exists as a configuration registry only.
 * No code calls these values during Phase 0. Phase 2+ consumers will
 * import this object to get intensity-appropriate constants.
 *
 * Phase 0: Constants defined. No consumers yet.
 * Phase 2+: Transitions and microinteractions will reference these tokens.
 */
object VaibMotionTokens {
    /** Transition duration in milliseconds per intensity level. */
    val transitionDurationMs: Map<MotionIntensity, Int> = mapOf(
        MotionIntensity.OFF to 0,
        MotionIntensity.REDUCED to 150,
        MotionIntensity.STANDARD to 300,
        MotionIntensity.ENHANCED to 500
    )

    /** Particle count cap per intensity level. */
    val maxParticles: Map<MotionIntensity, Int> = mapOf(
        MotionIntensity.OFF to 0,
        MotionIntensity.REDUCED to 0,
        MotionIntensity.STANDARD to 40,
        MotionIntensity.ENHANCED to 80
    )

    /** Glow border width (dp) per intensity level. */
    val glowWidthDp: Map<MotionIntensity, Float> = mapOf(
        MotionIntensity.OFF to 0f,
        MotionIntensity.REDUCED to 0f,
        MotionIntensity.STANDARD to 1.5f,
        MotionIntensity.ENHANCED to 2.5f
    )

    /** Default easing for all vAIb transitions.
     * Calm and gentle — never jarring or aggressive. */
    val defaultEasing: FastOutSlowInEasing = FastOutSlowInEasing

    /** Press feedback scale factor (1.0 = no scale). Subtle, almost imperceptible. */
    const val pressScaleDown = 0.97f

    /** Press feedback duration in milliseconds. Fast, never delayed. */
    const val pressDurationMs = 100

    /** Glow pulse period in milliseconds. Slow breathing — never frantic. */
    const val glowPulsePeriodMs = 2400

    /** Glow pulse minimum alpha (0f..1f). Barely visible at trough. */
    const val glowPulseMinAlpha = 0.3f

    /** Glow pulse maximum alpha (0f..1f). Present but never overwhelming. */
    const val glowPulseMaxAlpha = 0.8f

    /**
     * Returns true if the given intensity level permits particle rendering.
     * INERT: Phase 0 — no callers. Phase 3+ particle systems will use this gate.
     */
    fun particlesEnabled(intensity: MotionIntensity): Boolean =
        intensity == MotionIntensity.STANDARD || intensity == MotionIntensity.ENHANCED

    /**
     * Returns true if the given intensity level permits animated transitions.
     * INERT: Phase 0 — no callers. Phase 2+ transition systems will use this gate.
     */
    fun transitionsEnabled(intensity: MotionIntensity): Boolean =
        intensity != MotionIntensity.OFF

    /**
     * Returns true if the given intensity level permits ambient glow effects.
     * INERT: Phase 0 — no callers. Phase 2+ glow systems will use this gate.
     */
    fun glowEnabled(intensity: MotionIntensity): Boolean =
        intensity == MotionIntensity.STANDARD || intensity == MotionIntensity.ENHANCED
}

/**
 * CompositionLocal providing the current [MotionIntensity] to the entire Compose tree.
 *
 * Set in [MainActivity] via [CompositionLocalProvider]. Default is [MotionIntensity.STANDARD].
 * All animation/FX composables should read this value and degrade gracefully.
 *
 * Phase 0: Defined and wired in MainActivity. No consumers yet.
 * Phase 2+: All animated components will read this to determine behavior.
 */
val LocalMotionIntensity = compositionLocalOf { MotionIntensity.STANDARD }
