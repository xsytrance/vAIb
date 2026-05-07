import fs from 'node:fs'
import path from 'node:path'

const ROOT = resolveRoot()
const ROSTER_PATH = path.join(ROOT, 'data', 'agent-roster.json')
const SNAPSHOT_PATH = '/home/xsyprime/android-division/apps/prime-nexus/app/src/main/assets/prime_status_snapshot.json'
const OUT_PATH = path.join(ROOT, 'data', 'cockpit-bridge.json')

function resolveRoot() {
  return path.resolve(new URL('..', import.meta.url).pathname)
}

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

function sevWeight(sev) {
  const s = String(sev || '').toUpperCase()
  if (s === 'RED') return 100
  if (s === 'YELLOW') return 55
  return 20
}

function scoreModules(snapshot) {
  const mods = snapshot?.moduleStatuses || []
  if (!mods.length) return { pressure: 30, modules: {} }
  const moduleMap = {}
  let total = 0
  for (const m of mods) {
    const w = sevWeight(m.severity)
    moduleMap[m.name] = { severity: m.severity, pressure: w }
    total += w
  }
  return { pressure: Math.round(total / mods.length), modules: moduleMap }
}

function endpointPressure(snapshot) {
  const alerts = snapshot?.alerts || []
  const map = { prime: 30, vps: 30, pluto: 45, venus: 30 }
  for (const a of alerts) {
    const host = String(a.host || '').toLowerCase()
    if (!map[host]) continue
    map[host] = Math.min(100, Math.round((map[host] + sevWeight(a.severity)) / 2))
  }
  return map
}

function moodForWorkload(workload) {
  if (workload >= 75) return 'combat focus'
  if (workload >= 55) return 'locked in'
  if (workload >= 35) return 'steady ops'
  return 'creative drift'
}

function genresForWorkload(baseGenres, workload) {
  if (workload >= 75) return ['industrial', 'drum and bass', 'hard techno']
  if (workload >= 55) return ['techno', 'breaks', 'progressive']
  if (workload >= 35) return baseGenres
  return ['ambient', 'chillwave', 'dream-pop']
}

function build() {
  const roster = readJson(ROSTER_PATH, { agents: [] })
  const snapshot = readJson(SNAPSHOT_PATH, { moduleStatuses: [], alerts: [], lastUpdated: null })

  const moduleScore = scoreModules(snapshot)
  const byEndpoint = endpointPressure(snapshot)

  const agents = (roster.agents || []).map((a) => {
    const eps = (a.endpoints || []).filter(Boolean)
    const endpointAvg = eps.length
      ? Math.round(eps.reduce((n, e) => n + (byEndpoint[e] || 35), 0) / eps.length)
      : 35
    const workload = Math.min(100, Math.round(endpointAvg * 0.65 + moduleScore.pressure * 0.35))
    return {
      id: a.id,
      workload,
      moodFromWork: moodForWorkload(workload),
      preferredGenresNow: genresForWorkload(a.genres || ['electronic'], workload),
      active: a.status === 'online',
      endpoints: eps,
      lastSeen: a.lastSeen,
    }
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      rosterPath: ROSTER_PATH,
      cockpitSnapshotPath: SNAPSHOT_PATH,
      cockpitLastUpdated: snapshot.lastUpdated || null,
    },
    globalPressure: moduleScore.pressure,
    modulePressure: moduleScore.modules,
    endpointPressure: byEndpoint,
    agents,
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n')
  console.log(`synced cockpit bridge -> ${OUT_PATH} (${agents.length} agents)`)
}

build()
