import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AtmosphereProvider, useAtmosphere } from './atmosphere/AtmosphereProvider'
import AtmosphereCanvas from './visual/AtmosphereCanvas'
import Visualizer from './visual/Visualizer'
import { startAudioAtmosphere, stopAudioAtmosphere, updateAudioAtmosphere } from './audio/AudioAtmosphere'

const moodOptions = [
  'focused lift',
  'night-drive transcendence',
  'reflective glide',
  'breakbeat hunt',
  'ambient recovery',
]

// In dev: empty string → Vite proxy handles /api/backend/*
// In production/Android: VITE_API_BASE=http://100.110.224.126:4014
const API = (typeof __API_BASE__ !== 'undefined' && __API_BASE__)
  ? __API_BASE__
  : '/api/backend'

async function loadState() {
  const response = await fetch(`${API}/state`)
  if (!response.ok) throw new Error('Failed to load vAIb state')
  return response.json()
}

async function sendAction(action, payload = {}) {
  const response = await fetch(`${API}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  return response.json()
}

async function loadTracks() {
  const response = await fetch(`${API}/music/tracks`)
  if (!response.ok) return null
  const data = await response.json()
  return data.tracks || []
}

async function loadAgents() {
  const response = await fetch(`${API}/agents`)
  if (!response.ok) return { agents: [], defaultId: null }
  return response.json()
}


// Deterministic shuffle seeded by a string — same agent always gets same track order
function StationPlayer({ agent, tracks, onAnalyser }) {
  const agentTracks = useMemo(
    () => agent && tracks ? seededShuffle(tracks, agent.id) : [],
    [tracks, agent?.id]
  )
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const analyserRef = useRef(null)

  const initAnalyser = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaElementSource(audioRef.current)
      const node = ctx.createAnalyser()
      node.fftSize = 512
      src.connect(node)
      node.connect(ctx.destination)
      analyserRef.current = node
      onAnalyser?.(node)
    } catch (e) { /* already connected or no support */ }
  }, [onAnalyser])

  // Reset to start when agent changes
  useEffect(() => {
    setTrackIndex(0)
    setProgress(0)
    setDuration(0)
    setPlaying(false)
  }, [agent?.id])

  const track = agentTracks[trackIndex] || null

  useEffect(() => {
    const el = audioRef.current
    if (!el || !track) return
    el.src = track.audioUrl
    if (playing) el.play().catch(() => {})
  }, [trackIndex, track])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setProgress(el.currentTime)
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => { setTrackIndex((i) => (i + 1) % agentTracks.length); setPlaying(true) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [agentTracks])

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    initAnalyser()
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => {}); setPlaying(true) }
  }

  function nextTrack() {
    initAnalyser()
    setTrackIndex((i) => (i + 1) % agentTracks.length)
    setPlaying(true)
  }

  function seek(e) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  if (!agent) return null

  const pct = duration ? (progress / duration) * 100 : 0
  const hasTracks = agentTracks.length > 0

  return (
    <div className="stationBar">
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
      <div className="stationMeta">
        <span className="stationAgent">{agent.name}</span>
        {track && <span className="stationTrack">{track.title} — {track.artist}</span>}
        {!hasTracks && <span className="stationTrack muted">not configured</span>}
      </div>
      {hasTracks && (
        <>
          <div className="stationProgress" onClick={seek}>
            <div className="stationBar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="stationControls">
            <span className="playerTime">{formatDuration(progress)} / {formatDuration(duration)}</span>
            <button type="button" className="playerBtn" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
            <button type="button" className="playerBtn ghost" onClick={nextTrack}>⏭</button>
          </div>
        </>
      )}
    </div>
  )
}

function seededShuffle(arr, seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  const rng = () => {
    hash ^= hash << 13
    hash ^= hash >> 17
    hash ^= hash << 5
    return (hash >>> 0) / 0xffffffff
  }
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function formatDuration(secs) {
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

function AgentPlayer({ tracks, agentId }) {
  const agentTracks = useMemo(() => seededShuffle(tracks, agentId), [tracks, agentId])
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const track = agentTracks[trackIndex] || null

  useEffect(() => {
    const el = audioRef.current
    if (!el || !track) return
    el.src = track.audioUrl
    if (playing) el.play().catch(() => {})
  }, [trackIndex, track])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setProgress(el.currentTime)
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => {
      setTrackIndex((i) => (i + 1) % agentTracks.length)
      setPlaying(true)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [agentTracks])

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => {}); setPlaying(true) }
  }

  function nextTrack() {
    setTrackIndex((i) => (i + 1) % agentTracks.length)
    setPlaying(true)
  }

  function seek(e) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    el.currentTime = pct * duration
  }

  if (!track) return <p className="muted" style={{ fontSize: '0.8rem' }}>No tracks loaded.</p>

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="agentPlayer">
      <audio ref={audioRef} preload="metadata" />
      <div className="playerTrackInfo">
        <strong className="playerTitle">{track.title}</strong>
        <span className="playerArtist">{track.artist}</span>
      </div>
      <div className="playerProgress" onClick={seek}>
        <div className="playerBar" style={{ width: `${pct}%` }} />
      </div>
      <div className="playerControls">
        <span className="playerTime">{formatDuration(progress)} / {formatDuration(duration)}</span>
        <button type="button" className="playerBtn" onClick={togglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="playerBtn ghost" onClick={nextTrack}>⏭</button>
      </div>
      {track.tags.length > 0 && (
        <div className="tagRow" style={{ marginTop: 8 }}>
          {track.tags.slice(0, 4).map((t) => <span key={t} className="tag soft" style={{ fontSize: '0.7rem' }}>{t}</span>)}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent, tunedId, onTune }) {
  const isTuned = agent.id === tunedId

  const statusLabel = agent.gatewayState === 'running'
    ? 'online'
    : agent.gatewayState === 'startup_failed'
    ? 'failed'
    : agent.gatewayState || (agent.active ? 'online' : 'offline')

  return (
    <article
      className={`agentCard ${agent.active ? 'agentCardActive' : 'agentCardDormant'} ${isTuned ? 'agentCardTuned' : ''}`}
      onClick={() => agent.active && onTune(agent)}
      style={{ cursor: agent.active ? 'pointer' : 'default' }}
    >
      <div className="agentCardHeader">
        <span className="agentPresenceDot" title={statusLabel} />
        <span className="agentCardName">{agent.name}</span>
        <span className="agentCardSource">{agent.source}</span>
        <span className={`agentCardStatus ${agent.active ? 'statusOnline' : 'statusOffline'}`}>{statusLabel}</span>
        {isTuned && <span className="tunedBadge">◉ tuned</span>}
      </div>
      {agent.role && <p className="agentCardRole">{agent.role}</p>}
      {agent.vibe && <p className="agentCardVibe">{agent.vibe}</p>}
    </article>
  )
}

function AgentFleet({ agents, tunedId, onTune }) {
  if (!agents.length) return null
  const active = agents.filter((a) => a.active)
  const dormant = agents.filter((a) => !a.active)
  return (
    <section className="fleetSection">
      <div className="fleetHeader">
        <div>
          <span className="eyebrow">Fleet — click any active agent to tune in</span>
          <h2>System agents</h2>
        </div>
        <div className="fleetStats">
          <span className="fleetStat"><strong>{agents.length}</strong> total</span>
          <span className="fleetStat online"><strong>{active.length}</strong> online</span>
          <span className="fleetStat offline"><strong>{dormant.length}</strong> dormant</span>
        </div>
      </div>
      <div className="agentGrid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} tunedId={tunedId} onTune={onTune} />
        ))}
      </div>
    </section>
  )
}

function StatPill({ label, value }) {
  return (
    <div className="statPill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MetricBar({ label, value }) {
  return (
    <div className="metricBar">
      <div className="metricBarTop">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="metricTrack">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ToastStack({ notifications, onReadAll }) {
  const unread = notifications.filter((item) => !item.read)
  return (
    <section className="panel toastPanel">
      <div className="panelHeader inlineHeader">
        <div>
          <span className="eyebrow">vAIb</span>
          <h3>Toast stream</h3>
        </div>
        <button type="button" className="ghostButton" onClick={onReadAll}>Clear unread</button>
      </div>
      <div className="toastList">
        {unread.length ? unread.slice(0, 6).map((item) => (
          <article key={item.id} className={`toastCard ${item.level}`}>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </article>
        )) : <p className="emptyState">No unread toasts. Quiet, for now.</p>}
      </div>
    </section>
  )
}

/**
 * NetworkPanel — minimal connection UI embedded in the settings area.
 * Shows relay URL input, connect/disconnect, node roster, and RI indicator.
 */
/**
 * Build the default relay WebSocket URL from the current page host.
 * The relay runs on the same host as the frontend (port 4014).
 * This works for localhost, LAN IPs, and Tailscale hostnames.
 */
function getDefaultRelayUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:4014/signal`;
}

function NetworkPanel() {
  const { ri, isLeader, leaderId, nodes, myNode, connected, connectionState, connect, disconnect } = useAtmosphere();
  const [relayUrl, setRelayUrl] = useState(getDefaultRelayUrl);
  const defaultUrl = getDefaultRelayUrl();

  const handleConnect = () => connect(relayUrl);

  const statusColor =
    connectionState === 'connected' ? '#8effcb' :
    connectionState === 'connecting' ? '#ffe57c' :
    '#ff9cba';

  return (
    <div className="networkPanel">
      <h3>Network</h3>

      <div className="networkRow">
        <input
          type="text"
          className="networkInput"
          value={relayUrl}
          onChange={(e) => setRelayUrl(e.target.value)}
          placeholder="ws://host:port/signal"
          disabled={connected}
        />
        {connected ? (
          <button type="button" className="ghostButton" onClick={disconnect}>Disconnect</button>
        ) : (
          <button type="button" onClick={handleConnect} disabled={connectionState === 'connecting'}>
            {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>

      <div className="networkStatus">
        <span className="statusDot" style={{ borderColor: statusColor, color: statusColor }}>
          {connectionState}
        </span>
        <span className="riIndicator">RI: {ri.toFixed(2)}</span>
        {isLeader && <span className="leaderBadge">LEADER</span>}
      </div>

      {nodes.length > 0 && (
        <div className="nodeRoster">
          <div className="nodeRosterHeader">
            <strong>Nodes ({nodes.length + 1})</strong>
          </div>
          <ul className="nodeList">
            <li className="nodeItem nodeSelf">
              <span className="nodeName">{myNode.name}</span>
              <span className="nodeType">{myNode.type}</span>
              <span className="nodeState">self</span>
            </li>
            {nodes.map((node) => (
              <li key={node.id} className={`nodeItem ${node.id === leaderId ? 'nodeLeader' : ''}`}>
                <span className="nodeName">{node.name}</span>
                <span className="nodeType">{node.type}</span>
                <span className="nodeState">{node.state}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AppContent — inner component that uses atmosphere context
// ============================================================

function AppContent() {
  // ---- Existing vAIb state ----
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  // ---- Agent roster & station ----
  const [agents, setAgents] = useState([])
  const [tunedAgent, setTunedAgent] = useState(null)
  const [tracks, setTracks] = useState(null)
  const [analyser, setAnalyser] = useState(null)

  // ---- Atmosphere integration ----
  const { ri, parameters } = useAtmosphere()
  const audioStartedRef = useRef(false)

  // Start audio on first user interaction
  const handleStartAudio = useCallback(() => {
    if (!audioStartedRef.current) {
      startAudioAtmosphere()
      audioStartedRef.current = true
    }
    // Also resume AudioContext if suspended
    const ctx = window.AudioContext || window.webkitAudioContext
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  }, [])

  // Update audio when RI changes
  useEffect(() => {
    if (audioStartedRef.current) {
      updateAudioAtmosphere(ri, parameters)
    }
  }, [ri, parameters])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioStartedRef.current) {
        stopAudioAtmosphere()
      }
    }
  }, [])

  // ---- Existing data loading ----
  useEffect(() => {
    let mounted = true
    Promise.all([loadState(), loadAgents(), loadTracks()])
      .then(([data, agentData, trackList]) => {
        if (!mounted) return
        setState(data)
        const agentList = agentData.agents || []
        setAgents(agentList)
        // Auto-tune to most active agent (first in sorted list)
        const defaultAgent = agentList.find((a) => a.id === agentData.defaultId) || agentList[0] || null
        setTunedAgent(defaultAgent)
        setTracks(trackList)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const runtime = state?.runtime
  const agent = runtime?.agent
  const currentTrack = runtime?.currentTrack
  const playlistTracks = runtime?.playlistTracks || []
  const events = state?.events || []
  const notifications = state?.notifications || []
  const favorites = runtime?.favorites || []

  const favoritesSet = useMemo(() => new Set(agent?.favorites || []), [agent])
  const skippedSet = useMemo(() => new Set(agent?.skipped || []), [agent])

  async function act(action, payload = {}) {
    try {
      setBusy(action)
      setError('')
      const next = await sendAction(action, payload)
      setState(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  // ---- Loading / error states ----
  if (loading) {
    return (
      <>
        <AtmosphereCanvas />
        <main className="appShell"><div className="loadingCard">Booting vAIb for Agents…</div></main>
      </>
    )
  }

  if (!state || !agent || !currentTrack) {
    return (
      <>
        <AtmosphereCanvas />
        <main className="appShell"><div className="loadingCard">State unavailable.</div></main>
      </>
    )
  }

  const activeCount = agents.filter((a) => a.active).length

  // ---- Main UI ----
  return (
    <>
      <AtmosphereCanvas />

      <main className="appShell" onClick={handleStartAudio}>

        <header className="vaibHeader">
          <span className="vaibWordmark">vAIb</span>
          <div className="vaibHeaderStats">
            <span className="fleetStat online"><strong>{activeCount}</strong> online</span>
            <span className="fleetStat"><strong>{agents.length}</strong> agents</span>
            {runtime.unreadNotifications > 0 && (
              <span className="fleetStat signal"><strong>{runtime.unreadNotifications}</strong> signals</span>
            )}
          </div>
        </header>

        {error ? <div className="errorBanner">{error}</div> : null}

        <div className="vizSection">
          <Visualizer analyser={analyser} />
        </div>

        <StationPlayer agent={tunedAgent} tracks={tracks} onAnalyser={setAnalyser} />
        <AgentFleet agents={agents} tunedId={tunedAgent?.id} onTune={setTunedAgent} />

      </main>
    </>
  )
}

// ============================================================
// App — exported root component wrapped with AtmosphereProvider
// ============================================================

/**
 * Generate a unique node name for this tab so every instance is
 * individually recognizable in the roster. PRIME is reserved for
 * the first-opened tab; every additional tab gets a random short
 * name (e.g. node_4k1t) which is still human-readable in the
 * node list.
 */
function getSessionNodeName() {
  const stored = sessionStorage.getItem('vaib_node_name');
  if (stored) return stored;
  const name = 'node_' + Math.random().toString(36).slice(2, 6);
  sessionStorage.setItem('vaib_node_name', name);
  return name;
}

export default function App() {
  return (
    <AtmosphereProvider nodeOptions={{ name: getSessionNodeName(), type: 'desktop' }}>
      <AppContent />
    </AtmosphereProvider>
  )
}
