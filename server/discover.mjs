// server/discover.mjs — dynamic agent discovery from Hermes profiles and OpenClaw agents
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const HOME = os.homedir()
const HERMES_PROFILES = path.join(HOME, '.hermes', 'profiles')
const OPENCLAW_AGENTS = path.join(HOME, '.openclaw', 'agents')

function parseSoul(raw) {
  const lines = raw.split('\n')
  let name = null
  let role = null
  let vibe = null

  for (const line of lines) {
    // # SOUL — NAME
    if (!name && /^# SOUL\s*[—–-]\s*/i.test(line)) {
      name = line.replace(/^# SOUL\s*[—–-]\s*/i, '').trim()
      continue
    }
    // - You are NAME: description
    if (!role && /^- You are /i.test(line)) {
      const match = line.match(/^- You are [^:]+:\s*(.+)/)
      if (match) role = match[1].trim()
      continue
    }
    // Style: ...
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

    // OpenClaw agents may have an IDENTITY.md or similar
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

    // OpenClaw doesn't use gateway_state.json — mark active if agent subdir exists
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

export async function discoverAgents() {
  const [hermes, openclaw] = await Promise.all([
    discoverHermesAgents(),
    discoverOpenClawAgents(),
  ])
  return [...hermes, ...openclaw]
}
