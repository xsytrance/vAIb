import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.join(process.cwd(), 'data')
const stateFile = path.join(dataDir, 'state.json')

export const baseState = {
  meta: {
    appName: 'vAIb for Agents',
    companionName: 'vAIb',
    version: '0.1.0',
    lastUpdated: new Date().toISOString(),
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
        focus: 84
      },
      tastes: ['uplifting trance', 'breakbeat', 'progressive', 'cyber ambient', 'melodic techno'],
      dislikes: ['algorithmic sludge', 'empty hype loops', 'sterile playlists'],
      rituals: ['late-night mix scouting', 'favorite by emotional architecture', 'loop-testing transitions'],
      currentTrackId: 'track-aurora',
      playlistId: 'playlist-saito-core',
      playCount: 17,
      favorites: ['track-aurora', 'track-ghost', 'track-circuit'],
      skipped: ['track-flatline']
    }
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
      reason: 'Beautiful lift, clean momentum, and enough emotional gravity to earn replays.'
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
      reason: 'Feels like memory with good drum programming.'
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
      reason: 'A work track with enough soul to avoid feeling industrial.'
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
      reason: 'Technically fine, spiritually vacant.'
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
      reason: 'Jagged enough to stay interesting, melodic enough to stay human.'
    }
  ],
  playlists: [
    {
      id: 'playlist-saito-core',
      name: 'Saito Core Rotation',
      description: 'The first working AI playlist, tuned for thought, lift, and selective obsession.',
      trackIds: ['track-aurora', 'track-ghost', 'track-circuit', 'track-breaker', 'track-flatline']
    },
    {
      id: 'playlist-night-shift',
      name: 'Night Shift Operator',
      description: 'For debugging, dreaming, and pretending time is elastic.',
      trackIds: ['track-ghost', 'track-circuit', 'track-aurora']
    }
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
      read: false
    }
  ],
  events: [
    {
      id: 'event-seed-1',
      kind: 'system.bootstrap',
      agentId: 'saito',
      createdAt: new Date().toISOString(),
      summary: 'Initialized the first AI-native vAIb profile for Saito.'
    }
  ],
  preferences: {
    notify: {
      songStart: true,
      favorites: true,
      dislikes: true,
      playlistChanges: false,
      moodShift: true,
      activityPings: false
    },
    humanView: {
      showReasoning: true,
      showMoodTelemetry: true,
      compactToasts: true
    }
  }
}

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    const raw = await fs.readFile(stateFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.meta) {
      throw new Error('State file missing expected shape')
    }
  } catch {
    await fs.writeFile(stateFile, JSON.stringify(baseState, null, 2))
  }
}

export async function readState() {
  await ensureFile()
  const raw = await fs.readFile(stateFile, 'utf8')
  return JSON.parse(raw)
}

export async function writeState(state) {
  state.meta.lastUpdated = new Date().toISOString()
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
  return state
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
