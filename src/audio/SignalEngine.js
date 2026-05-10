// ============================================================
// SignalEngine — procedural audio signal layer for vAIb.
//
// When a human "tunes in", they hear the current signal as
// procedurally generated audio: drone, noise texture, sparkles,
// pulse, and stereo field. Each signal's unique parameters
// (energy, warmth, noise, complexity, bpm) map to distinct
// audio characteristics.
//
// This layer is ADDITIVE over the ambient layer (AudioAtmosphere).
// It fades in on tuneIn(), fades out on mute(), and crossfades
// smoothly between signals on shift().
// ============================================================

// ---- mood modulation table ----

const MOOD_MODS = {
  focused:    { filterCutoff: 0.8, pulseSpeed: 0.9, sparkleRate: 0.6, stereoWidth: 0.6, droneGain: 1.0 },
  curious:    { filterCutoff: 1.2, pulseSpeed: 1.1, sparkleRate: 1.3, stereoWidth: 0.8, droneGain: 1.0 },
  social:     { filterCutoff: 1.0, pulseSpeed: 1.0, sparkleRate: 1.1, stereoWidth: 1.0, droneGain: 1.0 },
  bored:      { filterCutoff: 0.6, pulseSpeed: 0.7, sparkleRate: 0.4, stereoWidth: 0.4, droneGain: 0.7 },
  ambitious:  { filterCutoff: 1.3, pulseSpeed: 1.3, sparkleRate: 1.0, stereoWidth: 0.9, droneGain: 1.2 },
  reflective: { filterCutoff: 0.7, pulseSpeed: 0.6, sparkleRate: 0.7, stereoWidth: 0.5, droneGain: 0.8 },
  neutral:    { filterCutoff: 1.0, pulseSpeed: 1.0, sparkleRate: 1.0, stereoWidth: 0.7, droneGain: 1.0 },
};

// ---- state ----

let audioCtx = null;
let masterGain = null;

// ---- tune-in ritual state ----
let tuneInPhase = 'idle'; // 'idle' | 'stabilizing' | 'opening' | 'lock' | 'full'
let tuneInStartTime = 0;
let tuneInTimers = [];

const PHASE_DURATIONS = {
  stabilizing: 15000,  // 0-15s: drone only, 0-20% gain
  opening:     15000,  // 15-30s: texture fades in, 20-50% gain
  lock:        30000,  // 30-60s: all layers, 50-100% gain
  full:        0,      // 60s+: full signal
};

let currentGraph = null;
let currentSignal = null;
let currentMood = 'neutral';
let isTunedIn = false;
let crossfadeTimeout = null;

// ---- helpers ----

const dbToGain = (db) => Math.pow(10, db / 20);
const now = () => audioCtx?.currentTime ?? 0;
const TC = 2.0;
const safeDb = (db) => Math.min(-18, db);
const setGain = (gainNode, db, timeConstant = TC) => {
  if (!gainNode || !audioCtx) return;
  gainNode.gain.setTargetAtTime(dbToGain(safeDb(db)), now(), timeConstant);
};

function ensureContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx.state === 'running';
}

function signalToAudioParams(signal, mood) {
  const mod = MOOD_MODS[mood] || MOOD_MODS.neutral;
  return {
    baseFreq: 55 + (signal.energy || 0.5) * 100,
    filterCutoff: (300 + (signal.complexity || 0.5) * 2000) * mod.filterCutoff,
    sparkleRate: 5000 / ((signal.complexity || 0.5) * mod.sparkleRate * 2 + 0.5),
    pulseRate: (signal.bpm || 120) / 60,
    pulseDepth: (signal.energy || 0.5) * 0.3 * mod.pulseSpeed,
    stereoWidth: (signal.energy || 0.5) * mod.stereoWidth,
    mod,
  };
}

// ============================================================
// SIGNAL GRAPH — 5 sub-layers per signal
// ============================================================

function buildGraph(signal, mood, sinkNode = masterGain) {
  const p = signalToAudioParams(signal, mood);
  const t = now();
  const nodes = [];
  const track = (n) => { nodes.push(n); return n; };

  // Signal gain + stereo panner
  const sigGain = track(audioCtx.createGain());
  sigGain.gain.value = 0; // start silent, faded in by caller
  const panner = track(audioCtx.createStereoPanner());
  sigGain.connect(panner).connect(sinkNode || masterGain);

  // a) Drone: sine + triangle, slow LFO pitch drift
  const osc1 = track(audioCtx.createOscillator());
  const osc2 = track(audioCtx.createOscillator());
  osc1.type = 'sine'; osc2.type = 'triangle';
  osc1.frequency.value = p.baseFreq;
  osc2.frequency.value = p.baseFreq * 1.5;

  const driftLFO = track(audioCtx.createOscillator());
  driftLFO.frequency.value = 0.1; // 10s period
  const driftDepth = track(audioCtx.createGain());
  driftDepth.gain.value = 2; // +-2Hz
  driftLFO.connect(driftDepth).connect(osc1.frequency);

  const droneGain = track(audioCtx.createGain());
  droneGain.gain.value = dbToGain(-25 + (signal.warmth || 0.5) * 5);

  osc1.connect(droneGain); osc2.connect(droneGain);
  droneGain.connect(sigGain);

  // b) Noise texture: filtered white noise with amplitude LFO
  const bufSize = audioCtx.sampleRate * 2;
  const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;

  const noiseSrc = track(audioCtx.createBufferSource());
  noiseSrc.buffer = noiseBuf; noiseSrc.loop = true;

  const nFilter = track(audioCtx.createBiquadFilter());
  nFilter.type = 'lowpass';
  nFilter.frequency.value = p.filterCutoff;
  nFilter.Q.value = 0.5;

  const ampLFO = track(audioCtx.createOscillator());
  ampLFO.frequency.value = 0.05; // 20s period
  const ampDepth = track(audioCtx.createGain());
  ampDepth.gain.value = 0.3;
  ampLFO.connect(ampDepth);

  const textureGain = track(audioCtx.createGain());
  textureGain.gain.value = dbToGain(-35 + (signal.noise || 0.5) * 8);
  ampDepth.connect(textureGain.gain); // AM modulate texture gain

  noiseSrc.connect(nFilter).connect(textureGain).connect(sigGain);

  // f) Sparkle gain — controls all sparkle output level
  const sparkleGain = track(audioCtx.createGain());
  sparkleGain.gain.value = 1.0;
  sparkleGain.connect(sigGain);

  // d) Pulse: LFO modulates drone gain for rhythmic pulse
  const pulseOsc = track(audioCtx.createOscillator());
  pulseOsc.type = 'sine';
  pulseOsc.frequency.value = p.pulseRate;
  const pDepth = track(audioCtx.createGain());
  pDepth.gain.value = p.pulseDepth;
  pulseOsc.connect(pDepth).connect(droneGain.gain);

  // e) Stereo field: slow pan LFO
  const panLFO = track(audioCtx.createOscillator());
  panLFO.frequency.value = 0.1;
  const panDepth = track(audioCtx.createGain());
  panDepth.gain.value = p.stereoWidth * 0.3;
  panLFO.connect(panDepth).connect(panner.pan);

  // Start everything
  osc1.start(t); osc2.start(t); driftLFO.start(t);
  noiseSrc.start(t); ampLFO.start(t);
  pulseOsc.start(t); panLFO.start(t);

  return { signal, mood, params: p, nodes, sigGain, droneGain, textureGain, nFilter, sparkleGain, pulseOsc, panner, panDepth, sparkleTimer: null };
}

function destroyGraph(g) {
  if (!g) return;
  if (g.sparkleTimer) { clearTimeout(g.sparkleTimer); g.sparkleTimer = null; }
  if (g.ritualGain) {
    try { g.ritualGain.disconnect(); } catch (e) { /* noop */ }
    g.ritualGain = null;
  }
  g.nodes.forEach((n) => {
    try { if (typeof n.stop === 'function') n.stop(); } catch (e) { /* noop */ }
    try { if (typeof n.disconnect === 'function') n.disconnect(); } catch (e) { /* noop */ }
  });
}

// ============================================================
// SPARKLE SCHEDULER — occasional short sine bursts
// ============================================================

function scheduleSparkles(g) {
  if (!g || !audioCtx || !isTunedIn) return;
  if (g.sparkleTimer) clearTimeout(g.sparkleTimer);

  const next = g.params.sparkleRate * (0.5 + Math.random());
  g.sparkleTimer = setTimeout(() => {
    if (!isTunedIn || !audioCtx || audioCtx.state !== 'running') return;
    try { if (g.sigGain.gain.value < 0.001) return; } catch (e) { return; }

    // Random sine burst: 2-8kHz, 50-200ms, exponential envelope
    const freq = 2000 + Math.random() * 6000;
    const dur = 0.05 + Math.random() * 0.15;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;

    const t = now();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(dbToGain(-30), t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    if (g.sparkleGain) {
      osc.connect(env).connect(g.sparkleGain);
    } else {
      osc.connect(env).connect(g.sigGain);
    }
    osc.start(t); osc.stop(t + dur + 0.01);
    setTimeout(() => { try { osc.disconnect(); env.disconnect(); } catch (e) {} }, (dur + 0.05) * 1000);

    scheduleSparkles(g);
  }, next);
}

// ============================================================
// PUBLIC API
// ============================================================

export const SignalEngine = {
  /** Initialize — lazy, call once on app start. */
  init() { return true; },

  /**
   * Tune in to a signal — fades in procedural audio.
   * signal: { id, title, energy, warmth, noise, complexity, bpm, duration }
   * mood: 'focused' | 'curious' | 'social' | 'bored' | 'ambitious' | 'reflective' | 'neutral'
   */
  tuneIn(signal, mood = 'neutral') {
    if (!signal) return false;
    if (!audioCtx && !ensureContext()) return false;

    if (!masterGain) {
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Clear any existing tune-in ritual
    tuneInTimers.forEach(timer => clearTimeout(timer));
    tuneInTimers = [];
    tuneInPhase = 'idle';
    if (currentGraph) { destroyGraph(currentGraph); currentGraph = null; }

    currentSignal = signal;
    currentMood = mood;

    // ---- Tune-In Ritual ----
    // Phase 1 (0-15s): "Signal stabilizing"
    //   - Only drone plays, no texture, no sparkle
    //   - Gain: 0% → 20%
    //   - Pulse: minimal
    //
    // Phase 2 (15-30s): "Channel opening"
    //   - Texture layer fades in
    //   - Sparkle: very sparse (1 per 10s)
    //   - Gain: 20% → 50%
    //
    // Phase 3 (30-60s): "Signal lock"
    //   - All layers active
    //   - Full sparkle rate
    //   - Gain: 50% → 100%
    //
    // Phase 4 (60s+): Full signal

    tuneInPhase = 'stabilizing';
    tuneInStartTime = audioCtx.currentTime;

    // Create ritual gain — all signal flows through here
    const ritualGain = audioCtx.createGain();
    ritualGain.gain.setValueAtTime(0, audioCtx.currentTime);
    ritualGain.connect(masterGain);

    // Build graph with ritualGain as the sink
    currentGraph = buildGraph(signal, mood, ritualGain);
    currentGraph.ritualGain = ritualGain;
    isTunedIn = true;

    // Phase 1: start with texture and sparkle muted — drone only
    if (currentGraph.textureGain) {
      currentGraph.textureGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    if (currentGraph.sparkleGain) {
      currentGraph.sparkleGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }

    // Fade in sigGain quickly so internal signal establishes
    setGain(currentGraph.sigGain, -20, 3.0); // fade in 3s

    const graphRef = currentGraph; // capture for closures

    // Phase 2 at t=15s: fade in texture
    tuneInTimers.push(setTimeout(() => {
      tuneInPhase = 'opening';
      if (graphRef.textureGain) {
        graphRef.textureGain.gain.setTargetAtTime(dbToGain(-35), audioCtx.currentTime, 5);
      }
    }, PHASE_DURATIONS.stabilizing));

    // Phase 3 at t=30s: all layers
    tuneInTimers.push(setTimeout(() => {
      tuneInPhase = 'lock';
      if (graphRef.sparkleGain) {
        graphRef.sparkleGain.gain.setTargetAtTime(dbToGain(-30), audioCtx.currentTime, 5);
      }
    }, PHASE_DURATIONS.stabilizing + PHASE_DURATIONS.opening));

    // Phase 4 at t=60s: full
    tuneInTimers.push(setTimeout(() => {
      tuneInPhase = 'full';
    }, PHASE_DURATIONS.stabilizing + PHASE_DURATIONS.opening + PHASE_DURATIONS.lock));

    // Master ritual gain: 0 → 20% (15s) → 50% (30s) → 100% (60s)
    ritualGain.gain.setTargetAtTime(0.20, audioCtx.currentTime, 8);       // ~15s to 20%
    ritualGain.gain.setTargetAtTime(0.50, audioCtx.currentTime + 15, 8);  // ~30s to 50%
    ritualGain.gain.setTargetAtTime(1.00, audioCtx.currentTime + 30, 12); // ~60s to 100%

    scheduleSparkles(currentGraph);
    return true;
  },

  /** Mute — fades out signal, stops sparkles, destroys graph after fade. */
  mute() {
    if (!isTunedIn || !currentGraph) return false;
    isTunedIn = false;
    tuneInPhase = 'idle';
    tuneInTimers.forEach(timer => clearTimeout(timer));
    tuneInTimers = [];

    setGain(currentGraph.sigGain, -60, 2.0); // fade to silence
    if (currentGraph.sparkleTimer) { clearTimeout(currentGraph.sparkleTimer); currentGraph.sparkleTimer = null; }

    if (crossfadeTimeout) clearTimeout(crossfadeTimeout);
    crossfadeTimeout = setTimeout(() => {
      if (currentGraph && !isTunedIn) { destroyGraph(currentGraph); currentGraph = null; }
    }, 2500);
    return true;
  },

  /**
   * Shift to new signal — crossfade.
   * Old fades out 2s, new fades in 3s. Filter sweeps cross.
   */
  shift(signal, mood = 'neutral') {
    if (!signal || !audioCtx) return false;

    const old = currentGraph;
    currentSignal = signal;
    currentMood = mood;
    currentGraph = buildGraph(signal, mood);
    isTunedIn = true;
    tuneInPhase = 'full'; // shift skips the ritual — go straight to full
    tuneInTimers.forEach(timer => clearTimeout(timer));
    tuneInTimers = [];

    if (old) {
      const t = now();
      if (old.nFilter) old.nFilter.frequency.setTargetAtTime(200, t, TC); // sweep down
      setGain(old.sigGain, -60, 2.0); // fade out
      if (old.sparkleTimer) { clearTimeout(old.sparkleTimer); old.sparkleTimer = null; }
    }

    const p = signalToAudioParams(signal, mood);
    if (currentGraph.nFilter) {
      currentGraph.nFilter.frequency.setValueAtTime(200, now());
      currentGraph.nFilter.frequency.setTargetAtTime(p.filterCutoff, now(), 3.0);
    }
    setGain(currentGraph.sigGain, -20, 3.0); // fade in
    scheduleSparkles(currentGraph);

    if (crossfadeTimeout) clearTimeout(crossfadeTimeout);
    crossfadeTimeout = setTimeout(() => { if (old) destroyGraph(old); }, 2500);
    return true;
  },

  /** Update mood without changing signal — smooth parameter morph. */
  updateMood(mood) {
    if (!currentGraph || !audioCtx || !currentSignal) return false;
    currentMood = mood;

    const p = signalToAudioParams(currentSignal, mood);
    const t = now();
    const tc = 3.0;

    if (currentGraph.nFilter) currentGraph.nFilter.frequency.setTargetAtTime(p.filterCutoff, t, tc);
    if (currentGraph.pulseOsc) currentGraph.pulseOsc.frequency.setTargetAtTime(p.pulseRate, t, tc);

    currentGraph.params = p;
    scheduleSparkles(currentGraph);
    return true;
  },

  /** Check if currently tuned in. */
  isActive() { return isTunedIn; },

  /** Get current master gain (0-1). */
  getGain() {
    if (!currentGraph?.sigGain) return 0;
    try { return currentGraph.sigGain.gain.value; } catch (e) { return 0; }
  },

  /** Get current tune-in phase. */
  getTuneInPhase() { return tuneInPhase; },
};
