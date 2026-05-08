package com.xsytrance.vaib.ui.fx.core

/**
 * Atmosphere configuration for the vAIb operational atmosphere system.
 *
 * INERT BY DESIGN: This class exists as a future-proofing hook only.
 * During Phase 0 it is never instantiated and never referenced by any code.
 * It represents the concept of "atmosphere enabled/disabled" as a separate
 * concern from [MotionIntensity].
 *
 * Why separate? [MotionIntensity] controls HOW MUCH motion/atmosphere exists.
 * [VaibAtmosphereConfig.atmosphereEnabled] controls WHETHER the atmosphere
 * system is active at all. This allows for a "clean music app mode" where:
 * - Music playback continues normally
 * - UI functions normally (navigation, settings, etc.)
 * - But ALL atmosphere systems are silent:
 *     -- No particles
 *     -- No reactive motion
 *     -- No haptics
 *     -- No sound cues
 *     -- No atmosphere modulation
 *     -- No agent presence visuals
 *     -- No operational silence effects
 *     -- No event-driven FX
 *
 * Phase 1: Will be referenced by VibeProfile as a configuration field.
 * Phase 2+: GlobalReactiveField and all FX systems check this before activating.
 * If atmosphereEnabled == false, all FX layers become no-ops regardless of
 * MotionIntensity level.
 *
 * This is the "nuclear off switch" for the entire atmosphere layer.
 * MotionIntensity.OFF is user preference.
 * atmosphereEnabled = false is architectural disable (testing, battery saver, etc.)
 */
data class VaibAtmosphereConfig(
    /** Master switch for the entire atmosphere system.
     * When false: all particles, glow, haptics, sounds, reactive motion,
     * agent presence visuals, and operational silence effects are disabled.
     * Music playback and core UI continue unaffected.
     *
     * Default: true (atmosphere system active).
     * Set to false for: battery saver mode, testing, debugging,
     * or user preference for absolute minimalism. */
    val atmosphereEnabled: Boolean = true,

    /** Whether the music should influence UI rhythm.
     * When true: transitions, pulses, and particle cadence subtly follow
     * music energy and BPM. When false: UI motion is independent of music.
     *
     * Default: true.
     * Phase 3+: MusicReactiveField reads this flag. */
    val musicDrivenRhythm: Boolean = true,

    /** Whether Operational Silence (vitality-based atmosphere thinning) is active.
     * When true: the ambient field thins during degraded system states.
     * When false: atmosphere remains constant regardless of system health.
     *
     * Default: true.
     * Phase 5+: EventInfluenceDecay and GlobalReactiveField read this flag. */
    val operationalSilenceActive: Boolean = true,

    /** Whether tiny surprises (unexpected music pairings, ambience shifts,
     * taste drift moments) are enabled.
     *
     * Default: true.
     * Phase 4+: Surprise system reads this flag. */
    val surprisesEnabled: Boolean = true
)

/**
 * Static default config. Used when no user preference exists.
 * INERT: Phase 0 — not referenced by any code.
 */
val DefaultAtmosphereConfig = VaibAtmosphereConfig()

/**
 * CompositionLocal for the atmosphere config.
 * Phase 0: Defined but not provided (uses DefaultAtmosphereConfig).
 * Phase 1+: Provided in MainActivity alongside LocalMotionIntensity.
 */
// val LocalAtmosphereConfig = staticCompositionLocalOf { DefaultAtmosphereConfig }
// COMMENTED OUT — uncomment in Phase 1 when VibeProfile provides the config.
