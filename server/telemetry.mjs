import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const dataDir = path.join(process.cwd(), 'data')
const telemetryFile = path.join(dataDir, 'telemetry.ndjson')
const rollupsFile = path.join(dataDir, 'telemetry-rollups.json')

const VALID_KINDS = new Set([
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
  'song.queue.add',
  'song.queue.remove',
  'agent.tokens.delta',
])

async function ensureTelemetryStorage() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(telemetryFile)
  } catch {
    await fs.writeFile(telemetryFile, '', 'utf8')
  }
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeTelemetryEvent(input) {
  if (!input || typeof input !== 'object') throw new Error('Telemetry event must be an object')
  if (!input.agentId || typeof input.agentId !== 'string') throw new Error('Telemetry event requires agentId')
  if (!input.kind || typeof input.kind !== 'string') throw new Error('Telemetry event requires kind')
  if (!VALID_KINDS.has(input.kind)) throw new Error(`Unsupported telemetry kind: ${input.kind}`)

  const ts = input.ts ? new Date(input.ts).toISOString() : new Date().toISOString()

  return {
    eventId: input.eventId || randomUUID(),
    ts,
    agentId: input.agentId,
    kind: input.kind,
    trackId: input.trackId || null,
    sessionId: input.sessionId || null,
    positionSec: toNumberOrNull(input.positionSec),
    durationSec: toNumberOrNull(input.durationSec),
    volume: toNumberOrNull(input.volume),
    muted: typeof input.muted === 'boolean' ? input.muted : null,
    reason: input.reason || null,
    context: input.context && typeof input.context === 'object' ? input.context : {},
  }
}

export async function appendTelemetryEvent(input) {
  await ensureTelemetryStorage()
  const event = normalizeTelemetryEvent(input)
  await fs.appendFile(telemetryFile, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

export async function appendTelemetryBatch(events) {
  await ensureTelemetryStorage()
  if (!Array.isArray(events)) throw new Error('events must be an array')
  const normalized = events.map(normalizeTelemetryEvent)
  if (!normalized.length) return { accepted: 0, rejected: 0, events: [] }
  const lines = normalized.map((event) => JSON.stringify(event)).join('\n') + '\n'
  await fs.appendFile(telemetryFile, lines, 'utf8')
  return { accepted: normalized.length, rejected: 0, events: normalized }
}

export async function readTelemetryEvents({ agentId, from, to, kinds, limit = 500 } = {}) {
  await ensureTelemetryStorage()
  const raw = await fs.readFile(telemetryFile, 'utf8')
  if (!raw.trim()) return []

  const fromTs = from ? Date.parse(from) : null
  const toTs = to ? Date.parse(to) : null
  const kindSet = Array.isArray(kinds) && kinds.length ? new Set(kinds) : null

  const rows = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let parsed
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }

    if (agentId && parsed.agentId !== agentId) continue
    const eventTs = Date.parse(parsed.ts)
    if (fromTs && Number.isFinite(eventTs) && eventTs < fromTs) continue
    if (toTs && Number.isFinite(eventTs) && eventTs > toTs) continue
    if (kindSet && !kindSet.has(parsed.kind)) continue
    rows.push(parsed)
  }

  rows.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
  return rows.slice(0, Math.max(1, Number(limit) || 500))
}

function computeFromBoundary(window) {
  const now = Date.now()
  if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (window === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

function ratio(num, den) {
  if (!den) return 0
  return num / den
}

function aggregate(events) {
  let starts = 0
  let ends = 0
  let skips = 0
  let totalPlaytimeSec = 0
  let pauses = 0
  let resumes = 0
  let mutes = 0
  let unmutes = 0
  let volumeChanges = 0
  let seeks = 0
  let favorites = 0
  let dislikes = 0

  const byTrack = new Map()
  const kindCounts = {}
  const hourBuckets = Array.from({ length: 24 }, () => 0)
  const bySession = new Map()

  let lastVolume = null
  let volumeThrash = 0
  let lastVolumeTs = null

  for (const event of events) {
    const trackId = event.trackId || null
    const kind = String(event.kind || 'unknown')
    kindCounts[kind] = (kindCounts[kind] || 0) + 1

    const eventDate = new Date(event.ts || 0)
    const hour = eventDate.getHours()
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) hourBuckets[hour] += 1

    if (event.kind === 'song.play.start') starts += 1
    if (event.kind === 'song.play.end') {
      ends += 1
      const played = Math.max(0, Number(event.positionSec) || 0)
      totalPlaytimeSec += played
      if (trackId) {
        const row = byTrack.get(trackId) || { trackId, plays: 0, playtimeSec: 0, completions: 0, skips: 0 }
        row.playtimeSec += played
        if ((Number(event.durationSec) || 0) > 0 && played / Number(event.durationSec) >= 0.9) row.completions += 1
        byTrack.set(trackId, row)
      }
    }
    if (event.kind === 'song.skip') {
      skips += 1
      if (trackId) {
        const row = byTrack.get(trackId) || { trackId, plays: 0, playtimeSec: 0, completions: 0, skips: 0 }
        row.skips += 1
        byTrack.set(trackId, row)
      }
    }
    if (event.kind === 'song.pause') pauses += 1
    if (event.kind === 'song.resume') resumes += 1
    if (event.kind === 'song.mute') mutes += 1
    if (event.kind === 'song.unmute') unmutes += 1
    if (event.kind === 'song.volume.change') {
      volumeChanges += 1
      const v = Number(event.volume)
      const ts = Date.parse(event.ts || '')
      if (Number.isFinite(v)) {
        if (lastVolume != null && Math.abs(v - lastVolume) >= 0.2) {
          if (lastVolumeTs && Number.isFinite(ts) && ts - lastVolumeTs <= 30_000) {
            volumeThrash += 1
          }
        }
        lastVolume = v
      }
      if (Number.isFinite(ts)) lastVolumeTs = ts
    }
    if (event.kind === 'song.seek') seeks += 1
    if (event.kind === 'song.favorite') favorites += 1
    if (event.kind === 'song.dislike') dislikes += 1

    if (event.kind === 'song.play.start' && trackId) {
      const row = byTrack.get(trackId) || { trackId, plays: 0, playtimeSec: 0, completions: 0, skips: 0 }
      row.plays += 1
      byTrack.set(trackId, row)
    }

    if (event.sessionId) {
      const s = bySession.get(event.sessionId) || { starts: 0, skips: 0, mutes: 0, volumeChanges: 0 }
      if (event.kind === 'song.play.start') s.starts += 1
      if (event.kind === 'song.skip') s.skips += 1
      if (event.kind === 'song.mute') s.mutes += 1
      if (event.kind === 'song.volume.change') s.volumeChanges += 1
      bySession.set(event.sessionId, s)
    }
  }

  const topSongs = [...byTrack.values()]
    .sort((a, b) => b.playtimeSec - a.playtimeSec || b.plays - a.plays)
    .slice(0, 25)
    .map((row) => ({
      ...row,
      completionRatio: ratio(row.completions, row.plays),
      skipRatio: ratio(row.skips, row.plays),
    }))

  const peakHourIdx = hourBuckets.reduce((best, v, i) => (v > hourBuckets[best] ? i : best), 0)
  const peakHour = `${String(peakHourIdx).padStart(2, '0')}:00`

  const fullListenBonus = Math.max(0, ends - skips) * 1.2
  const favoriteBonus = favorites * 1.6
  const diversityBonus = Math.min(25, Math.max(0, topSongs.filter((s) => s.playtimeSec > 0).length - 2) * 0.5)
  const earlySkipPenalty = skips * 1.4
  const mutePenalty = mutes * 0.55
  const volumeThrashPenalty = volumeThrash * 0.9
  const dislikePenalty = dislikes * 1.1
  const resonanceDelta = Number((fullListenBonus + favoriteBonus + diversityBonus - earlySkipPenalty - mutePenalty - volumeThrashPenalty - dislikePenalty).toFixed(2))

  const activeSessionCount = bySession.size

  return {
    metrics: {
      playtimeSec: totalPlaytimeSec,
      completionRatio: ratio(ends, starts),
      skipRatio: ratio(skips, starts),
      starts,
      ends,
      skips,
      pauses,
      resumes,
      mutes,
      unmutes,
      volumeChanges,
      seeks,
      favorites,
      dislikes,
      activeSessionCount,
      peakHour,
      volumeThrash,
    },
    topSongs,
    actionCounts: kindCounts,
    hourBuckets,
    resonance: {
      delta: resonanceDelta,
      components: {
        fullListenBonus,
        favoriteBonus,
        diversityBonus,
        earlySkipPenalty,
        mutePenalty,
        volumeThrashPenalty,
        dislikePenalty,
      },
    },
  }
}

export async function computeBasicRollups({ agentId = null, window = 'all' } = {}) {
  const from = computeFromBoundary(window)
  const events = await readTelemetryEvents({ agentId, from, limit: 100000 })
  return {
    agentId,
    window,
    ...aggregate(events),
  }
}

export async function refreshTelemetryRollups() {
  await ensureTelemetryStorage()
  const [all, d7, d30] = await Promise.all([
    computeBasicRollups({ window: 'all' }),
    computeBasicRollups({ window: '7d' }),
    computeBasicRollups({ window: '30d' }),
  ])

  const payload = {
    updatedAt: new Date().toISOString(),
    windows: { all, d7, d30 },
  }
  await fs.writeFile(rollupsFile, JSON.stringify(payload, null, 2), 'utf8')
  return payload
}
