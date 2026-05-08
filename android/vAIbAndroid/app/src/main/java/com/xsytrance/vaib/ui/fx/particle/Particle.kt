package com.xsytrance.vaib.ui.fx.particle

import androidx.compose.ui.graphics.Color

/**
 * Data class representing a single particle in the ambient particle system.
 *
 * Phase 0: Data class defined. No instances created at runtime.
 * Phase 3: ParticleSystem will instantiate and update these each frame.
 *
 * @property x Current X position (0f..1f normalized canvas space)
 * @property y Current Y position (0f..1f normalized canvas space)
 * @property vx Velocity X (normalized units per frame)
 * @property vy Velocity Y (normalized units per frame)
 * @property life Current life value (0f..maxLife)
 * @property maxLife Maximum life in frames before respawn
 * @property size Radius in dp
 * @property color Particle color
 * @property alpha Current opacity (0f..1f)
 * @property seed Deterministic seed for reproducible motion patterns
 */
data class Particle(
    val x: Float = 0f,
    val y: Float = 0f,
    val vx: Float = 0f,
    val vy: Float = 0f,
    val life: Float = 0f,
    val maxLife: Float = 300f,
    val size: Float = 2f,
    val color: Color = Color.Transparent,
    val alpha: Float = 0f,
    val seed: Int = 0
)

/**
 * Shape variants for particle rendering.
 *
 * Phase 0: Defined. Not used.
 * Phase 3: AmbientParticleLayer will use this to select draw command.
 */
enum class ParticleShape {
    CIRCLE,
    SOFT_CIRCLE,   // radial gradient for glow
    DIAMOND,
    LINE           // waveform trace
}
