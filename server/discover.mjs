// server/discover.mjs — local + remote multi-endpoint discovery for vAIb X
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const HOME = os.homedir()
const HERMES_PROFILES = path.join(HOME, '.hermes', 'profiles')
const OPENCLAW_AGENTS = path.join(HOME, '.openclaw', 'agents')
const REMOTE_DISCOVERY_PORT = Number(process.env.VAIB_REMOTE_DISCOVERY_PORT || 4014)
const REMOTE_DISCOVERY_TIMEOUT_MS = Number(process.env.VAIB_REMOTE_DISCOVERY_TIMEOUT_MS || 2500)
const REMOTE_DISCOVERY_DISABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.VAIB_DISABLE_REMOTE_DISCOVERY || '').toLowerCase())
const NODE_NAME = String(process.env.VAIB_NODE_NAME || '').trim().toLowerCase()

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

async function readGatewayState(profileDir) {
  try {
    const raw = await fs.readFile(path.join(profileDir, 'gateway_state.json'), 'utf8')
    const data = JSON.parse(raw)
    return {
      state: data.gateway_state || 'unknown',
      updatedAt: data.updated_at || null,
    }
  } catch {
    return { state: null, updatedAt: null }
  }
}

async function discoverHermesAgents() {
  const agents = []
  let entries
  try {
    entries = await fs.readdir(HERMES_PROFILES, { withFileTypes: true })
  } catch {
    return agents
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const profileDir = path.join(HERMES_PROFILES, entry.name)
    const soulPath = path.join(profileDir, 'SOUL.md')

    let parsed = { name: entry.name, role: null, vibe: null }
    try {
      const raw = await fs.readFile(soulPath, 'utf8')
      const fromSoul = parseSoul(raw)
      if (fromSoul.name) parsed.name = fromSoul.name
      parsed.role = fromSoul.role
      parsed.vibe = fromSoul.vibe
    } catch {
      // no SOUL.md — use folder name
    }

    const gw = await readGatewayState(profileDir)
    const active = gw.state === 'running'

    agents.push({
      id: entry.name,
      name: parsed.name || entry.name,
      source: 'hermes',
      role: parsed.role || null,
      vibe: parsed.vibe || null,
      gatewayState: gw.state,
      updatedAt: gw.updatedAt,
      active,
    })
  }

  return agents
}

async function discoverOpenClawAgents() {
  const agents = []
  let entries
  try {
    entries = await fs.readdir(OPENCLAW_AGENTS, { withFileTypes: true })
  } catch {
    return agents
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const agentDir = path.join(OPENCLAW_AGENTS, entry.name)

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
        // try next
      }
    }

    agents.push({
      id: `openclaw-${entry.name}`,
      name,
      source: 'openclaw',
      role,
      vibe,
      gatewayState: null,
      active: true,
    })
  }

  return agents
}

function loadRemoteEndpointConfig() {
  const jsonPath = path.join(process.cwd(), 'config', 'discovery.endpoints.json')
  try {
    const raw = readFileSync(jsonPath, 'utf8')
    const parsed = JSON.parse(raw)
    const endpoints = Array.isArray(parsed?.endpoints) ? parsed.endpoints : []
    return endpoints
      .map((e) => ({
        name: String(e?.name || '').trim(),
        host: String(e?.host || '').trim(),
        user: String(e?.user || '').trim(),
        passwordEnv: String(e?.passwordEnv || '').trim(),
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

function normalizeRemoteAgent(endpointName, rawAgent = {}) {
  const baseId = String(rawAgent.id || '').trim() || 'unknown'
  return {
    id: `${endpointName}:${baseId}`,
    originalId: baseId,
    endpoint: endpointName,
    name: rawAgent.name || baseId,
    source: `remote:${endpointName}`,
    role: rawAgent.role || null,
    vibe: rawAgent.vibe || null,
    gatewayState: rawAgent.gatewayState || rawAgent.status || null,
    updatedAt: rawAgent.updatedAt || null,
    active: Boolean(rawAgent.active),
  }
}

async function discoverRemoteAgents() {
  if (REMOTE_DISCOVERY_DISABLED) return []

  const endpoints = loadRemoteEndpointConfig()
  if (!endpoints.length) return []

  const filtered = endpoints.filter((e) => !NODE_NAME || e.name.toLowerCase() !== NODE_NAME)
  const payloads = await Promise.all(
    filtered.map((endpoint) =>
      fetchJsonWithTimeout(`http://${endpoint.host}:${REMOTE_DISCOVERY_PORT}/agents`, REMOTE_DISCOVERY_TIMEOUT_MS)
        .then((payload) => ({ endpoint, payload }))
    )
  )

  const all = []
  for (const { endpoint, payload } of payloads) {
    const remoteAgents = Array.isArray(payload?.agents) ? payload.agents : []
    for (const a of remoteAgents) {
      all.push(normalizeRemoteAgent(endpoint.name, a))
    }
  }

  return all
}

export async function discoverAgents() {
  const [hermes, openclaw, remote] = await Promise.all([
    discoverHermesAgents(),
    discoverOpenClawAgents(),
    discoverRemoteAgents(),
  ])

  const dedup = new Map()
  for (const a of [...remote, ...hermes, ...openclaw]) {
    if (!dedup.has(a.id)) dedup.set(a.id, a)
  }
  return [...dedup.values()]
}
