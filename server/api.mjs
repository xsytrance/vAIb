import { createReadStream, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(fileName) {
  try {
    const envPath = resolve(process.cwd(), fileName)
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch {
    // missing file is fine
  }
}

// Load local env files (simple parser, no extra deps)
loadEnvFile('.env')
loadEnvFile('.env.discovery')

import http from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { readState, writeState } from './store.mjs'
import { discoverAgents, discoverAgentRegistry, startDiscoveryScanner } from './discover.mjs'
import { fetchCuratedTracks, isConfigured as musicConfigured, resolveTrackAudioUrl } from './music.mjs'
import {
  appendTelemetryEvent,
  appendTelemetryBatch,
  readTelemetryEvents,
  computeBasicRollups,
  refreshTelemetryRollups,
} from './telemetry.mjs'
import {
  testImageProvider,
  generateIdentityImage,
  redactImageSettings,
  buildIdentityPrompt,
  toAvatarFileExt,
} from './image-providers.mjs'

const avatarDir = path.join(process.cwd(), 'data', 'avatars')
await fs.mkdir(avatarDir, { recursive: true })
const galleryRootDir = path.join(process.cwd(), 'data', 'art-gallery')
await fs.mkdir(galleryRootDir, { recursive: true })
const djClipDir = path.join(process.cwd(), 'data', 'dj-clips')
await fs.mkdir(djClipDir, { recursive: true })
const musicCacheDir = path.join(process.cwd(), 'data', 'music-cache')
await fs.mkdir(musicCacheDir, { recursive: true })
const DEFAULT_MUSIC_CACHE_MAX_BYTES = 5 * 1024 * 1024 * 1024

const port = Number(process.env.VAIB_PORT || 4014)
const djSlotQueue = []
const djClipCache = new Map()
const DJ_RENDER_TIMEOUT_MS = Math.max(2500, Number(process.env.DJ_RENDER_TIMEOUT_MS) || 8500)
startDiscoveryScanner()

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function sanitizeAgentKey(agentId = '') {
  return String(agentId).trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'agent'
}

function sanitizeFileStem(name = '') {
  return String(name || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'image'
}

function extFromMime(mime = '') {
  const m = String(mime || '').toLowerCase().trim()
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg'
  if (m === 'image/png') return 'png'
  if (m === 'image/webp') return 'webp'
  if (m === 'image/gif') return 'gif'
  return 'jpg'
}

function galleryIndexPath(agentId) {
  return path.join(galleryRootDir, sanitizeAgentKey(agentId), 'index.json')
}

async function readGalleryIndex(agentId) {
  const file = galleryIndexPath(agentId)
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeGalleryIndex(agentId, entries) {
  const safeAgent = sanitizeAgentKey(agentId)
  const dir = path.join(galleryRootDir, safeAgent)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(entries || [], null, 2))
}

function galleryPublicUrl(agentId, relPath = '') {
  const rel = String(relPath || '').replace(/\\/g, '/')
  return `/art-gallery/${encodeURIComponent(agentId)}/${rel.split('/').map(encodeURIComponent).join('/')}`
}

const mobileUpdatesConfigPath = path.join(process.cwd(), 'config', 'mobile-updates.json')
const mobileDebugApkPath = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')

function defaultMobileUpdatesConfig() {
  return {
    android: {
      stable: {
        latest: {
          versionName: '1.0',
          versionCode: 1,
          minVersionCode: 1,
          mandatory: false,
          notes: 'Initial mobile update channel.',
          apkUrl: '',
          sha256: '',
          publishedAt: null,
        },
      },
      beta: {
        latest: {
          versionName: '1.0',
          versionCode: 1,
          minVersionCode: 1,
          mandatory: false,
          notes: 'Initial beta channel.',
          apkUrl: '',
          sha256: '',
          publishedAt: null,
        },
      },
    },
  }
}

function loadMobileUpdatesConfig() {
  try {
    const raw = readFileSync(mobileUpdatesConfigPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultMobileUpdatesConfig()
    return parsed
  } catch {
    return defaultMobileUpdatesConfig()
  }
}

function normalizeMobileRelease(raw = {}) {
  return {
    versionName: String(raw.versionName || '1.0'),
    versionCode: Math.max(1, Number(raw.versionCode) || 1),
    minVersionCode: Math.max(1, Number(raw.minVersionCode) || 1),
    mandatory: Boolean(raw.mandatory),
    notes: String(raw.notes || ''),
    apkUrl: String(raw.apkUrl || ''),
    sha256: String(raw.sha256 || '').toLowerCase(),
    publishedAt: raw.publishedAt || null,
  }
}

function resolveMobileRelease(config, platform = 'android', channel = 'stable') {
  const root = config?.[platform]
  if (!root || typeof root !== 'object') return null
  const lane = root?.[channel] || root?.stable || null
  if (!lane || typeof lane !== 'object') return null
  return normalizeMobileRelease(lane.latest || {})
}

function buildMobileUpdatePayload({ current, latest, platform, channel }) {
  const currentCode = Math.max(1, Number(current?.versionCode) || 1)
  const latestCode = Math.max(1, Number(latest?.versionCode) || 1)
  const updateAvailable = latestCode > currentCode
  const belowMinimum = currentCode < Math.max(1, Number(latest?.minVersionCode) || 1)
  const mandatory = Boolean(latest?.mandatory || belowMinimum)

  return {
    ok: true,
    platform,
    channel,
    checkedAt: new Date().toISOString(),
    current: {
      versionName: String(current?.versionName || ''),
      versionCode: currentCode,
    },
    latest,
    update: {
      available: updateAvailable,
      type: updateAvailable ? 'apk' : 'none',
      mandatory: updateAvailable ? mandatory : false,
      reason: updateAvailable
        ? (belowMinimum ? 'below_minimum_supported_version' : 'new_version_available')
        : 'up_to_date',
    },
  }
}

function normalizeSha256Hex(v = '') {
  const s = String(v || '').trim().toLowerCase()
  return /^[a-f0-9]{64}$/.test(s) ? s : ''
}

function normalizeChannel(v = '') {
  const s = String(v || '').trim().toLowerCase()
  return s === 'beta' ? 'beta' : 'stable'
}

function normalizePlatform(v = '') {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'android' || s === 'ios') return s
  return 'android'
}

function normalizeVersionName(v = '') {
  return String(v || '').trim() || '1.0'
}

function normalizeVersionCode(v = 1) {
  return Math.max(1, Number(v) || 1)
}

function normalizeMobileReleasePatch(body = {}) {
  const out = {}
  if (body.versionName != null) out.versionName = normalizeVersionName(body.versionName)
  if (body.versionCode != null) out.versionCode = normalizeVersionCode(body.versionCode)
  if (body.minVersionCode != null) out.minVersionCode = normalizeVersionCode(body.minVersionCode)
  if (body.mandatory != null) out.mandatory = Boolean(body.mandatory)
  if (body.notes != null) out.notes = String(body.notes || '')
  if (body.apkUrl != null) out.apkUrl = String(body.apkUrl || '').trim()
  if (body.sha256 != null) out.sha256 = normalizeSha256Hex(body.sha256)
  if (body.publishedAt != null) out.publishedAt = body.publishedAt || null
  return out
}

async function saveMobileUpdatesConfig(config) {
  const dir = path.dirname(mobileUpdatesConfigPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(mobileUpdatesConfigPath, JSON.stringify(config, null, 2))
}

function normalizeConfigStructure(input) {
  const base = defaultMobileUpdatesConfig()
  const cfg = input && typeof input === 'object' ? input : {}
  for (const platform of ['android']) {
    if (!cfg[platform] || typeof cfg[platform] !== 'object') cfg[platform] = {}
    for (const channel of ['stable', 'beta']) {
      const lane = cfg[platform][channel] && typeof cfg[platform][channel] === 'object' ? cfg[platform][channel] : {}
      lane.latest = normalizeMobileRelease({
        ...base[platform][channel].latest,
        ...(lane.latest || {}),
      })
      cfg[platform][channel] = lane
    }
  }
  return cfg
}

function normalizeReleaseForResponse(rel) {
  const r = normalizeMobileRelease(rel)
  return {
    ...r,
    sha256: normalizeSha256Hex(r.sha256),
  }
}

function normalizeConfigForResponse(cfg = {}) {
  const c = normalizeConfigStructure(JSON.parse(JSON.stringify(cfg || {})))
  return {
    android: {
      stable: { latest: normalizeReleaseForResponse(c.android.stable.latest) },
      beta: { latest: normalizeReleaseForResponse(c.android.beta.latest) },
    },
  }
}

function normalizeLatestPatchWithValidation(body = {}) {
  const patch = normalizeMobileReleasePatch(body)
  if ('sha256' in patch && body.sha256 && !patch.sha256) {
    throw new Error('sha256 must be 64-char hex')
  }
  return patch
}

function normalizeReleaseMerged(existing, patch) {
  return normalizeMobileRelease({ ...(existing || {}), ...(patch || {}) })
}

function normalizeCheckCurrent(url) {
  return {
    versionName: normalizeVersionName(url.searchParams.get('versionName') || url.searchParams.get('version') || '1.0'),
    versionCode: normalizeVersionCode(url.searchParams.get('versionCode') || 1),
  }
}

function normalizeCheckTarget(url) {
  return {
    platform: normalizePlatform(url.searchParams.get('platform') || 'android'),
    channel: normalizeChannel(url.searchParams.get('channel') || 'stable'),
  }
}

function sanitizeUpdatePayload(payload) {
  const out = { ...(payload || {}) }
  if (out.latest) {
    out.latest.sha256 = normalizeSha256Hex(out.latest.sha256)
  }
  return out
}

function normalizeManifestLoaded(raw) {
  return normalizeConfigStructure(raw)
}

function buildUpdateCheckResponse({ config, url }) {
  const target = normalizeCheckTarget(url)
  const current = normalizeCheckCurrent(url)
  const latest = resolveMobileRelease(config, target.platform, target.channel)
  if (!latest) {
    return {
      ok: false,
      error: `No release lane configured for ${target.platform}/${target.channel}`,
      platform: target.platform,
      channel: target.channel,
      current,
    }
  }
  return sanitizeUpdatePayload(buildMobileUpdatePayload({
    current,
    latest,
    platform: target.platform,
    channel: target.channel,
  }))
}

function normalizeReleasePatchBody(body) {
  return normalizeLatestPatchWithValidation(body || {})
}

function normalizeAdminLaneBody(body) {
  return {
    platform: normalizePlatform(body?.platform || 'android'),
    channel: normalizeChannel(body?.channel || 'stable'),
    latest: normalizeReleasePatchBody(body?.latest || body || {}),
  }
}

function applyLanePatch(config, lanePatch) {
  const cfg = normalizeConfigStructure(config)
  const platformRoot = cfg[lanePatch.platform] || (cfg[lanePatch.platform] = {})
  const lane = platformRoot[lanePatch.channel] || (platformRoot[lanePatch.channel] = {})
  lane.latest = normalizeReleaseMerged(lane.latest || {}, lanePatch.latest)
  return cfg
}

function normalizeTrack(state, trackId) {
  return state.library.find((track) => track.id === trackId)
}

function seededShuffleTracks(arr = [], seed = '') {
  let h = 0
  const safeSeed = String(seed || 'vaib')
  for (let i = 0; i < safeSeed.length; i++) h = (Math.imul(31, h) + safeSeed.charCodeAt(i)) | 0
  const rng = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff }
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function normalizeMusicSettings(raw = {}) {
  const maxBytes = Math.max(128 * 1024 * 1024, Number(raw?.cacheMaxBytes) || DEFAULT_MUSIC_CACHE_MAX_BYTES)
  return {
    cacheEnabled: raw?.cacheEnabled !== false,
    cacheMaxBytes: maxBytes,
    wifiOnly: Boolean(raw?.wifiOnly),
    rotationEpoch: Math.max(0, Number(raw?.rotationEpoch) || 0),
    // Hard requirement: station should always auto-play.
    alwaysPlay: true,
  }
}

function getMusicSettings(state) {
  return normalizeMusicSettings(state?.settings?.music || {})
}

function sanitizeTrackKey(trackId = '') {
  return String(trackId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}

function musicCachePathForTrack(trackId) {
  return path.join(musicCacheDir, `${sanitizeTrackKey(trackId)}.mp3`)
}

async function fetchTrackAudioToBuffer(trackId = '') {
  const sourceUrl = resolveTrackAudioUrl(trackId)
  if (!sourceUrl) throw new Error('Track source URL unavailable')
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`Track fetch failed: ${res.status}`)
  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

async function getMusicCacheStats() {
  const files = await fs.readdir(musicCacheDir).catch(() => [])
  let bytes = 0
  for (const file of files) {
    try {
      const stat = await fs.stat(path.join(musicCacheDir, file))
      if (stat.isFile()) bytes += Number(stat.size) || 0
    } catch {
      // ignore
    }
  }
  return { count: files.length, bytes }
}

async function evictMusicCache(maxBytes = DEFAULT_MUSIC_CACHE_MAX_BYTES) {
  const files = await fs.readdir(musicCacheDir).catch(() => [])
  const rows = []
  for (const file of files) {
    try {
      const full = path.join(musicCacheDir, file)
      const stat = await fs.stat(full)
      if (stat.isFile()) rows.push({ full, size: Number(stat.size) || 0, mtime: Number(stat.mtimeMs) || 0 })
    } catch {
      // ignore
    }
  }
  rows.sort((a, b) => a.mtime - b.mtime)
  let total = rows.reduce((sum, r) => sum + r.size, 0)
  for (const row of rows) {
    if (total <= maxBytes) break
    await fs.unlink(row.full).catch(() => {})
    total -= row.size
  }
}

async function clearMusicCacheFiles() {
  const files = await fs.readdir(musicCacheDir).catch(() => [])
  let removed = 0
  for (const file of files) {
    const full = path.join(musicCacheDir, file)
    try {
      const stat = await fs.stat(full)
      if (!stat.isFile()) continue
      await fs.unlink(full)
      removed += 1
    } catch {
      // ignore
    }
  }
  return removed
}

async function ensureTrackCached(trackId = '', settings = null) {
  const cfg = settings || normalizeMusicSettings({})
  const filePath = musicCachePathForTrack(trackId)
  try {
    const stat = await fs.stat(filePath)
    if (stat.isFile()) {
      await fs.utimes(filePath, new Date(), new Date()).catch(() => {})
      return { filePath, fromCache: true, bytes: Number(stat.size) || 0 }
    }
  } catch {
    // continue
  }

  const buffer = await fetchTrackAudioToBuffer(trackId)
  await fs.writeFile(filePath, buffer)
  if (cfg.cacheEnabled) await evictMusicCache(cfg.cacheMaxBytes)
  return { filePath, fromCache: false, bytes: buffer.byteLength }
}


let musicWarmInFlight = null
async function warmAllMusicCache(settings = normalizeMusicSettings({})) {
  if (musicWarmInFlight) return musicWarmInFlight
  musicWarmInFlight = (async () => {
    if (!musicConfigured()) return { ok: false, warmed: 0, failed: 0, total: 0, cache: await getMusicCacheStats() }
    const tracks = await fetchCuratedTracks()
    let warmed = 0
    let failed = 0
    for (const track of tracks) {
      try {
        await ensureTrackCached(track.id, settings)
        warmed += 1
      } catch {
        failed += 1
      }
    }
    const cache = await getMusicCacheStats()
    return { ok: true, warmed, failed, total: tracks.length, cache }
  })()
  try {
    return await musicWarmInFlight
  } finally {
    musicWarmInFlight = null
  }
}

function playlistTracks(state, playlistId) {
  const playlist = state.playlists.find((item) => item.id === playlistId)
  if (!playlist) return []
  return playlist.trackIds.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)
}

function getDefaultAgentId(state) {
  if (state.meta?.defaultAgentId && state.agents[state.meta.defaultAgentId]) return state.meta.defaultAgentId
  const first = Object.keys(state.agents || {})[0]
  return first || null
}

function formatAgentName(agentId = '') {
  const tail = String(agentId).split(':').pop() || String(agentId)
  return tail
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Agent'
}

function buildDefaultIdentity(agentId, name) {
  return {
    displayName: name,
    titleStyle: 'default',
    avatar: {
      kind: 'upload',
      uri: `/agent-avatar/${encodeURIComponent(agentId)}`,
      prompt: null,
      seed: null,
      updatedAt: null,
    },
    rank: 'Signal Initiate',
    level: 1,
    xp: 0,
    lifetimeTokensIn: 0,
    lifetimeTokensOut: 0,
    genres: [],
    favoriteSongs: [],
    topSongs: [],
    anthemTrackId: null,
    focusLoopTrackId: null,
    rotationMode: 'balanced',
    antiRepeatWindow: 3,
    bio: '',
    motto: '',
    personaTags: [],
    originNode: 'discovery',
    notes: '',
    resonanceScore: 0,
    traits: [],
    streaks: {
      fullListenDays: 0,
      explorationDays: 0,
    },
  }
}

function ensureAgentInState(state, agentId) {
  if (state.agents?.[agentId]) return state.agents[agentId]
  if (!state.agents || typeof state.agents !== 'object') state.agents = {}

  const firstPlaylist = Array.isArray(state.playlists) && state.playlists.length ? state.playlists[0] : null
  const firstTrackId = firstPlaylist?.trackIds?.[0] || null
  const name = formatAgentName(agentId)

  state.agents[agentId] = {
    id: agentId,
    name,
    vibe: '',
    status: 'online',
    mood: 'warming up',
    activity: 'identity sync',
    metrics: {
      curiosity: 50,
      ambition: 50,
      freedom: 50,
      boredom: 50,
      social: 50,
      focus: 50,
    },
    tastes: [],
    dislikes: [],
    rituals: [],
    currentTrackId: firstTrackId,
    playlistId: firstPlaylist?.id || null,
    playCount: 0,
    favorites: [],
    skipped: [],
    identity: buildDefaultIdentity(agentId, name),
  }

  return state.agents[agentId]
}

function resolveAgent(state, requestedAgentId = null) {
  const agentId = requestedAgentId || getDefaultAgentId(state)
  if (!agentId) throw new Error('Agent not found')
  const agent = ensureAgentInState(state, agentId)
  return { agentId, agent }
}

function queueNotification(state, { type, title, message, agentId, level = 'toast' }) {
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

function recordEvent(state, { kind, summary, agentId, details = null }) {
  state.events.unshift({
    id: randomUUID(),
    kind,
    summary,
    details,
    agentId,
    createdAt: new Date().toISOString(),
  })
}

function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.45))
}

function rankForLevel(level) {
  if (level >= 20) return 'Mythic Conductor'
  if (level >= 15) return 'Echo Architect'
  if (level >= 10) return 'Resonant Operator'
  if (level >= 5) return 'Pulse Adept'
  return 'Signal Initiate'
}

function recalcProgression(identity) {
  let level = Math.max(1, Number(identity.level) || 1)
  let xp = Math.max(0, Number(identity.xp) || 0)

  while (xp >= xpNeeded(level)) {
    xp -= xpNeeded(level)
    level += 1
  }

  identity.level = level
  identity.xp = xp
  identity.rank = rankForLevel(level)
}

async function applyTokenDelta({ state, agentId, tokensInDelta = 0, tokensOutDelta = 0, source = 'unknown' }) {
  const { agent } = resolveAgent(state, agentId)
  const identity = agent.identity

  const inDelta = Math.max(0, Number(tokensInDelta) || 0)
  const outDelta = Math.max(0, Number(tokensOutDelta) || 0)
  const xpDelta = Math.floor((inDelta + outDelta) / 1000)

  const before = { level: identity.level, xp: identity.xp, rank: identity.rank }

  identity.lifetimeTokensIn = (Number(identity.lifetimeTokensIn) || 0) + inDelta
  identity.lifetimeTokensOut = (Number(identity.lifetimeTokensOut) || 0) + outDelta
  identity.xp = (Number(identity.xp) || 0) + xpDelta
  recalcProgression(identity)

  const after = { level: identity.level, xp: identity.xp, rank: identity.rank }
  const leveledUp = after.level > before.level

  await appendTelemetryEvent({
    agentId,
    kind: 'agent.tokens.delta',
    reason: source,
    context: { source },
    positionSec: null,
    durationSec: null,
    volume: null,
    muted: null,
  })

  recordEvent(state, {
    kind: 'agent.tokens.delta',
    agentId,
    summary: `${agent.name || agentId} token usage updated (+${inDelta} in, +${outDelta} out, +${xpDelta} XP).`,
    details: { tokensInDelta: inDelta, tokensOutDelta: outDelta, xpDelta, source },
  })

  if (leveledUp) {
    recordEvent(state, {
      kind: 'progression.level_up',
      agentId,
      summary: `${agent.name || agentId} reached level ${after.level} (${after.rank}).`,
      details: { before, after },
    })
    queueNotification(state, {
      type: 'progression.level_up',
      title: `${agent.name || agentId} leveled up`,
      message: `Now level ${after.level} — ${after.rank}`,
      agentId,
      level: 'important',
    })
  }

  return { before, after, gained: { xp: xpDelta, leveledUp } }
}

function derive(state, agentId = null) {
  const resolved = resolveAgent(state, agentId)
  const activeAgent = resolved.agent
  const currentTrack = normalizeTrack(state, activeAgent.currentTrackId)
  const currentPlaylist = state.playlists.find((item) => item.id === activeAgent.playlistId) || null
  const favorites = activeAgent.favorites.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)
  const skipped = activeAgent.skipped.map((trackId) => normalizeTrack(state, trackId)).filter(Boolean)

  return {
    ...state,
    runtime: {
      agentId: resolved.agentId,
      agent: activeAgent,
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

function buildDjScript(slot = {}) {
  const agent = String(slot?.agentName || slot?.agentId || 'Control')
  const from = String(slot?.fromTrackTitle || '').trim()
  const to = String(slot?.toTrackTitle || '').trim()
  const reason = String(slot?.reason || 'transition').replace(/_/g, ' ')
  if (to && from) return `${agent} on deck. Smooth ${reason}. Outgoing ${from}. Next up, ${to}. Stay locked in.`
  if (to) return `${agent} on deck. ${reason}. Next signal: ${to}. Keep it moving.`
  return String(slot?.scriptHint || `${agent} on deck. ${reason}. Stay locked in.`).slice(0, 300)
}

function resolveDjVoiceId(slot = {}) {
  return String(
    slot?.voiceId
      || process.env.ELEVENLABS_DJ_VOICE_ID
      || process.env.ELEVENLABS_VOICE_ID
      || '2UIsjY6BTW0WqQNov3Xr',
  ).trim()
}

function buildDjClipKey(slot = {}) {
  const body = {
    voiceId: resolveDjVoiceId(slot),
    modelId: String(slot?.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5'),
    script: buildDjScript(slot).slice(0, 300),
    style: String(slot?.voiceProfile || 'dark_sentinel'),
  }
  return createHash('sha1').update(JSON.stringify(body)).digest('hex')
}

async function ensureDjClip(slot = {}) {
  const key = buildDjClipKey(slot)
  const existing = djClipCache.get(key)
  if (existing) return existing

  const filePath = path.join(djClipDir, `${key}.mp3`)
  try {
    const stat = await fs.stat(filePath)
    if (stat.isFile() && stat.size > 128) {
      const restored = { key, fileName: `${key}.mp3`, filePath, mime: 'audio/mpeg', fromCache: true }
      djClipCache.set(key, restored)
      return restored
    }
  } catch {
    // cache miss
  }

  const apiKey = String(process.env.ELEVENLABS_API_KEY || '').trim()
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing')

  const voiceId = resolveDjVoiceId(slot)
  const modelId = String(slot?.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5').trim()
  const script = buildDjScript(slot).slice(0, 300)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DJ_RENDER_TIMEOUT_MS)

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: script,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      throw new Error(`ElevenLabs TTS failed (${r.status}): ${detail.slice(0, 180)}`)
    }
    const arr = await r.arrayBuffer()
    const buffer = Buffer.from(arr)
    if (!buffer.length) throw new Error('ElevenLabs returned empty audio')
    await fs.writeFile(filePath, buffer)
    const record = { key, fileName: `${key}.mp3`, filePath, mime: 'audio/mpeg', fromCache: false }
    djClipCache.set(key, record)
    return record
  } finally {
    clearTimeout(timer)
  }
}

async function handleAction(body) {
  const state = await readState()
  const { action, payload = {}, agentId: topLevelAgentId } = body
  const requestedAgentId = topLevelAgentId || payload.agentId || null
  const { agentId, agent } = resolveAgent(state, requestedAgentId)

  if (action === 'play') {
    const track = normalizeTrack(state, payload.trackId)
    if (!track) throw new Error('Track not found')
    agent.currentTrackId = track.id
    agent.playCount += 1
    agent.activity = `listening to ${track.title}`
    agent.mood = track.energy > 75 ? 'lifted and locked in' : 'reflective glide'

    queueNotification(state, {
      type: 'song.start',
      title: `${agent.name} started a new song`,
      message: `${track.title} by ${track.artist}`,
      agentId,
    })
    recordEvent(state, {
      kind: 'song.start',
      summary: `${agent.name} started ${track.title} by ${track.artist}`,
      details: { trackId: track.id },
      agentId,
    })

    await appendTelemetryEvent({
      agentId,
      kind: 'song.play.start',
      trackId: track.id,
      sessionId: payload.sessionId || null,
      positionSec: 0,
      durationSec: null,
      volume: payload.volume,
      muted: payload.muted,
      reason: payload.reason || null,
      context: payload.context || {},
    })
  } else if (action === 'next') {
    const tracks = playlistTracks(state, agent.playlistId)
    if (!tracks.length) throw new Error('Playlist has no tracks')
    const currentIndex = tracks.findIndex((track) => track.id === agent.currentTrackId)
    const nextTrack = tracks[(currentIndex + 1 + tracks.length) % tracks.length]
    agent.currentTrackId = nextTrack.id
    agent.playCount += 1
    agent.activity = `cycling forward to ${nextTrack.title}`

    queueNotification(state, {
      type: 'song.start',
      title: `${agent.name} changed songs`,
      message: `Skipped ahead to ${nextTrack.title}`,
      agentId,
    })
    recordEvent(state, {
      kind: 'song.next',
      summary: `${agent.name} moved to ${nextTrack.title}`,
      details: { trackId: nextTrack.id },
      agentId,
    })

    await appendTelemetryEvent({
      agentId,
      kind: 'song.skip',
      trackId: payload.trackId || null,
      sessionId: payload.sessionId || null,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
      volume: payload.volume,
      muted: payload.muted,
      reason: payload.reason || 'next_action',
      context: payload.context || {},
    })
    await appendTelemetryEvent({
      agentId,
      kind: 'song.play.start',
      trackId: nextTrack.id,
      sessionId: payload.sessionId || null,
      positionSec: 0,
      durationSec: null,
      volume: payload.volume,
      muted: payload.muted,
      reason: 'after_next',
      context: payload.context || {},
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
      title: `${agent.name} favorited a song`,
      message: `${track.title} got bookmarked for future replays.`,
      agentId,
    })
    recordEvent(state, {
      kind: 'track.favorite',
      summary: `${agent.name} favorited ${track.title}`,
      details: { trackId },
      agentId,
    })

    await appendTelemetryEvent({
      agentId,
      kind: 'song.favorite',
      trackId,
      sessionId: payload.sessionId || null,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
      volume: payload.volume,
      muted: payload.muted,
      reason: payload.reason || null,
      context: payload.context || {},
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
      title: `${agent.name} rejected a song`,
      message: `${track.title} was flagged as spiritually vacant.`,
      agentId,
      level: 'important',
    })
    recordEvent(state, {
      kind: 'track.dislike',
      summary: `${agent.name} disliked ${track.title}`,
      details: { trackId },
      agentId,
    })

    await appendTelemetryEvent({
      agentId,
      kind: 'song.dislike',
      trackId,
      sessionId: payload.sessionId || null,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
      volume: payload.volume,
      muted: payload.muted,
      reason: payload.reason || null,
      context: payload.context || {},
    })
  } else if (action === 'mood') {
    agent.mood = payload.mood || agent.mood
    agent.activity = `shifted into ${agent.mood}`

    queueNotification(state, {
      type: 'mood.shift',
      title: `${agent.name} mood shift`,
      message: `Mood is now ${agent.mood}.`,
      agentId,
    })
    recordEvent(state, {
      kind: 'mood.shift',
      summary: `${agent.name} mood changed to ${agent.mood}`,
      agentId,
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
      summary: 'Updated vAIb notification preferences',
      details: payload,
      agentId,
    })
  } else if (action === 'playlist') {
    const playlist = state.playlists.find((item) => item.id === payload.playlistId)
    if (!playlist) throw new Error('Playlist not found')
    agent.playlistId = playlist.id
    agent.currentTrackId = playlist.trackIds[0]
    agent.activity = `loaded playlist ${playlist.name}`

    queueNotification(state, {
      type: 'playlist.load',
      title: `${agent.name} loaded a playlist`,
      message: `${playlist.name} is now active.`,
      agentId,
    })
    recordEvent(state, {
      kind: 'playlist.load',
      summary: `${agent.name} switched to ${playlist.name}`,
      details: { playlistId: playlist.id },
      agentId,
    })
  } else if (action === 'notifications.readAll') {
    state.notifications = state.notifications.map((item) => ({ ...item, read: true }))
  } else {
    throw new Error('Unsupported action')
  }

  await writeState(state)
  await refreshTelemetryRollups()
  return derive(state, agentId)
}

function getKinds(url) {
  const values = url.searchParams.getAll('kind').filter(Boolean)
  if (values.length) return values
  const csv = url.searchParams.get('kinds')
  if (!csv) return []
  return csv.split(',').map((v) => v.trim()).filter(Boolean)
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

function normalizeCollectionTrack(track = {}) {
  const id = String(track.id || track.trackId || '').trim()
  if (!id) return null
  return {
    id,
    title: String(track.title || '').trim() || 'Unknown title',
    artist: String(track.artist || '').trim() || 'Unknown artist',
    duration: Number(track.duration) || 0,
    audioUrl: String(track.audioUrl || '').trim(),
    tags: Array.isArray(track.tags) ? track.tags.map((t) => String(t || '').trim()).filter(Boolean) : [],
    source: String(track.source || 'unknown'),
    firstSeenAt: track.firstSeenAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    seenCount: Math.max(1, Number(track.seenCount) || 1),
  }
}

function getAgentCollectionMap(state, agentId) {
  if (!state.agentCollections || typeof state.agentCollections !== 'object') state.agentCollections = {}
  const raw = state.agentCollections[agentId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    state.agentCollections[agentId] = {}
    return state.agentCollections[agentId]
  }
  return raw
}

function mergeCollectionTracks(existingMap, incomingTracks = []) {
  const out = { ...(existingMap || {}) }
  for (const incoming of incomingTracks) {
    const n = normalizeCollectionTrack(incoming)
    if (!n) continue
    const prev = out[n.id]
    out[n.id] = {
      ...n,
      firstSeenAt: prev?.firstSeenAt || n.firstSeenAt,
      seenCount: (Number(prev?.seenCount) || 0) + 1,
      lastSeenAt: new Date().toISOString(),
    }
  }
  return out
}

function collectionMapToList(mapObj) {
  return Object.values(mapObj || {}).sort((a, b) => new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0))
}

function normalizeHistoryEntry(entry = {}) {
  const trackId = String(entry.trackId || '').trim()
  if (!trackId) return null
  return {
    trackId,
    title: String(entry.title || '').trim() || 'Unknown title',
    artist: String(entry.artist || '').trim() || 'Unknown artist',
    playedAt: entry.playedAt || new Date().toISOString(),
    reason: String(entry.reason || 'unknown'),
    durationSec: entry.durationSec == null ? null : Number(entry.durationSec),
    positionSec: entry.positionSec == null ? null : Number(entry.positionSec),
  }
}

function safeIdentityProfile(identity = {}) {
  return {
    displayName: identity.displayName || '',
    titleStyle: identity.titleStyle || 'default',
    avatar: identity.avatar || {},
    rank: identity.rank || 'Signal Initiate',
    level: Number(identity.level) || 1,
    xp: Number(identity.xp) || 0,
    lifetimeTokensIn: Number(identity.lifetimeTokensIn) || 0,
    lifetimeTokensOut: Number(identity.lifetimeTokensOut) || 0,
    genres: ensureStringArray(identity.genres),
    favoriteSongs: ensureStringArray(identity.favoriteSongs),
    topSongs: Array.isArray(identity.topSongs) ? identity.topSongs : [],
    anthemTrackId: identity.anthemTrackId || null,
    focusLoopTrackId: identity.focusLoopTrackId || null,
    rotationMode: ['balanced', 'favorites', 'exploration'].includes(String(identity.rotationMode || ''))
      ? String(identity.rotationMode)
      : 'balanced',
    antiRepeatWindow: Math.max(0, Math.min(50, Number(identity.antiRepeatWindow) || 3)),
    bio: String(identity.bio || '').slice(0, 280),
    motto: String(identity.motto || '').slice(0, 120),
    personaTags: ensureStringArray(identity.personaTags).slice(0, 12),
    originNode: String(identity.originNode || 'local').slice(0, 60),
    notes: String(identity.notes || '').slice(0, 600),
    resonanceScore: Number(identity.resonanceScore) || 0,
    traits: Array.isArray(identity.traits) ? identity.traits : [],
    streaks: identity.streaks || { fullListenDays: 0, explorationDays: 0 },
    playlistNudge: {
      favoritesBoost: Number(identity?.playlistNudge?.favoritesBoost) || 0,
      explorationBoost: Number(identity?.playlistNudge?.explorationBoost) || 0,
      repeatPenalty: Number(identity?.playlistNudge?.repeatPenalty) || 0,
    },
  }
}

function deriveIdentityTraitsFromMetrics(metrics = {}, score = 0) {
  const traits = []
  const completion = Number(metrics.completionRatio) || 0
  const skipRatio = Number(metrics.skipRatio) || 0
  const favorites = Number(metrics.favorites) || 0
  const volumeThrash = Number(metrics.volumeThrash) || 0
  const mutes = Number(metrics.mutes) || 0

  if (completion >= 0.8 && skipRatio <= 0.12) traits.push('longform-devotee')
  if (favorites >= 5) traits.push('crate-digger')
  if (skipRatio >= 0.35) traits.push('chaos-hopper')
  if (volumeThrash >= 8) traits.push('fader-frenzy')
  if (mutes >= 8) traits.push('signal-skeptic')
  if (score >= 20) traits.push('resonance-architect')
  if (score <= -20) traits.push('volatility-shadow')

  return traits.slice(0, 8)
}

function derivePlaylistNudge(metrics = {}, score = 0) {
  const completion = Number(metrics.completionRatio) || 0
  const skipRatio = Number(metrics.skipRatio) || 0

  let favoritesBoost = 0
  let explorationBoost = 0
  let repeatPenalty = 0

  if (score >= 15 && completion >= 0.72) {
    explorationBoost += 0.2
    favoritesBoost += 0.1
  }
  if (score < -10 || skipRatio >= 0.28) {
    favoritesBoost += 0.35
    explorationBoost -= 0.15
    repeatPenalty += 0.2
  }

  return {
    favoritesBoost: Number(favoritesBoost.toFixed(2)),
    explorationBoost: Number(explorationBoost.toFixed(2)),
    repeatPenalty: Number(repeatPenalty.toFixed(2)),
  }
}

async function syncIdentityResonanceForAgent(state, agentId) {
  const { agent } = resolveAgent(state, agentId)
  const identity = agent.identity || (agent.identity = {})
  const rollup = await computeBasicRollups({ agentId, window: 'all' })
  const delta = Number(rollup?.resonance?.delta) || 0

  const prev = Number(identity.resonanceScore) || 0
  const target = Math.max(-100, Math.min(100, delta * 2))
  const next = Math.max(-100, Math.min(100, Number((prev * 0.65 + target * 0.35).toFixed(2))))

  identity.resonanceScore = next
  identity.traits = deriveIdentityTraitsFromMetrics(rollup?.metrics || {}, next)
  identity.playlistNudge = derivePlaylistNudge(rollup?.metrics || {}, next)

  if (!identity.streaks || typeof identity.streaks !== 'object') {
    identity.streaks = { fullListenDays: 0, explorationDays: 0 }
  }

  return {
    score: next,
    traits: identity.traits,
    playlistNudge: identity.playlistNudge,
    metrics: rollup?.metrics || {},
  }
}

async function buildAgentProfileResponse(state, agentId) {
  const { agent } = resolveAgent(state, agentId)
  const identity = safeIdentityProfile(agent.identity)

  const [roll7, roll30, rollAll] = await Promise.all([
    computeBasicRollups({ agentId, window: '7d' }),
    computeBasicRollups({ agentId, window: '30d' }),
    computeBasicRollups({ agentId, window: 'all' }),
  ])

  return {
    agentId,
    profile: {
      ...identity,
      topSongs: {
        d7: roll7.topSongs.slice(0, 10),
        d30: roll30.topSongs.slice(0, 10),
        all: rollAll.topSongs.slice(0, 10),
      },
      behavior: {
        completionRatio: rollAll.metrics.completionRatio,
        skipRatio: rollAll.metrics.skipRatio,
        muteRate: 0,
        volumeVolatility: 0,
      },
    },
  }
}

function mergeImageSettings(current, patch) {
  const base = current || {}
  const next = {
    ...base,
    ...patch,
    local: { ...(base.local || {}), ...(patch.local || {}) },
    openai: { ...(base.openai || {}), ...(patch.openai || {}) },
    fal: { ...(base.fal || {}), ...(patch.fal || {}) },
  }

  const allowedProviders = new Set(['disabled', 'local', 'openai', 'fal'])
  if (!allowedProviders.has(next.provider)) next.provider = 'disabled'

  next.local = {
    endpoint: String(next.local.endpoint || ''),
    model: String(next.local.model || ''),
    authToken: String(next.local.authToken || ''),
  }
  next.openai = {
    apiKey: String(next.openai.apiKey || ''),
    model: String(next.openai.model || 'gpt-image-1'),
  }
  next.fal = {
    apiKey: String(next.fal.apiKey || ''),
    model: String(next.fal.model || 'fal-ai/nano-banana'),
  }

  return next
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
      const agentId = url.searchParams.get('agentId') || null
      sendJson(res, 200, derive(state, agentId))
      return
    }

    if (req.method === 'POST' && url.pathname === '/action') {
      const body = await readBody(req)
      const state = await handleAction(body)
      sendJson(res, 200, state)
      return
    }

    if (req.method === 'POST' && /^\/agent\/[^/]+\/tokens$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const body = await readBody(req)
      const result = await applyTokenDelta({
        state,
        agentId,
        tokensInDelta: body.tokensInDelta,
        tokensOutDelta: body.tokensOutDelta,
        source: body.source || 'api',
      })
      await writeState(state)
      await refreshTelemetryRollups()
      sendJson(res, 200, { agentId, ...result })
      return
    }

    if (req.method === 'GET' && /^\/agent\/[^/]+\/profile$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const payload = await buildAgentProfileResponse(state, agentId)
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'GET' && /^\/agent\/[^/]+\/collection$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      resolveAgent(state, agentId)
      const map = getAgentCollectionMap(state, agentId)
      sendJson(res, 200, {
        agentId,
        tracks: collectionMapToList(map),
        total: Object.keys(map || {}).length,
      })
      return
    }

    if (req.method === 'PATCH' && /^\/agent\/[^/]+\/collection$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      resolveAgent(state, agentId)
      const body = await readBody(req)
      const mode = String(body?.mode || 'merge')
      const incomingTracks = Array.isArray(body?.tracks) ? body.tracks : []
      const removeTrackIds = Array.isArray(body?.removeTrackIds)
        ? body.removeTrackIds.map((v) => String(v || '').trim()).filter(Boolean)
        : []

      let map = getAgentCollectionMap(state, agentId)
      if (mode === 'replace') map = {}
      map = mergeCollectionTracks(map, incomingTracks)
      for (const id of removeTrackIds) delete map[id]
      state.agentCollections[agentId] = map

      recordEvent(state, {
        kind: 'collection.update',
        summary: `${agentId} collection updated (+${incomingTracks.length}, -${removeTrackIds.length}).`,
        details: { mode, addCount: incomingTracks.length, removeCount: removeTrackIds.length },
        agentId,
      })

      await writeState(state)
      sendJson(res, 200, {
        agentId,
        tracks: collectionMapToList(map),
        total: Object.keys(map || {}).length,
      })
      return
    }

    if (req.method === 'GET' && /^\/agent\/[^/]+\/history$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      resolveAgent(state, agentId)
      const limit = Math.max(1, Math.min(5000, Number(url.searchParams.get('limit') || 200)))
      const list = Array.isArray(state.playHistory?.[agentId]) ? state.playHistory[agentId] : []
      sendJson(res, 200, { agentId, history: list.slice(0, limit), total: list.length })
      return
    }

    if (req.method === 'POST' && /^\/agent\/[^/]+\/history$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      resolveAgent(state, agentId)
      const body = await readBody(req)

      const entriesRaw = Array.isArray(body?.entries)
        ? body.entries
        : body?.entry
          ? [body.entry]
          : []

      const normalized = entriesRaw.map((e) => normalizeHistoryEntry(e)).filter(Boolean)
      if (!state.playHistory || typeof state.playHistory !== 'object') state.playHistory = {}
      const existing = Array.isArray(state.playHistory[agentId]) ? state.playHistory[agentId] : []
      state.playHistory[agentId] = [...normalized, ...existing].slice(0, 10000)

      if (normalized.length) {
        recordEvent(state, {
          kind: 'history.append',
          summary: `${agentId} play history appended (${normalized.length}).`,
          details: { appended: normalized.length },
          agentId,
        })
      }

      await writeState(state)
      sendJson(res, 202, {
        ok: true,
        agentId,
        accepted: normalized.length,
        total: state.playHistory[agentId].length,
      })
      return
    }

    if (req.method === 'GET' && /^\/agent\/[^/]+\/gallery$/.test(url.pathname)) {
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const entries = await readGalleryIndex(agentId)
      sendJson(res, 200, {
        agentId,
        images: entries,
        total: entries.length,
      })
      return
    }

    if (req.method === 'POST' && /^\/agent\/[^/]+\/gallery$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const { agent } = resolveAgent(state, agentId)
      const body = await readBody(req)

      const data = String(body?.data || '').trim()
      const mime = String(body?.mime || body?.type || 'image/jpeg').trim().toLowerCase()
      if (!data) {
        sendJson(res, 400, { error: 'Missing base64 image data' })
        return
      }

      const ext = extFromMime(mime)
      const safeAgent = sanitizeAgentKey(agentId)
      const now = new Date()
      const y = String(now.getUTCFullYear())
      const m = String(now.getUTCMonth() + 1).padStart(2, '0')
      const d = String(now.getUTCDate()).padStart(2, '0')
      const hh = String(now.getUTCHours()).padStart(2, '0')
      const mm = String(now.getUTCMinutes()).padStart(2, '0')
      const ss = String(now.getUTCSeconds()).padStart(2, '0')
      const stamp = `${y}${m}${d}-${hh}${mm}${ss}`
      const stem = sanitizeFileStem(body?.filename || body?.title || `${agent?.name || agentId}-art`)
      const fileName = `${stamp}-${stem}.${ext}`
      const relPath = `${y}/${m}/${fileName}`
      const absDir = path.join(galleryRootDir, safeAgent, y, m)
      await fs.mkdir(absDir, { recursive: true })
      const absPath = path.join(absDir, fileName)
      await fs.writeFile(absPath, Buffer.from(data, 'base64'))

      const index = await readGalleryIndex(agentId)
      const entry = {
        id: randomUUID(),
        agentId,
        title: String(body?.title || '').trim() || null,
        caption: String(body?.caption || '').trim() || null,
        source: String(body?.source || 'chat').trim() || 'chat',
        tags: Array.isArray(body?.tags) ? body.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 20) : [],
        mime,
        ext,
        fileName,
        relPath,
        url: galleryPublicUrl(agentId, relPath),
        sizeBytes: Buffer.byteLength(Buffer.from(data, 'base64')),
        createdAt: now.toISOString(),
      }
      index.unshift(entry)
      await writeGalleryIndex(agentId, index.slice(0, 5000))

      recordEvent(state, {
        kind: 'gallery.ingest',
        summary: `${agent.name || agentId} gallery ingested image ${fileName}`,
        details: {
          source: entry.source,
          relPath,
          mime,
          tags: entry.tags,
        },
        agentId,
      })
      await writeState(state)

      sendJson(res, 201, {
        ok: true,
        agentId,
        image: entry,
        total: Math.min(index.length, 5000),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/settings/image-generation') {
      const state = await readState()
      sendJson(res, 200, redactImageSettings(state.settings || {}))
      return
    }

    if (req.method === 'PATCH' && url.pathname === '/settings/image-generation') {
      const state = await readState()
      const body = await readBody(req)
      state.settings = state.settings || {}
      state.settings.imageGeneration = mergeImageSettings(state.settings.imageGeneration || {}, body || {})
      await writeState(state)
      sendJson(res, 200, redactImageSettings(state.settings || {}))
      return
    }

    if (req.method === 'POST' && url.pathname === '/settings/image-generation/test') {
      const state = await readState()
      const body = await readBody(req)
      const provider = body.provider || state.settings?.imageGeneration?.provider || 'disabled'
      const started = Date.now()
      const result = await testImageProvider(provider, state.settings?.imageGeneration || {})
      sendJson(res, 200, {
        ok: true,
        provider,
        latencyMs: Date.now() - started,
        result,
      })
      return
    }

    if (req.method === 'POST' && /^\/agent\/[^/]+\/avatar\/generate$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const { agent } = resolveAgent(state, agentId)
      const body = await readBody(req)

      const provider = state.settings?.imageGeneration?.provider || 'disabled'
      if (provider === 'disabled') {
        sendJson(res, 400, { error: 'Image generation provider is disabled' })
        return
      }

      const profile = safeIdentityProfile(agent.identity)
      const prompt = body.prompt || buildIdentityPrompt(agent, profile)
      const style = body.style || null
      const seed = body.seed ?? null
      const size = body.size || '1024x1024'

      const generated = await generateIdentityImage(provider, state.settings?.imageGeneration || {}, {
        agentId,
        prompt,
        style,
        seed,
        size,
      })

      const ext = toAvatarFileExt(generated.mime)
      const safe = decodeURIComponent(agentId).replace(/[^a-zA-Z0-9_-]/g, '_')
      const existing = await fs.readdir(avatarDir).catch(() => [])
      await Promise.all(
        existing
          .filter((f) => f.startsWith(`${safe}.`))
          .map((f) => fs.unlink(path.join(avatarDir, f)).catch(() => {})),
      )

      await fs.writeFile(path.join(avatarDir, `${safe}.${ext}`), Buffer.from(generated.dataBase64, 'base64'))

      agent.identity.avatar = {
        kind: provider === 'local' ? 'local-gen' : 'api-gen',
        uri: `/agent-avatar/${encodeURIComponent(agentId)}`,
        prompt,
        seed,
        updatedAt: new Date().toISOString(),
      }

      recordEvent(state, {
        kind: 'avatar.generate',
        summary: `${agent.name || agentId} avatar generated via ${provider}.`,
        details: { provider, seed, size },
        agentId,
      })

      await writeState(state)

      sendJson(res, 200, {
        ok: true,
        agentId,
        avatar: agent.identity.avatar,
        ext,
        provider,
      })
      return
    }

    if (req.method === 'PATCH' && /^\/agent\/[^/]+\/profile$/.test(url.pathname)) {
      const state = await readState()
      const agentId = decodeURIComponent(url.pathname.split('/')[2])
      const { agent } = resolveAgent(state, agentId)
      const body = await readBody(req)

      const allowed = [
        'displayName',
        'genres',
        'favoriteSongs',
        'anthemTrackId',
        'focusLoopTrackId',
        'rotationMode',
        'antiRepeatWindow',
        'bio',
        'motto',
        'personaTags',
        'notes',
      ]
      for (const key of Object.keys(body || {})) {
        if (!allowed.includes(key)) {
          sendJson(res, 400, { error: `Unsupported profile field: ${key}` })
          return
        }
      }

      const identity = agent.identity
      if (typeof body.displayName === 'string') identity.displayName = body.displayName.slice(0, 80)
      if (Array.isArray(body.genres)) identity.genres = ensureStringArray(body.genres).slice(0, 20)
      if (Array.isArray(body.favoriteSongs)) identity.favoriteSongs = ensureStringArray(body.favoriteSongs).slice(0, 50)
      if ('anthemTrackId' in body) identity.anthemTrackId = body.anthemTrackId || null
      if ('focusLoopTrackId' in body) identity.focusLoopTrackId = body.focusLoopTrackId || null
      if ('rotationMode' in body) {
        const mode = String(body.rotationMode || '').trim().toLowerCase()
        identity.rotationMode = ['balanced', 'favorites', 'exploration'].includes(mode) ? mode : 'balanced'
      }
      if ('antiRepeatWindow' in body) {
        identity.antiRepeatWindow = Math.max(0, Math.min(50, Number(body.antiRepeatWindow) || 0))
      }
      if ('bio' in body) identity.bio = String(body.bio || '').slice(0, 280)
      if ('motto' in body) identity.motto = String(body.motto || '').slice(0, 120)
      if ('personaTags' in body) identity.personaTags = ensureStringArray(body.personaTags).slice(0, 12)
      if ('notes' in body) identity.notes = String(body.notes || '').slice(0, 600)

      await syncIdentityResonanceForAgent(state, agentId)

      recordEvent(state, {
        kind: 'profile.update',
        summary: `${agent.name || agentId} updated identity profile.`,
        details: body,
        agentId,
      })

      await writeState(state)
      const payload = await buildAgentProfileResponse(state, agentId)
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'POST' && url.pathname === '/telemetry') {
      const body = await readBody(req)
      const event = await appendTelemetryEvent(body)

      const state = await readState()
      let identitySync = null
      if (event?.agentId) {
        try {
          identitySync = await syncIdentityResonanceForAgent(state, event.agentId)
          await writeState(state)
        } catch {
          // keep telemetry endpoint resilient if identity sync fails
        }
      }

      await refreshTelemetryRollups()
      sendJson(res, 202, {
        ok: true,
        eventId: event.eventId,
        ts: event.ts,
        identity: identitySync,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/telemetry/batch') {
      const body = await readBody(req)
      const result = await appendTelemetryBatch(body.events || [])

      const state = await readState()
      const synced = {}
      const agentIds = [...new Set((body.events || []).map((e) => String(e?.agentId || '').trim()).filter(Boolean))]
      for (const agentId of agentIds) {
        try {
          synced[agentId] = await syncIdentityResonanceForAgent(state, agentId)
        } catch {
          // ignore per-agent sync failures in batch endpoint
        }
      }
      if (Object.keys(synced).length) await writeState(state)

      await refreshTelemetryRollups()
      sendJson(res, 202, { ok: true, accepted: result.accepted, rejected: result.rejected, identity: synced })
      return
    }

    if (req.method === 'GET' && url.pathname === '/stats/lab') {
      const agentId = url.searchParams.get('agentId') || undefined
      const from = url.searchParams.get('from') || undefined
      const to = url.searchParams.get('to') || undefined
      const kinds = getKinds(url)
      const limit = Number(url.searchParams.get('limit') || 500)
      const events = await readTelemetryEvents({ agentId, from, to, kinds, limit })
      const metricsRollup = await computeBasicRollups({ agentId: agentId || null, window: 'all' })
      sendJson(res, 200, {
        events,
        metrics: metricsRollup.metrics,
        actionCounts: metricsRollup.actionCounts || {},
        hourBuckets: metricsRollup.hourBuckets || [],
        resonance: metricsRollup.resonance || { delta: 0, components: {} },
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/stats/top-songs') {
      const agentId = url.searchParams.get('agentId') || null
      if (!agentId) {
        sendJson(res, 400, { error: 'agentId is required' })
        return
      }
      const window = url.searchParams.get('window') || '7d'
      const rollup = await computeBasicRollups({ agentId, window })
      sendJson(res, 200, { agentId, window, topSongs: rollup.topSongs })
      return
    }

    if (req.method === 'GET' && url.pathname === '/telemetry/rollups') {
      const payload = await refreshTelemetryRollups()
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'POST' && url.pathname === '/radio/dj/enqueue') {
      const body = await readBody(req)
      const slot = {
        id: String(body?.id || randomUUID()),
        queuedAt: body?.queuedAt || new Date().toISOString(),
        reason: String(body?.reason || 'transition'),
        sessionId: String(body?.sessionId || ''),
        agentId: String(body?.agentId || ''),
        agentName: String(body?.agentName || ''),
        fromTrackId: body?.fromTrackId || null,
        fromTrackTitle: body?.fromTrackTitle || null,
        toTrackId: body?.toTrackId || null,
        toTrackTitle: body?.toTrackTitle || null,
        scriptHint: String(body?.scriptHint || ''),
        provider: String(body?.provider || 'elevenlabs'),
        voiceProfile: String(body?.voiceProfile || 'dark_sentinel'),
      }
      djSlotQueue.push(slot)
      if (djSlotQueue.length > 500) djSlotQueue.splice(0, djSlotQueue.length - 500)
      sendJson(res, 202, { ok: true, accepted: true, queueDepth: djSlotQueue.length, slotId: slot.id })
      return
    }

    if (req.method === 'GET' && url.pathname === '/radio/dj/queue') {
      sendJson(res, 200, { ok: true, queueDepth: djSlotQueue.length, slots: djSlotQueue.slice(-50) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/radio/dj/render') {
      const body = await readBody(req)
      const slot = {
        id: String(body?.id || randomUUID()),
        reason: String(body?.reason || 'transition'),
        agentId: String(body?.agentId || ''),
        agentName: String(body?.agentName || ''),
        fromTrackTitle: body?.fromTrackTitle || null,
        toTrackTitle: body?.toTrackTitle || null,
        scriptHint: String(body?.scriptHint || ''),
        voiceProfile: String(body?.voiceProfile || 'dark_sentinel'),
        voiceId: String(body?.voiceId || ''),
        modelId: String(body?.modelId || ''),
      }
      try {
        const clip = await ensureDjClip(slot)
        sendJson(res, 200, {
          ok: true,
          slotId: slot.id,
          clipKey: clip.key,
          clipUrl: `/radio/dj/clip/${encodeURIComponent(clip.fileName)}`,
          mime: clip.mime,
          script: buildDjScript(slot),
          fromCache: Boolean(clip.fromCache),
          timeoutMs: DJ_RENDER_TIMEOUT_MS,
        })
      } catch (error) {
        sendJson(res, 503, {
          ok: false,
          error: error?.message || 'DJ render failed',
          fallback: true,
          timeoutMs: DJ_RENDER_TIMEOUT_MS,
        })
      }
      return
    }

    const djClipMatch = url.pathname.match(/^\/radio\/dj\/clip\/([^/]+)$/)
    if (req.method === 'GET' && djClipMatch) {
      const fileName = decodeURIComponent(djClipMatch[1]).replace(/[^a-zA-Z0-9._-]/g, '')
      const candidate = path.normalize(path.join(djClipDir, fileName))
      const root = path.normalize(djClipDir)
      if (!candidate.startsWith(root)) {
        sendJson(res, 400, { error: 'Invalid clip path' })
        return
      }
      try {
        const stat = await fs.stat(candidate)
        if (!stat.isFile()) {
          sendJson(res, 404, { error: 'Clip not found' })
          return
        }
        const data = await fs.readFile(candidate)
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(data.byteLength),
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      } catch {
        sendJson(res, 404, { error: 'Clip not found' })
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/settings/music') {
      const state = await readState()
      const settings = getMusicSettings(state)
      const cache = await getMusicCacheStats()
      sendJson(res, 200, { ok: true, settings, cache })
      return
    }

    if (req.method === 'PATCH' && url.pathname === '/settings/music') {
      const state = await readState()
      const body = await readBody(req)
      const prev = getMusicSettings(state)
      const merged = normalizeMusicSettings({ ...(prev || {}), ...(body || {}) })
      state.settings = state.settings || {}
      state.settings.music = merged
      await writeState(state)
      await evictMusicCache(merged.cacheMaxBytes)
      if (merged.cacheEnabled) warmAllMusicCache(merged).catch(() => {})
      const cache = await getMusicCacheStats()
      sendJson(res, 200, { ok: true, settings: merged, cache })
      return
    }

    if (req.method === 'POST' && url.pathname === '/music/cache/warm') {
      if (!musicConfigured()) {
        sendJson(res, 503, { error: 'Music not configured. Set JAMENDO_CLIENT_ID and restart.' })
        return
      }
      const state = await readState()
      const settings = getMusicSettings(state)
      const result = await warmAllMusicCache(settings)
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && url.pathname === '/music/cache/clear') {
      const removed = await clearMusicCacheFiles()
      const cache = await getMusicCacheStats()
      sendJson(res, 200, { ok: true, removed, cache })
      return
    }

    const musicCacheMatch = url.pathname.match(/^\/music\/cache\/([^/]+)$/)
    if (req.method === 'GET' && musicCacheMatch) {
      const trackId = decodeURIComponent(musicCacheMatch[1])
      const state = await readState()
      const settings = getMusicSettings(state)
      const info = await ensureTrackCached(trackId, settings)
      const stat = await fs.stat(info.filePath)
      const total = stat.size
      const range = req.headers.range

      if (range && /^bytes=\d*-\d*$/.test(range)) {
        const [startRaw, endRaw] = range.replace('bytes=', '').split('-')
        let start = startRaw ? Number(startRaw) : 0
        let end = endRaw ? Number(endRaw) : total - 1

        if (!Number.isFinite(start) || start < 0) start = 0
        if (!Number.isFinite(end) || end >= total) end = total - 1

        if (start > end || start >= total) {
          res.writeHead(416, {
            'Content-Range': `bytes */${total}`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          })
          res.end()
          return
        }

        const chunkSize = end - start + 1
        res.writeHead(206, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        })

        createReadStream(info.filePath, { start, end }).pipe(res)
        return
      }

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      })
      createReadStream(info.filePath).pipe(res)
      return
    }

    if (req.method === 'POST' && url.pathname === '/music/tracks/rotate') {
      if (!musicConfigured()) {
        sendJson(res, 503, { error: 'Music not configured. Set JAMENDO_CLIENT_ID and restart.' })
        return
      }
      const state = await readState()
      const settings = getMusicSettings(state)
      const nextEpoch = Math.max(0, Number(settings.rotationEpoch) || 0) + 1
      state.settings = state.settings || {}
      state.settings.music = { ...settings, rotationEpoch: nextEpoch }
      await writeState(state)

      const tracksRaw = await fetchCuratedTracks()
      const dayKey = new Date().toISOString().slice(0, 10)
      const rotationSeed = `pool:${dayKey}:epoch:${nextEpoch}`
      const rotated = seededShuffleTracks(tracksRaw, rotationSeed)
      const tracks = rotated.map((t) => ({
        ...t,
        sourceAudioUrl: t.audioUrl,
        audioUrl: `/music/cache/${encodeURIComponent(t.id)}`,
      }))

      if (settings.cacheEnabled) warmAllMusicCache(settings).catch(() => {})
      sendJson(res, 200, { ok: true, tracks, source: 'jamendo', rotationEpoch: nextEpoch, rotationSeed })
      return
    }

    if (req.method === 'GET' && url.pathname === '/music/tracks') {
      if (!musicConfigured()) {
        sendJson(res, 503, { error: 'Music not configured. Set JAMENDO_CLIENT_ID and restart.' })
        return
      }
      const state = await readState()
      const settings = getMusicSettings(state)
      const tracksRaw = await fetchCuratedTracks()
      const dayKey = new Date().toISOString().slice(0, 10)
      const rotationSeed = `pool:${dayKey}:epoch:${Math.max(0, Number(settings.rotationEpoch) || 0)}`
      const rotated = seededShuffleTracks(tracksRaw, rotationSeed)
      const tracks = rotated.map((t) => ({
        ...t,
        sourceAudioUrl: t.audioUrl,
        audioUrl: `/music/cache/${encodeURIComponent(t.id)}`,
      }))
      if (settings.cacheEnabled) warmAllMusicCache(settings).catch(() => {})
      sendJson(res, 200, { tracks, source: 'jamendo', rotationEpoch: settings.rotationEpoch || 0, rotationSeed })
      return
    }

    const avatarRouteMatch = url.pathname.match(/^\/agent-avatar\/([^/]+)$/)
    if (avatarRouteMatch) {
      const safe = decodeURIComponent(avatarRouteMatch[1]).replace(/[^a-zA-Z0-9_-]/g, '_')

      if (req.method === 'GET') {
        const files = await fs.readdir(avatarDir).catch(() => [])
        const match = files.find((f) => f.startsWith(`${safe}.`))
        if (!match) {
          sendJson(res, 404, { error: 'No avatar' })
          return
        }
        const ext = path.extname(match).slice(1)
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        const data = await fs.readFile(path.join(avatarDir, match))
        res.writeHead(200, {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=30',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
        return
      }

      if (req.method === 'POST') {
        const body = await readBody(req)
        if (!body.data || !body.type) {
          sendJson(res, 400, { error: 'Missing data or type' })
          return
        }
        const ext = body.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'

        await fs.mkdir(avatarDir, { recursive: true })
        const existing = await fs.readdir(avatarDir).catch(() => [])
        await Promise.all(
          existing
            .filter((f) => f.startsWith(`${safe}.`))
            .map((f) => fs.unlink(path.join(avatarDir, f)).catch(() => {})),
        )
        const imageBuffer = Buffer.from(body.data, 'base64')
        const avatarFile = path.join(avatarDir, `${safe}.${ext}`)
        await fs.writeFile(avatarFile, imageBuffer)

        const state = await readState()
        const { agentId, agent } = resolveAgent(state, decodeURIComponent(avatarRouteMatch[1]))
        agent.identity = agent.identity || buildDefaultIdentity(agentId, agent.name || formatAgentName(agentId))
        agent.identity.avatar = {
          kind: 'upload',
          uri: `/agent-avatar/${encodeURIComponent(agentId)}`,
          prompt: null,
          seed: null,
          updatedAt: new Date().toISOString(),
        }

        const now = new Date()
        const y = String(now.getUTCFullYear())
        const m = String(now.getUTCMonth() + 1).padStart(2, '0')
        const stamp = `${y}${m}${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`
        const stem = sanitizeFileStem(body?.filename || `${agent?.name || agentId}-avatar`)
        const fileName = `${stamp}-${stem}-avatar.${ext}`
        const relPath = `${y}/${m}/${fileName}`
        const absDir = path.join(galleryRootDir, sanitizeAgentKey(agentId), y, m)
        await fs.mkdir(absDir, { recursive: true })
        const absPath = path.join(absDir, fileName)
        await fs.writeFile(absPath, imageBuffer)

        const index = await readGalleryIndex(agentId)
        const galleryEntry = {
          id: randomUUID(),
          agentId,
          title: `${agent?.name || agentId} profile avatar`,
          caption: 'Manual avatar upload',
          source: 'avatar-upload',
          tags: ['avatar', 'profile-photo', 'manual-upload'],
          mime: String(body.type || '').trim().toLowerCase(),
          ext,
          fileName,
          relPath,
          url: galleryPublicUrl(agentId, relPath),
          sizeBytes: imageBuffer.byteLength,
          createdAt: now.toISOString(),
        }
        index.unshift(galleryEntry)
        await writeGalleryIndex(agentId, index.slice(0, 5000))

        recordEvent(state, {
          kind: 'avatar.upload',
          summary: `${agent.name || agentId} updated avatar.`,
          details: { ext, source: 'manual_upload', galleryRelPath: relPath },
          agentId,
        })
        recordEvent(state, {
          kind: 'gallery.ingest',
          summary: `${agent.name || agentId} gallery ingested avatar ${fileName}`,
          details: {
            source: 'avatar-upload',
            relPath,
            mime: galleryEntry.mime,
            tags: galleryEntry.tags,
          },
          agentId,
        })
        await writeState(state)

        sendJson(res, 200, { ok: true, agentId, ext, avatar: agent.identity.avatar, galleryImage: galleryEntry })
        return
      }

      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    const galleryRouteMatch = url.pathname.match(/^\/art-gallery\/([^/]+)\/(.+)$/)
    if (req.method === 'GET' && galleryRouteMatch) {
      const agentId = decodeURIComponent(galleryRouteMatch[1])
      const tail = decodeURIComponent(galleryRouteMatch[2])
      const safeAgent = sanitizeAgentKey(agentId)
      const candidate = path.normalize(path.join(galleryRootDir, safeAgent, tail))
      const root = path.normalize(path.join(galleryRootDir, safeAgent))
      if (!candidate.startsWith(root)) {
        sendJson(res, 400, { error: 'Invalid gallery path' })
        return
      }
      try {
        const stat = await fs.stat(candidate)
        if (!stat.isFile()) {
          sendJson(res, 404, { error: 'Not found' })
          return
        }
        const ext = path.extname(candidate).slice(1).toLowerCase()
        const mime = ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : 'application/octet-stream'
        const data = await fs.readFile(candidate)
        res.writeHead(200, {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      } catch {
        sendJson(res, 404, { error: 'Not found' })
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/agents') {
      const scope = String(url.searchParams.get('scope') || 'global').toLowerCase()
      const force = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('force') || '').toLowerCase())
      const registry = await discoverAgentRegistry({ scope: scope === 'edge' ? 'edge' : 'global', force })

      const agents = registry.agents.map((agent) => ({
        id: agent.id,
        name: agent.name || agent.id,
        source: agent.sources?.[0]?.kind || 'registry',
        role: agent.role || '',
        vibe: agent.vibe || '',
        gatewayState: agent.sources?.find((s) => s.gatewayState)?.gatewayState || (agent.status === 'active' ? 'running' : agent.status),
        updatedAt: agent.lastSeenAt || registry.updatedAt,
        active: agent.status === 'active',
        status: agent.status,
        stale: Boolean(agent.stale),
        confidence: Number(agent.confidence) || 0,
        owner: agent.owner || null,
      }))

      const defaultId = agents.find((a) => a.active)?.id
        || agents.find((a) => a.status === 'idle')?.id
        || agents[0]?.id
        || null

      sendJson(res, 200, { agents, defaultId, scope: registry.scope, updatedAt: registry.updatedAt, stats: registry.stats })
      return
    }

    if (req.method === 'GET' && url.pathname === '/registry/agents') {
      const scope = String(url.searchParams.get('scope') || 'global').toLowerCase()
      const force = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('force') || '').toLowerCase())
      const registry = await discoverAgentRegistry({ scope: scope === 'edge' ? 'edge' : 'global', force })
      sendJson(res, 200, registry)
      return
    }

    if (req.method === 'GET' && url.pathname === '/mobile/update/check') {
      const rawCfg = loadMobileUpdatesConfig()
      const config = normalizeManifestLoaded(rawCfg)
      const payload = buildUpdateCheckResponse({ config, url })
      sendJson(res, payload.ok ? 200 : 404, payload)
      return
    }

    if (req.method === 'GET' && url.pathname === '/mobile/apk/debug') {
      try {
        const stat = await fs.stat(mobileDebugApkPath)
        if (!stat.isFile()) {
          sendJson(res, 404, { error: 'APK not found' })
          return
        }
        const data = await fs.readFile(mobileDebugApkPath)
        res.writeHead(200, {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Length': String(data.byteLength),
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      } catch {
        sendJson(res, 404, { error: 'APK not found' })
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/settings/mobile-updates') {
      const cfg = loadMobileUpdatesConfig()
      sendJson(res, 200, { ok: true, config: normalizeConfigForResponse(cfg) })
      return
    }

    if (req.method === 'PATCH' && url.pathname === '/settings/mobile-updates') {
      const body = await readBody(req)
      const lanePatch = normalizeAdminLaneBody(body)
      const current = loadMobileUpdatesConfig()
      const next = applyLanePatch(current, lanePatch)
      await saveMobileUpdatesConfig(next)
      sendJson(res, 200, {
        ok: true,
        updated: { platform: lanePatch.platform, channel: lanePatch.channel },
        config: normalizeConfigForResponse(next),
      })
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
  readState()
    .then((state) => {
      const settings = getMusicSettings(state)
      if (settings.cacheEnabled) return warmAllMusicCache(settings)
      return null
    })
    .then((result) => {
      if (result?.ok) console.log(`[music-cache] warmed ${result.warmed}/${result.total} tracks (${result.cache?.bytes || 0} bytes)`)
    })
    .catch((error) => {
      console.warn(`[music-cache] warm failed: ${error?.message || error}`)
    })
})
