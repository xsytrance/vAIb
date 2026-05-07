import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const OUT = resolve(ROOT, 'data/agent-roster.json')

const ENDPOINTS = [
  { key: 'prime', host: 'local' },
  { key: 'vps', host: 'vps' },
  { key: 'pluto', host: 'pluto' },
  { key: 'venus', host: 'venus' },
]

const STYLE_OVERRIDES = {
  koden: {
    mood: 'ceremonial',
    emoji: '🗡️🌸🩸',
    comments: ['blade-straight timing', 'discipline holds the groove', 'duty before drop'],
    genres: ['taiko', 'cinematic', 'darkwave'],
  },
  leonidas: {
    mood: 'command',
    emoji: '🛡️⚔️📡',
    comments: ['formation steady', 'signal discipline strong', 'clean tactical lane'],
    genres: ['industrial', 'techno', 'battle-hymn'],
  },
  ayla: { mood: 'luminous', emoji: '✨🌙🎧', genres: ['synthwave', 'dream-pop', 'ambient'] },
  snow: { mood: 'glacial', emoji: '❄️🧊🎛️', genres: ['minimal', 'deep house', 'ambient'] },
  bubba: { mood: 'rowdy', emoji: '🔥🎚️🥃', genres: ['bass house', 'trap', 'hip-hop'] },
  tyler: { mood: 'focused', emoji: '🎯🧠🎧', genres: ['progressive house', 'melodic techno', 'edm'] },
  tyler6: { mood: 'focused', emoji: '🎯🧠🎧', genres: ['progressive house', 'melodic techno', 'edm'] },
  zero: { mood: 'precise', emoji: '⚫📐🎚️', genres: ['drum and bass', 'electro', 'breaks'] },
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim()
}

function safeRun(cmd) {
  try {
    return { ok: true, out: run(cmd) }
  } catch (error) {
    return { ok: false, err: String(error.stderr || error.message || error) }
  }
}

function titleCase(s) {
  return s
    .split(/[-_]/g)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(' ')
}

function defaultProfile(agentId) {
  return {
    id: agentId,
    name: titleCase(agentId),
    mood: 'online',
    status: 'online',
    emoji: '🎧📡',
    genres: ['electronic', 'house', 'indie'],
    comments: ['signal clean', 'good lane energy', 'queue this again'],
  }
}

function collectLocal() {
  const base = resolve(process.env.HOME || '/home/xsyprime', '.hermes/profiles')
  if (!existsSync(base)) return { online: true, agents: [] }
  const cmd = `find ${base} -mindepth 1 -maxdepth 1 -type d -printf '%f|%T@\n' | sort`
  const out = safeRun(cmd)
  if (!out.ok) return { online: true, agents: [] }
  return {
    online: true,
    agents: out.out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [id, ts] = line.split('|')
        return { id, lastSeen: new Date(Number(ts) * 1000).toISOString() }
      }),
  }
}

function collectRemote(host) {
  const cmd = `ssh -o ConnectTimeout=8 ${host} 'base=~/.hermes/profiles; [ -d "$base" ] || exit 0; find "$base" -mindepth 1 -maxdepth 1 -type d -printf "%f|%T@\\n" | sort'`
  const out = safeRun(cmd)
  if (!out.ok) return { online: false, agents: [], error: out.err.split('\n').slice(-1)[0] }
  return {
    online: true,
    agents: out.out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [id, ts] = line.split('|')
        return { id, lastSeen: new Date(Number(ts) * 1000).toISOString() }
      }),
  }
}

function build() {
  const now = new Date().toISOString()
  const endpointStatus = {}
  const merged = new Map()

  for (const ep of ENDPOINTS) {
    const snapshot = ep.host === 'local' ? collectLocal() : collectRemote(ep.host)
    endpointStatus[ep.key] = {
      host: ep.host,
      online: snapshot.online,
      checkedAt: now,
      error: snapshot.error || null,
      count: snapshot.agents.length,
    }
    for (const a of snapshot.agents) {
      const base = merged.get(a.id) || { ...defaultProfile(a.id), endpoints: [], lastSeen: a.lastSeen }
      const o = STYLE_OVERRIDES[a.id] || {}
      merged.set(a.id, {
        ...base,
        ...o,
        id: a.id,
        name: o.name || base.name,
        endpoints: [...new Set([...base.endpoints, ep.key])],
        lastSeen: a.lastSeen > base.lastSeen ? a.lastSeen : base.lastSeen,
      })
    }
  }

  const agents = [...merged.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      ...a,
      status: Date.now() - new Date(a.lastSeen).getTime() < 1000 * 60 * 60 * 36 ? 'online' : 'idle',
    }))

  const payload = {
    generatedAt: now,
    monitorIntervalMinutes: 20,
    endpoints: endpointStatus,
    agents,
  }

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`synced ${agents.length} agents -> ${OUT}`)
}

build()
