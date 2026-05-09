/**
 * Resonance Integrity (RI) engine for the vAIb Sacred Prototype.
 * Computes a smoothed RI value from the number of active nodes.
 * Uses EMA smoothing with rate limiting.
 *
 * @module ResonanceEngine
 */

const EMA_ALPHA = 0.3;
const MAX_CHANGE_PER_SECOND = 0.05;
const COMPUTE_INTERVAL_MS = 5000;

/**
 * Create the resonance engine.
 *
 * @returns {ResonanceEngineAPI} The engine API
 */
export function createResonanceEngine() {
  /** @type {number} */
  let smoothed = 0.7;
  /** @type {number | null} */
  let intervalId = null;
  /** @type {number} */
  let lastComputeTime = Date.now();
  /** @type {number} */
  let pendingRaw = 0.7;
  /** @type {boolean} */
  let hasPending = false;
  /** @type {Set<Function>} */
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((cb) => cb(smoothed));
  };

  /**
   * Compute raw RI from active node count.
   *
   * @param {number} activeNodeCount
   * @returns {number} Raw RI value
   */
  const computeRaw = (activeNodeCount) => {
    if (activeNodeCount === 0) return 0.3;
    if (activeNodeCount === 1) return 0.7;
    return Math.min(1.0, activeNodeCount / 3);
  };

  /**
   * Apply EMA smoothing and rate limiting.
   *
   * @param {number} raw
   */
  const applySmoothing = (raw) => {
    const now = Date.now();
    const dt = (now - lastComputeTime) / 1000;
    lastComputeTime = now;

    const ema = EMA_ALPHA * raw + (1 - EMA_ALPHA) * smoothed;
    const maxDelta = MAX_CHANGE_PER_SECOND * Math.max(dt, 0.001);
    const clamped = Math.max(smoothed - maxDelta, Math.min(smoothed + maxDelta, ema));

    const changed = Math.abs(smoothed - clamped) > 0.0001;
    smoothed = clamped;
    if (changed) notify();
  };

  const tick = () => {
    if (hasPending) {
      applySmoothing(pendingRaw);
      hasPending = false;
    }
  };

  return {
    computeRI: (activeNodeCount) => {
      pendingRaw = computeRaw(activeNodeCount);
      hasPending = true;

      if (!intervalId) {
        lastComputeTime = Date.now();
        intervalId = setInterval(tick, COMPUTE_INTERVAL_MS);
      }
    },

    getSmoothedRI: () => smoothed,

    forceRI: (value) => {
      pendingRaw = value;
      hasPending = true;
      smoothed = value;
      notify();
    },

    onChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    /** For testing: stop the compute interval */
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

/**
 * @typedef {Object} ResonanceEngineAPI
 * @property {(activeNodeCount: number) => void} computeRI
 * @property {() => number} getSmoothedRI
 * @property {(value: number) => void} forceRI
 * @property {(callback: (ri: number) => void) => (() => void)} onChange
 * @property {() => void} stop
 */
