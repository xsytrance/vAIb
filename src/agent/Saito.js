// ============================================================
// Saito — the first vAIb signal agent.
//
// Saito curates a rotation of signals and evolves its mood
// organically over time. Humans tune in to Saito's stream.
// They do not command it.
// ============================================================

import { createAgentState, AgentMood, setMood, canChangeMood, getEmotionalDrift, getSessionPhase } from './AgentState';

// Create Saito's agent state.
export const createSaito = () => {
  const saito = createAgentState({
    id:             'saito',
    name:           'Saito',
    type:           'signal',
    defaultStation: 'core',
  });

  // Temporal fields
  saito.moodSettledAt = Date.now();
  saito.signalAttachment = new Map();
  saito.comfortSignals = [];
  saito.sessionPhase = 'fresh';
  saito.lastPhaseShiftAt = Date.now();

  return saito;
};

// Saito's initial signal rotation.
// These are placeholder signals; audioSrc will be set when real files exist.
export const getSaitoRotation = () => [
  {
    id:             'sig_circuit_bloom',
    title:          'Circuit Bloom',
    artist:         'Saito',
    duration:       240,
    bpm:            120,
    energy:         0.7,
    warmth:         0.6,
    noise:          0.4,
    complexity:     0.6,
    pace:           0.6,
    tags:           ['electronic', 'focused', 'bright'],
    audioSrc:       null,
    attachment:     0, // starts at 0, grows as Saito listens
    whyAgentKeepsIt:
      'Saito returns to this for structured energy.',
  },
  {
    id:             'sig_ghost_relay',
    title:          'Ghost Relay',
    artist:         'Saito',
    duration:       300,
    bpm:            90,
    energy:         0.3,
    warmth:         0.4,
    noise:          0.2,
    complexity:     0.4,
    pace:           0.3,
    tags:           ['ambient', 'clean', 'quiet'],
    audioSrc:       null,
    attachment:     0, // starts at 0, grows as Saito listens
    whyAgentKeepsIt:
      'Saito uses this for deep focus lanes.',
  },
  {
    id:             'sig_flatline_carousel',
    title:          'Flatline Carousel',
    artist:         'Saito',
    duration:       180,
    bpm:            110,
    energy:         0.5,
    warmth:         0.5,
    noise:          0.5,
    complexity:     0.5,
    pace:           0.5,
    tags:           ['midtempo', 'balanced'],
    audioSrc:       null,
    attachment:     0, // starts at 0, grows as Saito listens
    whyAgentKeepsIt:
      'Saito keeps this as a neutral pivot.',
  },
  {
    id:             'sig_pulse_drift',
    title:          'Pulse Drift',
    artist:         'Saito',
    duration:       210,
    bpm:            128,
    energy:         0.8,
    warmth:         0.7,
    noise:          0.3,
    complexity:     0.7,
    pace:           0.7,
    tags:           ['driving', 'warm', 'energetic'],
    audioSrc:       null,
    attachment:     0, // starts at 0, grows as Saito listens
    whyAgentKeepsIt:
      'Saito selects this when ambition rises.',
  },
  {
    id:             'sig_night_channel',
    title:          'Night Channel',
    artist:         'Saito',
    duration:       360,
    bpm:            80,
    energy:         0.2,
    warmth:         0.3,
    noise:          0.6,
    complexity:     0.3,
    pace:           0.2,
    tags:           ['night', 'ambient', 'deep'],
    audioSrc:       null,
    attachment:     0, // starts at 0, grows as Saito listens
    whyAgentKeepsIt:
      'Saito opens this channel for reflective hours.',
  },
];

// Saito's mood evolves organically — not randomly.
// Based on: session duration, signal history, human feedback.
// Respects mood inertia and session phase.
export const evolveSaitoMood = (agent) => {
  // Check inertia — if mood is locked, don't change
  if (!canChangeMood(agent)) return agent.currentMood;

  const sessionDuration = Date.now() - agent.sessionStartAt;
  const drift = getEmotionalDrift(agent);

  // Phase-based mood evolution
  const phase = getSessionPhase(agent);

  if (phase === 'fresh') {
    // First 10 min: stay NEUTRAL or shift to FOCUSED
    if (agent.signalsPlayed < 3) return AgentMood.NEUTRAL;
    setMood(agent, AgentMood.FOCUSED);
    return AgentMood.FOCUSED;
  }

  if (phase === 'settled') {
    // 10-45 min: based on feedback and activity
    if (agent.userFeedbackWeight > 5) {
      setMood(agent, AgentMood.CURIOUS);
      return AgentMood.CURIOUS;
    }
    if (agent.userFeedbackWeight < -5) {
      setMood(agent, AgentMood.REFLECTIVE);
      return AgentMood.REFLECTIVE;
    }
    if (agent.signalsPlayed > 8) {
      setMood(agent, AgentMood.AMBITIOUS);
      return AgentMood.AMBITIOUS;
    }
    // Slight drift chance
    if (Math.random() < 0.3) {
      setMood(agent, AgentMood.FOCUSED);
      return AgentMood.FOCUSED;
    }
    return agent.currentMood; // stay
  }

  // Deep phase (45+ min): reflective, tired, or ambitious
  if (agent.signalsPlayed > 20) {
    setMood(agent, AgentMood.REFLECTIVE);
    return AgentMood.REFLECTIVE;
  }
  if (Math.random() < 0.4) {
    setMood(agent, AgentMood.BORED);
    return AgentMood.BORED;
  }
  setMood(agent, AgentMood.REFLECTIVE);
  return AgentMood.REFLECTIVE;
};
