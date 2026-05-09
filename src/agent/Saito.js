// ============================================================
// Saito — the first vAIb signal agent.
//
// Saito curates a rotation of signals and evolves its mood
// organically over time. Humans tune in to Saito's stream.
// They do not command it.
// ============================================================

import { createAgentState, AgentMood } from './AgentState';

// Create Saito's agent state.
export const createSaito = () =>
  createAgentState({
    id:             'saito',
    name:           'Saito',
    type:           'signal',
    defaultStation: 'core',
  });

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
    whyAgentKeepsIt:
      'Saito opens this channel for reflective hours.',
  },
];

// Saito's mood evolves organically — not randomly.
// Based on: session duration, signal history, human feedback.
export const evolveSaitoMood = (agent) => {
  const sessionDuration = Date.now() - agent.sessionStartAt;

  if (sessionDuration < 60000) return AgentMood.NEUTRAL;
  if (agent.userFeedbackWeight > 5) return AgentMood.CURIOUS;
  if (agent.userFeedbackWeight < -5) return AgentMood.REFLECTIVE;
  if (agent.signalsPlayed > 8) return AgentMood.AMBITIOUS;

  // Default: stay current or drift slightly.
  const moods = Object.values(AgentMood);
  const currentIdx = moods.indexOf(agent.currentMood);
  const drift =
    Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
  return moods[(currentIdx + drift + moods.length) % moods.length];
};
