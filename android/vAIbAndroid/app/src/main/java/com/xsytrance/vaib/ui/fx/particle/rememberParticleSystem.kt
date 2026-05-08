package com.xsytrance.vaib.ui.fx.particle

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember

/**
 * Creates and remembers a [ParticleSystem] instance tied to the Compose lifecycle.
 *
 * **Phase 0: Returns an inert stub system.** No coroutines. No timers.
 * No background loops. The returned system has empty particles and isActive = false.
 *
 * Phase 3: Will create an active ParticleSystem with:
 *   - Pre-allocated particle pool sized by current MotionIntensity
 *   - Frame loop via LaunchedEffect + withFrameNanos
 *   - Auto-pause on ON_STOP lifecycle event
 *   - Auto-dispose when leaving composition
 *   - Resize when MotionIntensity changes
 *
 * @param maxParticles Cap for this instance. Overridden to 0 at OFF/REDUCED.
 * @param seed Deterministic seed for reproducible patterns.
 * @return ParticleSystem instance (inert stub during Phase 0).
 */
@Composable
fun rememberParticleSystem(
    maxParticles: Int = 0,
    seed: Int = 42
): ParticleSystem {
    // Phase 0: Creates inert stub. No background activity.
    // Phase 3: Will create active system with lifecycle-bound frame loop.
    val system = remember(maxParticles, seed) {
        ParticleSystem(maxParticles = maxParticles, seed = seed)
    }

    DisposableEffect(system) {
        // Phase 0: No cleanup needed (stub has no resources).
        // Phase 3: Will call system.dispose() to release particle pool.
        onDispose {
            system.dispose()
        }
    }

    return system
}
