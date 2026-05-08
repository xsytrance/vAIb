package com.xsytrance.vaib.ui.fx.particle

import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Ambient particle layer — a full-screen Canvas overlay at the lowest z-index
 * that renders the operational atmosphere particle field.
 *
 * **Phase 0: Returns [Spacer] only. No Canvas. No rendering. No particles.**
 * Zero allocation. Zero recomposition. Zero visual impact.
 *
 * Phase 3: Will render a full-screen Canvas with:
 *   - Particle pool from [ParticleSystem]
 *   - Music-reactive waveform motion
 *   - VitalityLevel-aware density (Operational Silence)
 *   - Deterministic seeded patterns
 *   - MotionIntensity-gated: OFF/REDUCED → Spacer (fast path)
 *
 * This composable must always check [LocalMotionIntensity] first and return
 * [Spacer] immediately at OFF or REDUCED levels. This is the zero-cost path.
 *
 * @param modifier Modifier for sizing/positioning.
 */
@Composable
fun AmbientParticleLayer(
    modifier: Modifier = Modifier
) {
    // Phase 0: Inert placeholder. Returns Spacer — invisible, zero allocation.
    // Phase 3: Will check LocalMotionIntensity and either render Canvas
    // (STANDARD/ENHANCED) or return Spacer (OFF/REDUCED).
    Spacer(modifier = modifier)
}
