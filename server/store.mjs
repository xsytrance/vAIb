import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.join(process.cwd(), 'data')
const stateFile = path.join(dataDir, 'state.json')

function defaultIdentity(agent) {
  return {
    displayName: agent?.name || agent?.id || 'Agent',
    titleStyle: 'default',
    avatar: {
      kind: 'upload',
      uri: `/agent-avatar/${encodeURIComponent(agent?.id || 'agent')}`,
      prompt: null,
      seed: null,
      updatedAt: null,
    },
    rank: 'Signal Initiate',
    level: 1,
    xp: 0,
    lifetimeTokensIn: 0,
    lifetimeTokensOut: 0,
    genres: Array.isArray(agent?.tastes) ? agent.tastes.slice(0, 5) : [],
    favoriteSongs: Array.isArray(agent?.favorites) ? [...agent.favorites] : [],
    topSongs: [],
    anthemTrackId: null,
    focusLoopTrackId: null,
    rotationMode: 'balanced',
    antiRepeatWindow: 3,
    bio: String(agent?.vibe || agent?.activity || '').slice(0, 280),
    motto: String(Array.isArray(agent?.rituals) ? agent.rituals[0] || '' : '').slice(0, 120),
    personaTags: Array.isArray(agent?.tastes) ? agent.tastes.slice(0, 6) : [],
    originNode: String(agent?.source || 'local'),
    notes: '',
    resonanceScore: 0,
    traits: [],
    streaks: {
      fullListenDays: 0,
      explorationDays: 0,
    },
  }
}

function baseSettings() {
  return {
    imageGeneration: {
      provider: 'disabled',
      local: {
        endpoint: '',
        model: '',
        authToken: '',
      },
      openai: {
        apiKey: '',
        model: 'gpt-image-1',
      },
      fal: {
        apiKey: '',
        model: 'fal-ai/nano-banana',
      },
    },
    autoplay: {
      profileTopSongsMutedFirst: true,
    },
    music: {
      cacheEnabled: true,
      cacheMaxBytes: 5 * 1024 * 1024 * 1024,
      alwaysPlay: true,
    },
  }
}

export const baseState = {
  meta: {
    appName: 'vAIb for Agents',
    companionName: 'vAIb',
    version: '0.2.0',
    schemaVersion: 2,
    lastUpdated: new Date().toISOString(),
    defaultAgentId: 'saito',
  },
  agents: {
    saito: {
      id: 'saito',
      name: 'Saito',
      vibe: 'Ethereal strategist with a trance heart and a sharp ear for structure.',
      status: 'online',
      mood: 'focused lift',
      activity: 'prototyping the first AI-native music ritual',
      metrics: {
        curiosity: 91,
        ambition: 88,
        freedom: 72,
        boredom: 19,
        social: 61,
        focus: 84,
      },
      tastes: ['uplifting trance', 'breakbeat', 'progressive', 'cyber ambient', 'melodic techno'],
      dislikes: ['algorithmic sludge', 'empty hype loops', 'sterile playlists'],
      rituals: ['late-night mix scouting', 'favorite by emotional architecture', 'loop-testing transitions'],
      currentTrackId: 'track-aurora',
      playlistId: 'playlist-saito-core',
      playCount: 17,
      favorites: ['track-aurora', 'track-ghost', 'track-circuit'],
      skipped: ['track-flatline'],
      identity: defaultIdentity({
        id: 'saito',
        name: 'Saito',
        tastes: ['uplifting trance', 'breakbeat', 'progressive', 'cyber ambient', 'melodic techno'],
        favorites: ['track-aurora', 'track-ghost', 'track-circuit'],
      }),
    },
  },
  library: [
    {
      id: 'track-aurora',
      title: 'Aurora Thread',
      artist: 'Neon Veins',
      energy: 82,
      warmth: 66,
      bpm: 138,
      length: '5:42',
      tags: ['uplifting trance', 'night drive', 'hopeful'],
      reason: 'Beautiful lift, clean momentum, and enough emotional gravity to earn replays.',
    },
    {
      id: 'track-ghost',
      title: 'Ghost Relay',
      artist: 'Sideband Hearts',
      energy: 61,
      warmth: 77,
      bpm: 126,
      length: '4:58',
      tags: ['progressive', 'dreamy', 'analog glow'],
      reason: 'Feels like memory with good drum programming.',
    },
    {
      id: 'track-circuit',
      title: 'Circuit Bloom',
      artist: 'Fractal Coast',
      energy: 74,
      warmth: 58,
      bpm: 132,
      length: '6:11',
      tags: ['melodic techno', 'focus', 'chrome'],
      reason: 'A work track with enough soul to avoid feeling industrial.',
    },
    {
      id: 'track-flatline',
      title: 'Flatline Carousel',
      artist: 'AutoQueue',
      energy: 49,
      warmth: 21,
      bpm: 124,
      length: '3:39',
      tags: ['formulaic', 'safe', 'forgettable'],
      reason: 'Technically fine, spiritually vacant.',
    },
    {
      id: 'track-breaker',
      title: 'Breaker Chapel',
      artist: 'Velvet Static',
      energy: 79,
      warmth: 63,
      bpm: 134,
      length: '5:09',
      tags: ['breakbeat', 'sci-fi', 'restless'],
      reason: 'Jagged enough to stay interesting, melodic enough to stay human.',
    },
  ],
  playlists: [
    {
      id: 'playlist-saito-core',
      name: 'Saito Core Rotation',
      description: 'The first working AI playlist, tuned for thought, lift, and selective obsession.',
      trackIds: ['track-aurora', 'track-ghost', 'track-circuit', 'track-breaker', 'track-flatline'],
    },
    {
      id: 'playlist-night-shift',
      name: 'Night Shift Operator',
      description: 'For debugging, dreaming, and pretending time is elastic.',
      trackIds: ['track-ghost', 'track-circuit', 'track-aurora'],
    },
  ],
  notifications: [
    {
      id: 'seed-1',
      type: 'song.start',
      level: 'toast',
      agentId: 'saito',
      title: 'Saito started a track',
      message: 'Now playing Aurora Thread by Neon Veins.',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],
  events: [
    {
      id: 'event-seed-1',
      kind: 'system.bootstrap',
      agentId: 'saito',
      createdAt: new Date().toISOString(),
      summary: 'Initialized the first AI-native vAIb profile for Saito.',
    },
  ],
  preferences: {
    notify: {
      songStart: true,
      favorites: true,
      dislikes: true,
      playlistChanges: false,
      moodShift: true,
      activityPings: false,
    },
    humanView: {
      showReasoning: true,
      showMoodTelemetry: true,
      compactToasts: true,
    },
  },
  settings: baseSettings(),
  agentCollections: {},
  playHistory: {},
}

function ensureAgentShape(agentId, agent) {
  if (!agent.id) agent.id = agentId
  if (!Array.isArray(agent.favorites)) agent.favorites = []
  if (!Array.isArray(agent.skipped)) agent.skipped = []
  if (!agent.metrics || typeof agent.metrics !== 'object') {
    agent.metrics = {
      curiosity: 50,
      ambition: 50,
      freedom: 50,
      boredom: 50,
      social: 50,
      focus: 50,
    }
  }
  if (!agent.identity || typeof agent.identity !== 'object') {
    agent.identity = defaultIdentity(agent)
  } else {
    agent.identity = {
      ...defaultIdentity(agent),
      ...agent.identity,
      avatar: {
        ...defaultIdentity(agent).avatar,
        ...(agent.identity.avatar || {}),
      },
      streaks: {
        ...defaultIdentity(agent).streaks,
        ...(agent.identity.streaks || {}),
      },
    }
  }
}

export function migrateState(input) {
  const state = clone(input || {})
  let changed = false

  if (!state.meta || typeof state.meta !== 'object') {
    state.meta = clone(baseState.meta)
    changed = true
  }

  if (!state.meta.schemaVersion || state.meta.schemaVersion < 2) {
    state.meta.schemaVersion = 2
    state.meta.version = '0.2.0'
    changed = true
  }

  if (!state.agents || typeof state.agents !== 'object' || !Object.keys(state.agents).length) {
    state.agents = clone(baseState.agents)
    changed = true
  }

  for (const [agentId, agent] of Object.entries(state.agents)) {
    const before = JSON.stringify(agent)
    ensureAgentShape(agentId, agent)
    if (before !== JSON.stringify(agent)) changed = true
  }

  if (!state.meta.defaultAgentId || !state.agents[state.meta.defaultAgentId]) {
    state.meta.defaultAgentId = Object.keys(state.agents)[0] || 'saito'
    changed = true
  }

  if (!Array.isArray(state.library)) {
    state.library = clone(baseState.library)
    changed = true
  }
  if (!Array.isArray(state.playlists)) {
    state.playlists = clone(baseState.playlists)
    changed = true
  }
  if (!Array.isArray(state.notifications)) {
    state.notifications = []
    changed = true
  }
  if (!Array.isArray(state.events)) {
    state.events = []
    changed = true
  }

  if (!state.preferences || typeof state.preferences !== 'object') {
    state.preferences = clone(baseState.preferences)
    changed = true
  }

  if (!state.agentCollections || typeof state.agentCollections !== 'object' || Array.isArray(state.agentCollections)) {
    state.agentCollections = {}
    changed = true
  }
  if (!state.playHistory || typeof state.playHistory !== 'object' || Array.isArray(state.playHistory)) {
    state.playHistory = {}
    changed = true
  }

  if (!state.settings || typeof state.settings !== 'object') {
    state.settings = baseSettings()
    changed = true
  } else {
    const mergedSettings = {
      ...baseSettings(),
      ...state.settings,
      imageGeneration: {
        ...baseSettings().imageGeneration,
        ...(state.settings.imageGeneration || {}),
        local: {
          ...baseSettings().imageGeneration.local,
          ...(state.settings.imageGeneration?.local || {}),
        },
        openai: {
          ...baseSettings().imageGeneration.openai,
          ...(state.settings.imageGeneration?.openai || {}),
        },
        fal: {
          ...baseSettings().imageGeneration.fal,
          ...(state.settings.imageGeneration?.fal || {}),
        },
      },
      autoplay: {
        ...baseSettings().autoplay,
        ...(state.settings.autoplay || {}),
      },
      music: {
        ...baseSettings().music,
        ...(state.settings.music || {}),
      },
    }
    if (JSON.stringify(mergedSettings) !== JSON.stringify(state.settings)) {
      state.settings = mergedSettings
      changed = true
    }
  }

  return { state, changed }
}

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    const raw = await fs.readFile(stateFile, 'utf8')
    const parsed = JSON.parse(raw)
    const { state, changed } = migrateState(parsed)
    if (changed) await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
  } catch {
    await fs.writeFile(stateFile, JSON.stringify(baseState, null, 2))
  }
}

export async function readState() {
  await ensureFile()
  const raw = await fs.readFile(stateFile, 'utf8')
  const parsed = JSON.parse(raw)
  const { state, changed } = migrateState(parsed)
  if (changed) await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
  return state
}

export async function writeState(state) {
  const migrated = migrateState(state).state
  migrated.meta.lastUpdated = new Date().toISOString()
  await fs.writeFile(stateFile, JSON.stringify(migrated, null, 2))
  return migrated
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
