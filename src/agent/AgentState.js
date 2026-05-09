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

    return { signal, score };
  });

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
