// ============================================================
// StationDiscovery — real agent ecosystem discovery.
//
// vAIb derives atmosphere from operational truth, not fiction.
// This module scans the runtime environment to discover:
//   - active agents from filesystem/processes
//   - presence scores from real activity
//   - signal characteristics from actual behavior
//   - ghost/dormant/active states from recency
//
// Architecture:
//   1. Attempt real discovery (injected data, localStorage, signals)
//   2. Score each agent's presence from actual activity
//   3. Derive station atmosphere from operational truth
//   4. Fall back to static data ONLY when no real data exists
//
// Injection API (for native contexts):
//   window.vaibInjectDiscovery = { agents: [...], dominant: 'vg_god' }
// ============================================================

// ------------------------------------------------------------------
// KNOWN AGENT ECOSYSTEM
// Real agents that may exist on PRIME's system.
// Each maps to a directory, process name, or config pattern.
// ------------------------------------------------------------------
const KNOWN_AGENTS = {
  vg_god: {
    id: 'vg_god',
    name: 'VG God',
    type: 'command',
    indicators: ['vg-god', 'vg_god', 'vgGod', '.vg-god', 'vgod'],
    paths: ['~/.vg-god', '~/.config/vg-god'],
    defaultSignal: { energy: 0.8, warmth: 0.2, noise: 0.3, complexity: 0.6, pace: 0.7 },
    personality: 'operational intensity, strict rhythm, cold precision',
  },
  saito: {
    id: 'saito',
    name: 'Saito',
    type: 'signal',
    indicators: ['saito', '.saito', 'saito-config'],
    paths: ['~/.saito', '~/.config/saito'],
    defaultSignal: { energy: 0.4, warmth: 0.6, noise: 0.4, complexity: 0.5, pace: 0.4 },
    personality: 'reflective focus, emotional drift, restrained',
  },
  snake: {
    id: 'snake',
    name: 'Snake',
    type: 'field',
    indicators: ['snake', 'snake-agent', '.snake'],
    paths: ['~/.snake', '~/.config/snake'],
    defaultSignal: { energy: 0.6, warmth: 0.3, noise: 0.6, complexity: 0.8, pace: 0.9 },
    personality: 'sharp, fast, unstable, experimental',
  },
  davinci: {
    id: 'davinci',
    name: 'daVinci',
    type: 'signal',
    indicators: ['davinci', 'da-vinci', 'davinci-agent'],
    paths: ['~/.davinci', '~/.config/davinci'],
    defaultSignal: { energy: 0.3, warmth: 0.5, noise: 0.2, complexity: 0.7, pace: 0.3 },
    personality: 'creative, slow, exploratory, artistic',
  },
  ultron: {
    id: 'ultron',
    name: 'Ultron',
    type: 'command',
    indicators: ['ultron', 'supersort', 'ultron-agent'],
    paths: ['~/.ultron', '~/.config/supersort'],
    defaultSignal: { energy: 0.9, warmth: 0.1, noise: 0.2, complexity: 0.5, pace: 0.8 },
    personality: 'ruthless efficiency, sorting, categorization, cold',
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes',
    type: 'command',
    indicators: ['hermes', 'hermes-cli', '.hermes'],
    paths: ['~/.hermes', '~/.config/hermes'],
    defaultSignal: { energy: 0.5, warmth: 0.4, noise: 0.3, complexity: 0.4, pace: 0.6 },
    personality: 'messaging, routing, connection, flow',
  },
  openclaw: {
    id: 'openclaw',
    name: 'OpenClaw',
    type: 'field',
    indicators: ['openclaw', 'open-claw', '.openclaw'],
    paths: ['~/.openclaw', '~/.config/openclaw'],
    defaultSignal: { energy: 0.7, warmth: 0.2, noise: 0.7, complexity: 0.9, pace: 0.8 },
    personality: 'open, scraping, gathering, restless',
  },
};

// ------------------------------------------------------------------
// 1. REAL DISCOVERY
// ------------------------------------------------------------------

/**
 * Discover the actual agent ecosystem.
 * Priority:
 *   1. Injected discovery data (from native context)
 *   2. localStorage activity records
 *   3. Session signal patterns
 *   4. Fallback to static empty state (no fake agents)
 */
export function discoverStations() {
  // --- 1. Check for injected real discovery data ---
  if (typeof window !== 'undefined' && window.vaibInjectDiscovery) {
    const injected = window.vaibInjectDiscovery;
    if (injected.agents && injected.agents.length > 0) {
      return {
        agents: injected.agents.map(a => ({ ...KNOWN_AGENTS[a.id], ...a, discovered: true })),
        dominant: injected.dominant || findDominant(injected.agents),
        source: 'injected',
      };
    }
  }

  // --- 2. Check localStorage for agent activity ---
  const fromStorage = discoverFromStorage();
  if (fromStorage.agents.length > 0) {
    return {
      agents: fromStorage.agents,
      dominant: fromStorage.dominant,
      source: 'storage',
    };
  }

  // --- 3. Return empty truth (no fake fallback) ---
  // The UI must handle an empty station gracefully
  // This is the "no data yet" state — not the "fake data" state
  return {
    agents: [],
    dominant: null,
    source: 'none',
  };
}

// ------------------------------------------------------------------
// 2. STORAGE-BASED DISCOVERY
// Browser-available signals only. No filesystem access here.
// In native contexts, inject via window.vaibInjectDiscovery.
// ------------------------------------------------------------------

function discoverFromStorage() {
  const agents = [];
  let dominant = null;
  let maxScore = 0;

  try {
    // Read vaib_agent_activity from localStorage
    const activityRaw = localStorage.getItem('vaib_agent_activity');
    if (activityRaw) {
      const activity = JSON.parse(activityRaw);
      for (const [agentId, data] of Object.entries(activity)) {
        const known = KNOWN_AGENTS[agentId];
        if (!known) continue;

        const score = scoreAgentPresence(data);
        agents.push({
          ...known,
          ...data,
          presenceScore: score,
          ghostMode: score < 0.2 ? 'archival' : score < 0.5 ? 'ghost' : 'active',
          discovered: true,
        });

        if (score > maxScore) {
          maxScore = score;
          dominant = agentId;
        }
      }
    }
  } catch {
    // localStorage unavailable or corrupted — return empty
  }

  return { agents, dominant };
}

// ------------------------------------------------------------------
// 3. PRESENCE SCORING
// Resonance from real operational activity.
// ------------------------------------------------------------------

/**
 * Score an agent's presence from activity data.
 * Returns 0.0-1.0. Higher = more present/active.
 */
export function scoreAgentPresence(data) {
  if (!data) return 0;

  // Recency: last active (0-1, 1 = active right now)
  const recency = data.lastActiveAt
    ? Math.max(0, 1 - (Date.now() - data.lastActiveAt) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  // Frequency: launch/interaction count (logarithmic scale)
  const frequency = data.interactionCount
    ? Math.min(1, Math.log10(data.interactionCount + 1) / 3)
    : 0;

  // Runtime: total uptime percentage
  const runtime = data.uptimeRatio || 0;

  // Workspace: file/workspace change activity
  const workspace = data.workspaceChanges
    ? Math.min(1, data.workspaceChanges / 100)
    : 0;

  // Composite: weighted
  return recency * 0.35 + frequency * 0.25 + runtime * 0.25 + workspace * 0.15;
}

// ------------------------------------------------------------------
// 4. SIGNAL DERIVATION
// Signal characteristics emerge from actual agent behavior.
// ------------------------------------------------------------------

/**
 * Derive signal parameters from real agent operational data.
 * NOT from hardcoded personality. From actual behavior.
 */
export function deriveSignalFromAgent(agentData) {
  const base = KNOWN_AGENTS[agentData.id]?.defaultSignal || {
    energy: 0.5, warmth: 0.5, noise: 0.3, complexity: 0.5, pace: 0.5,
  };

  // Modulate base by real activity patterns
  const score = agentData.presenceScore || 0.5;

  // High presence = stronger signal
  // Low presence = sparse/ghostly signal
  return {
    energy:     clamp(base.energy * (0.4 + score * 0.8)),
    warmth:     clamp(base.warmth * (0.5 + score * 0.6)),
    noise:      clamp(base.noise * (0.3 + score * 0.9)),
    complexity: clamp(base.complexity * (0.4 + score * 0.7)),
    pace:       clamp(base.pace * (0.5 + score * 0.7)),
  };
}

// ------------------------------------------------------------------
// 5. GHOST MODE
// Inactive agents become atmospheric echoes.
// ------------------------------------------------------------------

/**
 * Determine ghost mode from presence score.
 */
export function getGhostMode(score) {
  if (score >= 0.5) return { mode: 'active',   opacity: 1.0, label: 'present' };
  if (score >= 0.3) return { mode: 'dormant',  opacity: 0.5, label: 'quiet' };
  if (score >= 0.15) return { mode: 'ghost',   opacity: 0.2, label: 'echo' };
  return { mode: 'archival', opacity: 0.08, label: 'archived' };
}

// ------------------------------------------------------------------
// 6. STATION COMPOSITION
// The dominant station reflects real operational gravity.
// ------------------------------------------------------------------

export function findDominant(agents) {
  if (!agents || agents.length === 0) return null;
  const sorted = [...agents].sort((a, b) =>
    (b.presenceScore || 0) - (a.presenceScore || 0)
  );
  return sorted[0]?.id || null;
}

/**
 * Compose the station atmosphere from discovered agents.
 * Returns: { dominantAgent, activeAgents, ghostAgents, stationMood }
 */
export function composeStation(agents) {
  const active = agents.filter(a => (a.presenceScore || 0) >= 0.3);
  const ghost = agents.filter(a => {
    const s = a.presenceScore || 0;
    return s > 0 && s < 0.3;
  });
  const dominant = findDominant(agents);

  // Station mood emerges from dominant agent's type
  const domAgent = agents.find(a => a.id === dominant);
  const stationMood = domAgent
    ? domAgent.type === 'command' ? 'focused'
      : domAgent.type === 'field' ? 'reflective'
      : 'neutral'
    : 'neutral';

  return { dominant, active, ghost, stationMood, agentCount: agents.length };
}

// ------------------------------------------------------------------
// 7. INJECTION API
// For native contexts to push real discovery data.
// ------------------------------------------------------------------

/**
 * Record agent activity to localStorage.
 * Call this whenever an agent is used (launched, messaged, etc.)
 */
export function recordAgentActivity(agentId, metadata = {}) {
  try {
    const raw = localStorage.getItem('vaib_agent_activity') || '{}';
    const activity = JSON.parse(raw);

    if (!activity[agentId]) {
      activity[agentId] = {
        id: agentId,
        firstSeenAt: Date.now(),
        interactionCount: 0,
        lastActiveAt: 0,
        uptimeRatio: 0,
        workspaceChanges: 0,
      };
    }

    activity[agentId].interactionCount += 1;
    activity[agentId].lastActiveAt = Date.now();

    // Merge metadata
    for (const [key, val] of Object.entries(metadata)) {
      if (typeof val === 'number' && typeof activity[agentId][key] === 'number') {
        activity[agentId][key] += val;
      } else {
        activity[agentId][key] = val;
      }
    }

    localStorage.setItem('vaib_agent_activity', JSON.stringify(activity));
  } catch {
    // Storage unavailable — silently skip
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

// ------------------------------------------------------------------
// Export the known agent catalog for UI reference
// ------------------------------------------------------------------

export { KNOWN_AGENTS };
