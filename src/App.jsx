import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { AtmosphereProvider, useAtmosphere } from './atmosphere/AtmosphereProvider'
import { AgentProvider, useAgent } from './agent/AgentProvider'
// NOTE: No Saito imports. All display is driven by backend discovery only.
import AtmosphereCanvas from './visual/AtmosphereCanvas'
import Visualizer from './visual/Visualizer'
import MusicNoteOverlay from './visual/MusicNoteOverlay'
import { startAudioAtmosphere, stopAudioAtmosphere, updateAudioAtmosphere } from './audio/AudioAtmosphere'

// ============================================================
// API
// ============================================================
const PRIME_HOST = '100.110.224.126'
const API = (typeof __API_BASE__ !== 'undefined' && __API_BASE__)
  ? __API_BASE__
  : '/api/backend'

function resolveApiOrigin(base) {
  try {
    const u = new URL(base, window?.location?.origin || `http://${PRIME_HOST}`)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

function resolveDefaultRelayUrl() {
  try {
    const apiOrigin = resolveApiOrigin(API)
    if (apiOrigin) {
      const u = new URL(apiOrigin)
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${u.hostname}:4014/signal`
    }
  } catch {
    // fallback below
  }
  return `ws://${PRIME_HOST}:4014/signal`
}

function resolveTrackAudioUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) return raw
  if (raw.startsWith('/')) {
    const origin = resolveApiOrigin(API)
    if (origin) return `${origin}${raw}`
    return `${API.replace(/\/$/, '')}${raw}`
  }
  return `${API.replace(/\/$/, '')}/${raw.replace(/^\//, '')}`
}

async function loadState() {
  const r = await fetch(`${API}/state`)
  if (!r.ok) throw new Error('Failed to load state')
  return r.json()
}
async function loadAgents() {
  const r = await fetch(`${API}/agents`)
  if (!r.ok) return { agents: [], defaultId: null }
  return r.json()
}
async function loadTracks() {
  const r = await fetch(`${API}/music/tracks`)
  if (!r.ok) return []
  const d = await r.json()
  return d.tracks || []
}

async function loadMusicSettings() {
  const r = await fetch(`${API}/settings/music`)
  if (!r.ok) throw new Error('Failed to load music settings')
  return r.json()
}

async function saveMusicSettings(payload) {
  const r = await fetch(`${API}/settings/music`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to save music settings')
  return r.json()
}

async function warmMusicCache() {
  const r = await fetch(`${API}/music/cache/warm`, { method: 'POST' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to warm music cache')
  return r.json()
}

async function clearMusicCache() {
  const r = await fetch(`${API}/music/cache/clear`, { method: 'POST' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to clear music cache')
  return r.json()
}

async function rotateMusicTracks() {
  const r = await fetch(`${API}/music/tracks/rotate`, { method: 'POST' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to rotate tracks')
  return r.json()
}

function isOnWifiConnection() {
  try {
    const conn = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection
    if (!conn) return true
    const type = String(conn.type || '').toLowerCase()
    if (type === 'wifi' || type === 'ethernet') return true
    if (type === 'cellular') return false
    const effective = String(conn.effectiveType || '').toLowerCase()
    if (effective.includes('2g') || effective.includes('3g') || effective.includes('4g') || effective.includes('5g')) return false
    return true
  } catch {
    return true
  }
}
async function sendAction(action, payload = {}, agentId = null) {
  const r = await fetch(`${API}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, agentId }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed')
  return r.json()
}
async function checkHealth() {
  try { const r = await fetch(`${API}/health`); return r.ok } catch { return false }
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function uploadAvatar(agentId, file) {
  const buf = await file.arrayBuffer()
  const base64 = arrayBufferToBase64(buf)
  const r = await fetch(`${API}/agent-avatar/${encodeURIComponent(agentId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64, type: file.type, filename: file.name }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Upload failed')
  return r.json()
}

async function loadAgentProfile(agentId) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/profile`)
  if (!r.ok) throw new Error('Failed to load agent profile')
  return r.json()
}

async function saveAgentProfile(agentId, payload) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to save profile')
  return r.json()
}

async function loadImageGenerationSettings() {
  const r = await fetch(`${API}/settings/image-generation`)
  if (!r.ok) throw new Error('Failed to load image settings')
  return r.json()
}

async function saveImageGenerationSettings(payload) {
  const r = await fetch(`${API}/settings/image-generation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to save image settings')
  return r.json()
}

async function testImageGenerationProvider(provider) {
  const r = await fetch(`${API}/settings/image-generation/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Image provider test failed')
  return r.json()
}

async function generateAvatar(agentId, payload = {}) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/avatar/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Avatar generation failed')
  return r.json()
}

async function loadAgentCollection(agentId) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/collection`)
  if (!r.ok) throw new Error('Failed to load agent collection')
  return r.json()
}

async function saveAgentCollection(agentId, payload) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/collection`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to save collection')
  return r.json()
}

async function loadAgentHistory(agentId, limit = 200) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/history?limit=${encodeURIComponent(limit)}`)
  if (!r.ok) throw new Error('Failed to load agent history')
  return r.json()
}

async function loadAgentGallery(agentId) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/gallery`)
  if (!r.ok) throw new Error('Failed to load agent gallery')
  return r.json()
}

async function ingestAgentGalleryImage(agentId, payload) {
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to ingest gallery image')
  return r.json()
}

async function checkMobileUpdate(params = {}) {
  const q = new URLSearchParams()
  q.set('platform', params.platform || 'android')
  q.set('channel', params.channel || 'stable')
  q.set('versionName', params.versionName || '1.0')
  q.set('versionCode', String(Number(params.versionCode) || 1))
  const r = await fetch(`${API}/mobile/update/check?${q.toString()}`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to check mobile update')
  return r.json()
}

async function loadMobileUpdateSettings() {
  const r = await fetch(`${API}/settings/mobile-updates`)
  if (!r.ok) throw new Error('Failed to load mobile update settings')
  return r.json()
}

async function saveMobileUpdateSettings(payload) {
  const r = await fetch(`${API}/settings/mobile-updates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to save mobile update settings')
  return r.json()
}

async function loadStatsLab(agentId, params = {}) {
  const q = new URLSearchParams()
  if (agentId) q.set('agentId', agentId)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (Array.isArray(params.kinds) && params.kinds.length) q.set('kinds', params.kinds.join(','))
  if (params.limit) q.set('limit', String(params.limit))
  const r = await fetch(`${API}/stats/lab?${q.toString()}`)
  if (!r.ok) throw new Error('Failed to load stats lab data')
  return r.json()
}

async function appendAgentHistory(agentId, entries) {
  const payload = Array.isArray(entries) ? { entries } : { entry: entries }
  const r = await fetch(`${API}/agent/${encodeURIComponent(agentId)}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to append history')
  return r.json()
}

async function appendTelemetry(payload) {
  const r = await fetch(`${API}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to append telemetry')
  return r.json()
}

async function enqueueDjSlot(payload) {
  const r = await fetch(`${API}/radio/dj/enqueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to enqueue DJ slot')
  return r.json()
}

async function renderDjClip(payload) {
  const r = await fetch(`${API}/radio/dj/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to render DJ clip')
  return r.json()
}

// ============================================================
// Utilities
// ============================================================
function formatDuration(secs) {
  if (!secs) return '--:--'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

function nextLevelXp(level) {
  return Math.floor(100 * Math.pow(Math.max(1, level || 1), 1.45))
}

function levelProgressPct(profile) {
  const currentXp = Number(profile?.xp) || 0
  const needed = nextLevelXp(profile?.level)
  if (!needed) return 0
  return Math.max(0, Math.min(100, (currentXp / needed) * 100))
}

function seededShuffle(arr, seed) {
  let h = 0
  const safeSeed = String(seed || 'agent')
  for (let i = 0; i < safeSeed.length; i++) h = (Math.imul(31, h) + safeSeed.charCodeAt(i)) | 0
  const rng = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff }
  const r = [...arr]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function buildRotationQueue({ pool, mode = 'balanced', favorites = [], history = [], antiRepeatWindow = 3, seed = 'agent', playlistNudge = null }) {
  const safePool = Array.isArray(pool) ? pool : []
  const favoriteSet = new Set((favorites || []).map((v) => String(v || '').trim()).filter(Boolean))
  const recentIds = new Set((history || []).slice(0, Math.max(0, antiRepeatWindow)).map((e) => String(e?.trackId || '').trim()).filter(Boolean))
  const nudge = {
    favoritesBoost: Number(playlistNudge?.favoritesBoost) || 0,
    explorationBoost: Number(playlistNudge?.explorationBoost) || 0,
    repeatPenalty: Number(playlistNudge?.repeatPenalty) || 0,
  }

  const base = seededShuffle(safePool, `${seed}:base`)
  const notRecent = base.filter((t) => !recentIds.has(String(t?.id || '')))
  const candidate = notRecent.length ? notRecent : base

  if (mode === 'favorites') {
    const fav = candidate.filter((t) => favoriteSet.has(String(t?.id || '')))
    const non = candidate.filter((t) => !favoriteSet.has(String(t?.id || '')))
    return [...fav, ...non]
  }

  if (mode === 'exploration') {
    const non = candidate.filter((t) => !favoriteSet.has(String(t?.id || '')))
    const fav = candidate.filter((t) => favoriteSet.has(String(t?.id || '')))
    return [...non, ...fav]
  }

  // balanced + playlist nudge
  const fav = candidate.filter((t) => favoriteSet.has(String(t?.id || '')))
  const non = candidate.filter((t) => !favoriteSet.has(String(t?.id || '')))

  const out = []
  const favQ = [...fav]
  const nonQ = [...non]

  const favStepBase = 1 + (nudge.favoritesBoost > 0 ? Math.round(nudge.favoritesBoost * 2) : 0)
  const nonStepBase = 1 + (nudge.explorationBoost > 0 ? Math.round(nudge.explorationBoost * 2) : 0)

  while (favQ.length || nonQ.length) {
    for (let i = 0; i < favStepBase && favQ.length; i++) out.push(favQ.shift())
    for (let i = 0; i < nonStepBase && nonQ.length; i++) out.push(nonQ.shift())
    if (!favQ.length && nonQ.length) out.push(nonQ.shift())
    if (!nonQ.length && favQ.length) out.push(favQ.shift())
  }

  const repeatPenalty = Math.max(0, Math.min(1, nudge.repeatPenalty))
  if (repeatPenalty > 0 && out.length > 2) {
    const recent = new Set((history || []).slice(0, 6).map((h) => String(h?.trackId || '')).filter(Boolean))
    const protectedTail = []
    const front = []
    for (const t of out) {
      if (recent.has(String(t?.id || '')) && Math.random() < repeatPenalty) protectedTail.push(t)
      else front.push(t)
    }
    const merged = [...front, ...protectedTail]
    return merged.length ? merged : out
  }

  return out.length ? out : candidate
}

const PLAYBACK_RESUME_KEY = 'vaib_playback_resume_v1'
const AGENT_COLLECTIONS_KEY = 'vaib_agent_collections_v1'
const AGENT_PLAY_HISTORY_KEY = 'vaib_agent_play_history_v1'
const PINNED_PROFILE_AGENT_KEY = 'vaib_pinned_profile_agent_v1'
const MOTION_MODE_KEY = 'vaib_motion_mode_v1'
const RADIO_MODE_KEY = 'vaib_radio_mode_v1'
const RADIO_LISTENER_AGENT_IDS_KEY = 'vaib_radio_listener_agents_v1'
const RADIO_DJ_ENABLED_KEY = 'vaib_radio_dj_enabled_v1'
const RADIO_DJ_QUEUE_KEY = 'vaib_radio_dj_queue_v1'

function loadPinnedProfileAgent() {
  try {
    return localStorage.getItem(PINNED_PROFILE_AGENT_KEY) || ''
  } catch {
    return ''
  }
}

function savePinnedProfileAgent(agentId = '') {
  try {
    if (!agentId) localStorage.removeItem(PINNED_PROFILE_AGENT_KEY)
    else localStorage.setItem(PINNED_PROFILE_AGENT_KEY, String(agentId))
  } catch {
    // ignore storage errors
  }
}

function loadMotionMode() {
  try {
    const mode = localStorage.getItem(MOTION_MODE_KEY) || 'medium'
    return ['off', 'low', 'medium', 'high', 'dynamic'].includes(mode) ? mode : 'medium'
  } catch {
    return 'medium'
  }
}

function saveMotionMode(mode = 'medium') {
  try {
    localStorage.setItem(MOTION_MODE_KEY, mode)
  } catch {
    // ignore storage errors
  }
}

function loadRadioMode() {
  try {
    const mode = localStorage.getItem(RADIO_MODE_KEY) || 'on_air'
    return mode === 'listener' ? 'listener' : 'on_air'
  } catch {
    return 'on_air'
  }
}

function saveRadioMode(mode = 'on_air') {
  try {
    localStorage.setItem(RADIO_MODE_KEY, mode === 'listener' ? 'listener' : 'on_air')
  } catch {
    // ignore storage errors
  }
}

function loadListenerAgentIds() {
  try {
    const raw = localStorage.getItem(RADIO_LISTENER_AGENT_IDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map((v) => String(v || '')).filter(Boolean) : []
  } catch {
    return []
  }
}

function saveListenerAgentIds(ids = []) {
  try {
    localStorage.setItem(RADIO_LISTENER_AGENT_IDS_KEY, JSON.stringify(Array.isArray(ids) ? ids : []))
  } catch {
    // ignore storage errors
  }
}

function loadDjEnabled() {
  try {
    return localStorage.getItem(RADIO_DJ_ENABLED_KEY) !== '0'
  } catch {
    return true
  }
}

function saveDjEnabled(enabled = true) {
  try {
    localStorage.setItem(RADIO_DJ_ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    // ignore storage errors
  }
}

function loadDjQueue() {
  try {
    const raw = localStorage.getItem(RADIO_DJ_QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, 100) : []
  } catch {
    return []
  }
}

function saveDjQueue(queue = []) {
  try {
    localStorage.setItem(RADIO_DJ_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue.slice(0, 100) : []))
  } catch {
    // ignore storage errors
  }
}

function hashString(input = '') {
  let h = 0
  const s = String(input || '')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function agentThemeVars(agentId = '', resonanceScore = 0) {
  const h = hashString(agentId) % 360
  const alt = (h + 42) % 360
  const glow = Math.max(0.18, Math.min(0.45, 0.2 + (Math.abs(Number(resonanceScore) || 0) / 100) * 0.22))
  return {
    '--agent-hue': `${h}`,
    '--agent-hue-alt': `${alt}`,
    '--agent-glow': `${glow}`,
  }
}

function computeStarAgent(agents = [], historyMap = {}) {
  if (!Array.isArray(agents) || !agents.length) return { agent: null, reason: 'No agents discovered.' }

  const now = Date.now()
  const rows = agents.map((agent) => {
    const id = String(agent?.id || '')
    const history = Array.isArray(historyMap?.[id]) ? historyMap[id] : []
    const statusScore = agent?.active ? 30 : (String(agent?.gatewayState || '').toLowerCase().includes('idle') ? 20 : 8)
    const seenMs = Date.parse(agent?.updatedAt || agent?.lastSeenAt || '')
    const ageMin = Number.isFinite(seenMs) ? Math.max(0, (now - seenMs) / 60000) : 1e6
    const freshnessScore = Math.max(0, 25 - Math.min(25, ageMin / 3))
    const eventCountScore = Math.min(20, history.length / 8)

    let completionScore = 0
    let skipPenalty = 0
    if (history.length) {
      const sample = history.slice(0, 80)
      const completions = sample
        .map((e) => Number(e?.completionRatio))
        .filter((v) => Number.isFinite(v))
      const avgCompletion = completions.length
        ? completions.reduce((a, b) => a + b, 0) / completions.length
        : 0.55
      const skipCount = sample.filter((e) => String(e?.reason || '').toLowerCase().includes('skip')).length
      const skipRate = sample.length ? skipCount / sample.length : 0
      completionScore = Math.max(0, Math.min(18, avgCompletion * 18))
      skipPenalty = Math.max(0, Math.min(10, skipRate * 12))
    }

    const total = statusScore + freshnessScore + eventCountScore + completionScore - skipPenalty
    const reasonBits = []
    if (statusScore >= 30) reasonBits.push('live')
    if (freshnessScore >= 16) reasonBits.push('fresh signal')
    if (eventCountScore >= 8) reasonBits.push('active history')
    if (completionScore >= 10) reasonBits.push('high completion')

    return {
      agent,
      score: Number(total.toFixed(2)),
      reason: reasonBits.length ? reasonBits.join(' · ') : 'balanced profile signal',
    }
  })

  rows.sort((a, b) => b.score - a.score)
  return rows[0]
}

function loadPlaybackResume() {
  try {
    const raw = localStorage.getItem(PLAYBACK_RESUME_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function savePlaybackResume(snapshot) {
  try {
    localStorage.setItem(PLAYBACK_RESUME_KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }))
  } catch {
    // ignore storage errors
  }
}

function normalizeTrackForCollection(t) {
  if (!t) return null
  return {
    id: String(t.id),
    title: t.title || 'Unknown title',
    artist: t.artist || 'Unknown artist',
    duration: Number(t.duration) || 0,
    audioUrl: resolveTrackAudioUrl(t.audioUrl || ''),
    tags: Array.isArray(t.tags) ? t.tags : [],
    source: t.source || 'unknown',
  }
}

function loadAgentCollections() {
  try {
    const raw = localStorage.getItem(AGENT_COLLECTIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function saveAgentCollections(collections) {
  try {
    localStorage.setItem(AGENT_COLLECTIONS_KEY, JSON.stringify(collections || {}))
  } catch {
    // ignore storage errors
  }
}

function collectionArrayToMap(list = []) {
  const map = {}
  for (const t of list || []) {
    const n = normalizeTrackForCollection(t)
    if (!n?.id) continue
    map[n.id] = {
      ...n,
      firstSeenAt: t.firstSeenAt || n.firstSeenAt || new Date().toISOString(),
      lastSeenAt: t.lastSeenAt || n.lastSeenAt || new Date().toISOString(),
      seenCount: Number(t.seenCount) || 1,
    }
  }
  return map
}

function mergeAgentCollectionForAgent(existing, incomingTracks = []) {
  const map = new Map()

  const addTrack = (track) => {
    const normalized = normalizeTrackForCollection(track)
    if (!normalized?.id) return
    const prev = map.get(normalized.id)
    map.set(normalized.id, {
      ...normalized,
      firstSeenAt: prev?.firstSeenAt || normalized.firstSeenAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      seenCount: (prev?.seenCount || 0) + 1,
    })
  }

  Object.values(existing || {}).forEach(addTrack)
  incomingTracks.forEach(addTrack)

  const merged = {}
  for (const [id, value] of map.entries()) merged[id] = value
  return merged
}

function loadAgentPlayHistory() {
  try {
    const raw = localStorage.getItem(AGENT_PLAY_HISTORY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function saveAgentPlayHistory(history) {
  try {
    localStorage.setItem(AGENT_PLAY_HISTORY_KEY, JSON.stringify(history || {}))
  } catch {
    // ignore storage errors
  }
}

// ============================================================
// Agent Avatar
// ============================================================
function AgentAvatar({ agentId, name, size = 64, uploadable = false, className = '', onUpload = null }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setSrc(`${API}/agent-avatar/${encodeURIComponent(agentId)}?t=${Date.now()}`)
    setFailed(false)
  }, [agentId])

  const initials = (name || '?').split(/[\s_-]/).map(w => w[0]).join('').toUpperCase().slice(0, 2)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const payload = await uploadAvatar(agentId, file)
      setSrc(`${API}/agent-avatar/${encodeURIComponent(agentId)}?t=${Date.now()}`)
      setFailed(false)
      onUpload?.(payload)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    e.target.value = ''
  }

  return (
    <div className={`avatarWrap ${className}`.trim()} style={{ width: size, height: size }}
      onClick={() => uploadable && inputRef.current?.click()}>
      {!failed && src
        ? <img src={src} alt={name} className="avatarImg" onError={() => setFailed(true)} />
        : <div className="avatarInitials" style={{ fontSize: size * 0.32 }}>{initials}</div>
      }
      {uploadable && (
        <>
          <div className="avatarUploadOverlay">📷</div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}
    </div>
  )
}

// ============================================================
// Tab bar icons (inline SVG)
// ============================================================
const Icons = {
  cockpit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  stations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M7.76 7.76a6 6 0 0 0 0 8.49" />
      <path d="M20.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M3.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
    </svg>
  ),
}

// ============================================================
// Top EQ strip — persistent, full-width, bars only
// ============================================================
function TopEqualizer({ analyser }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const peaksRef = useRef(new Float32Array(64))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      const ctx = canvas.getContext('2d')
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const count = 64
      const gap = 1.5
      const barW = (w - gap * (count - 1)) / count
      const peaks = peaksRef.current

      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData)
      }

      for (let i = 0; i < count; i++) {
        const dataI = Math.floor((i / count) * (freqData ? freqData.length * 0.75 : 1))
        const val = freqData ? freqData[dataI] / 255 : 0
        const barH = Math.max(1.5, val * h * 0.92)

        if (barH > peaks[i]) peaks[i] = barH
        else peaks[i] *= 0.92

        const x = i * (barW + gap)

        // Amplitude-based color: tall=cyan, short=purple
        const r = Math.round(180 - val * 180)
        const g = Math.round(80 + val * 175)
        const b = Math.round(255 - val * 35)

        const grad = ctx.createLinearGradient(x, h - barH, x, h)
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0.2)`)
        ctx.fillStyle = grad
        ctx.fillRect(x, h - barH, barW, barH)

        // Peak dot
        if (peaks[i] > 2) {
          ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
          ctx.fillRect(x, h - peaks[i] - 1, barW, 1.5)
        }
      }
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [analyser])

  return <canvas ref={canvasRef} className="topEQ" />
}

// ============================================================
// Tab: Cockpit
// ============================================================
function CockpitTab({ tunedAgent, track, events, notifications, apiHealthy, onReadAll, analyser }) {
  const [signalsCollapsed, setSignalsCollapsed] = useState(false)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)
  const [eventFilter, setEventFilter] = useState('all')

  const unreadNotifications = notifications.filter(n => !n.read)

  const classify = useCallback((text = '') => {
    const t = String(text || '').toLowerCase()
    if (/(track|dj|song|radio|play|queue|broadcast|music|audio)/.test(t)) return 'music'
    if (/(agent|profile|avatar|station|resonance|tune)/.test(t)) return 'agent'
    return 'system'
  }, [])

  const filteredSignals = useMemo(() => {
    if (eventFilter === 'all') return unreadNotifications
    return unreadNotifications.filter((n) => classify(`${n?.title || ''} ${n?.message || ''}`) === eventFilter)
  }, [unreadNotifications, eventFilter, classify])

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events
    return events.filter((e) => classify(`${e?.summary || ''}`) === eventFilter)
  }, [events, eventFilter, classify])

  return (
    <div className="tabScreen">
      <div className="tabSectionHeader">
        <span className="cardLabel">Primary feed</span>
      </div>

      {/* Agent hero — front and center */}
      {tunedAgent && (
        <div className="card heroCard">
          <div className="heroTop">
            <AgentAvatar agentId={tunedAgent.id} name={tunedAgent.name} size={72} />
            <div className="heroInfo">
              <div className="heroNameRow">
                <span className="presenceDot" />
                <h1 className="heroName">{tunedAgent.name}</h1>
                <span className={`statusPill ${tunedAgent.active ? 'online' : 'offline'}`}>
                  {tunedAgent.active ? 'LIVE' : 'offline'}
                </span>
              </div>
              {tunedAgent.role && <p className="heroRole">{tunedAgent.role}</p>}
              <span className="heroSource">{tunedAgent.source}</span>
            </div>
          </div>

          {track && (
            <div className="heroTrack">
              <span className="broadcastEyebrow">Now Broadcasting</span>
              <p className="heroTrackTitle">{track.title}</p>
              <p className="heroTrackArtist">{track.artist}</p>
              {track.tags[0] && (
                <div className="broadcastMeta" style={{ marginTop: 6 }}>
                  <span className="broadcastTag">Vibe: {track.tags[0]}</span>
                  <span className="broadcastDuration">{formatDuration(track.duration)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card heroVizCard vizCard">
        <div className="cardHeaderRow">
          <span className="cardLabel">Signal visualizer</span>
        </div>
        <Visualizer analyser={analyser} compact={false} />
      </div>

      <div className="tabSectionHeader">
        <span className="cardLabel">Operations</span>
      </div>
      <div className="filterChipRow" role="group" aria-label="Event filters">
        {['all', 'system', 'music', 'agent'].map((flt) => (
          <button
            key={flt}
            type="button"
            className={`filterChip ${eventFilter === flt ? 'active' : ''}`}
            onClick={() => setEventFilter(flt)}
          >
            {flt}
          </button>
        ))}
      </div>
      <div className="card statusCard">
        <div className="statusRow">
          <span className="statusLabel">Backend API</span>
          <span className={`statusPill ${apiHealthy ? 'online' : 'offline'}`}>{apiHealthy ? 'online' : 'offline'}</span>
        </div>
        <div className="statusRow">
          <span className="statusLabel">Local State</span>
          <span className="statusPill online">online</span>
        </div>
      </div>

      {unreadNotifications.length > 0 && (
        <div className="card">
          <div className="cardHeaderRow">
            <span className="cardLabel">Signals</span>
            <div className="cardHeaderActions">
              <button type="button" className="textBtn" onClick={() => setSignalsCollapsed((v) => !v)}>
                {signalsCollapsed ? 'Expand' : 'Collapse'}
              </button>
              <button type="button" className="textBtn" onClick={onReadAll}>Clear</button>
            </div>
          </div>
          {!signalsCollapsed && (
            <ul className="signalList">
              {filteredSignals.slice(0, 4).map(n => (
                <li key={n.id} className="signalItem">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                </li>
              ))}
              {!filteredSignals.length && <li className="signalItem"><p>No signals for this filter.</p></li>}
            </ul>
          )}
        </div>
      )}

      <div className="tabSectionHeader">
        <span className="cardLabel">Timeline</span>
      </div>
      <div className="card">
        <div className="cardHeaderRow">
          <span className="cardLabel">Recent events</span>
          <button type="button" className="textBtn" onClick={() => setTimelineCollapsed((v) => !v)}>
            {timelineCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {!timelineCollapsed && (
          <ul className="eventFeed">
            {filteredEvents.slice(0, 6).map(e => (
              <li key={e.id} className="eventItem">
                <span className="eventSummary">{e.summary}</span>
                <span className="eventTime">{new Date(e.createdAt).toLocaleTimeString()}</span>
              </li>
            ))}
            {!filteredEvents.length && <li className="eventItem"><span className="eventSummary">No events for this filter.</span></li>}
          </ul>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab: Stations
// ============================================================
function StationsTab({ agents, tunedId, onTune }) {
  const active = agents.filter(a => a.active)
  const dormant = agents.filter(a => !a.active)
  return (
    <div className="tabScreen">
      <div className="tabSectionHeader">
        <span className="cardLabel">Active — {active.length}</span>
      </div>
      <div className="stationGrid">
        {active.map(agent => (
          <StationCard key={agent.id} agent={agent} tuned={agent.id === tunedId} onTune={onTune} />
        ))}
      </div>
      {dormant.length > 0 && (
        <>
          <div className="tabSectionHeader" style={{ marginTop: 20 }}>
            <span className="cardLabel">Dormant — {dormant.length}</span>
          </div>
          <div className="stationGrid">
            {dormant.map(agent => (
              <StationCard key={agent.id} agent={agent} tuned={false} onTune={onTune} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StationCard({ agent, tuned, onTune }) {
  const statusLabel = agent.gatewayState === 'running' ? 'LIVE'
    : agent.gatewayState === 'startup_failed' ? 'failed'
    : agent.gatewayState || 'offline'

  return (
    <div
      className={`card stationCard ${agent.active ? 'stationActive' : 'stationDormant'} ${tuned ? 'stationTuned' : ''}`}
      onClick={() => agent.active && onTune(agent)}
    >
      <div className="stationCardTop">
        <span className="presenceDot" />
        <span className="stationCardName">{agent.name}</span>
        {agent.active && <span className="liveBadge">{statusLabel}</span>}
        {tuned && <span className="tunedBadge">◉</span>}
      </div>
      {agent.role && <p className="stationCardRole">{agent.role}</p>}
      <div className="stationCardMeta">
        <span className="stationCardSource">{agent.source}</span>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Queue
// ============================================================
function QueueTab({ agentTracks, trackIndex, playing, onPlayTrack }) {
  if (!agentTracks.length) return (
    <div className="tabScreen emptyScreen">
      <p>No tracks loaded. Check Jamendo API config.</p>
    </div>
  )
  return (
    <div className="tabScreen">
      <span className="cardLabel" style={{ marginBottom: 12, display: 'block' }}>
        {agentTracks.length} tracks
      </span>
      <ul className="queueList">
        {agentTracks.map((t, i) => (
          <li
            key={t.id}
            className={`queueItem ${i === trackIndex ? 'queueItemActive' : ''}`}
            onClick={() => onPlayTrack(i)}
          >
            <div className="queueItemInfo">
              <span className="queueItemTitle">{t.title}</span>
              <span className="queueItemArtist">{t.artist}</span>
            </div>
            <div className="queueItemRight">
              {i === trackIndex && playing && <span className="playingDot">▶</span>}
              <span className="queueItemDuration">{formatDuration(t.duration)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================
// Tab: Agents
// ============================================================
function AgentsTab({ agents, onOpenProfile }) {
  return (
    <div className="tabScreen">
      <ul className="agentDetailList">
        {agents.map(agent => (
          <li key={agent.id} className={`card agentDetailCard ${agent.active ? '' : 'agentDormant'}`}>
            <div className="agentDetailTop">
              <AgentAvatar agentId={agent.id} name={agent.name} size={48} uploadable />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="presenceDot" style={agent.active ? {} : { background: '#444', boxShadow: 'none' }} />
                  <span className="agentDetailName">{agent.name}</span>
                  <span className="agentDetailSource">{agent.source}</span>
                </div>
                {agent.role && <p className="agentDetailRole">{agent.role}</p>}
                {agent.vibe && <p className="agentDetailVibe">{agent.vibe}</p>}
              </div>
            </div>
            <div className="agentDetailActions">
              <span className={`statusPill ${agent.active ? 'online' : 'offline'}`} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                {agent.gatewayState || 'offline'}
              </span>
              <button type="button" className="profileBtn" onClick={() => onOpenProfile(agent.id)}>
                Profile
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AgentProfileTab({
  profile,
  collection = [],
  history = [],
  gallery = [],
  busy,
  saveError,
  onChange,
  onSave,
  onPlayTopSong,
  onAddTrack,
  onRemoveTrack,
  onIngestGalleryImage,
  onOpenAgent,
  onTune,
  allAgents = [],
  selectedAgentId,
  liveTrack,
  starAgent,
  starReason = '',
  pinnedAgentId = '',
  onPinAgent,
  motionMode = 'medium',
  onAvatarUploaded,
  editMode = false,
  onToggleEditMode,
  onCancelEdit,
}) {
  if (!profile) {
    return (
      <div className="tabScreen">
        <div className="card profileAgentSelectorCard">
          <div className="cardHeaderRow">
            <span className="cardLabel">Agent Profiles</span>
            <div className="profileHeaderBadges">
              {starAgent?.id ? <span className="starAgentChip">⭐ Star: {starAgent.name || starAgent.id}</span> : null}
              <span className="eventTime">{allAgents.length} total</span>
            </div>
          </div>
          <div className="profileAgentScroller">
            {allAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`profileAgentPill ${selectedAgentId === agent.id ? 'active' : ''} ${pinnedAgentId === agent.id ? 'pinned' : ''}`}
                onClick={() => onOpenAgent?.(agent.id)}
              >
                <AgentAvatar agentId={agent.id} name={agent.name} size={28} />
                <span>{agent.name}</span>
                {starAgent?.id === agent.id ? <span className="profileAgentMeta">⭐</span> : null}
                {pinnedAgentId === agent.id ? <span className="profileAgentMeta">📌</span> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="card profileEmptyCard">
          <span className="cardLabel">Profile Chamber</span>
          <p className="cardMuted">Identity channel is waiting. Spin up a profile and lock onto an agent signature.</p>
          <div className="profileEmptyActions">
            {starAgent?.id ? (
              <button type="button" className="profileBtn" onClick={() => onOpenAgent?.(starAgent.id)}>
                Open Star Agent
              </button>
            ) : null}
            {pinnedAgentId ? (
              <button type="button" className="ghostButton" onClick={() => onOpenAgent?.(pinnedAgentId)}>
                Open Pinned Favorite
              </button>
            ) : null}
          </div>
          {starReason ? <p className="eventTime profileEmptyReason">Signal analysis: {starReason}</p> : null}
        </div>
      </div>
    )
  }

  const p = profile.profile
  const progress = levelProgressPct(p)
  const nextXp = nextLevelXp(p.level)
  const topSongs = p.topSongs?.d7 || []
  const auraHue = Math.abs(Array.from(String(profile.agentId || 'agent')).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) | 0, 17)) % 360
  const persona = (p.personaTags || []).slice(0, 6)
  const resonanceScore = Number(p.resonanceScore || 0)
  const resonanceTone = resonanceScore >= 18
    ? 'Ascendant'
    : resonanceScore >= 6
      ? 'Stable'
      : resonanceScore <= -18
        ? 'Volatile'
        : resonanceScore <= -6
          ? 'Fragile'
          : 'Neutral'
  const auraAlpha = Math.max(0.18, Math.min(0.7, 0.24 + (Math.abs(resonanceScore) / 100) * 0.5))
  const unlocks = [
    { key: 'frame-signal', label: 'Signal Frame', unlocked: (p.level || 1) >= 3 },
    { key: 'title-resonant', label: 'Resonant Title', unlocked: (p.level || 1) >= 8 || resonanceScore >= 12 },
    { key: 'era-architect', label: 'Era: Architect', unlocked: (p.level || 1) >= 14 || resonanceScore >= 22 },
    { key: 'mythic-aura', label: 'Mythic Aura', unlocked: (p.level || 1) >= 20 || resonanceScore >= 32 },
  ]

  const tyler6AgentIds = new Set(['vps:tyler6'])
  const isTyler6 = tyler6AgentIds.has(String(profile.agentId || '').toLowerCase())

  const tyler6ThemeVars = isTyler6
    ? {
      '--t6-bg': '#0a0908',
      '--t6-bg2': '#1a0f0a',
      '--t6-border': '#5f3a1a',
      '--t6-primary': '#ff9a3b',
      '--t6-primary-soft': 'rgba(255,154,59,0.24)',
      '--t6-crimson': '#8e1e2f',
      '--t6-purple': '#6553a8',
      '--t6-text': '#f3e7db',
      '--t6-muted': 'rgba(243,231,219,0.72)',
      '--t6-heading-font': "'Cinzel', 'UnifrakturCook', 'Cormorant Garamond', 'Times New Roman', serif",
    }
    : undefined

  const heroThemeVars = {
    ...agentThemeVars(profile.agentId, resonanceScore),
    ...(isTyler6 ? tyler6ThemeVars : {}),
  }

  const historyStats = useMemo(() => {
    const entries = Array.isArray(history) ? history : []
    if (!entries.length) {
      return {
        total: 0,
        uniqueTracks: 0,
        avgCompletion: 0,
        skipRate: 0,
        totalPlaytimeSec: 0,
        peakHour: null,
        topGenres: [],
        behaviorLabel: 'Untrained Signal',
      }
    }

    const trackSet = new Set()
    const hourBuckets = Array.from({ length: 24 }, () => 0)
    let completionSum = 0
    let completionCount = 0
    let skipCount = 0
    let playtimeSum = 0
    const genreCounts = new Map()

    for (const entry of entries) {
      const trackId = String(entry?.trackId || '')
      if (trackId) trackSet.add(trackId)

      const ts = new Date(entry?.playedAt || entry?.ts || Date.now())
      const hour = Number.isFinite(ts.getTime()) ? ts.getHours() : null
      if (hour !== null && hour >= 0 && hour <= 23) hourBuckets[hour] += 1

      const completion = Number(entry?.completionRatio)
      if (Number.isFinite(completion)) {
        completionSum += Math.max(0, Math.min(1, completion))
        completionCount += 1
      }

      const playSec = Number(entry?.playtimeSec)
      if (Number.isFinite(playSec) && playSec > 0) playtimeSum += playSec

      const reason = String(entry?.reason || '').toLowerCase()
      if (reason.includes('skip')) skipCount += 1

      const trackGenre = Array.isArray(entry?.tags) ? entry.tags : []
      for (const g of trackGenre.slice(0, 2)) {
        const key = String(g || '').trim().toLowerCase()
        if (!key) continue
        genreCounts.set(key, (genreCounts.get(key) || 0) + 1)
      }
    }

    const avgCompletion = completionCount ? completionSum / completionCount : 0
    const skipRate = entries.length ? skipCount / entries.length : 0
    const peakHourIdx = hourBuckets.reduce((best, curr, idx) => (curr > hourBuckets[best] ? idx : best), 0)
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)

    const behaviorLabel = avgCompletion > 0.85 && skipRate < 0.08
      ? 'Steady Resonance'
      : avgCompletion > 0.65 && skipRate < 0.2
        ? 'Adaptive Listener'
        : skipRate > 0.35
          ? 'Chaotic Hopper'
          : 'Pattern Seeker'

    return {
      total: entries.length,
      uniqueTracks: trackSet.size,
      avgCompletion,
      skipRate,
      totalPlaytimeSec: Math.round(playtimeSum),
      peakHour: `${String(peakHourIdx).padStart(2, '0')}:00`,
      topGenres,
      behaviorLabel,
    }
  }, [history])

  const identitySummary = useMemo(() => {
    const displayName = p.displayName || profile.agentId
    const tokensIn = Number(p.lifetimeTokensIn) || 0
    const tokensOut = Number(p.lifetimeTokensOut) || 0
    const hasTokens = tokensIn > 0 || tokensOut > 0

    const genrePart = historyStats.topGenres.length
      ? `${historyStats.topGenres.slice(0, 2).join(' / ')} specialist`
      : 'genre profile still forming'

    const stabilityPart = historyStats.skipRate <= 0.12
      ? 'low skip volatility'
      : historyStats.skipRate <= 0.28
        ? 'moderate skip volatility'
        : 'high skip volatility'

    const completionPart = historyStats.avgCompletion >= 0.82
      ? 'high completion discipline'
      : historyStats.avgCompletion >= 0.62
        ? 'balanced completion habits'
        : 'fast-switch listening behavior'

    const peakPart = historyStats.peakHour
      ? `most active around ${historyStats.peakHour}`
      : 'active window not established yet'

    const tokenPart = hasTokens
      ? `Token footprint ${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out`
      : 'Token footprint pending telemetry'

    return `${displayName}: ${historyStats.behaviorLabel}. ${genrePart}, ${stabilityPart}, ${completionPart}; ${peakPart}. ${tokenPart}.`
  }, [historyStats, p.displayName, p.lifetimeTokensIn, p.lifetimeTokensOut, profile.agentId])

  return (
    <div className={`tabScreen ${isTyler6 ? 'tyler6ProfileTheme' : ''}`} style={heroThemeVars}>
      <div className="card profileAgentSelectorCard">
        <div className="cardHeaderRow">
          <span className="cardLabel">Agent Profiles</span>
          <div className="profileHeaderBadges">
            {starAgent?.id ? <span className="starAgentChip">⭐ Star: {starAgent.name || starAgent.id}</span> : null}
            <span className="eventTime">{allAgents.length} total</span>
          </div>
        </div>
        <div className="profileAgentScroller">
          {allAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className={`profileAgentPill ${selectedAgentId === agent.id ? 'active' : ''} ${pinnedAgentId === agent.id ? 'pinned' : ''}`}
              onClick={() => onOpenAgent?.(agent.id)}
            >
              <AgentAvatar agentId={agent.id} name={agent.name} size={28} />
              <span>{agent.name}</span>
              {starAgent?.id === agent.id ? <span className="profileAgentMeta">⭐</span> : null}
              {pinnedAgentId === agent.id ? <span className="profileAgentMeta">📌</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="card profileHeroCard profileTradingCard" style={{ borderColor: `hsla(${auraHue}, 90%, 65%, 0.45)` }}>
        {isTyler6 ? (
          <div className="tyler6Backdrop" aria-hidden>
            <span className="tyler6Sky" />
            <span className="tyler6Runes" />
            <span className="tyler6Embers" />
          </div>
        ) : null}
        <div className="profileAura" style={{ '--aura-hue': auraHue, '--aura-alpha': auraAlpha }} />
        <div className="profileHeroControlRow">
          <span className="profileStarReason">{starReason ? `⭐ ${starReason}` : '⭐ Star agent signal calibrated'}</span>
          <div className="profileHeroControlBtns">
            <button type="button" className="textBtn" onClick={() => onPinAgent?.(profile.agentId)}>
              {pinnedAgentId === profile.agentId ? 'Unpin Favorite' : 'Pin Favorite'}
            </button>
            <button type="button" className="textBtn" onClick={() => onToggleEditMode?.()}>
              {editMode ? 'Done' : 'Edit'}
            </button>
            {editMode ? (
              <button type="button" className="textBtn" onClick={() => onCancelEdit?.()}>
                Cancel
              </button>
            ) : null}
            <span className="profileMotionModeBadge">motion: {motionMode}</span>
          </div>
        </div>

        <div className="profileTradingDeck" tabIndex={0}>
          <div className="profileTradingDeckTrack" aria-hidden>
            <div className="profileTradingDeckSlide profileTradingDeckSlide--primary">
              <div className="profileAvatarSpotlight">
                <AgentAvatar
                  agentId={profile.agentId}
                  name={p.displayName || profile.agentId}
                  size={200}
                  uploadable
                  className="profileAvatarHero"
                  onUpload={onAvatarUploaded}
                />
                <span className="profileAvatarHint">Tap avatar to upload</span>
              </div>
              <div className="profileHeroInfo">
                {editMode ? (
                  <input
                    className="profileNameInput"
                    value={p.displayName || ''}
                    onChange={(e) => onChange({ displayName: e.target.value })}
                    placeholder="Stylized display name"
                  />
                ) : (
                  <h2 className="profileDisplayName">{p.displayName || profile.agentId}</h2>
                )}
                <div className="profileMetaRow">
                  <span className="agentBadge">{p.rank || 'Signal Initiate'}</span>
                  <span className="profileLevel">Level {p.level || 1}</span>
                  <span className={`profileResonanceTone ${resonanceScore < 0 ? 'negative' : resonanceScore > 0 ? 'positive' : ''}`}>
                    Resonance {resonanceTone}
                  </span>
                </div>
                <div className="profileXpBar">
                  <div className="profileXpFill" style={{ width: `${progress}%` }} />
                </div>
                <span className="profileXpLabel">XP {p.xp || 0} / {nextXp}</span>
              </div>
            </div>

            <div className="profileTradingDeckSlide profileTradingDeckSlide--stats">
              <div className="cardHeaderRow">
                <span className="cardLabel">Signal Stats Card</span>
                <span className="agentBadge">{historyStats.behaviorLabel}</span>
              </div>
              <div className="profileStatsGrid profileTradingStatsGrid">
                <div><span className="profileStatLabel">Events</span><strong>{historyStats.total.toLocaleString()}</strong></div>
                <div><span className="profileStatLabel">Unique Tracks</span><strong>{historyStats.uniqueTracks.toLocaleString()}</strong></div>
                <div><span className="profileStatLabel">Completion</span><strong>{Math.round(historyStats.avgCompletion * 100)}%</strong></div>
                <div><span className="profileStatLabel">Skip Rate</span><strong>{Math.round(historyStats.skipRate * 100)}%</strong></div>
                <div><span className="profileStatLabel">Playtime</span><strong>{formatDuration(historyStats.totalPlaytimeSec)}</strong></div>
                <div><span className="profileStatLabel">Peak Hour</span><strong>{historyStats.peakHour || '--:--'}</strong></div>
              </div>
              {historyStats.topGenres.length ? (
                <div className="profileGenreCloud">
                  {historyStats.topGenres.map((genre) => <span key={genre} className="profileGenrePill">{genre}</span>)}
                </div>
              ) : null}
            </div>

            <div className="profileTradingDeckSlide profileTradingDeckSlide--identity">
              {!!(p.traits || []).length && (
                <div className="profileTraitCloud">
                  {(p.traits || []).slice(0, 8).map((trait) => (
                    <span key={trait} className={`profileTraitBadge ${trait.includes('shadow') || trait.includes('frenzy') || trait.includes('chaos') ? 'negative' : ''}`}>
                      {String(trait).replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              <div className="profileUnlockGrid">
                {unlocks.map((u) => (
                  <div key={u.key} className={`profileUnlockChip ${u.unlocked ? 'unlocked' : 'locked'}`}>
                    <span>{u.label}</span>
                    <strong>{u.unlocked ? 'Unlocked' : 'Locked'}</strong>
                  </div>
                ))}
              </div>
              <p className="profileIdentitySummary">{identitySummary}</p>
            </div>
          </div>
        </div>

        {isTyler6 ? (
          <div className="tyler6LoreStrip">
            <span className="tyler6LoreTitle">NexusOne Command Throne</span>
            <p>Infernal war-room protocol active: molten-gold command glow, crimson conflict traces, and rare storm-violet highlights.</p>
            <div className="tyler6PaletteRow" aria-label="Tyler6 palette">
              <span style={{ background: '#0a0908' }} title="Abyss Black" />
              <span style={{ background: '#1a0f0a' }} title="Burnt Umber" />
              <span style={{ background: '#5f3a1a' }} title="Blackened Bronze" />
              <span style={{ background: '#ff9a3b' }} title="Molten Gold" />
              <span style={{ background: '#8e1e2f' }} title="Dark Crimson" />
              <span style={{ background: '#6553a8' }} title="Storm Violet" />
            </div>
          </div>
        ) : null}
      </div>

      {editMode ? (
        <>
          <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
            <span className="cardLabel">Identity Voice</span>
            <label className="profileFieldLabel">Bio</label>
            <textarea
              className="profileTextInput profileTextarea"
              value={p.bio || ''}
              onChange={(e) => onChange({ bio: e.target.value })}
              placeholder="Who this agent is in your universe"
            />

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Motto</label>
            <input
              className="profileTextInput"
              value={p.motto || ''}
              onChange={(e) => onChange({ motto: e.target.value })}
              placeholder="One line mantra"
            />

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Persona Tags (comma separated)</label>
            <input
              className="profileTextInput"
              value={(persona || []).join(', ')}
              onChange={(e) => onChange({ personaTags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
              placeholder="architect, night-owl, melodic"
            />

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Private Notes</label>
            <textarea
              className="profileTextInput profileTextarea"
              value={p.notes || ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="What makes this agent unique for you"
            />

            {persona.length > 0 && (
              <div className="profilePersonaCloud">
                {persona.map((tag) => <span key={tag} className="profilePersonaTag">#{tag}</span>)}
              </div>
            )}
          </div>

          <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
            <span className="cardLabel">Music DNA</span>
            <label className="profileFieldLabel">Genres (comma separated)</label>
            <input
              className="profileTextInput"
              value={(p.genres || []).join(', ')}
              onChange={(e) => onChange({ genres: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
              placeholder="uplifting trance, breakbeat"
            />

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Favorite Songs (track IDs, comma separated)</label>
            <input
              className="profileTextInput"
              value={(p.favoriteSongs || []).join(', ')}
              onChange={(e) => onChange({ favoriteSongs: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
              placeholder="track-aurora, track-circuit"
            />

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Rotation Mode</label>
            <select
              className="profileTextInput"
              value={p.rotationMode || 'balanced'}
              onChange={(e) => onChange({ rotationMode: e.target.value })}
            >
              <option value="balanced">balanced</option>
              <option value="favorites">favorites-heavy</option>
              <option value="exploration">exploration-heavy</option>
            </select>

            <label className="profileFieldLabel" style={{ marginTop: 10 }}>Anti-repeat window (tracks)</label>
            <input
              className="profileTextInput"
              type="number"
              min="0"
              max="50"
              value={Number(p.antiRepeatWindow) || 0}
              onChange={(e) => onChange({ antiRepeatWindow: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
              placeholder="3"
            />
          </div>

          <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
            <button type="button" className="profileSaveBtn" disabled={busy} onClick={onSave}>
              {busy ? 'Saving…' : 'Save Profile'}
            </button>
            {saveError ? <p className="cardMuted" style={{ color: '#ff9cba', marginTop: 8 }}>{saveError}</p> : null}
          </div>
        </>
      ) : null}

      <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
        <div className="cardHeaderRow">
          <span className="cardLabel">Top Songs (7d)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="textBtn" onClick={() => onTune?.(profile.agentId)}>
              Tune In
            </button>
            <button type="button" className="textBtn" onClick={onPlayTopSong}>Play Top Song</button>
          </div>
        </div>
        {liveTrack ? <p className="cardMuted">Live now: {liveTrack.title} — {liveTrack.artist}</p> : null}
        {topSongs.length ? (
          <ul className="eventFeed">
            {topSongs.slice(0, 5).map((song) => (
              <li key={song.trackId} className="eventItem">
                <span className="eventSummary">{song.trackId} · {song.playtimeSec || 0}s</span>
                <span className="eventTime">{Math.round((song.completionRatio || 0) * 100)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted">No top-song telemetry yet. Play a few tracks first.</p>
        )}
      </div>

      <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
        <div className="cardHeaderRow">
          <span className="cardLabel">Collection ({collection.length})</span>
          <button type="button" className="textBtn" onClick={onAddTrack}>Add Track</button>
        </div>
        {collection.length ? (
          <ul className="eventFeed">
            {collection.slice(0, 30).map((track) => (
              <li key={track.id} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="eventSummary">{track.title} — {track.artist}</span>
                  <button type="button" className="textBtn" onClick={() => onRemoveTrack(track.id)}>Remove</button>
                </div>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>{track.id}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted">No tracks in this agent collection yet.</p>
        )}
      </div>

      <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
        <div className="cardHeaderRow">
          <span className="cardLabel">Art Gallery ({gallery.length})</span>
          <button type="button" className="textBtn" onClick={onIngestGalleryImage}>Ingest Image</button>
        </div>
        {gallery.length ? (
          <ul className="eventFeed">
            {gallery.slice(0, 20).map((img) => (
              <li key={img.id || img.relPath} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                {img?.url ? (
                  <img
                    src={`${API}${img.url}`}
                    alt={img.title || img.fileName || 'gallery image'}
                    className="galleryThumb"
                  />
                ) : null}
                <span className="eventSummary">{img.title || img.fileName || 'Untitled image'}</span>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>
                  {(img.tags || []).slice(0, 4).join(', ') || 'no tags'} · {new Date(img.createdAt || Date.now()).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted">No art-gallery images yet.</p>
        )}
      </div>

      <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
        <div className="cardHeaderRow">
          <span className="cardLabel">Play History ({history.length})</span>
        </div>
        {history.length ? (
          <ul className="eventFeed">
            {history.slice(0, 20).map((item, idx) => (
              <li key={`${item.trackId}-${item.playedAt}-${idx}`} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="eventSummary">{item.title || item.trackId} — {item.artist || 'Unknown artist'}</span>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>
                  {new Date(item.playedAt || Date.now()).toLocaleString()} · {item.reason || 'unknown'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted">No play history yet.</p>
        )}
      </div>

      {editMode ? (
        <div className={`card ${isTyler6 ? 'tyler6SectionCard' : ''}`}>
          <button type="button" className="profileSaveBtn" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save Profile'}
          </button>
          {saveError ? <p className="cardMuted" style={{ color: '#ff9cba', marginTop: 8 }}>{saveError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function HistoryLabTab({ agents, selectedAgentId, onSelectAgent, entries, onRefresh }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [trackFilter, setTrackFilter] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [statsEvents, setStatsEvents] = useState([])
  const [statsMetrics, setStatsMetrics] = useState(null)
  const [statsActionCountsRaw, setStatsActionCountsRaw] = useState({})
  const [statsHourBucketsRaw, setStatsHourBucketsRaw] = useState([])
  const [statsResonance, setStatsResonance] = useState({ delta: 0, components: {} })

  const reasonOptions = useMemo(() => {
    const set = new Set(entries.map((e) => String(e.reason || 'unknown')))
    return ['all', ...Array.from(set).sort()]
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const ts = new Date(e.playedAt || 0).getTime()
      if (fromDate) {
        const fromTs = new Date(`${fromDate}T00:00:00`).getTime()
        if (!Number.isFinite(ts) || ts < fromTs) return false
      }
      if (toDate) {
        const toTs = new Date(`${toDate}T23:59:59`).getTime()
        if (!Number.isFinite(ts) || ts > toTs) return false
      }
      if (reasonFilter !== 'all' && String(e.reason || 'unknown') !== reasonFilter) return false
      const tf = trackFilter.trim().toLowerCase()
      if (tf) {
        const hay = `${e.trackId || ''} ${e.title || ''} ${e.artist || ''}`.toLowerCase()
        if (!hay.includes(tf)) return false
      }
      return true
    })
  }, [entries, fromDate, toDate, reasonFilter, trackFilter])

  const countsByReason = useMemo(() => {
    const acc = {}
    for (const e of filtered) {
      const r = String(e.reason || 'unknown')
      acc[r] = (acc[r] || 0) + 1
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const statsKinds = useMemo(
    () => [
      'song.play.start',
      'song.play.end',
      'song.pause',
      'song.resume',
      'song.skip',
      'song.mute',
      'song.unmute',
      'song.volume.change',
      'song.seek',
      'song.favorite',
      'song.dislike',
    ],
    []
  )

  const statsActionCounts = useMemo(() => {
    const rawPairs = Object.entries(statsActionCountsRaw || {})
    if (rawPairs.length) return rawPairs.sort((a, b) => b[1] - a[1])
    const acc = {}
    for (const e of statsEvents) {
      const k = String(e.kind || 'unknown')
      acc[k] = (acc[k] || 0) + 1
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [statsEvents, statsActionCountsRaw])

  const statsHourMap = useMemo(() => {
    if (Array.isArray(statsHourBucketsRaw) && statsHourBucketsRaw.length === 24) {
      return statsHourBucketsRaw.map((count, hour) => ({ hour, count: Number(count) || 0 }))
    }
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    for (const e of statsEvents) {
      const ts = new Date(e.ts || 0)
      const h = ts.getHours()
      if (Number.isFinite(h) && h >= 0 && h <= 23) buckets[h].count += 1
    }
    return buckets
  }, [statsEvents, statsHourBucketsRaw])

  const statsRecentTracks = useMemo(() => {
    const map = new Map()
    for (const e of statsEvents) {
      const id = String(e.trackId || '').trim()
      if (!id) continue
      const row = map.get(id) || { trackId: id, count: 0, kinds: new Set() }
      row.count += 1
      row.kinds.add(String(e.kind || 'unknown'))
      map.set(id, row)
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((row) => ({ ...row, kinds: Array.from(row.kinds).slice(0, 3) }))
  }, [statsEvents])

  async function refreshStatsLab() {
    if (!selectedAgentId) return
    try {
      setStatsLoading(true)
      setStatsError('')
      const payload = await loadStatsLab(selectedAgentId, {
        from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
        kinds: statsKinds,
        limit: 2000,
      })
      setStatsEvents(Array.isArray(payload?.events) ? payload.events : [])
      setStatsMetrics(payload?.metrics || null)
      setStatsActionCountsRaw(payload?.actionCounts && typeof payload.actionCounts === 'object' ? payload.actionCounts : {})
      setStatsHourBucketsRaw(Array.isArray(payload?.hourBuckets) ? payload.hourBuckets : [])
      setStatsResonance(payload?.resonance || { delta: 0, components: {} })
    } catch (err) {
      setStatsError(err.message || 'Failed to load stats lab data')
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    refreshStatsLab()
  }, [selectedAgentId, fromDate, toDate])

  return (
    <div className="tabScreen">
      <div className="card">
        <div className="cardHeaderRow">
          <span className="cardLabel">History Lab</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="textBtn" onClick={onRefresh}>Refresh History</button>
            <button type="button" className="textBtn" onClick={refreshStatsLab} disabled={statsLoading}>Refresh Stats</button>
          </div>
        </div>
        <label className="profileFieldLabel">Agent</label>
        <select className="profileTextInput" value={selectedAgentId || ''} onChange={(e) => onSelectAgent(e.target.value)}>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <div className="profileActionsRow" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="profileFieldLabel">From</label>
            <input className="profileTextInput" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="profileFieldLabel">To</label>
            <input className="profileTextInput" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Reason</label>
        <select className="profileTextInput" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          {reasonOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Track/Artist Filter</label>
        <input
          className="profileTextInput"
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          placeholder="track id, title, artist"
        />
      </div>

      <div className="card">
        <span className="cardLabel">Summary</span>
        <div className="profileStatsGrid" style={{ marginTop: 10 }}>
          <div><span className="profileStatLabel">Visible events</span><strong>{filtered.length}</strong></div>
          <div><span className="profileStatLabel">Reasons</span><strong>{countsByReason.length}</strong></div>
          <div><span className="profileStatLabel">Telemetry events</span><strong>{statsEvents.length}</strong></div>
          <div><span className="profileStatLabel">Starts / Ends</span><strong>{statsMetrics?.starts || 0} / {statsMetrics?.ends || 0}</strong></div>
          <div><span className="profileStatLabel">Skip ratio</span><strong>{Math.round((statsMetrics?.skipRatio || 0) * 100)}%</strong></div>
          <div><span className="profileStatLabel">Playtime</span><strong>{formatDuration(statsMetrics?.playtimeSec || 0)}</strong></div>
          <div><span className="profileStatLabel">Mutes / Unmutes</span><strong>{statsMetrics?.mutes || 0} / {statsMetrics?.unmutes || 0}</strong></div>
          <div><span className="profileStatLabel">Volume Thrash</span><strong>{statsMetrics?.volumeThrash || 0}</strong></div>
          <div><span className="profileStatLabel">Peak Hour</span><strong>{statsMetrics?.peakHour || '--:--'}</strong></div>
          <div><span className="profileStatLabel">Active Sessions</span><strong>{statsMetrics?.activeSessionCount || 0}</strong></div>
        </div>
        {countsByReason.length ? (
          <ul className="eventFeed" style={{ marginTop: 8 }}>
            {countsByReason.slice(0, 8).map(([reason, count]) => (
              <li key={reason} className="eventItem">
                <span className="eventSummary">{reason}</span>
                <span className="eventTime">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted" style={{ marginTop: 8 }}>No events for current filters.</p>
        )}
      </div>

      <div className="card profilePulseCard">
        <div className="cardHeaderRow">
          <span className="cardLabel">Reward / Punish Engine</span>
          <span className={`agentBadge ${statsResonance?.delta < 0 ? 'resonanceBad' : ''}`}>
            Δ {Number(statsResonance?.delta || 0).toFixed(2)}
          </span>
        </div>
        <div className="profileStatsGrid" style={{ marginTop: 4 }}>
          <div><span className="profileStatLabel">Full Listen Bonus</span><strong>+{Number(statsResonance?.components?.fullListenBonus || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Favorites Bonus</span><strong>+{Number(statsResonance?.components?.favoriteBonus || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Diversity Bonus</span><strong>+{Number(statsResonance?.components?.diversityBonus || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Early Skip Penalty</span><strong>-{Number(statsResonance?.components?.earlySkipPenalty || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Mute Penalty</span><strong>-{Number(statsResonance?.components?.mutePenalty || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Volume Thrash Penalty</span><strong>-{Number(statsResonance?.components?.volumeThrashPenalty || 0).toFixed(1)}</strong></div>
          <div><span className="profileStatLabel">Dislike Penalty</span><strong>-{Number(statsResonance?.components?.dislikePenalty || 0).toFixed(1)}</strong></div>
        </div>
      </div>

      <div className="card">
        <span className="cardLabel">Action Breakdown</span>
        {statsError ? <p className="cardMuted" style={{ color: '#ff9cba' }}>{statsError}</p> : null}
        {statsLoading ? <p className="cardMuted">Loading telemetry…</p> : null}
        {!statsLoading && !statsError && statsActionCounts.length ? (
          <ul className="eventFeed" style={{ marginTop: 8 }}>
            {statsActionCounts.map(([kind, count]) => (
              <li key={kind} className="eventItem">
                <span className="eventSummary">{kind}</span>
                <span className="eventTime">{count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="card">
        <span className="cardLabel">Hour Heatmap (event density)</span>
        <div className="hourHeatmapRow">
          {statsHourMap.map((row) => {
            const max = Math.max(1, ...statsHourMap.map((x) => x.count))
            const pct = row.count / max
            return (
              <div key={row.hour} className="hourHeatCell" title={`${String(row.hour).padStart(2, '0')}:00 — ${row.count}`}>
                <div className="hourHeatFill" style={{ opacity: Math.max(0.08, pct), height: `${Math.max(8, Math.round(36 * pct))}px` }} />
                <span className="hourHeatLabel">{String(row.hour).padStart(2, '0')}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <span className="cardLabel">Top Active Tracks (telemetry)</span>
        {statsRecentTracks.length ? (
          <ul className="eventFeed" style={{ marginTop: 8 }}>
            {statsRecentTracks.map((row) => (
              <li key={row.trackId} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="eventSummary">{row.trackId} · {row.count} events</span>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>{row.kinds.join(', ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted" style={{ marginTop: 8 }}>No telemetry track activity yet.</p>
        )}
      </div>

      <div className="card">
        <span className="cardLabel">Timeline</span>
        {filtered.length ? (
          <ul className="eventFeed" style={{ marginTop: 8 }}>
            {filtered.slice(0, 200).map((e, idx) => (
              <li key={`${e.trackId}-${e.playedAt}-${idx}`} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="eventSummary">{e.title || e.trackId} — {e.artist || 'Unknown artist'}</span>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>
                  {new Date(e.playedAt || Date.now()).toLocaleString()} · {e.reason || 'unknown'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted" style={{ marginTop: 8 }}>No history yet.</p>
        )}
      </div>

      <div className="card">
        <div className="cardHeaderRow">
          <span className="cardLabel">Telemetry Timeline</span>
        </div>
        {statsEvents.length ? (
          <ul className="eventFeed" style={{ marginTop: 8 }}>
            {statsEvents.slice(0, 250).map((e, idx) => (
              <li key={`${e.eventId || e.ts}-${idx}`} className="eventItem" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="eventSummary">{e.kind} · {e.trackId || 'no-track'} · v:{e.volume ?? '-'} {e.muted === true ? 'muted' : e.muted === false ? 'unmuted' : ''}</span>
                <span className="eventTime" style={{ alignSelf: 'flex-start' }}>
                  {new Date(e.ts || Date.now()).toLocaleString()} · {e.reason || 'n/a'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cardMuted" style={{ marginTop: 8 }}>No telemetry yet for this agent/range.</p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab: More
// ============================================================
function MoreTab({
  state,
  act,
  networkPanel,
  imageSettings,
  imageBusy,
  imageError,
  imageMessage,
  onImageSettingsChange,
  onSaveImageSettings,
  onTestImageSettings,
  onGenerateAvatar,
  profileAgentId,
  updateChannel = 'stable',
  onUpdateChannelChange,
  updateInfo,
  updateBusy,
  updateError,
  updateMessage,
  onCheckUpdate,
  onOpenUpdate,
  updateAdminForm,
  onUpdateAdminFormChange,
  onSaveUpdateAdmin,
  motionMode = 'medium',
  onMotionModeChange,
  musicSettings,
  musicCacheStats,
  musicBusy,
  musicError,
  musicMessage,
  onMusicSettingsChange,
  onSaveMusicSettings,
  onWarmMusicCache,
  onClearMusicCache,
  onRotateMusicTracks,
}) {
  if (!state) return null
  return (
    <div className="tabScreen">
      <div className="card settingsCard">
        <span className="cardLabel">Notifications</span>
        <p className="cardMuted">Choose which fleet signals should surface here.</p>
        <div className="prefsList">
          {Object.entries(state.preferences.notify).map(([key, val]) => (
            <label key={key} className="prefItem">
              <span>{key}</span>
              <input type="checkbox" checked={val}
                onChange={e => act('preferences', { notify: { [key]: e.target.checked } })} />
            </label>
          ))}
        </div>
      </div>

      <div className="card settingsCard" style={{ marginTop: 12 }}>
        <span className="cardLabel">Identity Generation</span>

        <label className="profileFieldLabel">Provider</label>
        <select
          className="profileTextInput"
          value={imageSettings?.provider || 'disabled'}
          onChange={(e) => onImageSettingsChange({ provider: e.target.value })}
        >
          <option value="disabled">disabled</option>
          <option value="local">local</option>
          <option value="openai">openai</option>
          <option value="fal">fal</option>
        </select>

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Local endpoint</label>
        <input
          className="profileTextInput"
          value={imageSettings?.local?.endpoint || ''}
          onChange={(e) => onImageSettingsChange({ local: { endpoint: e.target.value } })}
          placeholder="http://100.110.224.126:8188"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Local model</label>
        <input
          className="profileTextInput"
          value={imageSettings?.local?.model || ''}
          onChange={(e) => onImageSettingsChange({ local: { model: e.target.value } })}
          placeholder="sdxl"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>OpenAI API key</label>
        <input
          className="profileTextInput"
          type="password"
          value={imageSettings?.openai?.apiKey || ''}
          onChange={(e) => onImageSettingsChange({ openai: { apiKey: e.target.value } })}
          placeholder="sk-..."
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>OpenAI model</label>
        <input
          className="profileTextInput"
          value={imageSettings?.openai?.model || 'gpt-image-1'}
          onChange={(e) => onImageSettingsChange({ openai: { model: e.target.value } })}
          placeholder="gpt-image-1"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>FAL API key</label>
        <input
          className="profileTextInput"
          type="password"
          value={imageSettings?.fal?.apiKey || ''}
          onChange={(e) => onImageSettingsChange({ fal: { apiKey: e.target.value } })}
          placeholder="fal_..."
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>FAL model</label>
        <input
          className="profileTextInput"
          value={imageSettings?.fal?.model || 'fal-ai/nano-banana'}
          onChange={(e) => onImageSettingsChange({ fal: { model: e.target.value } })}
          placeholder="fal-ai/nano-banana"
        />

        <div className="profileActionsRow">
          <button type="button" className="profileBtn" disabled={imageBusy} onClick={onSaveImageSettings}>Save</button>
          <button type="button" className="profileBtn" disabled={imageBusy} onClick={onTestImageSettings}>Test</button>
          <button
            type="button"
            className="profileBtn"
            disabled={imageBusy || !profileAgentId}
            onClick={onGenerateAvatar}
          >
            Generate Avatar
          </button>
        </div>
        {imageMessage ? <p className="cardMuted" style={{ color: '#8effcb', marginTop: 8 }}>{imageMessage}</p> : null}
        {imageError ? <p className="cardMuted" style={{ color: '#ff9cba', marginTop: 8 }}>{imageError}</p> : null}
      </div>

      <div className="card settingsCard" style={{ marginTop: 12 }}>
        <span className="cardLabel">Mobile Update</span>
        <p className="cardMuted">Check update manifest, inspect version delta, then install the latest APK.</p>

        <label className="profileFieldLabel">Channel</label>
        <select
          className="profileTextInput"
          value={updateChannel}
          onChange={(e) => onUpdateChannelChange?.(e.target.value)}
        >
          <option value="stable">stable</option>
          <option value="beta">beta</option>
        </select>

        <div className="profileActionsRow">
          <button type="button" className="profileBtn" disabled={updateBusy} onClick={onCheckUpdate}>Check for update</button>
          <button
            type="button"
            className="profileBtn"
            disabled={updateBusy || !updateInfo?.latest?.apkUrl || !updateInfo?.update?.available}
            onClick={onOpenUpdate}
          >
            Install APK
          </button>
        </div>

        {updateInfo ? (
          <div className="updateInfoBox">
            <div className="updateInfoRow">
              <span>Current</span>
              <strong>{updateInfo?.current?.versionName || '1.0'} ({updateInfo?.current?.versionCode || 1})</strong>
            </div>
            <div className="updateInfoRow">
              <span>Latest</span>
              <strong>{updateInfo?.latest?.versionName || '1.0'} ({updateInfo?.latest?.versionCode || 1})</strong>
            </div>
            <div className="updateInfoRow">
              <span>Status</span>
              <strong>{updateInfo?.update?.available ? (updateInfo?.update?.mandatory ? 'mandatory update' : 'update available') : 'up to date'}</strong>
            </div>
            {updateInfo?.latest?.notes ? <p className="cardMuted" style={{ marginTop: 8 }}>{updateInfo.latest.notes}</p> : null}
          </div>
        ) : null}

        <label className="profileFieldLabel" style={{ marginTop: 12 }}>Latest version name</label>
        <input
          className="profileTextInput"
          value={updateAdminForm?.versionName || ''}
          onChange={(e) => onUpdateAdminFormChange?.({ versionName: e.target.value })}
          placeholder="1.0"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Latest version code</label>
        <input
          className="profileTextInput"
          type="number"
          min="1"
          value={Number(updateAdminForm?.versionCode) || 1}
          onChange={(e) => onUpdateAdminFormChange?.({ versionCode: Math.max(1, Number(e.target.value) || 1) })}
          placeholder="1"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Minimum supported version code</label>
        <input
          className="profileTextInput"
          type="number"
          min="1"
          value={Number(updateAdminForm?.minVersionCode) || 1}
          onChange={(e) => onUpdateAdminFormChange?.({ minVersionCode: Math.max(1, Number(e.target.value) || 1) })}
          placeholder="1"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>APK URL</label>
        <input
          className="profileTextInput"
          value={updateAdminForm?.apkUrl || ''}
          onChange={(e) => onUpdateAdminFormChange?.({ apkUrl: e.target.value })}
          placeholder="https://.../app-debug.apk"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>SHA256</label>
        <input
          className="profileTextInput"
          value={updateAdminForm?.sha256 || ''}
          onChange={(e) => onUpdateAdminFormChange?.({ sha256: e.target.value })}
          placeholder="64-char hex"
        />

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Release notes</label>
        <textarea
          className="profileTextInput profileTextarea"
          value={updateAdminForm?.notes || ''}
          onChange={(e) => onUpdateAdminFormChange?.({ notes: e.target.value })}
          placeholder="Release notes"
        />

        <label className="prefItem" style={{ marginTop: 8 }}>
          <span>Mandatory update</span>
          <input
            type="checkbox"
            checked={Boolean(updateAdminForm?.mandatory)}
            onChange={(e) => onUpdateAdminFormChange?.({ mandatory: e.target.checked })}
          />
        </label>

        <div className="profileActionsRow">
          <button type="button" className="profileBtn" disabled={updateBusy} onClick={onSaveUpdateAdmin}>Publish update lane</button>
        </div>

        {updateMessage ? <p className="cardMuted" style={{ color: '#8effcb', marginTop: 8 }}>{updateMessage}</p> : null}
        {updateError ? <p className="cardMuted" style={{ color: '#ff9cba', marginTop: 8 }}>{updateError}</p> : null}
      </div>

      <div className="card settingsCard" style={{ marginTop: 12 }}>
        <span className="cardLabel">Visual Motion</span>
        <p className="cardMuted">Set interface animation intensity. Dynamic auto-adapts to context and performance.</p>
        <select
          className="profileTextInput"
          value={motionMode}
          onChange={(e) => onMotionModeChange?.(e.target.value)}
        >
          <option value="off">off</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="dynamic">dynamic</option>
        </select>
      </div>

      <div className="card settingsCard" style={{ marginTop: 12 }}>
        <span className="cardLabel">Music Runtime</span>
        <p className="cardMuted">Cache music on device for faster launch and smoother playback.</p>

        <label className="prefItem" style={{ marginTop: 8 }}>
          <span>Always play automatically</span>
          <input
            type="checkbox"
            checked={musicSettings?.alwaysPlay !== false}
            onChange={(e) => onMusicSettingsChange?.({ alwaysPlay: e.target.checked })}
          />
        </label>

        <label className="prefItem" style={{ marginTop: 8 }}>
          <span>Wi‑Fi only playback</span>
          <input
            type="checkbox"
            checked={Boolean(musicSettings?.wifiOnly)}
            onChange={(e) => onMusicSettingsChange?.({ wifiOnly: e.target.checked })}
          />
        </label>

        <label className="profileFieldLabel" style={{ marginTop: 10 }}>Cache limit (GB, default 5)</label>
        <input
          className="profileTextInput"
          type="number"
          min="1"
          max="50"
          value={Math.max(1, Math.round((Number(musicSettings?.cacheMaxBytes) || (5 * 1024 * 1024 * 1024)) / (1024 * 1024 * 1024)))}
          onChange={(e) => {
            const gb = Math.max(1, Math.min(50, Number(e.target.value) || 5))
            onMusicSettingsChange?.({ cacheMaxBytes: gb * 1024 * 1024 * 1024 })
          }}
        />

        <p className="cardMuted" style={{ marginTop: 8 }}>
          Cached files: {Number(musicCacheStats?.count) || 0} · {((Number(musicCacheStats?.bytes) || 0) / (1024 * 1024)).toFixed(1)} MB
        </p>

        <div className="profileActionsRow">
          <button type="button" className="profileBtn" disabled={musicBusy} onClick={onSaveMusicSettings}>Save music settings</button>
          <button type="button" className="profileBtn" disabled={musicBusy} onClick={onWarmMusicCache}>Cache all now</button>
          <button type="button" className="profileBtn" disabled={musicBusy} onClick={onRotateMusicTracks}>Rotate track pool</button>
          <button type="button" className="profileBtn" disabled={musicBusy} onClick={onClearMusicCache}>Clear cache</button>
        </div>

        {musicMessage ? <p className="cardMuted" style={{ color: '#8effcb', marginTop: 8 }}>{musicMessage}</p> : null}
        {musicError ? <p className="cardMuted" style={{ color: '#ff9cba', marginTop: 8 }}>{musicError}</p> : null}
      </div>

      <div className="card settingsCard" style={{ marginTop: 12 }}>
        {networkPanel}
      </div>
    </div>
  )
}

// ============================================================
// Mini Player (docked above tab bar)
// ============================================================
function MiniPlayer({
  tunedAgent,
  track,
  playing,
  progress,
  duration,
  onToggle,
  onNext,
  onSeek,
  onToggleMute,
  onVolumeChange,
  muted,
  volume,
  resumeBanner,
  rotationMode,
  antiRepeatWindow,
  radioMode,
  onRadioModeChange,
  listenerAgents = [],
  listenerAgentIds = [],
  onToggleListenerAgent,
  apiHealthy,
  djEnabled,
  onToggleDj,
  djQueueDepth = 0,
  djDispatchState = 'idle',
  djNowPlaying = '',
}) {
  if (!tunedAgent) return null
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="miniPlayer">
      {resumeBanner ? <div className="resumeChip">↺ {resumeBanner}</div> : null}
      <div className="rotationChipRow">
        <span className="rotationChip">mode: {rotationMode || 'balanced'}</span>
        <span className="rotationChip">anti-repeat: {Number(antiRepeatWindow) || 0}</span>
        <span className="rotationChip">radio: {radioMode === 'listener' ? 'listener' : 'on-air'}</span>
        <span className="rotationChip">health: {apiHealthy ? 'healthy' : 'degraded'}</span>
        <span className="rotationChip">dj: {djEnabled ? `armed · q${Math.max(0, Number(djQueueDepth) || 0)}` : 'off'}</span>
        <span className="rotationChip">dj-dispatch: {djDispatchState}</span>
        {djNowPlaying ? <span className="rotationChip">🎙 {djNowPlaying.slice(0, 64)}</span> : null}
      </div>
      <div className="rotationChipRow" style={{ marginTop: 4 }}>
        <button type="button" className="miniBtn ghost" onClick={() => onRadioModeChange?.(radioMode === 'listener' ? 'on_air' : 'listener')}>
          {radioMode === 'listener' ? '🎧 Listener mode' : '📡 On-air mode'}
        </button>
        <button type="button" className="miniBtn ghost" onClick={() => onToggleDj?.()}>
          {djEnabled ? '🎙 DJ armed' : '🎙 DJ off'}
        </button>
      </div>
      {radioMode === 'listener' && listenerAgents.length ? (
        <div className="rotationChipRow" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {listenerAgents.slice(0, 8).map((agent) => {
            const selected = listenerAgentIds.includes(agent.id)
            return (
              <button
                key={agent.id}
                type="button"
                className="miniBtn ghost"
                onClick={() => onToggleListenerAgent?.(agent.id)}
                style={{ opacity: selected ? 1 : 0.55 }}
              >
                {selected ? '✓' : '○'} {agent.name}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="miniPlayerProgress" onClick={onSeek}>
        <div className="miniPlayerBar" style={{ width: `${pct}%` }} />
      </div>
      <div className="miniPlayerInner">
        <div className="miniPlayerInfo">
          <span className="miniPlayerAgent">{tunedAgent.name}</span>
          {track && <span className="miniPlayerTrack">{track.title}</span>}
        </div>
        <div className="miniPlayerControls">
          <span className="miniPlayerTime">{formatDuration(progress)}</span>
          <button type="button" className="miniBtn ghost" onClick={onToggleMute}>{muted ? '🔇' : '🔊'}</button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            className="miniVolume"
            value={Math.round((Number(volume) || 0) * 100)}
            onChange={(e) => onVolumeChange?.(Number(e.target.value) / 100)}
          />
          <button type="button" className="miniBtn" onClick={onToggle}>{playing ? '⏸' : '▶'}</button>
          <button type="button" className="miniBtn ghost" onClick={onNext}>⏭</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab Bar
// ============================================================
const TABS = [
  { id: 'cockpit',  label: 'Cockpit',  icon: 'cockpit' },
  { id: 'stations', label: 'Stations', icon: 'stations' },
  { id: 'queue',    label: 'Queue',    icon: 'queue' },
  { id: 'agents',   label: 'Agents',   icon: 'agents' },
  { id: 'profile',  label: 'Profile',  icon: 'agents' },
  { id: 'history',  label: 'History',  icon: 'queue' },
  { id: 'more',     label: 'More',     icon: 'more' },
]

function TabBar({ active, onChange }) {
  return (
    <nav className="tabBar">
      {TABS.map(t => (
        <button key={t.id} type="button"
          className={`tabBtn ${active === t.id ? 'tabBtnActive' : ''}`}
          onClick={() => onChange(t.id)}>
          <span className="tabIcon">{Icons[t.icon]}</span>
          <span className="tabLabel">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ============================================================
// Network Panel (from atmosphere system)
// ============================================================
function NetworkPanel() {
  const { ri, isLeader, leaderId, nodes, myNode, connected, connectionState, connect, disconnect } = useAtmosphere()
  const [relayUrl, setRelayUrl] = useState(() => {
    try {
      const saved = localStorage.getItem('vaib-relay-url')
      if (saved && /^wss?:\/\//i.test(saved)) return saved
    } catch {
      // ignore
    }
    return resolveDefaultRelayUrl()
  })
  const statusColor = connectionState === 'connected' ? '#8effcb' : connectionState === 'connecting' ? '#ffe57c' : '#ff9cba'

  useEffect(() => {
    try { localStorage.setItem('vaib-relay-url', relayUrl) } catch {}
  }, [relayUrl])

  function syncPrimeBeacon() {
    const next = resolveDefaultRelayUrl()
    setRelayUrl(next)
    if (connected) {
      disconnect()
      setTimeout(() => connect(next), 120)
      return
    }
    connect(next)
  }

  return (
    <div>
      <span className="cardLabel">Network</span>
      <div className="networkRow" style={{ marginTop: 10 }}>
        <input className="networkInput" value={relayUrl} disabled={connected}
          onChange={e => setRelayUrl(e.target.value)} placeholder="ws://host:port/signal" />
        {connected
          ? <button type="button" className="ghostButton" onClick={disconnect}>Disconnect</button>
          : <button type="button" onClick={() => connect(relayUrl)} disabled={connectionState === 'connecting'}>
              {connectionState === 'connecting' ? '...' : 'Connect'}
            </button>
        }
        <button type="button" className="ghostButton" onClick={syncPrimeBeacon} disabled={connectionState === 'connecting'}>
          Sync Fleet Beacon
        </button>
      </div>
      <div className="networkStatus" style={{ marginTop: 8 }}>
        <span style={{ color: statusColor, fontSize: '0.75rem' }}>● {connectionState}</span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginLeft: 10 }}>RI: {ri.toFixed(2)}</span>
        {isLeader && <span style={{ fontSize: '0.68rem', color: '#ffe57c', marginLeft: 8 }}>LEADER</span>}
      </div>
    </div>
  )
}

// ============================================================
// AppContent
// ============================================================
function AppContent() {
  // ---- Tab ----
  const [tab, setTab] = useState('cockpit')

  // ---- Data ----
  const [state, setState] = useState(null)
  const [agents, setAgents] = useState([])
  const [tunedAgent, setTunedAgent] = useState(null)
  const [tracks, setTracks] = useState([])
  const [agentCollections, setAgentCollections] = useState(() => loadAgentCollections())
  const [agentPlayHistory, setAgentPlayHistory] = useState(() => loadAgentPlayHistory())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [apiHealthy, setApiHealthy] = useState(false)
  const [profileAgentId, setProfileAgentId] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [profileDraft, setProfileDraft] = useState(null)
  const [profileCollection, setProfileCollection] = useState([])
  const [profileHistory, setProfileHistory] = useState([])
  const [profileGallery, setProfileGallery] = useState([])
  const [historyAgentId, setHistoryAgentId] = useState(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')
  const [profileEditMode, setProfileEditMode] = useState(false)
  const [profileBaseline, setProfileBaseline] = useState(null)
  const [imageSettings, setImageSettings] = useState(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageMessage, setImageMessage] = useState('')
  const [musicSettings, setMusicSettings] = useState({ cacheEnabled: true, cacheMaxBytes: 5 * 1024 * 1024 * 1024, alwaysPlay: true, wifiOnly: false })
  const [musicCacheStats, setMusicCacheStats] = useState({ count: 0, bytes: 0 })
  const [musicBusy, setMusicBusy] = useState(false)
  const [musicError, setMusicError] = useState('')
  const [musicMessage, setMusicMessage] = useState('')
  const [updateChannel, setUpdateChannel] = useState('stable')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateAdminForm, setUpdateAdminForm] = useState({
    versionName: '1.0',
    versionCode: 1,
    minVersionCode: 1,
    mandatory: false,
    notes: '',
    apkUrl: '',
    sha256: '',
  })
  const [pinnedProfileAgentId, setPinnedProfileAgentId] = useState(() => loadPinnedProfileAgent())
  const [motionMode, setMotionMode] = useState(() => loadMotionMode())
  const [radioMode, setRadioMode] = useState(() => loadRadioMode())
  const [listenerAgentIds, setListenerAgentIds] = useState(() => loadListenerAgentIds())
  const [djEnabled, setDjEnabled] = useState(() => loadDjEnabled())
  const [djQueue, setDjQueue] = useState(() => loadDjQueue())
  const [djDispatchState, setDjDispatchState] = useState('idle')
  const [djNowPlaying, setDjNowPlaying] = useState('')
  const [starReason, setStarReason] = useState('')
  const [resumeBanner, setResumeBanner] = useState('')
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false)
  const [profileSwitcherQuery, setProfileSwitcherQuery] = useState('')
  const [profileSwitcherHighlight, setProfileSwitcherHighlight] = useState(0)

  const sessionIdRef = useRef(`sess_${Math.random().toString(36).slice(2, 10)}`)
  const lastUpdateCheckRef = useRef(0)

  const starAgentMeta = useMemo(() => computeStarAgent(agents, agentPlayHistory), [agents, agentPlayHistory])
  const starAgentId = starAgentMeta?.agent?.id || ''

  const selectableAgents = useMemo(
    () => (agents || []).filter((a) => a?.id),
    [agents],
  )

  const effectiveListenerAgentIds = useMemo(() => {
    const valid = new Set(selectableAgents.map((a) => a.id))
    const ids = (listenerAgentIds || []).filter((id) => valid.has(id))
    return ids.length ? ids : selectableAgents.filter((a) => a.active).map((a) => a.id)
  }, [listenerAgentIds, selectableAgents])

  const effectiveRadioAgents = useMemo(() => {
    if (radioMode === 'listener') {
      const allow = new Set(effectiveListenerAgentIds)
      return selectableAgents.filter((a) => allow.has(a.id))
    }
    return selectableAgents.filter((a) => a.active)
  }, [radioMode, effectiveListenerAgentIds, selectableAgents])

  const headerAgents = useMemo(() => {
    return [...(agents || [])]
      .filter((a) => a?.id)
      .sort((a, b) => {
        if (Boolean(b.active) !== Boolean(a.active)) return Number(b.active) - Number(a.active)
        return String(a.name || a.id).localeCompare(String(b.name || b.id))
      })
      .slice(0, 24)
  }, [agents])

  const headerFilteredAgents = useMemo(() => {
    const q = profileSwitcherQuery.trim().toLowerCase()
    if (!q) return headerAgents
    return headerAgents.filter((a) => {
      const name = String(a.name || '').toLowerCase()
      const role = String(a.role || '').toLowerCase()
      const id = String(a.id || '').toLowerCase()
      return name.includes(q) || role.includes(q) || id.includes(q)
    })
  }, [headerAgents, profileSwitcherQuery])

  // ---- Player ----
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const analyserRef = useRef(null)
  const [analyser, setAnalyser] = useState(null)
  const autoPlayRef = useRef(false)
  const musicAutoStartedRef = useRef(false)
  const audioStartedRef = useRef(false)
  const resumeRef = useRef(loadPlaybackResume())
  const pendingSeekRef = useRef(0)
  const lastPersistSecondRef = useRef(-1)
  const lastAirtimeSwitchRef = useRef(0)
  const agentRotationCursorRef = useRef(0)
  const djInterludeActiveRef = useRef(false)
  const profileSwitcherRef = useRef(null)

  // ---- Atmosphere ----
  const { ri, parameters } = useAtmosphere()

  const agentTrackPool = useMemo(() => {
    if (!tunedAgent?.id) return []
    const ownCollection = Object.values(agentCollections?.[tunedAgent.id] || {})
      .map((t) => normalizeTrackForCollection(t))
      .filter(Boolean)
    if (ownCollection.length) return ownCollection
    return (tracks || []).map((t) => normalizeTrackForCollection(t)).filter(Boolean)
  }, [tracks, agentCollections, tunedAgent?.id])

  const tunedIdentity = useMemo(() => {
    if (!tunedAgent?.id) return null
    if (profileAgentId === tunedAgent.id && profileDraft?.profile) return profileDraft.profile
    return state?.agents?.[tunedAgent.id]?.identity || null
  }, [tunedAgent?.id, profileAgentId, profileDraft?.profile, state?.agents])

  const profileRotationMode = tunedIdentity?.rotationMode || 'balanced'
  const profileAntiRepeatWindow = Number(tunedIdentity?.antiRepeatWindow) || 3

  // Computed per-agent track list (each agent rotates their own collection)
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = Math.max(0, Math.min(1, Number(volume) || 0))
    el.muted = Boolean(muted)
  }, [volume, muted])

  function emitTelemetry(kind, payload = {}) {
    if (!tunedAgent?.id) return
    const context = {
      tab,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...(payload.context || {}),
    }
    appendTelemetry({
      agentId: tunedAgent.id,
      kind,
      trackId: payload.trackId ?? currentTrack?.id ?? null,
      sessionId: sessionIdRef.current,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
      volume: payload.volume,
      muted: payload.muted,
      reason: payload.reason || null,
      context,
    }).catch(() => {})
  }

  const agentTracks = useMemo(
    () => tunedAgent && agentTrackPool.length
      ? buildRotationQueue({
          pool: agentTrackPool,
          mode: profileRotationMode,
          favorites: tunedIdentity?.favoriteSongs || [],
          history: agentPlayHistory?.[tunedAgent.id] || [],
          antiRepeatWindow: profileAntiRepeatWindow,
          seed: tunedAgent.id,
          playlistNudge: tunedIdentity?.playlistNudge || null,
        })
      : [],
    [agentTrackPool, tunedAgent?.id, profileRotationMode, profileAntiRepeatWindow, tunedIdentity?.favoriteSongs, tunedIdentity?.playlistNudge, agentPlayHistory]
  )

  useEffect(() => {
    saveAgentCollections(agentCollections)
  }, [agentCollections])

  useEffect(() => {
    saveAgentPlayHistory(agentPlayHistory)
  }, [agentPlayHistory])

  useEffect(() => {
    savePinnedProfileAgent(pinnedProfileAgentId)
  }, [pinnedProfileAgentId])

  useEffect(() => {
    saveMotionMode(motionMode)
  }, [motionMode])

  useEffect(() => {
    saveRadioMode(radioMode)
  }, [radioMode])

  useEffect(() => {
    saveListenerAgentIds(listenerAgentIds)
  }, [listenerAgentIds])

  useEffect(() => {
    saveDjEnabled(djEnabled)
  }, [djEnabled])

  useEffect(() => {
    saveDjQueue(djQueue)
  }, [djQueue])

  useEffect(() => {
    if (!apiHealthy || !djEnabled || !djQueue.length) return
    let cancelled = false
    const dispatch = async () => {
      const slot = djQueue[0]
      if (!slot) return
      setDjDispatchState('dispatching')
      try {
        await enqueueDjSlot(slot)
        if (cancelled) return
        setDjQueue((prev) => prev.slice(1))
        setDjDispatchState('ok')
      } catch {
        if (cancelled) return
        setDjDispatchState('offline_fallback')
      }
    }
    dispatch()
    return () => { cancelled = true }
  }, [apiHealthy, djEnabled, djQueue])

  useEffect(() => {
    if (!profileAgentId) return
    setProfileCollection(Object.values(agentCollections?.[profileAgentId] || {}))
    setProfileHistory(Array.isArray(agentPlayHistory?.[profileAgentId]) ? agentPlayHistory[profileAgentId] : [])
  }, [profileAgentId, agentCollections, agentPlayHistory])

  useEffect(() => {
    const reason = starAgentMeta?.reason || ''
    setStarReason(reason)
  }, [starAgentMeta?.reason])

  useEffect(() => {
    if (!agents.length || profileAgentId) return
    const preferred = pinnedProfileAgentId && agents.some((a) => a.id === pinnedProfileAgentId)
      ? pinnedProfileAgentId
      : starAgentId
    if (preferred) openProfile(preferred)
  }, [agents, profileAgentId, pinnedProfileAgentId, starAgentId])

  useEffect(() => {
    if (!profileSwitcherOpen) return
    const onPointerDown = (event) => {
      const host = profileSwitcherRef.current
      if (!host) return
      if (!host.contains(event.target)) {
        setProfileSwitcherOpen(false)
        setProfileSwitcherQuery('')
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileSwitcherOpen(false)
        setProfileSwitcherQuery('')
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [profileSwitcherOpen])

  useEffect(() => {
    if (!profileSwitcherOpen) return
    setProfileSwitcherHighlight(0)
  }, [profileSwitcherOpen, profileSwitcherQuery])

  const tuneToAgentById = useCallback((agentId) => {
    const pick = (agents || []).find((a) => a.id === agentId)
    if (!pick) return false
    autoPlayRef.current = true
    pendingSeekRef.current = 0
    setTunedAgent(pick)
    setPlaying(true)
    return true
  }, [agents])

  useEffect(() => {
    if (!effectiveRadioAgents.length) return
    if (tunedAgent && effectiveRadioAgents.some((a) => a.id === tunedAgent.id)) return
    const next = effectiveRadioAgents[0]
    if (next) tuneToAgentById(next.id)
  }, [effectiveRadioAgents, tunedAgent?.id, tuneToAgentById])

  useEffect(() => {
    if (motionMode !== 'dynamic') return

    const prefersReduced = typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      : false
    const hidden = typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false

    let target = 'medium'
    if (prefersReduced) target = 'off'
    else if (hidden) target = 'low'
    else if (playing) target = 'high'

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-motion-dynamic', target)
    }
  }, [motionMode, playing, tab])

  // Reset player when agent changes
  useEffect(() => {
    setTrackIndex(0); setProgress(0); setDuration(0); setPlaying(false)
    pendingSeekRef.current = 0
    lastPersistSecondRef.current = -1
  }, [tunedAgent?.id])

  // Audio element wiring
  const currentTrack = agentTracks[trackIndex] || null

  useEffect(() => {
    const el = audioRef.current
    if (!el || !currentTrack) return
    const resolvedUrl = resolveTrackAudioUrl(currentTrack.audioUrl)
    el.src = resolvedUrl
    if (!musicAutoStartedRef.current && musicSettings?.alwaysPlay !== false) {
      musicAutoStartedRef.current = true
      setPlaying(true)
      autoPlayRef.current = true
    }
    // Auto-play: use the audio element directly — no AudioContext here.
    // AudioContext (analyser) requires a user gesture; audio element playback does not
    // when setMediaPlaybackRequiresUserGesture(false) is set in Android.
    if (playing || autoPlayRef.current) {
      if (musicSettings?.wifiOnly && !isOnWifiConnection()) {
        setPlaying(false)
        autoPlayRef.current = false
        setMusicError('Wi‑Fi only mode is enabled. Connect to Wi‑Fi to auto-play music.')
        return
      }
      el.play().then(() => {
        setPlaying(true)
        autoPlayRef.current = false
        setMusicError('')
      }).catch((err) => {
        setMusicError(`Playback blocked: ${err?.message || 'unknown error'}`)
      })
    }
  }, [trackIndex, currentTrack, musicSettings?.alwaysPlay, musicSettings?.wifiOnly, playing])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      setProgress(el.currentTime)
      if (!tunedAgent || !currentTrack) return
      const sec = Math.floor(el.currentTime || 0)
      if (sec === lastPersistSecondRef.current) return
      lastPersistSecondRef.current = sec
      savePlaybackResume({
        agentId: tunedAgent.id,
        trackId: currentTrack.id,
        positionSec: sec,
        playing: !el.paused,
      })
    }
    const onMeta = () => {
      setDuration(el.duration)
      if (pendingSeekRef.current > 0 && Number.isFinite(el.duration)) {
        const safeSeek = Math.max(0, Math.min(pendingSeekRef.current, Math.max(0, el.duration - 1)))
        el.currentTime = safeSeek
        setProgress(safeSeek)
        pendingSeekRef.current = 0
      }
      emitTelemetry('song.play.start', {
        positionSec: Math.floor(el.currentTime || 0),
        durationSec: Math.floor(el.duration || 0),
        volume,
        muted,
        reason: 'track_loaded',
      })
    }
    const onEnd = () => { nextTrack('track_ended') }
    const onError = () => {
      const err = el?.error
      const code = err?.code ? ` (code ${err.code})` : ''
      setMusicError(`Track failed to load${code}`)
      nextTrack('track_error_skip')
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('error', onError)
    }
  }, [agentTracks, tunedAgent?.id, currentTrack?.id, volume, muted, tab])

  const computeAirtimeSliceSec = useCallback((agent) => {
    if (!agent) return 75
    const historyLen = Array.isArray(agentPlayHistory?.[agent.id]) ? agentPlayHistory[agent.id].length : 0
    const recencyMs = Date.parse(agent?.updatedAt || agent?.lastSeenAt || '')
    const freshBonus = Number.isFinite(recencyMs) && (Date.now() - recencyMs) < 10 * 60 * 1000 ? 20 : 0
    const activeBonus = agent?.active ? 25 : 0
    const historyBonus = Math.min(20, Math.floor(historyLen / 20))
    return Math.max(35, Math.min(140, 50 + freshBonus + activeBonus + historyBonus))
  }, [agentPlayHistory])

  useEffect(() => {
    const t = setInterval(() => {
      const el = audioRef.current
      if (!el) return

      // Always-on: if healthy and we have content, keep radio alive.
      if (musicSettings?.alwaysPlay !== false && apiHealthy && tunedAgent && currentTrack && !playing) {
        autoPlayRef.current = true
        setPlaying(true)
        el.play().catch(() => {})
      }

      // Airtime slicing for ON AIR mode.
      if (radioMode !== 'on_air' || !apiHealthy || !tunedAgent || !currentTrack) return
      if (effectiveRadioAgents.length <= 1) return
      const now = Date.now()
      if (now - lastAirtimeSwitchRef.current < 12000) return

      const currentSec = Number(el.currentTime || progress || 0)
      const sliceSec = computeAirtimeSliceSec(tunedAgent)
      if (currentSec >= sliceSec) {
        lastAirtimeSwitchRef.current = now
        nextTrack('airtime_slice')
      }
    }, 3000)
    return () => clearInterval(t)
  }, [
    apiHealthy,
    tunedAgent,
    currentTrack,
    playing,
    progress,
    radioMode,
    effectiveRadioAgents.length,
    computeAirtimeSliceSec,
    musicSettings?.alwaysPlay,
  ])

  // Analyser init — call only after a user gesture; AudioContext needs it
  const initAnalyser = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaElementSource(audioRef.current)
      const node = ctx.createAnalyser()
      node.fftSize = 1024
      src.connect(node); node.connect(ctx.destination)
      analyserRef.current = node; setAnalyser(node)
    } catch (e) {}
  }, [])

  // First gesture: start ambient audio + init analyser for visualizer
  const handleGesture = useCallback(() => {
    if (!audioStartedRef.current) { startAudioAtmosphere(); audioStartedRef.current = true }
    initAnalyser()
  }, [initAnalyser])

  useEffect(() => {
    if (audioStartedRef.current) updateAudioAtmosphere(ri, parameters)
  }, [ri, parameters])

  useEffect(() => () => { if (audioStartedRef.current) stopAudioAtmosphere() }, [])

  const rotateToNextRadioAgent = useCallback(() => {
    const list = effectiveRadioAgents
    if (!list.length) return false
    const currentIdx = list.findIndex((a) => a.id === tunedAgent?.id)
    const nextIdx = currentIdx >= 0
      ? (currentIdx + 1) % list.length
      : (agentRotationCursorRef.current % list.length)
    agentRotationCursorRef.current = (nextIdx + 1) % list.length
    return tuneToAgentById(list[nextIdx].id)
  }, [effectiveRadioAgents, tunedAgent?.id, tuneToAgentById])

  // Player controls
  function tuneAndPlay(agent) {
    autoPlayRef.current = true
    pendingSeekRef.current = 0
    setTunedAgent(agent)
    savePlaybackResume({
      agentId: agent.id,
      trackId: null,
      positionSec: 0,
      playing: true,
    })
  }

  function togglePlay() {
    const el = audioRef.current; if (!el) return
    initAnalyser() // safe to call; no-ops if already initialized or gesture not yet given
    if (playing) {
      el.pause()
      setPlaying(false)
      emitTelemetry('song.pause', {
        positionSec: Math.floor(el.currentTime || 0),
        durationSec: Math.floor(el.duration || duration || 0),
        volume,
        muted,
        reason: 'user_toggle',
      })
    } else {
      if (musicSettings?.wifiOnly && !isOnWifiConnection()) {
        setMusicError('Wi‑Fi only mode is enabled. Connect to Wi‑Fi to play music.')
        return
      }
      el.play().catch(() => {})
      setPlaying(true)
      setMusicError('')
      emitTelemetry('song.resume', {
        positionSec: Math.floor(el.currentTime || 0),
        durationSec: Math.floor(el.duration || duration || 0),
        volume,
        muted,
        reason: 'user_toggle',
      })
    }
  }

  function queueDjSlot(reason = 'transition', nextTrackMeta = null) {
    if (!djEnabled || !tunedAgent) return null
    const slot = {
      id: `dj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: new Date().toISOString(),
      sessionId: sessionIdRef.current,
      reason,
      agentId: tunedAgent.id,
      agentName: tunedAgent.name || tunedAgent.id,
      fromTrackId: currentTrack?.id || null,
      fromTrackTitle: currentTrack?.title || null,
      toTrackId: nextTrackMeta?.id || null,
      toTrackTitle: nextTrackMeta?.title || null,
      scriptHint: `${tunedAgent.name || tunedAgent.id} transition: ${reason.replace(/_/g, ' ')}`,
      provider: 'elevenlabs',
      voiceProfile: 'dark_sentinel',
    }
    setDjQueue((prev) => [...(Array.isArray(prev) ? prev : []), slot].slice(-100))
    return slot
  }

  async function playDjInterlude(slot, onDone) {
    if (!djEnabled || !slot || djInterludeActiveRef.current) {
      onDone?.()
      return
    }

    djInterludeActiveRef.current = true
    const script = String(slot.scriptHint || '').trim() || `${slot.agentName || 'Station'} transition.`
    setDjNowPlaying(script)
    setDjDispatchState('rendering')

    const el = audioRef.current
    const originalVolume = Number(el?.volume ?? volume)
    if (el) {
      try {
        el.volume = Math.max(0.12, originalVolume * 0.25)
        el.pause()
      } catch {
        // no-op
      }
    }

    let done = false
    let clipAudio = null
    let hardTimeout = null
    const finish = (state = 'ok') => {
      if (done) return
      done = true
      if (hardTimeout) clearTimeout(hardTimeout)
      if (clipAudio) {
        clipAudio.onended = null
        clipAudio.onerror = null
      }
      if (el) {
        try { el.volume = originalVolume } catch {}
      }
      setDjNowPlaying('')
      setDjDispatchState(state)
      djInterludeActiveRef.current = false
      onDone?.()
    }

    hardTimeout = setTimeout(() => finish('timeout_fallback'), 9000)

    try {
      const rendered = await renderDjClip(slot)
      if (!rendered?.clipUrl) throw new Error('DJ clip URL missing')

      clipAudio = new Audio(rendered.clipUrl)
      clipAudio.preload = 'auto'
      clipAudio.volume = Math.max(0.1, Math.min(1, (Number(volume) || 0.85) * 0.95))
      clipAudio.onended = () => finish('ok')
      clipAudio.onerror = () => finish('offline_fallback')

      setDjDispatchState(rendered?.fromCache ? 'clip_cache_playout' : 'clip_playout')
      await clipAudio.play()
      return
    } catch {
      // continue to local fallback
    }

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (synth && typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function') {
      try {
        synth.cancel()
        const utt = new window.SpeechSynthesisUtterance(script)
        utt.rate = 1
        utt.pitch = 0.8
        utt.volume = 0.85
        utt.onend = () => finish('offline_fallback')
        utt.onerror = () => finish('offline_fallback')
        synth.speak(utt)
        return
      } catch {
        // fallback below
      }
    }

    setTimeout(() => finish('offline_fallback'), 1800)
  }

  function nextTrack(reason = 'next_button') {
    if (!agentTracks.length) return
    if (tunedAgent && currentTrack) {
      const el = audioRef.current
      const nowPos = Math.floor(el?.currentTime || progress || 0)
      const dur = Math.floor(el?.duration || duration || currentTrack.duration || 0)
      const completionRatio = dur > 0 ? Math.max(0, Math.min(1, nowPos / dur)) : null

      const entry = {
        trackId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        playedAt: new Date().toISOString(),
        reason,
        durationSec: dur || null,
        positionSec: nowPos,
        completionRatio,
      }
      setAgentPlayHistory((prev) => {
        const next = { ...(prev || {}) }
        const list = Array.isArray(next[tunedAgent.id]) ? [...next[tunedAgent.id]] : []
        list.unshift(entry)
        next[tunedAgent.id] = list.slice(0, 5000)
        return next
      })
      if (profileAgentId === tunedAgent.id) {
        setProfileHistory((prev) => [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 200))
      }
      appendAgentHistory(tunedAgent.id, entry).catch(() => {})

      emitTelemetry(reason === 'track_ended' ? 'song.play.end' : 'song.skip', {
        trackId: currentTrack.id,
        positionSec: nowPos,
        durationSec: dur || null,
        volume,
        muted,
        reason,
      })
    }

    const shouldRotateAgent = radioMode === 'on_air' && reason !== 'manual_select' && effectiveRadioAgents.length > 1
    if (shouldRotateAgent) {
      const slot = queueDjSlot(reason, { id: null, title: 'agent rotation' })
      playDjInterlude(slot, () => {
        const rotated = rotateToNextRadioAgent()
        if (rotated) {
          setTrackIndex(0)
          setPlaying(true)
          return
        }
        const fallbackIdx = (trackIndex + 1) % agentTracks.length
        setTrackIndex(fallbackIdx)
        setPlaying(true)
      })
      return
    }

    const nextIdx = (trackIndex + 1) % agentTracks.length
    const slot = queueDjSlot(reason, agentTracks[nextIdx] || null)
    playDjInterlude(slot, () => {
      setTrackIndex(nextIdx)
      setPlaying(true)
    })
  }
  function seekFromEvent(e) {
    const el = audioRef.current; if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const toSec = ((e.clientX - rect.left) / rect.width) * duration
    const fromSec = Math.floor(el.currentTime || 0)
    el.currentTime = toSec
    emitTelemetry('song.seek', {
      positionSec: Math.floor(toSec),
      durationSec: Math.floor(duration || 0),
      volume,
      muted,
      reason: 'progress_bar',
      context: { fromSec, toSec: Math.floor(toSec) },
    })
  }
  function playTrack(i) {
    initAnalyser()
    pendingSeekRef.current = 0
    if (tunedAgent && currentTrack) {
      const el = audioRef.current
      const nowPos = Math.floor(el?.currentTime || progress || 0)
      const dur = Math.floor(el?.duration || duration || currentTrack.duration || 0)
      const completionRatio = dur > 0 ? Math.max(0, Math.min(1, nowPos / dur)) : null

      const entry = {
        trackId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        playedAt: new Date().toISOString(),
        reason: 'manual_select',
        durationSec: dur || null,
        positionSec: nowPos,
        completionRatio,
      }
      setAgentPlayHistory((prev) => {
        const next = { ...(prev || {}) }
        const list = Array.isArray(next[tunedAgent.id]) ? [...next[tunedAgent.id]] : []
        list.unshift(entry)
        next[tunedAgent.id] = list.slice(0, 5000)
        return next
      })
      if (profileAgentId === tunedAgent.id) {
        setProfileHistory((prev) => [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 200))
      }
      appendAgentHistory(tunedAgent.id, entry).catch(() => {})
      emitTelemetry('song.skip', {
        trackId: currentTrack.id,
        positionSec: nowPos,
        durationSec: dur || null,
        volume,
        muted,
        reason: 'manual_select',
      })
    }

    setTrackIndex(i)
    setPlaying(true)
    autoPlayRef.current = true
  }

  function onVolumeChange(nextVolume) {
    const v = Math.max(0, Math.min(1, Number(nextVolume) || 0))
    setVolume(v)
    const el = audioRef.current
    if (el) el.volume = v
    emitTelemetry('song.volume.change', {
      positionSec: Math.floor(el?.currentTime || progress || 0),
      durationSec: Math.floor(el?.duration || duration || 0),
      volume: v,
      muted,
      reason: 'ui_slider',
    })
  }

  function onToggleMute() {
    const nextMuted = !muted
    setMuted(nextMuted)
    const el = audioRef.current
    if (el) el.muted = nextMuted
    emitTelemetry(nextMuted ? 'song.mute' : 'song.unmute', {
      positionSec: Math.floor(el?.currentTime || progress || 0),
      durationSec: Math.floor(el?.duration || duration || 0),
      volume,
      muted: nextMuted,
      reason: 'ui_toggle',
    })
  }

  function toggleListenerAgent(agentId) {
    setListenerAgentIds((prev) => {
      const safe = Array.isArray(prev) ? prev : []
      if (safe.includes(agentId)) {
        const trimmed = safe.filter((id) => id !== agentId)
        return trimmed.length ? trimmed : [agentId]
      }
      return [...safe, agentId]
    })
  }

  async function openProfile(agentId) {
    try {
      setProfileAgentId(agentId)
      setProfileSaveError('')
      setProfileBusy(true)
      const [payload, collectionPayload, historyPayload, galleryPayload] = await Promise.all([
        loadAgentProfile(agentId),
        loadAgentCollection(agentId).catch(() => ({ tracks: [] })),
        loadAgentHistory(agentId, 200).catch(() => ({ history: [] })),
        loadAgentGallery(agentId).catch(() => ({ images: [] })),
      ])
      setProfileData(payload)
      setProfileDraft(payload)
      setProfileBaseline(payload)
      setProfileEditMode(false)
      setProfileCollection(Array.isArray(collectionPayload?.tracks) ? collectionPayload.tracks : [])
      setProfileHistory(Array.isArray(historyPayload?.history) ? historyPayload.history : [])
      setProfileGallery(Array.isArray(galleryPayload?.images) ? galleryPayload.images : [])
      setHistoryAgentId(agentId)
      setTab('profile')

      const profilePool = (Array.isArray(collectionPayload?.tracks) && collectionPayload.tracks.length
        ? collectionPayload.tracks
        : tracks)

      const topTrackId = payload?.profile?.topSongs?.d7?.[0]?.trackId
        || payload?.profile?.topSongs?.all?.[0]?.trackId
        || payload?.profile?.favoriteSongs?.[0]
        || profilePool?.[0]?.id
        || null
      const profileAgent = agents.find((a) => a.id === agentId) || null
      if (profileAgent && tunedAgent?.id !== agentId) setTunedAgent(profileAgent)
      if (profilePool?.length) {
        const profileTracks = seededShuffle(profilePool, agentId)
        const idx = topTrackId ? profileTracks.findIndex((t) => t.id === topTrackId) : 0
        pendingSeekRef.current = 0
        setTrackIndex(idx >= 0 ? idx : 0)
        setPlaying(true)
        autoPlayRef.current = true
      }
    } catch (err) {
      setProfileSaveError(err.message || 'Failed to load profile')
    } finally {
      setProfileBusy(false)
    }
  }

  function updateProfileDraft(patch) {
    setProfileEditMode(true)
    setProfileDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        profile: {
          ...prev.profile,
          ...patch,
        },
      }
    })
  }

  async function saveProfile() {
    if (!profileAgentId || !profileDraft?.profile) return
    try {
      setProfileBusy(true)
      setProfileSaveError('')
      const payload = {
        displayName: profileDraft.profile.displayName,
        genres: profileDraft.profile.genres,
        favoriteSongs: profileDraft.profile.favoriteSongs,
        anthemTrackId: profileDraft.profile.anthemTrackId,
        focusLoopTrackId: profileDraft.profile.focusLoopTrackId,
        rotationMode: profileDraft.profile.rotationMode,
        antiRepeatWindow: profileDraft.profile.antiRepeatWindow,
        bio: profileDraft.profile.bio,
        motto: profileDraft.profile.motto,
        personaTags: profileDraft.profile.personaTags,
        notes: profileDraft.profile.notes,
      }
      const saved = await saveAgentProfile(profileAgentId, payload)
      setProfileData(saved)
      setProfileDraft(saved)
      setProfileBaseline(saved)
      setProfileEditMode(false)

      const mergedCollection = await saveAgentCollection(profileAgentId, {
        mode: 'merge',
        tracks: profileCollection,
      })
      setProfileCollection(Array.isArray(mergedCollection?.tracks) ? mergedCollection.tracks : [])
      setAgentCollections((prev) => ({
        ...(prev || {}),
        [profileAgentId]: collectionArrayToMap(mergedCollection?.tracks || []),
      }))
    } catch (err) {
      setProfileSaveError(err.message || 'Failed to save profile')
    } finally {
      setProfileBusy(false)
    }
  }

  function onImageSettingsChange(patch) {
    setImageSettings((prev) => {
      const base = prev || {
        provider: 'disabled',
        local: { endpoint: '', model: '' },
        openai: { apiKey: '', model: 'gpt-image-1' },
        fal: { apiKey: '', model: 'fal-ai/nano-banana' },
      }
      return {
        ...base,
        ...patch,
        local: { ...(base.local || {}), ...(patch.local || {}) },
        openai: { ...(base.openai || {}), ...(patch.openai || {}) },
        fal: { ...(base.fal || {}), ...(patch.fal || {}) },
      }
    })
  }

  async function saveImageSettingsAction() {
    try {
      setImageBusy(true)
      setImageError('')
      setImageMessage('')
      const saved = await saveImageGenerationSettings(imageSettings || {})
      setImageSettings(saved)
      setImageMessage('Image settings saved.')
    } catch (err) {
      setImageError(err.message || 'Failed to save image settings')
    } finally {
      setImageBusy(false)
    }
  }

  async function testImageSettingsAction() {
    try {
      setImageBusy(true)
      setImageError('')
      setImageMessage('')
      if (imageSettings) await saveImageGenerationSettings(imageSettings)
      const test = await testImageGenerationProvider(imageSettings?.provider || 'disabled')
      setImageMessage(`Provider test ok (${test.provider}) in ${test.latencyMs}ms`)
    } catch (err) {
      setImageError(err.message || 'Provider test failed')
    } finally {
      setImageBusy(false)
    }
  }

  async function generateAvatarAction() {
    if (!profileAgentId) {
      setImageError('Open a profile first to pick an agent.')
      return
    }
    try {
      setImageBusy(true)
      setImageError('')
      setImageMessage('')
      if (imageSettings) await saveImageGenerationSettings(imageSettings)
      await generateAvatar(profileAgentId)
      setImageMessage(`Avatar generated for ${profileAgentId}.`)
      await openProfile(profileAgentId)
    } catch (err) {
      setImageError(err.message || 'Avatar generation failed')
    } finally {
      setImageBusy(false)
    }
  }

  async function saveMusicSettingsAction() {
    try {
      setMusicBusy(true)
      setMusicError('')
      setMusicMessage('')
      const payload = await saveMusicSettings(musicSettings)
      setMusicSettings(payload?.settings || musicSettings)
      setMusicCacheStats(payload?.cache || { count: 0, bytes: 0 })
      setMusicMessage('Music settings saved.')
    } catch (err) {
      setMusicError(err.message || 'Failed to save music settings')
    } finally {
      setMusicBusy(false)
    }
  }

  async function warmMusicCacheAction() {
    try {
      setMusicBusy(true)
      setMusicError('')
      setMusicMessage('')
      const payload = await warmMusicCache()
      setMusicCacheStats(payload?.cache || { count: 0, bytes: 0 })
      setMusicMessage(`Cache warmed: ${payload?.warmed || 0}/${payload?.total || 0} tracks.`)
    } catch (err) {
      setMusicError(err.message || 'Failed to warm music cache')
    } finally {
      setMusicBusy(false)
    }
  }

  async function clearMusicCacheAction() {
    try {
      setMusicBusy(true)
      setMusicError('')
      setMusicMessage('')
      const payload = await clearMusicCache()
      setMusicCacheStats(payload?.cache || { count: 0, bytes: 0 })
      setMusicMessage('Music cache cleared.')
    } catch (err) {
      setMusicError(err.message || 'Failed to clear music cache')
    } finally {
      setMusicBusy(false)
    }
  }

  async function rotateMusicTracksAction() {
    try {
      setMusicBusy(true)
      setMusicError('')
      setMusicMessage('')
      const payload = await rotateMusicTracks()
      const nextTracks = Array.isArray(payload?.tracks) ? payload.tracks : []
      if (nextTracks.length) {
        setTracks(nextTracks)
        setTrackIndex(0)
      }
      setMusicMessage(`Track pool rotated${payload?.rotationEpoch != null ? ` (epoch ${payload.rotationEpoch})` : ''}.`)
    } catch (err) {
      setMusicError(err.message || 'Failed to rotate track pool')
    } finally {
      setMusicBusy(false)
    }
  }

  function updateUpdateAdminForm(patch = {}) {
    setUpdateAdminForm((prev) => ({
      ...(prev || {}),
      ...(patch || {}),
    }))
  }

  async function loadUpdateAdminLane(channel = updateChannel) {
    try {
      const payload = await loadMobileUpdateSettings()
      const latest = payload?.config?.android?.[channel]?.latest || payload?.config?.android?.stable?.latest || null
      if (latest) {
        setUpdateAdminForm({
          versionName: latest.versionName || '1.0',
          versionCode: Number(latest.versionCode) || 1,
          minVersionCode: Number(latest.minVersionCode) || 1,
          mandatory: Boolean(latest.mandatory),
          notes: latest.notes || '',
          apkUrl: latest.apkUrl || '',
          sha256: latest.sha256 || '',
        })
      }
    } catch {
      // keep defaults if settings endpoint is unavailable
    }
  }

  async function getCurrentAppVersion() {
    try {
      if (Capacitor.isNativePlatform()) {
        const info = await CapacitorApp.getInfo()
        return {
          versionName: String(info?.version || '1.0'),
          versionCode: Number(info?.build || 1) || 1,
        }
      }
    } catch {
      // fallback to web/package version below
    }
    return {
      versionName: '1.0',
      versionCode: 1,
    }
  }

  async function checkForMobileUpdate({ silent = false } = {}) {
    try {
      setUpdateBusy(true)
      if (!silent) {
        setUpdateError('')
        setUpdateMessage('')
      }
      const current = await getCurrentAppVersion()
      const payload = await checkMobileUpdate({
        platform: 'android',
        channel: updateChannel,
        versionName: current.versionName,
        versionCode: current.versionCode,
      })
      setUpdateInfo(payload)
      lastUpdateCheckRef.current = Date.now()
      if (!silent) {
        if (payload?.update?.available) {
          setUpdateMessage(`Update available: ${payload?.latest?.versionName} (${payload?.latest?.versionCode})`)
        } else {
          setUpdateMessage('App is up to date.')
        }
      }
      return payload
    } catch (err) {
      if (!silent) setUpdateError(err.message || 'Failed to check update')
      return null
    } finally {
      setUpdateBusy(false)
    }
  }

  async function openUpdateApkAction() {
    const apkUrl = String(updateInfo?.latest?.apkUrl || '').trim()
    if (!apkUrl) {
      setUpdateError('No APK URL configured for this channel.')
      return
    }
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: apkUrl })
      } else {
        window.open(apkUrl, '_blank', 'noopener,noreferrer')
      }
      setUpdateMessage('Opened update URL.')
    } catch (err) {
      setUpdateError(err.message || 'Failed to open update URL')
    }
  }

  async function saveUpdateAdminLane() {
    try {
      setUpdateBusy(true)
      setUpdateError('')
      setUpdateMessage('')
      const payload = await saveMobileUpdateSettings({
        platform: 'android',
        channel: updateChannel,
        latest: {
          versionName: updateAdminForm?.versionName,
          versionCode: updateAdminForm?.versionCode,
          minVersionCode: updateAdminForm?.minVersionCode,
          mandatory: updateAdminForm?.mandatory,
          notes: updateAdminForm?.notes,
          apkUrl: updateAdminForm?.apkUrl,
          sha256: updateAdminForm?.sha256,
          publishedAt: new Date().toISOString(),
        },
      })
      const latest = payload?.config?.android?.[updateChannel]?.latest
      if (latest) {
        setUpdateAdminForm({
          versionName: latest.versionName || '1.0',
          versionCode: Number(latest.versionCode) || 1,
          minVersionCode: Number(latest.minVersionCode) || 1,
          mandatory: Boolean(latest.mandatory),
          notes: latest.notes || '',
          apkUrl: latest.apkUrl || '',
          sha256: latest.sha256 || '',
        })
      }
      setUpdateMessage(`Saved ${updateChannel} lane.`)
      await checkForMobileUpdate({ silent: true })
    } catch (err) {
      setUpdateError(err.message || 'Failed to save update lane')
    } finally {
      setUpdateBusy(false)
    }
  }

  function playProfileTopSong() {
    if (!profileDraft?.profile || !profileAgentId) return
    const profilePool = profileCollection?.length ? profileCollection : tracks
    if (!profilePool.length) return

    const topTrackId = profileDraft.profile.topSongs?.d7?.[0]?.trackId
      || profileDraft.profile.topSongs?.all?.[0]?.trackId
      || profileDraft.profile.favoriteSongs?.[0]
      || profileCollection?.[0]?.id
      || null

    const profileAgent = agents.find((a) => a.id === profileAgentId) || null
    if (profileAgent && tunedAgent?.id !== profileAgentId) setTunedAgent(profileAgent)

    const profileTracks = seededShuffle(profilePool, profileAgentId)
    const idx = topTrackId ? profileTracks.findIndex((t) => t.id === topTrackId) : 0
    pendingSeekRef.current = 0
    setTrackIndex(idx >= 0 ? idx : 0)
    setPlaying(true)
    autoPlayRef.current = true
  }

  async function addTrackToProfileCollection() {
    if (!profileAgentId) return
    const id = prompt('Track ID (required)')
    if (!id) return
    const title = prompt('Track title', id) || id
    const artist = prompt('Artist', 'Unknown artist') || 'Unknown artist'
    const audioUrl = prompt('Audio URL (optional)', '') || ''
    const tagsCsv = prompt('Tags (comma separated)', '') || ''
    const durationRaw = prompt('Duration in seconds (optional)', '') || ''
    const duration = Number(durationRaw)

    const track = {
      id: String(id).trim(),
      title: String(title).trim(),
      artist: String(artist).trim(),
      audioUrl: String(audioUrl).trim(),
      tags: tagsCsv.split(',').map((v) => v.trim()).filter(Boolean),
      duration: Number.isFinite(duration) ? duration : 0,
      source: 'manual',
    }

    try {
      setProfileBusy(true)
      setProfileSaveError('')
      const saved = await saveAgentCollection(profileAgentId, { mode: 'merge', tracks: [track] })
      const savedTracks = Array.isArray(saved?.tracks) ? saved.tracks : []
      setProfileCollection(savedTracks)
      setAgentCollections((prev) => ({
        ...(prev || {}),
        [profileAgentId]: collectionArrayToMap(savedTracks),
      }))
    } catch (err) {
      setProfileSaveError(err.message || 'Failed to add track')
    } finally {
      setProfileBusy(false)
    }
  }

  async function removeTrackFromProfileCollection(trackId) {
    if (!profileAgentId || !trackId) return
    try {
      setProfileBusy(true)
      setProfileSaveError('')
      const saved = await saveAgentCollection(profileAgentId, { removeTrackIds: [trackId] })
      const savedTracks = Array.isArray(saved?.tracks) ? saved.tracks : []
      setProfileCollection(savedTracks)
      setAgentCollections((prev) => ({
        ...(prev || {}),
        [profileAgentId]: collectionArrayToMap(savedTracks),
      }))
    } catch (err) {
      setProfileSaveError(err.message || 'Failed to remove track')
    } finally {
      setProfileBusy(false)
    }
  }

  async function ingestGalleryImageForProfile() {
    if (!profileAgentId) return
    const data = prompt('Base64 image payload (required)')
    if (!data) return
    const title = prompt('Title (optional)', '') || ''
    const caption = prompt('Caption (optional)', '') || ''
    const tagsCsv = prompt('Tags (comma separated)', '') || ''
    const mime = prompt('MIME type', 'image/jpeg') || 'image/jpeg'
    const filename = prompt('Original filename (optional)', '') || ''

    try {
      setProfileBusy(true)
      setProfileSaveError('')
      const saved = await ingestAgentGalleryImage(profileAgentId, {
        data,
        mime,
        type: mime,
        title,
        caption,
        filename,
        tags: tagsCsv.split(',').map((v) => v.trim()).filter(Boolean),
        source: 'profile-manual',
      })
      const added = saved?.image
      setProfileGallery((prev) => {
        const next = Array.isArray(prev) ? [...prev] : []
        if (added) next.unshift(added)
        return next.slice(0, 200)
      })
    } catch (err) {
      setProfileSaveError(err.message || 'Failed to ingest image')
    } finally {
      setProfileBusy(false)
    }
  }

  function handleProfileAvatarUploaded(payload) {
    const added = payload?.galleryImage || null
    if (added && payload?.agentId && payload.agentId === profileAgentId) {
      setProfileGallery((prev) => {
        const next = Array.isArray(prev) ? [...prev] : []
        next.unshift(added)
        return next.slice(0, 200)
      })
    }
    if (payload?.avatar && payload?.agentId && payload.agentId === profileAgentId) {
      setProfileEditMode(true)
      setProfileDraft((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          profile: {
            ...prev.profile,
            avatar: payload.avatar,
          },
        }
      })
    }
  }

  function toggleProfileEditMode() {
    setProfileEditMode((prev) => !prev)
  }

  function cancelProfileEdit() {
    if (profileBaseline) setProfileDraft(profileBaseline)
    setProfileSaveError('')
    setProfileEditMode(false)
  }

  async function refreshHistoryForAgent(agentId = historyAgentId || tunedAgent?.id || profileAgentId) {
    if (!agentId) return
    try {
      const payload = await loadAgentHistory(agentId, 500)
      const entries = Array.isArray(payload?.history) ? payload.history : []
      setAgentPlayHistory((prev) => ({ ...(prev || {}), [agentId]: entries }))
      if (profileAgentId === agentId) setProfileHistory(entries)
    } catch {
      // keep UI stable on transient failures
    }
  }

  // Actions
  async function act(action, payload = {}) {
    try {
      setBusy(action)
      const next = await sendAction(action, payload, tunedAgent?.id || state?.runtime?.agentId || null)
      setState(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  // Initial data load
  useEffect(() => {
    let mounted = true
    Promise.all([
      loadState(),
      loadAgents(),
      loadTracks(),
      checkHealth(),
      loadImageGenerationSettings().catch(() => null),
      loadMusicSettings().catch(() => null),
    ])
      .then(([stateData, agentData, trackList, healthy, imgSettings, musicCfg]) => {
        if (!mounted) return

        // Guard: /agents can be empty on some backends; fallback to state.agents
        let agentList = Array.isArray(agentData?.agents) ? agentData.agents : []
        const defaultFromAgents = agentData?.defaultId || null
        if (!agentList.length) {
          const fromState = Object.values(stateData?.agents || {}).map((agent) => ({
            id: agent.id,
            name: agent.name || agent.id,
            role: agent.activity || '',
            vibe: agent.vibe || '',
            source: 'state',
            active: String(agent.status || '').toLowerCase() !== 'offline',
            gatewayState: String(agent.status || '').toLowerCase() === 'offline' ? 'offline' : 'running',
            updatedAt: stateData?.meta?.lastUpdated || new Date().toISOString(),
          }))
          if (fromState.length) agentList = fromState
        }

        setState(stateData)
        setAgents(agentList)
        setHistoryAgentId((prev) => prev || agentList[0]?.id || null)

        const resume = resumeRef.current
        let tuned = agentList.find((a) => a.id === defaultFromAgents)
          || agentList.find((a) => a.id === stateData?.meta?.defaultAgentId)
          || agentList[0]
          || null
        if (resume?.agentId) {
          const resumedAgent = agentList.find((a) => a.id === resume.agentId)
          if (resumedAgent) tuned = resumedAgent
        }
        setTunedAgent(tuned)

        setTracks(trackList)
        setAgentCollections((prev) => {
          const next = { ...(prev || {}), ...(stateData?.agentCollections || {}) }
          const now = new Date().toISOString()
          const normalizedBase = (trackList || []).map((t) => normalizeTrackForCollection(t)).filter(Boolean)

          ;(agentList || []).forEach((agent) => {
            const existing = next[agent.id] || {}
            next[agent.id] = mergeAgentCollectionForAgent(existing, normalizedBase)
            // touch for freshness without deleting anything
            Object.values(next[agent.id]).forEach((item) => {
              if (!item.firstSeenAt) item.firstSeenAt = now
              item.lastSeenAt = now
            })
          })

          return next
        })
        setApiHealthy(healthy)
        setImageSettings(imgSettings)
        if (musicCfg?.settings) setMusicSettings(musicCfg.settings)
        if (musicCfg?.cache) setMusicCacheStats(musicCfg.cache)
        setAgentPlayHistory((prev) => ({ ...(prev || {}), ...(stateData?.playHistory || {}) }))
        setLoading(false)

        const alwaysPlay = musicCfg?.settings?.alwaysPlay !== false

        if (resume && tuned && trackList.length) {
          const resumedTracks = seededShuffle(trackList, tuned.id)
          const resumedIdx = resume.trackId ? resumedTracks.findIndex((t) => t.id === resume.trackId) : -1
          setTrackIndex(resumedIdx >= 0 ? resumedIdx : 0)
          pendingSeekRef.current = Math.max(0, Number(resume.positionSec) || 0)
          setProgress(pendingSeekRef.current)
          autoPlayRef.current = alwaysPlay
          setPlaying(alwaysPlay ? Boolean(resume.playing ?? true) : false)
          setResumeBanner(`Resumed ${tuned.name} at ${formatDuration(pendingSeekRef.current)}`)
          setTimeout(() => setResumeBanner(''), 4500)
          return
        }

        // Trigger immediate auto-play on open.
        autoPlayRef.current = alwaysPlay
        setPlaying(alwaysPlay)
      })
      .catch(err => { if (mounted) { setError(err.message); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  // Periodic health check — only update state when value changes
  useEffect(() => {
    const t = setInterval(async () => {
      const healthy = await checkHealth()
      setApiHealthy(prev => prev === healthy ? prev : healthy)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadUpdateAdminLane(updateChannel)
  }, [updateChannel])

  useEffect(() => {
    checkForMobileUpdate({ silent: true })
  }, [updateChannel])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const removePromise = CapacitorApp.addListener('resume', async () => {
      const now = Date.now()
      if (now - (lastUpdateCheckRef.current || 0) < 5 * 60 * 1000) return
      await checkForMobileUpdate({ silent: true })
    })
    return () => {
      Promise.resolve(removePromise)
        .then((h) => h?.remove?.())
        .catch(() => {})
    }
  }, [updateChannel])

  // Persist playback state on app/page interruptions (background, close, refresh)
  useEffect(() => {
    function persistNow() {
      const el = audioRef.current
      if (!el || !tunedAgent || !currentTrack) return
      savePlaybackResume({
        agentId: tunedAgent.id,
        trackId: currentTrack.id,
        positionSec: Math.floor(el.currentTime || 0),
        playing: !el.paused,
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistNow()
    }

    window.addEventListener('pagehide', persistNow)
    window.addEventListener('beforeunload', persistNow)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('pagehide', persistNow)
      window.removeEventListener('beforeunload', persistNow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tunedAgent, currentTrack])

  // ---- Render ----
  if (loading) return (
    <>
      <AtmosphereCanvas />
      <div className="appShell"><div className="loadingCard">Booting vAIb…</div></div>
    </>
  )

  const events = state?.events || []
  const notifications = state?.notifications || []
  const activeCount = agents.filter(a => a.active).length
  const currentHistoryAgentId = historyAgentId || tunedAgent?.id || agents[0]?.id || ''
  const historyEntries = Array.isArray(agentPlayHistory?.[currentHistoryAgentId])
    ? agentPlayHistory[currentHistoryAgentId]
    : []

  return (
    <>
      <AtmosphereCanvas />
      <MusicNoteOverlay analyser={analyser} tunedAgent={tunedAgent} />
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" style={{ display: 'none' }} />

      <div className="appShell" onClick={handleGesture} data-motion={motionMode}>

        {/* Header */}
        <header className="vaibHeader">
          <div className="vaibBrand" aria-label="vAIb">
            <img
              className="vaibLogo"
              src="/branding/vaib-official-logo.jpg"
              alt="vAIb official logo"
              loading="eager"
              decoding="async"
            />
            <span className="vaibWordmark">vAIb</span>
          </div>

          <div className="profileSwitcher" ref={profileSwitcherRef}>
            <button
              type="button"
              className={`profileSwitcherTrigger${profileSwitcherOpen ? ' open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={profileSwitcherOpen}
              aria-label="Change tuned profile"
              onClick={() => setProfileSwitcherOpen((v) => !v)}
            >
              <AgentAvatar agentId={tunedAgent?.id || 'none'} name={tunedAgent?.name || 'No profile'} size={24} className="profileSwitcherAvatar" />
              <span className="profileSwitcherMeta">
                <span className="profileSwitcherLabel">Profile</span>
                <span className="profileSwitcherName">{tunedAgent?.name || 'No active profile'}</span>
              </span>
              <span className="profileSwitcherChevron" aria-hidden>▾</span>
            </button>

            {profileSwitcherOpen && (
              <div className="profileSwitcherMenu" role="dialog" aria-label="Profile selector">
                <input
                  className="profileSwitcherSearch"
                  type="search"
                  placeholder="Search name, role, or id"
                  value={profileSwitcherQuery}
                  onChange={(e) => setProfileSwitcherQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (!headerFilteredAgents.length) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setProfileSwitcherHighlight((prev) => Math.min(prev + 1, headerFilteredAgents.length - 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setProfileSwitcherHighlight((prev) => Math.max(prev - 1, 0))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      const agent = headerFilteredAgents[Math.max(0, Math.min(profileSwitcherHighlight, headerFilteredAgents.length - 1))]
                      if (agent) {
                        tuneAndPlay(agent)
                        setProfileSwitcherOpen(false)
                        setProfileSwitcherQuery('')
                      }
                    }
                  }}
                  autoFocus
                />
                <div className="profileSwitcherList" role="listbox" aria-label="Profiles">
                  {headerFilteredAgents.map((agent, idx) => {
                    const active = agent.id === tunedAgent?.id
                    const highlighted = idx === profileSwitcherHighlight
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`profileSwitcherOption${active ? ' active' : ''}${highlighted ? ' highlighted' : ''}`}
                        onClick={() => {
                          tuneAndPlay(agent)
                          setProfileSwitcherOpen(false)
                          setProfileSwitcherQuery('')
                        }}
                      >
                        <AgentAvatar agentId={agent.id} name={agent.name} size={22} className="profileSwitcherOptionAvatar" />
                        <span className="profileSwitcherOptionMain">
                          <span className="profileSwitcherOptionName">{agent.name}</span>
                          <span className="profileSwitcherOptionSub">{agent.role || agent.id}</span>
                        </span>
                        <span className={`profileSwitcherDot ${agent.active ? 'online' : 'offline'}`} aria-hidden />
                      </button>
                    )
                  })}
                  {!headerFilteredAgents.length && (
                    <div className="profileSwitcherEmpty">No matching profiles.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="vaibHeaderRight">
            {error && <span className="headerError">⚠</span>}
            <span className="headerStat">{activeCount} online</span>
          </div>
        </header>

        {/* Top EQ strip — always visible */}
        <TopEqualizer analyser={analyser} />

        {/* Tab content */}
        <div className="tabContent">
          {tab === 'cockpit' && (
            <CockpitTab
              tunedAgent={tunedAgent}
              track={currentTrack}
              events={events}
              notifications={notifications}
              apiHealthy={apiHealthy}
              onReadAll={() => act('notifications.readAll')}
              analyser={analyser}
            />
          )}
          {tab === 'stations' && (
            <StationsTab agents={agents} tunedId={tunedAgent?.id} onTune={tuneAndPlay} />
          )}
          {tab === 'queue' && (
            <QueueTab agentTracks={agentTracks} trackIndex={trackIndex} playing={playing} onPlayTrack={playTrack} />
          )}
          {tab === 'agents' && <AgentsTab agents={agents} onOpenProfile={openProfile} />}
          {tab === 'profile' && (
            <AgentProfileTab
              profile={profileDraft || profileData}
              collection={profileCollection}
              history={profileHistory}
              gallery={profileGallery}
              busy={profileBusy}
              saveError={profileSaveError}
              onChange={updateProfileDraft}
              onSave={saveProfile}
              onPlayTopSong={playProfileTopSong}
              onAddTrack={addTrackToProfileCollection}
              onRemoveTrack={removeTrackFromProfileCollection}
              onIngestGalleryImage={ingestGalleryImageForProfile}
              onOpenAgent={openProfile}
              onTune={(agentId) => {
                const a = agents.find((x) => x.id === agentId)
                if (a) tuneAndPlay(a)
              }}
              allAgents={agents}
              selectedAgentId={profileAgentId}
              liveTrack={currentTrack}
              starAgent={starAgentMeta?.agent || null}
              starReason={starReason}
              pinnedAgentId={pinnedProfileAgentId}
              onPinAgent={(agentId) => {
                setPinnedProfileAgentId((prev) => (prev === agentId ? '' : agentId))
              }}
              onAvatarUploaded={handleProfileAvatarUploaded}
              editMode={profileEditMode}
              onToggleEditMode={toggleProfileEditMode}
              onCancelEdit={cancelProfileEdit}
              motionMode={motionMode}
            />
          )}
          {tab === 'history' && (
            <HistoryLabTab
              agents={agents}
              selectedAgentId={currentHistoryAgentId}
              onSelectAgent={(agentId) => {
                setHistoryAgentId(agentId)
                refreshHistoryForAgent(agentId)
              }}
              entries={historyEntries}
              onRefresh={() => refreshHistoryForAgent(currentHistoryAgentId)}
            />
          )}
          {tab === 'more' && (
            <MoreTab
              state={state}
              act={act}
              networkPanel={<NetworkPanel />}
              imageSettings={imageSettings}
              imageBusy={imageBusy}
              imageError={imageError}
              imageMessage={imageMessage}
              onImageSettingsChange={onImageSettingsChange}
              onSaveImageSettings={saveImageSettingsAction}
              onTestImageSettings={testImageSettingsAction}
              onGenerateAvatar={generateAvatarAction}
              profileAgentId={profileAgentId}
              updateChannel={updateChannel}
              onUpdateChannelChange={setUpdateChannel}
              updateInfo={updateInfo}
              updateBusy={updateBusy}
              updateError={updateError}
              updateMessage={updateMessage}
              onCheckUpdate={() => checkForMobileUpdate({ silent: false })}
              onOpenUpdate={openUpdateApkAction}
              updateAdminForm={updateAdminForm}
              onUpdateAdminFormChange={updateUpdateAdminForm}
              onSaveUpdateAdmin={saveUpdateAdminLane}
              motionMode={motionMode}
              onMotionModeChange={setMotionMode}
              musicSettings={musicSettings}
              musicCacheStats={musicCacheStats}
              musicBusy={musicBusy}
              musicError={musicError}
              musicMessage={musicMessage}
              onMusicSettingsChange={(patch) => setMusicSettings((prev) => ({ ...(prev || {}), ...(patch || {}) }))}
              onSaveMusicSettings={saveMusicSettingsAction}
              onWarmMusicCache={warmMusicCacheAction}
              onRotateMusicTracks={rotateMusicTracksAction}
              onClearMusicCache={clearMusicCacheAction}
            />
          )}
        </div>

        {/* Mini player */}
        <MiniPlayer
          tunedAgent={tunedAgent}
          track={currentTrack}
          playing={playing}
          progress={progress}
          duration={duration}
          onToggle={togglePlay}
          onNext={() => nextTrack('mini_player_next')}
          onSeek={seekFromEvent}
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
          muted={muted}
          volume={volume}
          resumeBanner={resumeBanner}
          rotationMode={profileRotationMode}
          antiRepeatWindow={profileAntiRepeatWindow}
          radioMode={radioMode}
          onRadioModeChange={setRadioMode}
          listenerAgents={selectableAgents}
          listenerAgentIds={effectiveListenerAgentIds}
          onToggleListenerAgent={toggleListenerAgent}
          apiHealthy={apiHealthy}
          djEnabled={djEnabled}
          onToggleDj={() => setDjEnabled((v) => !v)}
          djQueueDepth={djQueue.length}
          djDispatchState={djDispatchState}
          djNowPlaying={djNowPlaying}
        />

        {/* Tab bar */}
        <TabBar active={tab} onChange={setTab} />
      </div>
    </>
  )
}

// ============================================================
// Root
// ============================================================
function getNodeName() {
  const s = sessionStorage.getItem('vaib_node_name')
  if (s) return s
  const n = 'node_' + Math.random().toString(36).slice(2, 6)
  sessionStorage.setItem('vaib_node_name', n)
  return n
}

export default function App() {
  return (
    <AtmosphereProvider nodeOptions={{ name: getNodeName(), type: 'desktop' }}>
      <AppContent />
    </AtmosphereProvider>
  )
}
