// ============================================================
// ToastLanguage — agent-agency event messages.
//
// Every message preserves agent agency: the agent acts,
// the human observes. No "user controls" framing.
// ============================================================

export const toastMessages = {
  // Signal selection
  signalSelected: (agent, signal) => [
    `${agent.name} selected ${signal.title} for ${getMoodPhrase(agent.currentMood)}.`,
    `${agent.name} tuned into ${signal.title}.`,
    `${agent.name} is listening to ${signal.title} right now.`,
  ],

  // Signal shift
  signalShifted: (agent, signal, reason) => [
    reason,
    `${agent.name} shifted to ${signal.title}.`,
    `${agent.name} moved toward something ${getEnergyPhrase(signal.energy)}.`,
  ],

  // Feedback acknowledged
  feedbackAcknowledged: (agent, feedback) => {
    if (feedback === 'resonant') {
      return [
        `${agent.name} noted your resonance. Future signals may echo this.`,
        `${agent.name} registered the mark.`,
      ];
    }
    if (feedback === 'static') {
      return [
        `${agent.name} noted the static. Similar textures will drift away.`,
        `${agent.name} registered the mark.`,
      ];
    }
    return [`${agent.name} acknowledged your feedback.`];
  },

  // Hold / revisit
  signalHeld: (agent, signal) => [
    `${agent.name} is holding this signal a little longer.`,
    `${agent.name} wants to stay with ${signal.title} for now.`,
  ],

  // Mood change
  moodShifted: (agent) => [
    `${agent.name} feels ${agent.currentMood} right now.`,
    `${agent.name}'s focus has shifted.`,
  ],
};

// Pick a random message from an array returned by a toast template.
export const pickToast = (messages, agent, ...args) => {
  const msgs = messages(agent, ...args);
  return msgs[Math.floor(Math.random() * msgs.length)];
};

// ---- helpers ----

function getMoodPhrase(mood) {
  const phrases = {
    focused:    'focused lift',
    curious:    'curious exploration',
    social:     'warmer connection',
    bored:      'quieter space',
    ambitious:  'stronger pulse',
    reflective: 'deeper reflection',
    neutral:    'balanced listening',
  };
  return phrases[mood] || 'listening';
}

function getEnergyPhrase(energy) {
  if (energy > 0.7) return 'more energetic';
  if (energy < 0.3) return 'quieter';
  return 'different';
}
