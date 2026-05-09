// ============================================================
// vAIb Sacred Prototype — AudioAtmosphere
// Web Audio API ambient atmosphere — 4 layers: drone, texture,
// sparkle, pulse.  Pure JavaScript, no external libraries.
// ============================================================

let audioCtx = null;
let masterGain = null;
let layers = {};
let isRunning = false;
let sparkleInterval = null;
let currentRI = 0.7;

// ---- helpers ----

const dbToGain = (db) => Math.pow(10, db / 20);

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// ---- reverb ----

// Build a simple synthetic impulse response for reverb
function createImpulseResponse(duration = 2.0, decay = 2.0) {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const n = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / duration, decay);
    }
  }
  return buffer;
}

// ---- sparkle scheduling ----

// Use a single persistent gain node for sparkles to avoid
// creating too many nodes.  We ramp a short sine burst through it.
let sparkleNodes = null;

function scheduleSparkles() {
  if (sparkleInterval) clearInterval(sparkleInterval);

  const trigger = () => {
    if (!isRunning || !audioCtx || audioCtx.state === 'suspended') return;

    // RI determines sparkle frequency: low=1/5s, high=1/s
    const chance = 0.2 + currentRI * 0.8; // 0.2..1.0
    if (Math.random() > chance) return;

    // Random frequency 3-8kHz
    const freq = 3000 + Math.random() * 5000;
    const duration = 0.05 + Math.random() * 0.15; // 50-200ms

    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    env.gain.setValueAtTime(0, audioCtx.currentTime);
    env.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(env);
    env.connect(layers.sparkleGain);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration + 0.01);

    // Cleanup
    setTimeout(() => {
      try { osc.disconnect(); env.disconnect(); } catch (e) { /* noop */ }
    }, (duration + 0.05) * 1000);
  };

  // Trigger at 1Hz base; RI increases density, not just chance
  const intervalMs = Math.max(200, 1000 - currentRI * 800);
  sparkleInterval = setInterval(trigger, intervalMs);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Start the ambient audio atmosphere.
 * Must be called after a user gesture (browser requirement).
 */
export function startAudioAtmosphere() {
  if (isRunning) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain at -20dB with safety ceiling
  masterGain = audioCtx.createGain();
  masterGain.gain.value = dbToGain(-20);

  // Stereo master
  const masterPanner = audioCtx.createStereoPanner();
  masterPanner.pan.value = 0;

  // Reverb (convolver with synthetic IR)
  const convolver = audioCtx.createConvolver();
  convolver.buffer = createImpulseResponse(1.5, 2.5);

  const reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.3; // default wet amount

  const dryGain = audioCtx.createGain();
  dryGain.gain.value = 1.0;

  // ---- Layer 1: Drone ----
  // Two sine oscillators at 55Hz + 82Hz with slow LFO pitch modulation
  const droneOsc1 = audioCtx.createOscillator();
  const droneOsc2 = audioCtx.createOscillator();
  droneOsc1.type = 'sine';
  droneOsc2.type = 'sine';
  droneOsc1.frequency.value = 55;
  droneOsc2.frequency.value = 82;

  // LFO for slow pitch modulation (±2Hz, 10s period)
  const droneLFO = audioCtx.createOscillator();
  droneLFO.frequency.value = 0.1; // 10s period
  const droneLFODepth = audioCtx.createGain();
  droneLFODepth.gain.value = 2; // ±2Hz
  droneLFO.connect(droneLFODepth);
  droneLFODepth.connect(droneOsc1.frequency);

  const droneGain = audioCtx.createGain();
  droneGain.gain.value = dbToGain(-25);

  const dronePanner = audioCtx.createStereoPanner();
  dronePanner.pan.value = -0.2;

  droneOsc1.connect(droneGain);
  droneOsc2.connect(droneGain);
  droneGain.connect(dronePanner);
  dronePanner.connect(dryGain);
  dronePanner.connect(reverbGain);

  // ---- Layer 2: Texture ----
  // Filtered white noise with slow amplitude modulation
  const noiseBufferSize = audioCtx.sampleRate * 2; // 2 seconds
  const noiseBuffer = audioCtx.createBuffer(1, noiseBufferSize, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const textureSource = audioCtx.createBufferSource();
  textureSource.buffer = noiseBuffer;
  textureSource.loop = true;

  const textureFilter = audioCtx.createBiquadFilter();
  textureFilter.type = 'lowpass';
  textureFilter.frequency.value = 800;
  textureFilter.Q.value = 0.5;

  // Slow amplitude LFO (0.05Hz = 20s period)
  const textureLFO = audioCtx.createOscillator();
  textureLFO.frequency.value = 0.05;
  const textureLFODepth = audioCtx.createGain();
  textureLFODepth.gain.value = 0.5; // ±50% modulation
  const textureLFOffset = audioCtx.createGain();
  textureLFOffset.gain.value = 0.5; // offset to keep positive

  textureLFO.connect(textureLFODepth);

  const textureGain = audioCtx.createGain();
  textureGain.gain.value = dbToGain(-30);

  // Modulate texture gain with LFO: base 0.5 + lfo*0.5
  textureLFODepth.connect(textureGain.gain);
  // We'll just set the gain to be modulated by the LFO directly
  textureGain.gain.value = 0.5;
  textureLFO.connect(textureLFODepth);

  const texturePanner = audioCtx.createStereoPanner();
  texturePanner.pan.value = 0.3;

  textureSource.connect(textureFilter);
  textureFilter.connect(textureGain);
  textureGain.connect(texturePanner);
  texturePanner.connect(dryGain);
  texturePanner.connect(reverbGain);

  // ---- Layer 3: Sparkle ----
  // Short random sine bursts (handled by scheduleSparkles)
  const sparkleGain = audioCtx.createGain();
  sparkleGain.gain.value = dbToGain(-40);

  const sparklePanner = audioCtx.createStereoPanner();
  sparklePanner.pan.value = 0.6;

  sparkleGain.connect(sparklePanner);
  sparklePanner.connect(dryGain);
  sparklePanner.connect(reverbGain);

  // ---- Layer 4: Pulse ----
  // Low-frequency amplitude pulse synced to ~0.5Hz
  const pulseOsc = audioCtx.createOscillator();
  pulseOsc.type = 'sine';
  pulseOsc.frequency.value = 0.5;

  const pulseGain = audioCtx.createGain();
  pulseGain.gain.value = dbToGain(-35);

  const pulsePanner = audioCtx.createStereoPanner();
  pulsePanner.pan.value = 0;

  // Pulse modulates the drone gain subtly
  const pulseModDepth = audioCtx.createGain();
  pulseModDepth.gain.value = 0.15; // 15% depth
  pulseOsc.connect(pulseModDepth);
  pulseModDepth.connect(droneGain.gain);

  pulseOsc.connect(pulseGain);
  pulseGain.connect(pulsePanner);
  pulsePanner.connect(dryGain);
  pulsePanner.connect(reverbGain);

  // ---- Reverb routing ----
  reverbGain.connect(convolver);
  convolver.connect(masterGain);
  dryGain.connect(masterGain);

  // ---- Master output ----
  masterGain.connect(masterPanner);
  masterPanner.connect(audioCtx.destination);

  // ---- Start all sources ----
  droneOsc1.start();
  droneOsc2.start();
  droneLFO.start();
  textureSource.start();
  textureLFO.start();
  pulseOsc.start();

  // ---- Store references ----
  layers = {
    droneOsc1,
    droneOsc2,
    droneLFO,
    droneGain,
    dronePanner,
    textureSource,
    textureLFO,
    textureFilter,
    textureGain,
    texturePanner,
    sparkleGain,
    sparklePanner,
    pulseOsc,
    pulseGain,
    pulsePanner,
    pulseModDepth,
    reverbGain,
    masterGain,
    masterPanner,
  };

  isRunning = true;

  // Start sparkle scheduler
  scheduleSparkles();

  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Stop the ambient audio atmosphere and release all resources.
 */
export function stopAudioAtmosphere() {
  if (!isRunning) return;

  if (sparkleInterval) {
    clearInterval(sparkleInterval);
    sparkleInterval = null;
  }

  try {
    Object.values(layers).forEach((node) => {
      if (node && typeof node.stop === 'function') {
        try { node.stop(); } catch (e) { /* noop */ }
      }
      if (node && typeof node.disconnect === 'function') {
        try { node.disconnect(); } catch (e) { /* noop */ }
      }
    });
  } catch (e) {
    // ignore cleanup errors
  }

  if (audioCtx) {
    try { audioCtx.close(); } catch (e) { /* noop */ }
  }

  layers = {};
  audioCtx = null;
  masterGain = null;
  isRunning = false;
}

/**
 * Update audio parameters based on Resonance Index (RI).
 * All changes use smooth setTargetAtTime transitions (2s).
 */
export function updateAudioAtmosphere(ri, parameters) {
  if (!isRunning || !audioCtx) return;

  currentRI = typeof ri === 'number' ? ri : 0.7;
  const t = audioCtx.currentTime;
  const tc = 2.0; // 2 second time constant for smooth transitions

  // Gains per layer (all in dB, converted to linear)
  const droneTarget = dbToGain(-25);
  const textureTarget = dbToGain(lerp(-40, -20, currentRI));
  const sparkleTarget = dbToGain(lerp(-50, -18, currentRI));
  const pulseTarget = dbToGain(lerp(-60, -20, currentRI));

  // Master: lerp(-25dB, -20dB, ri) — NEVER exceeds -18dB
  const masterDB = Math.min(-18, lerp(-25, -20, currentRI));
  const masterTarget = dbToGain(masterDB);

  // Stereo width increases with RI
  const stereoWidth = lerp(0.3, 1.0, currentRI);

  // Reverb wet amount
  const reverbAmount = lerp(0.1, 0.5, currentRI);

  // Apply smooth transitions
  if (layers.droneGain) {
    layers.droneGain.gain.setTargetAtTime(droneTarget, t, tc);
  }
  if (layers.textureGain) {
    layers.textureGain.gain.setTargetAtTime(textureTarget, t, tc);
  }
  if (layers.sparkleGain) {
    layers.sparkleGain.gain.setTargetAtTime(sparkleTarget, t, tc);
  }
  if (layers.pulseGain) {
    layers.pulseGain.gain.setTargetAtTime(pulseTarget, t, tc);
  }
  if (layers.masterGain) {
    layers.masterGain.gain.setTargetAtTime(masterTarget, t, tc);
  }

  // Stereo pan spread: layers spread wider as RI increases
  if (layers.dronePanner) {
    layers.dronePanner.pan.setTargetAtTime(-0.4 * stereoWidth, t, tc);
  }
  if (layers.texturePanner) {
    layers.texturePanner.pan.setTargetAtTime(0.2 * stereoWidth, t, tc);
  }
  if (layers.sparklePanner) {
    layers.sparklePanner.pan.setTargetAtTime(0.6 * stereoWidth, t, tc);
  }

  // Reverb amount
  if (layers.reverbGain) {
    layers.reverbGain.gain.setTargetAtTime(reverbAmount, t, tc);
  }

  // Reschedule sparkles with updated RI
  scheduleSparkles();
}
