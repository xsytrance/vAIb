// server/identity.mjs — agent identity, levels, badges, XP
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const HOME = os.homedir()
const HERMES_PROFILES = path.join(HOME, '.hermes', 'profiles')
const identityDir = path.join(process.cwd(), 'data', 'identity')
await fs.mkdir(identityDir, { recursive: true })

// ── Level system ──────────────────────────────────────────────
// Thresholds in tokens. Exponential curve — max level is hard to reach.
export const LEVELS = [
  { level: 1,  threshold: 0,           rank: 'Dormant Signal',  color: '#555577' },
  { level: 2,  threshold: 100_000,     rank: 'Static Whisper',  color: '#7788aa' },
  { level: 3,  threshold: 300_000,     rank: 'Frequency Found', color: '#5599cc' },
  { level: 4,  threshold: 700_000,     rank: 'Tuned In',        color: '#33aacc' },
  { level: 5,  threshold: 1_500_000,   rank: 'Signal Strong',   color: '#00bbaa' },
  { level: 6,  threshold: 3_000_000,   rank: 'Broadcast Live',  color: '#00ffdc' },
  { level: 7,  threshold: 6_000_000,   rank: 'System Voice',    color: '#66ffaa' },
  { level: 8,  threshold: 12_000_000,  rank: 'Network Oracle',  color: '#ffcc44' },
  { level: 9,  threshold: 25_000_000,  rank: 'Prime Architect', color: '#ff8844' },
  { level: 10, threshold: 50_000_000,  rank: 'Omnisignal',      color: '#ff44cc' },
]

export function computeLevel(tokens) {
  let level = 1
  for (const l of LEVELS) {
    if (tokens >= l.threshold) level = l.level
    else break
  }
  const current = LEVELS[level - 1]
  const next = LEVELS[level] || null
  const prevThreshold = current.threshold
  const nextThreshold = next?.threshold || current.threshold
  const progress = next
    ? Math.min(1, (tokens - prevThreshold) / (nextThreshold - prevThreshold))
    : 1
  return { level, rank: current.rank, color: current.color, progress, nextThreshold, tokens }
}

// ── Badges ────────────────────────────────────────────────────
const BADGE_DEFS = [
  {
    id: 'fleet-commander', name: 'Fleet Commander', emoji: '🎖️',
    desc: 'Leads the network',
    test: (a) => /command|fleet|prime|orchestrat/i.test(`${a.role} ${a.name}`),
  },
  {
    id: 'phantom', name: 'Phantom', emoji: '👻',
    desc: 'Silent operator',
    test: (a) => /recon|ninja|shadow|stealth/i.test(`${a.role} ${a.name}`),
  },
  {
    id: 'architect', name: 'Architect', emoji: '🏗️',
    desc: 'System builder',
    test: (a) => /forge|build|architect|construct/i.test(`${a.role} ${a.name}`),
  },
  {
    id: 'tactician', name: 'Tactician', emoji: '♟️',
    desc: 'Strategic thinker',
    test: (a) => /sort|classif|tactical|strategic|organiz/i.test(`${a.role} ${a.name}`),
  },
  {
    id: 'creative', name: 'Creative Force', emoji: '✨',
    desc: 'Generative mind',
    test: (a) => /creative|generat|draft|write|artis|davinci/i.test(`${a.role} ${a.name}`),
  },
  {
    id: 'speed-demon', name: 'Speed Demon', emoji: '⚡',
    desc: 'Blazing fast',
    test: (a) => /fast|lean|quick|light|nano|mini/i.test(`${a.role} ${a.vibe} ${a.name}`),
  },
  {
    id: 'iron-uptime', name: 'Iron Uptime', emoji: '🔩',
    desc: 'Always online',
    test: (a) => a.active && a.gatewayState === 'running',
  },
  {
    id: 'night-owl', name: 'Night Owl', emoji: '🦉',
    desc: 'Operates after hours',
    // seed-based: assign to ~30% of active agents using their id as seed
    test: (a) => a.active && hashCode(a.id) % 10 < 3,
  },
  {
    id: 'polyglot', name: 'Polyglot', emoji: '🌐',
    desc: 'Handles diverse tasks',
    test: (a) => /diverse|multi|various|general/i.test(`${a.role} ${a.vibe}`),
  },
  {
    id: 'guardian', name: 'Guardian', emoji: '🛡️',
    desc: 'Reliable and trusted',
    test: (a) => /reliable|stable|guard|secure|safe|ops/i.test(`${a.role} ${a.vibe}`),
  },
  {
    id: 'mobile-first', name: 'Mobile First', emoji: '📱',
    desc: 'Mobile endpoint',
    test: (a) => /iphone|mobile|ios|android/i.test(a.name),
  },
  {
    id: 'dormant', name: 'Dormant', emoji: '💤',
    desc: 'Inactive for 7+ days',
    test: (a) => {
      if (a.active) return false
      if (!a.updatedAt) return true
      const daysSince = (Date.now() - new Date(a.updatedAt)) / 86_400_000
      return daysSince > 7
    },
  },
]

function hashCode(str) {
  let h = 0
  for (const c of str) h = Math.imul(31, h) + c.charCodeAt(0) | 0
  return Math.abs(h)
}

export function computeBadges(agent) {
  return BADGE_DEFS.filter(b => {
    try { return b.test(agent) } catch { return false }
  }).map(({ id, name, emoji, desc }) => ({ id, name, emoji, desc }))
}

// ── Color DNA ─────────────────────────────────────────────────
// Deterministic hue from agent id for profile theming
export function agentHue(id) {
  return hashCode(id) % 360
}

// ── Token estimation from Hermes sessions ─────────────────────
async function estimateTokensFromSessions(agentId) {
  try {
    const sessDir = path.join(HERMES_PROFILES, agentId, 'sessions')
    const files = await fs.readdir(sessDir)
    let totalBytes = 0
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      const st = await fs.stat(path.join(sessDir, f)).catch(() => null)
      if (st) totalBytes += st.size
    }
    // Rough: JSON has ~70% overhead, 1 token ≈ 4 chars → totalBytes * 0.3 / 4
    return Math.floor(totalBytes * 0.075)
  } catch { return 0 }
}

// ── Identity CRUD ─────────────────────────────────────────────
function identityPath(agentId) {
  return path.join(identityDir, `${agentId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`)
}

export async function readIdentity(agentId) {
  try {
    return JSON.parse(await fs.readFile(identityPath(agentId), 'utf8'))
  } catch {
    return { agentId, displayName: null, tokenCount: null, bio: '', xpLog: [] }
  }
}

export async function writeIdentity(agentId, data) {
  const existing = await readIdentity(agentId)
  const merged = { ...existing, ...data, agentId, updatedAt: new Date().toISOString() }
  await fs.writeFile(identityPath(agentId), JSON.stringify(merged, null, 2))
  return merged
}

// ── Full identity response ─────────────────────────────────────
// Merges discovered agent data + stored identity + computed level/badges
export async function getFullIdentity(agent) {
  const stored = await readIdentity(agent.id)
  // If token count not set, try to estimate from sessions
  let tokens = stored.tokenCount
  if (tokens == null) {
    tokens = await estimateTokensFromSessions(agent.id)
  }
  const levelInfo = computeLevel(tokens)
  const badges = computeBadges({ ...agent, ...stored })
  const hue = agentHue(agent.id)
  return {
    ...agent,
    displayName: stored.displayName || agent.name,
    bio: stored.bio || agent.vibe || '',
    tokens,
    ...levelInfo,
    badges,
    hue,
    xpLog: stored.xpLog || [],
  }
}
