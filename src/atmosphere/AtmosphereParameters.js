/**
 * Atmosphere parameter mapping for vAIb Sacred Prototype.
 * Maps Resonance Integrity (RI) to visual and audio parameters.
 *
 * @module AtmosphereParameters
 */

/**
 * Linear interpolation between two values.
 *
 * @param {number} a - Low value
 * @param {number} b - High value
 * @param {number} t - Interpolation factor 0..1
 * @returns {number} Interpolated value
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Parameter definitions with low/high ranges.
 * Each parameter is interpolated from low (RI=0) to high (RI=1).
 *
 * @type {Object<string, {low: number, high: number}>}
 */
const PARAMS = {
  saturation:       { low: 40,   high: 100 },
  luminance:        { low: 60,   high: 100 },
  motionSpeed:      { low: 0.3,  high: 1.0 },
  particleCount:    { low: 20,   high: 100 },
  bloomIntensity:   { low: 0.0,  high: 1.0 },
  colorTemperature: { low: 2000, high: 6500 },
  complexity:       { low: 1,    high: 3 },
  stereoWidth:      { low: 0.3,  high: 1.0 },
  textureGain:      { low: -40,  high: -20 },
  reverbAmount:     { low: 0.1,  high: 0.5 },
};

/**
 * Solo mode multipliers applied when running alone.
 * Each parameter is scaled by this factor when in solo mode.
 *
 * @type {Object<string, number>}
 */
const SOLO_MULTIPLIERS = {
  saturation:       0.85,
  luminance:        1.0,
  motionSpeed:      0.9,
  particleCount:    0.8,
  bloomIntensity:   0.6,
  colorTemperature: 0.85,
  complexity:       1.0,
  stereoWidth:      1.0,
  textureGain:      1.0,
  reverbAmount:     1.0,
};

/**
 * Map Resonance Integrity (RI) to atmosphere parameters.
 *
 * @param {number} ri - Resonance Integrity 0..1
 * @param {boolean} [isSolo=false] - Whether solo mode overrides apply
 * @returns {AtmosphereParameters} Mapped parameters
 */
export function mapRIToParameters(ri, isSolo = false) {
  const t = Math.max(0, Math.min(1, ri));

  const params = {
    saturation:       lerp(PARAMS.saturation.low,       PARAMS.saturation.high,       t),
    luminance:        lerp(PARAMS.luminance.low,        PARAMS.luminance.high,        t),
    motionSpeed:      lerp(PARAMS.motionSpeed.low,      PARAMS.motionSpeed.high,      t * t * Math.sqrt(t)),
    particleCount:    lerp(PARAMS.particleCount.low,    PARAMS.particleCount.high,    t),
    bloomIntensity:   lerp(PARAMS.bloomIntensity.low,   PARAMS.bloomIntensity.high,   t),
    colorTemperature: lerp(PARAMS.colorTemperature.low, PARAMS.colorTemperature.high, t),
    complexity:       lerp(PARAMS.complexity.low,       PARAMS.complexity.high,       t),
    stereoWidth:      lerp(PARAMS.stereoWidth.low,      PARAMS.stereoWidth.high,      t),
    textureGain:      lerp(PARAMS.textureGain.low,      PARAMS.textureGain.high,      t),
    reverbAmount:     lerp(PARAMS.reverbAmount.low,     PARAMS.reverbAmount.high,     t),
  };

  if (isSolo) {
    for (const key of Object.keys(SOLO_MULTIPLIERS)) {
      params[key] *= SOLO_MULTIPLIERS[key];
    }
  }

  return params;
}

/**
 * @typedef {Object} AtmosphereParameters
 * @property {number} saturation       0..100%
 * @property {number} luminance        0..100%
 * @property {number} motionSpeed      Speed multiplier
 * @property {number} particleCount    Particle count
 * @property {number} bloomIntensity   0..1
 * @property {number} colorTemperature Kelvin 2000..6500
 * @property {number} complexity       Layer count
 * @property {number} stereoWidth      0..1
 * @property {number} textureGain      dB
 * @property {number} reverbAmount     0..1
 */
