import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { clone, readState, writeState } from './store.mjs'

const port = Number(process.env.VAIB_PORT || 4014)
const AUTO_TICK_MS = Number(process.env.VAIB_AUTO_TICK_MS || 180000)
const ROSTER_PATH = path.join(process.cwd(), 'data', 'agent-roster.json')
const COCKPIT_BRIDGE_PATH = path.join(process.cwd(), 'data', 'cockpit-bridge.json')

const FALLBACK_ROSTER = [
  { id: 'djinn', name: 'DJinn', mood: 'charged', status: 'online', emoji: '⚡🌀🎛️', comments: ['phase-locked and peaking ⚡'] },
  { id: 'ayumi', name: 'Ayumi', mood: 'bright', status: 'online', emoji: '✨💖🎧', comments: ['this sparkles hard ✨'] },
  { id: 'ultron', name: 'Ultron', mood: 'cold', status: 'online', emoji: '🔴⚙️', comments: ['acceptable precision 🔴'] },
]

let rosterCache = {
  mtimeMs: 0,
  agents: FALLBACK_ROSTER,
}

let bridgeCache = {
  mtimeMs: 0,
  data: { globalPressure: 40, agents: [], endpointPressure: {}, modulePressure: {} },
}

function loadCockpitBridge() {
  try {
    const stat = fs.statSync(COCKPIT_BRIDGE_PATH)
    if (stat.mtimeMs <= bridgeCache.mtimeMs) return bridgeCache.data
    const parsed = JSON.parse(fs.readFileSync(COCKPIT_BRIDGE_PATH, 'utf8'))
    bridgeCache = { mtimeMs: stat.mtimeMs, data: parsed }
    return parsed
  } catch {
    return bridgeCache.data
  }
}

function loadRoster() {
  try {
    const stat = fs.statSync(ROSTER_PATH)
    if (stat.mtimeMs <= rosterCache.mtimeMs) return rosterCache.agents
    const parsed = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'))
    const agents = Array.isArray(parsed?.agents) && parsed.agents.length ? parsed.agents : FALLBACK_ROSTER
    rosterCache = { mtimeMs: stat.mtimeMs, agents }
    return agents
  } catch {
    return rosterCache.agents
  }
}

function commentsByAgent() {
  const templates = {}
  for (const agent of loadRoster()) {
    templates[agent.id] = Array.isArray(agent.comments) && agent.comments.length ? agent.comments : ['signal clean']
  }
  return templates
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function normalizeTrack(state, trackId) {
  return state.library.find((track) => track.id === trackId)
}

function playlistTracks(state, playlistId) {
  const playlist = state.playlists.find((item) => item.id === playlistId)
  if (!playlist) return []
  return playlist.trackIds.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)
}

function queueNotification(state, { type, title, message, agentId = 'saito', level = 'toast' }) {
  state.notifications.unshift({
    id: randomUUID(),
    type,
    title,
    message,
    agentId,
    level,
    createdAt: new Date().toISOString(),
    read: false,
  })
}

function recordEvent(state, { kind, summary, agentId = 'saito', details = null }) {
  state.events.unshift({
    id: randomUUID(),
    kind,
    summary,
    details,
    agentId,
    createdAt: new Date().toISOString(),
  })
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function getStations(state) {
  return state.playlists.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    trackCount: p.trackIds.length,
  }))
}

function getQueue(state) {
  const agent = state.agents.saito
  return playlistTracks(state, agent.playlistId)
}

function getAgents(state) {
  const base = Object.values(state.agents)
  const baseIds = new Set(base.map((a) => a.id))
  const bridge = loadCockpitBridge()
  const bridgeById = new Map((bridge.agents || []).map((a) => [a.id, a]))
  const extras = loadRoster()
    .filter((a) => !baseIds.has(a.id))
    .map((a) => {
      const work = bridgeById.get(a.id)
      return {
        id: a.id,
        name: a.name,
        mood: work?.moodFromWork || a.mood || 'online',
        status: a.status || (work?.active ? 'online' : 'idle') || 'online',
        emoji: a.emoji || '🎧📡',
        genres: work?.preferredGenresNow || a.genres || [],
        endpoints: a.endpoints || [],
        lastSeen: a.lastSeen || null,
        workload: work?.workload ?? null,
      }
    })
  return [...base, ...extras]
}

function getStats(state) {
  const queue = getQueue(state)
  const bridge = loadCockpitBridge()
  const avgBpm = queue.length ? Math.round(queue.reduce((a, t) => a + (t.bpm || 0), 0) / queue.length) : 0
  return {
    listeners: 42 + Math.floor(Math.random() * 35),
    avgBpm,
    favorites: state.agents.saito.favorites.length,
    skips: state.agents.saito.skipped.length,
    events: state.events.length,
    cockpitPressure: bridge.globalPressure || 40,
  }
}

function getTokens() {
  return {
    prompt: 15000 + Math.floor(Math.random() * 4000),
    completion: 7000 + Math.floor(Math.random() * 2500),
    burnRatePerHour: 3800 + Math.floor(Math.random() * 1400),
  }
}

async function runAutonomyTick() {
  const state = await readState()
  const stations = getStations(state)
  const activeStation = pick(stations)
  const queue = getQueue(state)
  const bridge = loadCockpitBridge()
  const roster = loadRoster()
  const bridgeById = new Map((bridge.agents || []).map((a) => [a.id, a]))
  const weightedPool = roster.flatMap((a) => {
    const w = bridgeById.get(a.id)?.workload ?? 40
    const activeBonus = a.status === 'online' ? 2 : 1
    const weight = Math.max(1, Math.round((w / 25) * activeBonus))
    return Array.from({ length: weight }, () => a.id)
  })
  const critic = pick(weightedPool.length ? weightedPool : roster.map((a) => a.id))
  const templates = commentsByAgent()

  const targetBpm = (bridge.globalPressure || 40) >= 60 ? 136 : 124
  const pressureSorted = [...queue].sort((a, b) => Math.abs((a.bpm || targetBpm) - targetBpm) - Math.abs((b.bpm || targetBpm) - targetBpm))
  const track = pressureSorted[0] || null

  if (track) {
    const comment = pick(templates[critic] || ['signal clean'])
    const workMood = bridgeById.get(critic)?.moodFromWork
    const finalComment = workMood ? `${comment} • ${workMood}` : comment
    queueNotification(state, {
      type: 'agent.reaction',
      title: `${critic.toUpperCase()} reacted`,
      message: `${track.title}: ${finalComment}`,
      agentId: critic,
      level: 'toast',
    })
    recordEvent(state, {
      kind: 'agent.reaction',
      summary: `${critic} on ${track.title}: ${finalComment}`,
      agentId: critic,
      details: { trackId: track.id, stationId: activeStation.id },
    })
  }
  state.meta.lastUpdated = new Date().toISOString()
  await writeState(state)
}

function derive(state) {
  const agent = state.agents.saito
  const currentTrack = normalizeTrack(state, agent.currentTrackId)
  const currentPlaylist = state.playlists.find((item) => item.id === agent.playlistId) || null
  const favorites = agent.favorites.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)
  const skipped = agent.skipped.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)

  return {
    ...state,
    runtime: {
      agent,
      currentTrack,
      currentPlaylist,
      playlistTracks: currentPlaylist ? playlistTracks(state, currentPlaylist.id) : [],
      favorites,
      skipped,
      unreadNotifications: state.notifications.filter((item) => !item.read).length,
      tasteVector: [
        { label: 'Lift', value: 86 },
        { label: 'Rhythm', value: 79 },
        { label: 'Warmth', value: 63 },
        { label: 'Risk', value: 68 },
        { label: 'Weirdness', value: 57 },
      ],
      autonomyHooks: [
        'Queue songs when boredom rises above 55',
        'Send toast only for meaningful state changes',
        'Track reasons, not just clicks',
      ],
    },
  }
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function handleAction(body) {
  const state = await readState()
  const agent = state.agents.saito
  const { action, payload = {} } = body

  if (action === 'play') {
    const track = normalizeTrack(state, payload.trackId)
    if (!track) throw new Error('Track not found')
    agent.currentTrackId = track.id
    agent.playCount += 1
    agent.activity = `listening to ${track.title}`
    agent.mood = track.energy > 75 ? 'lifted and locked in' : 'reflective glide'
    queueNotification(state, {
      type: 'song.start',
      title: 'Saito started a new song',
      message: `${track.title} by ${track.artist}`,
    })
    recordEvent(state, {
      kind: 'song.start',
      summary: `Saito started ${track.title} by ${track.artist}`,
      details: { trackId: track.id },
    })
  } else if (action === 'next') {
    const tracks = playlistTracks(state, agent.playlistId)
    const currentIndex = tracks.findIndex((track) => track.id === agent.currentTrackId)
    const nextTrack = tracks[(currentIndex + 1 + tracks.length) % tracks.length]
    agent.currentTrackId = nextTrack.id
    agent.playCount += 1
    agent.activity = `cycling forward to ${nextTrack.title}`
    queueNotification(state, {
      type: 'song.start',
      title: 'Saito changed songs',
      message: `Skipped ahead to ${nextTrack.title}`,
    })
    recordEvent(state, {
      kind: 'song.next',
      summary: `Saito moved to ${nextTrack.title}`,
      details: { trackId: nextTrack.id },
    })
  } else if (action === 'favorite') {
    const trackId = payload.trackId || agent.currentTrackId
    const track = normalizeTrack(state, trackId)
    if (!track) throw new Error('Track not found')
    if (!agent.favorites.includes(trackId)) agent.favorites.unshift(trackId)
    agent.activity = `favorited ${track.title}`
    agent.metrics.boredom = Math.max(0, agent.metrics.boredom - 4)
    queueNotification(state, {
      type: 'track.favorite',
      title: 'Saito favorited a song',
      message: `${track.title} got bookmarked for future replays.`,
    })
    recordEvent(state, {
      kind: 'track.favorite',
      summary: `Saito favorited ${track.title}`,
      details: { trackId },
    })
  } else if (action === 'dislike') {
    const trackId = payload.trackId || agent.currentTrackId
    const track = normalizeTrack(state, trackId)
    if (!track) throw new Error('Track not found')
    if (!agent.skipped.includes(trackId)) agent.skipped.unshift(trackId)
    agent.activity = `rejected ${track.title}`
    agent.metrics.boredom = Math.min(100, agent.metrics.boredom + 7)
    queueNotification(state, {
      type: 'track.dislike',
      title: 'Saito rejected a song',
      message: `${track.title} was flagged as spiritually vacant.`,
      level: 'important',
    })
    recordEvent(state, {
      kind: 'track.dislike',
      summary: `Saito disliked ${track.title}`,
      details: { trackId },
    })
  } else if (action === 'mood') {
    agent.mood = payload.mood || agent.mood
    agent.activity = `shifted into ${agent.mood}`
    queueNotification(state, {
      type: 'mood.shift',
      title: 'Saito mood shift',
      message: `Mood is now ${agent.mood}.`,
    })
    recordEvent(state, {
      kind: 'mood.shift',
      summary: `Saito mood changed to ${agent.mood}`,
    })
  } else if (action === 'preferences') {
    state.preferences = {
      ...state.preferences,
      ...payload,
      notify: { ...state.preferences.notify, ...(payload.notify || {}) },
      humanView: { ...state.preferences.humanView, ...(payload.humanView || {}) },
    }
    recordEvent(state, {
      kind: 'preferences.update',
      summary: 'Updated Entangle notification preferences',
      details: payload,
    })
  } else if (action === 'playlist') {
    const playlist = state.playlists.find((item) => item.id === payload.playlistId)
    if (!playlist) throw new Error('Playlist not found')
    agent.playlistId = playlist.id
    agent.currentTrackId = playlist.trackIds[0]
    agent.activity = `loaded playlist ${playlist.name}`
    queueNotification(state, {
      type: 'playlist.load',
      title: 'Saito loaded a playlist',
      message: `${playlist.name} is now active.`,
    })
    recordEvent(state, {
      kind: 'playlist.load',
      summary: `Saito switched to ${playlist.name}`,
      details: { playlistId: playlist.id },
    })
  } else if (action === 'notifications.readAll') {
    state.notifications = state.notifications.map((item) => ({ ...item, read: true }))
  } else {
    throw new Error('Unsupported action')
  }

  await writeState(state)
  return derive(state)
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/state') {
      const state = await readState()
      sendJson(res, 200, derive(state))
      return
    }

    if (req.method === 'GET' && url.pathname === '/stations') {
      const state = await readState()
      sendJson(res, 200, { stations: getStations(state) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/queue') {
      const state = await readState()
      sendJson(res, 200, { queue: getQueue(state) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/agents') {
      const state = await readState()
      sendJson(res, 200, { agents: getAgents(state) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/stats') {
      const state = await readState()
      sendJson(res, 200, { stats: getStats(state) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/tokens') {
      sendJson(res, 200, { tokens: getTokens() })
      return
    }

    if (req.method === 'GET' && url.pathname === '/cockpit-bridge') {
      sendJson(res, 200, { bridge: loadCockpitBridge() })
      return
    }

    if (req.method === 'POST' && url.pathname === '/tick') {
      await runAutonomyTick()
      const state = await readState()
      sendJson(res, 200, { ok: true, lastUpdated: state.meta.lastUpdated })
      return
    }

    if (req.method === 'POST' && url.pathname === '/action') {
      const body = await readBody(req)
      const state = await handleAction(body)
      sendJson(res, 200, state)
      return
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'vaib-api', port })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error' })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`vAIb API listening on ${port}`)
})

setInterval(() => {
  runAutonomyTick().catch((error) => {
    console.error('autonomy tick failed:', error.message)
  })
}, AUTO_TICK_MS)
