// server/discover.mjs — edge + master scanner for agent authority
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const HOME = os.homedir()
const HOSTNAME = os.hostname().toLowerCase()
const CURRENT_USER = os.userInfo().username
const NODE_NAME = String(process.env.VAIB_NODE_NAME || HOSTNAME).trim().toLowerCase()

const REMOTE_DISCOVERY_PORT = Number(process.env.VAIB_REMOTE_DISCOVERY_PORT || 4014)
const REMOTE_DISCOVERY_TIMEOUT_MS = Number(process.env.VAIB_REMOTE_DISCOVERY_TIMEOUT_MS || 2500)
const REMOTE_DISCOVERY_DISABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.VAIB_DISABLE_REMOTE_DISCOVERY || '').toLowerCase())

const EDGE_CACHE_MS = Number(process.env.VAIB_EDGE_SCAN_CACHE_MS || 15000)
const GLOBAL_CACHE_MS = Number(process.env.VAIB_GLOBAL_SCAN_CACHE_MS || 45000)
const ACTIVE_WINDOW_MS = Number(process.env.VAIB_ACTIVE_WINDOW_MS || 2 * 60 * 1000)
const STALE_WINDOW_MS = Number(process.env.VAIB_STALE_WINDOW_MS || 7 * 24 * 60 * 60 * 1000)

const cache = {
  edge: { ts: 0, payload: null, inFlight: null },
  global: { ts: 0, payload: null, inFlight: null },
}

let scannerTimer = null

function nowIso() {
  return new Date().toISOString()
}

function parseSoul(raw) {
  const lines = raw.split('\n')
  let name = null
  let role = null
  let vibe = null

  for (const line of lines) {
    if (!name && /^# SOUL\s*[—–-]\s*/i.test(line)) {
      name = line.replace(/^# SOUL\s*[—–-]\s*/i, '').trim()
      continue
    }
    if (!role && /^- You are /i.test(line)) {
      const match = line.match(/^- You are [^:]+:\s*(.+)/)
      if (match) role = match[1].trim()
      continue
    }
    if (!vibe && /^- Style:/i.test(line)) {
      vibe = line.replace(/^- Style:\s*/i, '').trim()
      continue
    }
  }

  return { name, role, vibe }
}

function isoFromMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return null
  return new Date(ms).toISOString()
}

async function statMs(p) {
  try {
    const st = await fs.stat(p)
    return st?.mtimeMs || 0
  } catch {
    return 0
  }
}

async function readGatewayState(profileDir) {
  try {
    const raw = await fs.readFile(path.join(profileDir, 'gateway_state.json'), 'utf8')
    const data = JSON.parse(raw)
    const updatedAtMs = Date.parse(data.updated_at || '')
    return {
      state: data.gateway_state || null,
      updatedAt: data.updated_at || null,
      updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
    }
  } catch {
    return { state: null, updatedAt: null, updatedAtMs: 0 }
  }
}

async function listHomeRoots() {
  const roots = new Map()
  roots.set(HOME, CURRENT_USER)

  try {
    const entries = await fs.readdir('/home', { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const user = entry.name
      const p = path.join('/home', user)
      roots.set(p, user)
    }
  } catch {
    // not all systems expose /home
  }

  return [...roots.entries()].map(([home, user]) => ({ home, user }))
}

function localAgentId(user, baseId) {
  if (user === CURRENT_USER) return baseId
  return `${user}:${baseId}`
}

function makeEdgeSource({ kind, node = NODE_NAME, owner, path: srcPath, lastSeenAt, active, confidence, gatewayState = null, detail = null }) {
  return {
    kind,
    node,
    owner,
    path: srcPath,
    lastSeenAt: lastSeenAt || null,
    active: Boolean(active),
    confidence: Number(confidence) || 0.5,
    gatewayState: gatewayState || null,
    detail,
  }
}

function classifyAgent(agent) {
  const lastSeenMs = Date.parse(agent.lastSeenAt || '')
  const age = Number.isFinite(lastSeenMs) ? Date.now() - lastSeenMs : Number.POSITIVE_INFINITY

  let status = 'orphaned'
  if (agent.inUse) status = 'active'
  else if (age <= ACTIVE_WINDOW_MS * 20) status = 'idle'
  else if (age <= STALE_WINDOW_MS) status = 'stale'
  else status = 'orphaned'

  const stale = status === 'stale' || status === 'orphaned'
  const srcCountBonus = Math.min(0.2, Math.max(0, agent.sources.length - 1) * 0.05)
  const activeBonus = agent.inUse ? 0.1 : 0
  const agePenalty = age > STALE_WINDOW_MS ? 0.2 : 0
  const baseConfidence = Math.max(0, ...agent.sources.map((s) => Number(s.confidence) || 0))
  const confidence = Math.max(0, Math.min(1, Number((baseConfidence + srcCountBonus + activeBonus - agePenalty).toFixed(2))))

  return {
    ...agent,
    status,
    stale,
    confidence,
  }
}

async function discoverHermesAgentsInHome({ home, user }) {
  const out = []
  const profilesDir = path.join(home, '.hermes', 'profiles')

  let entries
  try {
    entries = await fs.readdir(profilesDir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const profileDir = path.join(profilesDir, entry.name)

    let parsed = { name: entry.name, role: null, vibe: null }
    try {
      const raw = await fs.readFile(path.join(profileDir, 'SOUL.md'), 'utf8')
      const fromSoul = parseSoul(raw)
      if (fromSoul.name) parsed.name = fromSoul.name
      parsed.role = fromSoul.role
      parsed.vibe = fromSoul.vibe
    } catch {
      // keep defaults
    }

    const gw = await readGatewayState(profileDir)
    const mtimeMs = await statMs(profileDir)
    const lastSeenMs = Math.max(mtimeMs, gw.updatedAtMs || 0)
    const active = gw.state === 'running' || (Date.now() - lastSeenMs) <= ACTIVE_WINDOW_MS

    const id = localAgentId(user, entry.name)
    const source = makeEdgeSource({
      kind: 'hermes-profile',
      owner: user,
      path: profileDir,
      lastSeenAt: isoFromMs(lastSeenMs),
      active,
      confidence: gw.state ? 0.95 : 0.8,
      gatewayState: gw.state,
      detail: 'filesystem profile scan',
    })

    out.push({
      id,
      shortId: entry.name,
      name: parsed.name || entry.name,
      role: parsed.role || null,
      vibe: parsed.vibe || null,
      owner: user,
      node: NODE_NAME,
      lastSeenAt: source.lastSeenAt,
      inUse: source.active,
      sources: [source],
      warnings: [],
    })
  }

  return out
}

async function discoverOpenClawAgentsInHome({ home, user }) {
  const out = []
  const agentsDir = path.join(home, '.openclaw', 'agents')

  let entries
  try {
    entries = await fs.readdir(agentsDir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const agentDir = path.join(agentsDir, entry.name)

    let name = entry.name
    let role = null
    let vibe = null

    for (const candidate of ['SOUL.md', 'IDENTITY.md', 'identity.md']) {
      try {
        const raw = await fs.readFile(path.join(agentDir, candidate), 'utf8')
        const parsed = parseSoul(raw)
        if (parsed.name) name = parsed.name
        role = parsed.role
        vibe = parsed.vibe
        break
      } catch {
        // continue
      }
    }

    const mtimeMs = await statMs(agentDir)
    const idBase = `openclaw-${entry.name}`
    const id = localAgentId(user, idBase)
    const active = (Date.now() - mtimeMs) <= ACTIVE_WINDOW_MS

    const source = makeEdgeSource({
      kind: 'openclaw-agent',
      owner: user,
      path: agentDir,
      lastSeenAt: isoFromMs(mtimeMs),
      active,
      confidence: 0.75,
      detail: 'filesystem openclaw agent scan',
    })

    out.push({
      id,
      shortId: idBase,
      name,
      role,
      vibe,
      owner: user,
      node: NODE_NAME,
      lastSeenAt: source.lastSeenAt,
      inUse: source.active,
      sources: [source],
      warnings: [],
    })
  }

  return out
}

function mergeAgentRows(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        ...row,
        sources: [...(row.sources || [])],
        warnings: [...(row.warnings || [])],
      })
      continue
    }

    const current = map.get(row.id)
    const mergedSources = [...current.sources, ...(row.sources || [])]
    const mergedWarnings = [...new Set([...(current.warnings || []), ...(row.warnings || [])])]
    const role = current.role || row.role || null
    const vibe = current.vibe || row.vibe || null
    const name = current.name || row.name || row.id

    const currentLast = Date.parse(current.lastSeenAt || '')
    const rowLast = Date.parse(row.lastSeenAt || '')
    const lastSeenAt = Number.isFinite(currentLast) && Number.isFinite(rowLast)
      ? (rowLast > currentLast ? row.lastSeenAt : current.lastSeenAt)
      : (current.lastSeenAt || row.lastSeenAt || null)

    map.set(row.id, {
      ...current,
      name,
      role,
      vibe,
      lastSeenAt,
      inUse: Boolean(current.inUse || row.inUse || mergedSources.some((s) => s.active)),
      sources: mergedSources,
      warnings: mergedWarnings,
    })
  }

  return [...map.values()].map(classifyAgent)
}

function loadRemoteEndpointConfig() {
  const jsonPath = path.join(process.cwd(), 'config', 'discovery.endpoints.json')
  try {
    const raw = readFileSync(jsonPath, 'utf8')
    const parsed = JSON.parse(raw)
    const endpoints = Array.isArray(parsed?.endpoints) ? parsed.endpoints : []
    return endpoints
      .map((e) => ({
        name: String(e?.name || '').trim().toLowerCase(),
        host: String(e?.host || '').trim(),
      }))
      .filter((e) => e.name && e.host)
  } catch {
    return []
  }
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function discoverEdgeAgents() {
  const homes = await listHomeRoots()
  const scans = await Promise.all(
    homes.map(async (homeInfo) => {
      const [hermes, openclaw] = await Promise.all([
        discoverHermesAgentsInHome(homeInfo),
        discoverOpenClawAgentsInHome(homeInfo),
      ])
      return [...hermes, ...openclaw]
    }),
  )

  const merged = mergeAgentRows(scans.flat())
  merged.sort((a, b) => {
    if (a.status !== b.status) {
      const rank = { active: 0, idle: 1, stale: 2, orphaned: 3 }
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
    }
    return Date.parse(b.lastSeenAt || 0) - Date.parse(a.lastSeenAt || 0)
  })

  return {
    scope: 'edge',
    node: NODE_NAME,
    updatedAt: nowIso(),
    agents: merged,
    stats: {
      total: merged.length,
      active: merged.filter((a) => a.status === 'active').length,
      stale: merged.filter((a) => a.stale).length,
    },
  }
}

function normalizeRemoteRegistryAgent(endpointName, agent) {
  if (!agent || typeof agent !== 'object') return null
  const rawId = String(agent.id || '').trim()
  if (!rawId) return null

  const id = rawId.includes(':') ? rawId : `${endpointName}:${rawId}`
  const src = makeEdgeSource({
    kind: 'remote-edge',
    node: endpointName,
    owner: agent.owner || null,
    path: null,
    lastSeenAt: agent.lastSeenAt || null,
    active: Boolean(agent.inUse || agent.status === 'active'),
    confidence: Number(agent.confidence) || 0.7,
    gatewayState: agent.gatewayState || null,
    detail: 'aggregated from remote edge scanner',
  })

  return {
    id,
    shortId: String(agent.shortId || rawId).split(':').pop(),
    name: agent.name || rawId,
    role: agent.role || null,
    vibe: agent.vibe || null,
    owner: agent.owner || null,
    node: endpointName,
    lastSeenAt: agent.lastSeenAt || null,
    inUse: src.active,
    sources: [src],
    warnings: Array.isArray(agent.warnings) ? agent.warnings.slice(0, 10) : [],
  }
}

function normalizeRemoteLegacyAgent(endpointName, rawAgent = {}) {
  const baseId = String(rawAgent.id || '').trim() || 'unknown'
  const id = `${endpointName}:${baseId}`
  const src = makeEdgeSource({
    kind: 'remote-legacy',
    node: endpointName,
    owner: null,
    path: null,
    lastSeenAt: rawAgent.updatedAt || null,
    active: Boolean(rawAgent.active),
    confidence: 0.6,
    gatewayState: rawAgent.gatewayState || null,
    detail: 'fallback from /agents endpoint',
  })

  return {
    id,
    shortId: baseId,
    name: rawAgent.name || baseId,
    role: rawAgent.role || null,
    vibe: rawAgent.vibe || null,
    owner: null,
    node: endpointName,
    lastSeenAt: rawAgent.updatedAt || null,
    inUse: src.active,
    sources: [src],
    warnings: [],
  }
}

async function discoverRemoteRows() {
  if (REMOTE_DISCOVERY_DISABLED) return []

  const endpoints = loadRemoteEndpointConfig()
  if (!endpoints.length) return []

  const filtered = endpoints.filter((e) => e.name !== NODE_NAME)
  if (!filtered.length) return []

  const payloads = await Promise.all(
    filtered.map(async (endpoint) => {
      const registry = await fetchJsonWithTimeout(
        `http://${endpoint.host}:${REMOTE_DISCOVERY_PORT}/registry/agents?scope=edge`,
        REMOTE_DISCOVERY_TIMEOUT_MS,
      )

      if (Array.isArray(registry?.agents)) {
        return { endpoint, mode: 'registry', rows: registry.agents }
      }

      const legacy = await fetchJsonWithTimeout(
        `http://${endpoint.host}:${REMOTE_DISCOVERY_PORT}/agents`,
        REMOTE_DISCOVERY_TIMEOUT_MS,
      )
      return {
        endpoint,
        mode: 'legacy',
        rows: Array.isArray(legacy?.agents) ? legacy.agents : [],
      }
    }),
  )

  const all = []
  for (const p of payloads) {
    if (p.mode === 'registry') {
      for (const row of p.rows) {
        const normalized = normalizeRemoteRegistryAgent(p.endpoint.name, row)
        if (normalized) all.push(normalized)
      }
    } else {
      for (const row of p.rows) {
        all.push(normalizeRemoteLegacyAgent(p.endpoint.name, row))
      }
    }
  }

  return all
}

async function computeRegistryPayload(scope = 'global') {
  const local = await discoverEdgeAgents()
  if (scope === 'edge') return local

  const remoteRows = await discoverRemoteRows()
  const merged = mergeAgentRows([...local.agents, ...remoteRows])
  merged.sort((a, b) => {
    if (a.status !== b.status) {
      const rank = { active: 0, idle: 1, stale: 2, orphaned: 3 }
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
    }
    return Date.parse(b.lastSeenAt || 0) - Date.parse(a.lastSeenAt || 0)
  })

  return {
    scope: 'global',
    node: NODE_NAME,
    updatedAt: nowIso(),
    agents: merged,
    stats: {
      total: merged.length,
      active: merged.filter((a) => a.status === 'active').length,
      stale: merged.filter((a) => a.stale).length,
      remoteSources: remoteRows.length,
    },
  }
}

export async function discoverAgentRegistry({ scope = 'global', force = false } = {}) {
  const key = scope === 'edge' ? 'edge' : 'global'
  const ttl = key === 'edge' ? EDGE_CACHE_MS : GLOBAL_CACHE_MS
  const slot = cache[key]

  if (!force && slot.payload && Date.now() - slot.ts <= ttl) return slot.payload
  if (slot.inFlight) return slot.inFlight

  slot.inFlight = computeRegistryPayload(key)
    .then((payload) => {
      slot.payload = payload
      slot.ts = Date.now()
      return payload
    })
    .finally(() => {
      slot.inFlight = null
    })

  return slot.inFlight
}

export function startDiscoveryScanner() {
  if (scannerTimer) return
  discoverAgentRegistry({ scope: 'global', force: true }).catch(() => {})
  scannerTimer = setInterval(() => {
    discoverAgentRegistry({ scope: 'global', force: true }).catch(() => {})
  }, GLOBAL_CACHE_MS)
  if (typeof scannerTimer.unref === 'function') scannerTimer.unref()
}

// Legacy shape used by existing /agents consumers
export async function discoverAgents() {
  const registry = await discoverAgentRegistry({ scope: 'global' })
  const out = registry.agents.map((agent) => {
    const gateway = agent.sources.find((s) => s.gatewayState)?.gatewayState
    return {
      id: agent.id,
      name: agent.name || agent.id,
      source: agent.sources?.[0]?.kind || 'registry',
      role: agent.role || null,
      vibe: agent.vibe || null,
      gatewayState: gateway || (agent.status === 'active' ? 'running' : agent.status),
      updatedAt: agent.lastSeenAt,
      active: agent.status === 'active',
      confidence: agent.confidence,
      stale: agent.stale,
      owner: agent.owner || null,
    }
  })

  out.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)
  })

  return out
}
