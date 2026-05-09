// ============================================================
// AgentState — core agent model for the vAIb signal platform.
//
// Agents control the music. Humans tune in, observe, and nudge.
// Every agent has: mood, taste vector, signal rotation, agency.
// ============================================================

export const AgentMood = {
  FOCUSED:    'focused',     // tighter particles, calmer motion
  CURIOUS:    'curious',     // brighter sparkle frequency
  SOCIAL:     'social',      // warmer glow
  BORED:      'bored',       // reduced energy, thinner signal
  AMBITIOUS:  'ambitious',   // stronger pulse
  REFLECTIVE: 'reflective',  // slower bloom, deeper blue
  NEUTRAL:    'neutral',     // balanced
};

// ---- Mood Inertia ----
// Saito resists mood changes. Each mood has an inertia value (seconds).
// Saito will not change mood until inertia decays.

const MOOD_INERTIA = {
  focused:     600,   // 10 min of focus before drift
  curious:     300,   // 5 min of curiosity
  social:      180,   // 3 min (social is fleeting)
  bored:       120,   // 2 min (bored → change soon)
  ambitious:   480,   // 8 min of ambition
  reflective:  900,   // 15 min of reflection
  neutral:     300,   // 5 min before picking direction
};

// Check if mood can change (inertia has decayed)
export const canChangeMood = (agent) => {
  if (!agent.moodSettledAt) return true;
  const inertia = MOOD_INERTIA[agent.currentMood] || 300;
  return (Date.now() - agent.moodSettledAt) > inertia * 1000;
};

// Set mood with inertia tracking
export const setMood = (agent, mood) => {
  agent.currentMood = mood;
  agent.moodSettledAt = Date.now();
};

// Taste vector: weights for different musical dimensions.
export const createTasteVector = () => ({
  energy:     0.5,  // 0 = calm, 1 = intense
  noise:      0.3,  // 0 = clean, 1 = textured
  warmth:     0.6,  // 0 = cool, 1 = warm
  complexity: 0.5,  // 0 = simple, 1 = complex
  pace:       0.5,  // 0 = slow, 1 = fast
});

// Create an agent's state.
export const createAgentState = (config) => ({
  id:   config.id,
  name: config.name,
  type: config.type || 'signal',  // 'signal' | 'command' | 'ambient' | 'field'

  // Current listening state
  currentSignal:   null,
  currentMood:     AgentMood.NEUTRAL,
  currentStation:  config.defaultStation || 'core',

  // Taste and preferences
  taste:         createTasteVector(),
  rotation:      [],        // signals the agent curates
  signalHistory: [],        // recently played signals (last 20)

  // Agent behavior
  focusLevel:       0.5,   // 0 = distracted, 1 = deep focus
  driftTendency:    0.3,   // likelihood of changing signal spontaneously
  holdPreference:   0.5,   // how long agent prefers to hold a signal

  // Feedback integration
  userFeedbackWeight: 0,   // cumulative feedback (-10 to +10)
  lastFeedbackAt:     null,
  resonanceMarks:     [],  // signals marked as resonant
  staticMarks:        [],  // signals marked as static

  // Time state
  sessionStartAt:      Date.now(),
  lastSignalChangeAt:  null,
  signalsPlayed:       0,

  // Fatigue (new)
  signalExhaustion:    new Map(),  // signalId → exhaustion (0-1)
  stimulationHistory:  [],         // { energy, timestamp }[]

  // Temporal continuity
  moodSettledAt:     Date.now(),   // when current mood was set
  signalAttachment:  new Map(),    // signalId → attachment score (0-1)
  comfortSignals:    [],           // top 3 signals by attachment
  sessionPhase:      'fresh',      // 'fresh' | 'settled' | 'deep'
  lastPhaseShiftAt:  Date.now(),
});

// Agent selects next signal based on taste, mood, feedback, context.
export const selectNextSignal = (agent, context = {}) => {
  if (!agent.rotation || agent.rotation.length === 0) return null;

  const candidates = agent.rotation.map((signal) => {
    let score = 0;

    // Mood fit
    const moodFit = getMoodFit(agent.currentMood, signal);
    score += moodFit * 0.3;

    // Taste similarity
    const tasteSim = getTasteSimilarity(agent.taste, signal);
    score += tasteSim * 0.3;

    // Feedback bias
    const feedbackBias = getFeedbackBias(agent, signal);
    score += feedbackBias * 0.2;

    // Recency penalty (avoid repeating recently played)
    const recencyPenalty = getRecencyPenalty(agent, signal);
    score += recencyPenalty * 0.2;

    // Attachment bonus (10% weight)
    const attachmentScore = getAttachment(agent, signal.id) * 0.1;
    score += attachmentScore;

    return { signal, score };
  });

  // Comfort loop: 15% chance to pick from comfort signals
  if (Math.random() < 0.15 && agent.comfortSignals.length > 0) {
    const comfortId = agent.comfortSignals[Math.floor(Math.random() * agent.comfortSignals.length)];
    const comfortSignal = agent.rotation.find(s => s.id === comfortId);
    if (comfortSignal) return comfortSignal;
  }

  candidates.sort((a, b) => b.score - a.score);

  // Add slight randomness — agent is not deterministic
  const topCandidates = candidates.slice(0, 3);
  const selected = topCandidates[
    Math.floor(Math.random() * topCandidates.length)
  ];

  return selected ? selected.signal : candidates[0]?.signal;
};

// Apply human feedback to shape future agent behavior.
export const applyFeedback = (agent, signalId, feedback) => {
  // feedback: 'resonant' | 'static' | 'more' | 'less'
  const weight =
    feedback === 'resonant' ? +2
    : feedback === 'static' ? -2
    : feedback === 'more'   ? +1
    :                         -1;

  agent.userFeedbackWeight = Math.max(
    -10,
    Math.min(10, agent.userFeedbackWeight + weight)
  );
  agent.lastFeedbackAt = Date.now();

  if (feedback === 'resonant' && !agent.resonanceMarks.includes(signalId)) {
    agent.resonanceMarks.push(signalId);
  }
  if (feedback === 'static' && !agent.staticMarks.includes(signalId)) {
    agent.staticMarks.push(signalId);
  }

  // Nudge taste vector based on feedback
  const signal = agent.rotation.find((s) => s.id === signalId);
  if (signal) {
    const nudge = 0.05 * (weight > 0 ? 1 : -1);
    agent.taste.energy = clamp(agent.taste.energy + nudge * (signal.energy - 0.5));
    agent.taste.warmth = clamp(agent.taste.warmth + nudge * (signal.warmth - 0.5));
  }
};

// Agent interprets a "shift signal" nudge from a human.
export const interpretShiftRequest = (agent) => {
  const nextSignal = selectNextSignal(agent, { requested: true });

  // Determine narrative for why agent shifted — agent has agency.
  const reasons = [
    agent.userFeedbackWeight < -3
      && 'Saito drifted away after recent static marks.',
    agent.currentMood === AgentMood.CURIOUS
      && 'Saito is exploring something new.',
    agent.currentMood === AgentMood.FOCUSED
      && 'Saito tightened the signal for deeper focus.',
    agent.currentMood === AgentMood.REFLECTIVE
      && 'Saito moved toward something quieter.',
    agent.signalsPlayed > 5
      && 'Saito felt ready for a shift.',
    'Saito selected a new signal.',
  ];

  const reason = reasons.find((r) => r) || reasons[reasons.length - 1];

  return { signal: nextSignal, reason };
};

// Get atmosphere modifiers from agent state.
export const getAgentAtmosphereModifiers = (agent) => {
  const moodMods = {
    [AgentMood.FOCUSED]:    { speed: 0.7, sparkle: 0.6, warmth: 0.5, pulse: 0.8 },
    [AgentMood.CURIOUS]:    { speed: 1.1, sparkle: 1.3, warmth: 0.6, pulse: 0.9 },
    [AgentMood.SOCIAL]:     { speed: 0.9, sparkle: 1.1, warmth: 1.2, pulse: 1.0 },
    [AgentMood.BORED]:      { speed: 0.5, sparkle: 0.4, warmth: 0.4, pulse: 0.4 },
    [AgentMood.AMBITIOUS]:  { speed: 1.2, sparkle: 1.0, warmth: 0.7, pulse: 1.3 },
    [AgentMood.REFLECTIVE]: { speed: 0.6, sparkle: 0.7, warmth: 0.5, pulse: 0.5 },
    [AgentMood.NEUTRAL]:    { speed: 1.0, sparkle: 1.0, warmth: 1.0, pulse: 1.0 },
  };
  return moodMods[agent.currentMood] || moodMods[AgentMood.NEUTRAL];
};

// ---- helpers ----

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function getMoodFit(mood, signal) {
  // Placeholder: mood-to-signal energy alignment.
  const moodEnergy = {
    [AgentMood.FOCUSED]:    0.6,
    [AgentMood.CURIOUS]:    0.7,
    [AgentMood.SOCIAL]:     0.8,
    [AgentMood.BORED]:      0.2,
    [AgentMood.AMBITIOUS]:  0.9,
    [AgentMood.REFLECTIVE]: 0.2,
    [AgentMood.NEUTRAL]:    0.5,
  };
  const target = moodEnergy[mood] ?? 0.5;
  return 1 - Math.abs(target - (signal.energy ?? 0.5));
}

function getTasteSimilarity(taste, signal) {
  const dims = ['energy', 'noise', 'warmth', 'complexity', 'pace'];
  let diff = 0;
  let count = 0;
  for (const d of dims) {
    if (signal[d] !== undefined) {
      diff += Math.abs((taste[d] ?? 0.5) - signal[d]);
      count += 1;
    }
  }
  return count === 0 ? 0.5 : 1 - diff / count;
}

function getFeedbackBias(agent, signal) {
  if (agent.resonanceMarks.includes(signal.id)) return 0.3;
  if (agent.staticMarks.includes(signal.id)) return -0.3;
  return 0;
}

function getRecencyPenalty(agent, signal) {
  const recent = agent.signalHistory.slice(-5);
  const idx = recent.indexOf(signal.id);
  return idx >= 0 ? (-0.2 * (5 - idx)) / 5 : 0;
}

// ---- Signal Attachment ----
// Saito grows attached to signals the longer it listens.

// Update attachment for the current signal
export const updateAttachment = (agent) => {
  if (!agent.currentSignal) return;
  const id = agent.currentSignal.id;
  const current = agent.signalAttachment.get(id) || 0;
  // Attachment increases while playing (+0.02 per minute)
  const timeHeld = agent.lastSignalChangeAt
    ? (Date.now() - agent.lastSignalChangeAt) / 60000
    : 0;
  const newAttachment = Math.min(1, current + 0.02 * timeHeld);
  agent.signalAttachment.set(id, newAttachment);

  // Update comfort signals (top 3 by attachment)
  agent.comfortSignals = [...agent.signalAttachment.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
};

// Get attachment for a signal
export const getAttachment = (agent, signalId) => {
  return agent.signalAttachment.get(signalId) || 0;
};

// Emotional drift: session duration affects parameters
export const getEmotionalDrift = (agent) => {
  const elapsed = (Date.now() - agent.sessionStartAt) / 60000; // minutes
  if (elapsed < 5)   return { speedMult: 1.0, sparkleMult: 1.0, warmthMult: 1.0, pulseMult: 1.0 };
  if (elapsed < 15)  return { speedMult: 0.9, sparkleMult: 0.9, warmthMult: 1.0, pulseMult: 0.9 };
  if (elapsed < 30)  return { speedMult: 0.8, sparkleMult: 0.7, warmthMult: 0.9, pulseMult: 0.8 };
  if (elapsed < 60)  return { speedMult: 0.7, sparkleMult: 0.5, warmthMult: 0.8, pulseMult: 0.7 };
  return { speedMult: 0.6, sparkleMult: 0.4, warmthMult: 0.7, pulseMult: 0.6 };
};

// Determine session phase
export const getSessionPhase = (agent) => {
  const elapsed = (Date.now() - agent.sessionStartAt) / 60000;
  if (elapsed < 10)  return 'fresh';
  if (elapsed < 45)  return 'settled';
  return 'deep';
};

// ---- Atmospheric Fatigue ----
// The atmosphere tires over time. Signals exhaust. The system rests.

// Signal exhaustion: each signal gets tired the longer it plays
export const updateSignalExhaustion = (agent) => {
  if (!agent.currentSignal) return;
  const id = agent.currentSignal.id;
  const current = agent.signalExhaustion?.get(id) || 0;
  // +0.02 per minute of play, -0.01 per minute away
  const elapsed = agent.lastSignalChangeAt
    ? (Date.now() - agent.lastSignalChangeAt) / 60000
    : 0;
  const newVal = Math.min(1, Math.max(0, current + 0.02 * elapsed));
  if (!agent.signalExhaustion) agent.signalExhaustion = new Map();
  agent.signalExhaustion.set(id, newVal);
};

export const getSignalExhaustion = (agent, signalId) => {
  return agent.signalExhaustion?.get(signalId) || 0;
};

// Stimulation tracking: average energy over time
export const updateStimulation = (agent) => {
  if (!agent.stimulationHistory) agent.stimulationHistory = [];
  const energy = agent.currentSignal?.energy || 0.5;
  agent.stimulationHistory.push({
    energy,
    timestamp: Date.now(),
  });
  // Keep last 60 minutes
  const cutoff = Date.now() - 3600000;
  agent.stimulationHistory = agent.stimulationHistory.filter(s => s.timestamp > cutoff);
};

export const getStimulationLevel = (agent) => {
  if (!agent.stimulationHistory?.length) return 0.5;
  const recent = agent.stimulationHistory.slice(-10);
  const avg = recent.reduce((s, e) => s + e.energy, 0) / recent.length;
  return avg;
};

// Check if overstimulated (>0.7 for 10+ consecutive minutes)
export const isOverstimulated = (agent) => {
  if (!agent.stimulationHistory?.length) return false;
  const tenMinAgo = Date.now() - 600000;
  const recent = agent.stimulationHistory.filter(s => s.timestamp > tenMinAgo);
  if (recent.length < 5) return false; // need enough samples
  return recent.every(s => s.energy > 0.7);
};

// Fatigue multipliers: how much the atmosphere should reduce
export const getFatigueMultipliers = (agent) => {
  // Base: no fatigue
  const mults = { speed: 1.0, sparkle: 1.0, warmth: 1.0, pulse: 1.0, saturation: 1.0 };

  // Signal exhaustion
  if (agent.currentSignal) {
    const exhaustion = getSignalExhaustion(agent, agent.currentSignal.id);
    if (exhaustion > 0.5) {
      const reduction = (exhaustion - 0.5) * 0.3; // up to 15% reduction
      mults.sparkle *= (1 - reduction);
      mults.pulse *= (1 - reduction * 0.5);
    }
    if (exhaustion > 0.8) {
      mults.speed *= 0.85;
      mults.saturation *= 0.9;
    }
  }

  // Overstimulation decay
  if (isOverstimulated(agent)) {
    mults.speed *= 0.9;
    mults.sparkle *= 0.8;
    mults.pulse *= 0.85;
  }

  // Low-energy periods (rare, ~5% chance per 10 min of high stimulation)
  const stim = getStimulationLevel(agent);
  if (stim > 0.6 && Math.random() < 0.05) {
    mults.speed *= 0.8;
    mults.sparkle *= 0.5;
    mults.pulse *= 0.7;
    mults.warmth *= 0.9;
  }

  return mults;
};
