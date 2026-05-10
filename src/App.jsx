import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AtmosphereProvider, useAtmosphere } from './atmosphere/AtmosphereProvider'
import AtmosphereCanvas from './visual/AtmosphereCanvas'
import Visualizer from './visual/Visualizer'
import { startAudioAtmosphere, stopAudioAtmosphere, updateAudioAtmosphere } from './audio/AudioAtmosphere'

// ============================================================
// API
// ============================================================
const API = (typeof __API_BASE__ !== 'undefined' && __API_BASE__)
  ? __API_BASE__
  : '/api/backend'

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
async function sendAction(action, payload = {}) {
  const r = await fetch(`${API}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed')
  return r.json()
}
async function checkHealth() {
  try { const r = await fetch(`${API}/health`); return r.ok } catch { return false }
}

// ============================================================
// Utilities
// ============================================================
function formatDuration(secs) {
  if (!secs) return '--:--'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

function seededShuffle(arr, seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const rng = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff }
  const r = [...arr]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
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
// Tab: Cockpit
// ============================================================
function CockpitTab({ tunedAgent, track, agentTracks, trackIndex, events, notifications, apiHealthy, analyser, onReadAll }) {
  return (
    <div className="tabScreen">
      {/* Status card */}
      <div className="card statusCard">
        <div className="statusRow">
          <span className="statusLabel">Backend API</span>
          <span className={`statusPill ${apiHealthy ? 'online' : 'offline'}`}>
            {apiHealthy ? 'online' : 'offline'}
          </span>
        </div>
        <div className="statusRow">
          <span className="statusLabel">Local State</span>
          <span className="statusPill online">online</span>
        </div>
      </div>

      {/* Now Broadcasting */}
      {tunedAgent && track && (
        <div className="card nowBroadcastingCard">
          <span className="broadcastEyebrow">Now Broadcasting</span>
          <h2 className="broadcastTitle">{track.title}</h2>
          <p className="broadcastArtist">{track.artist}</p>
          <div className="broadcastMeta">
            <span className="agentBadge">{tunedAgent.name}</span>
            {track.tags[0] && <span className="broadcastTag">Vibe: {track.tags[0]}</span>}
            <span className="broadcastDuration">{formatDuration(track.duration)}</span>
          </div>
        </div>
      )}

      {/* Visualizer */}
      <div className="card vizCard">
        <span className="cardLabel">Visualizer</span>
        <Visualizer analyser={analyser} compact />
        <div className="visualizerModes" style={{ marginTop: 8 }}>
          {/* mode switcher injected by Visualizer when not compact */}
        </div>
      </div>

      {/* Recent signals */}
      {notifications.filter(n => !n.read).length > 0 && (
        <div className="card">
          <div className="cardHeaderRow">
            <span className="cardLabel">Signals</span>
            <button type="button" className="textBtn" onClick={onReadAll}>Clear</button>
          </div>
          <ul className="signalList">
            {notifications.filter(n => !n.read).slice(0, 5).map(n => (
              <li key={n.id} className="signalItem">
                <strong>{n.title}</strong>
                <p>{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent events */}
      <div className="card">
        <span className="cardLabel">Recent events</span>
        <ul className="eventFeed">
          {events.slice(0, 8).map(e => (
            <li key={e.id} className="eventItem">
              <span className="eventSummary">{e.summary}</span>
              <span className="eventTime">{new Date(e.createdAt).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
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
function AgentsTab({ agents }) {
  return (
    <div className="tabScreen">
      <ul className="agentDetailList">
        {agents.map(agent => (
          <li key={agent.id} className={`card agentDetailCard ${agent.active ? '' : 'agentDormant'}`}>
            <div className="agentDetailTop">
              <span className="presenceDot" style={agent.active ? {} : { background: '#444', boxShadow: 'none' }} />
              <span className="agentDetailName">{agent.name}</span>
              <span className="agentDetailSource">{agent.source}</span>
            </div>
            {agent.role && <p className="agentDetailRole">{agent.role}</p>}
            {agent.vibe && <p className="agentDetailVibe">{agent.vibe}</p>}
            <span className={`statusPill ${agent.active ? 'online' : 'offline'}`} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              {agent.gatewayState || 'offline'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================
// Tab: More
// ============================================================
function MoreTab({ state, act, networkPanel }) {
  if (!state) return null
  return (
    <div className="tabScreen">
      <div className="card">
        <span className="cardLabel">Signal preferences</span>
        <p className="cardMuted">Choose which agent signals reach you.</p>
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
      <div className="card" style={{ marginTop: 12 }}>
        {networkPanel}
      </div>
    </div>
  )
}

// ============================================================
// Mini Player (docked above tab bar)
// ============================================================
function MiniPlayer({ tunedAgent, track, playing, progress, duration, onToggle, onNext, onSeek }) {
  if (!tunedAgent) return null
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="miniPlayer">
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
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.hostname}:4014/signal`
  })
  const statusColor = connectionState === 'connected' ? '#8effcb' : connectionState === 'connecting' ? '#ffe57c' : '#ff9cba'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [apiHealthy, setApiHealthy] = useState(false)

  // ---- Player ----
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const analyserRef = useRef(null)
  const [analyser, setAnalyser] = useState(null)

  // ---- Atmosphere ----
  const { ri, parameters } = useAtmosphere()
  const audioStartedRef = useRef(false)

  // Computed per-agent track list
  const agentTracks = useMemo(
    () => tunedAgent && tracks.length ? seededShuffle(tracks, tunedAgent.id) : [],
    [tracks, tunedAgent?.id]
  )

  // Reset player when agent changes
  useEffect(() => {
    setTrackIndex(0); setProgress(0); setDuration(0); setPlaying(false)
  }, [tunedAgent?.id])

  // Audio element wiring
  const currentTrack = agentTracks[trackIndex] || null

  useEffect(() => {
    const el = audioRef.current
    if (!el || !currentTrack) return
    el.src = currentTrack.audioUrl
    if (playing) el.play().catch(() => {})
  }, [trackIndex, currentTrack])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setProgress(el.currentTime)
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => { setTrackIndex(i => (i + 1) % agentTracks.length); setPlaying(true) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [agentTracks])

  // Analyser init (once, on first play)
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

  // Ambient atmosphere audio
  const handleGesture = useCallback(() => {
    if (!audioStartedRef.current) { startAudioAtmosphere(); audioStartedRef.current = true }
  }, [])

  useEffect(() => {
    if (audioStartedRef.current) updateAudioAtmosphere(ri, parameters)
  }, [ri, parameters])

  useEffect(() => () => { if (audioStartedRef.current) stopAudioAtmosphere() }, [])

  // Player controls
  function togglePlay() {
    const el = audioRef.current; if (!el) return
    initAnalyser()
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => {}); setPlaying(true) }
  }
  function nextTrack() {
    initAnalyser()
    setTrackIndex(i => (i + 1) % agentTracks.length)
    setPlaying(true)
  }
  function seekFromEvent(e) {
    const el = audioRef.current; if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }
  function playTrack(i) {
    initAnalyser(); setTrackIndex(i); setPlaying(true)
  }

  // Actions
  async function act(action, payload = {}) {
    try { setBusy(action); const next = await sendAction(action, payload); setState(next) }
    catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  // Initial data load
  useEffect(() => {
    let mounted = true
    Promise.all([loadState(), loadAgents(), loadTracks(), checkHealth()])
      .then(([stateData, agentData, trackList, healthy]) => {
        if (!mounted) return
        setState(stateData)
        const agentList = agentData.agents || []
        setAgents(agentList)
        const def = agentList.find(a => a.id === agentData.defaultId) || agentList[0] || null
        setTunedAgent(def)
        setTracks(trackList)
        setApiHealthy(healthy)
        setLoading(false)
      })
      .catch(err => { if (mounted) { setError(err.message); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  // Periodic health check
  useEffect(() => {
    const t = setInterval(async () => setApiHealthy(await checkHealth()), 30000)
    return () => clearInterval(t)
  }, [])

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

  return (
    <>
      <AtmosphereCanvas />
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" style={{ display: 'none' }} />

      <div className="appShell" onClick={handleGesture}>

        {/* Header */}
        <header className="vaibHeader">
          <span className="vaibWordmark">vAIb</span>
          <div className="vaibHeaderRight">
            {error && <span className="headerError">⚠</span>}
            <span className="headerStat">{activeCount} online</span>
          </div>
        </header>

        {/* Tab content */}
        <div className="tabContent">
          {tab === 'cockpit' && (
            <CockpitTab
              tunedAgent={tunedAgent}
              track={currentTrack}
              agentTracks={agentTracks}
              trackIndex={trackIndex}
              events={events}
              notifications={notifications}
              apiHealthy={apiHealthy}
              analyser={analyser}
              onReadAll={() => act('notifications.readAll')}
            />
          )}
          {tab === 'stations' && (
            <StationsTab agents={agents} tunedId={tunedAgent?.id} onTune={agent => { setTunedAgent(agent); setTab('cockpit') }} />
          )}
          {tab === 'queue' && (
            <QueueTab agentTracks={agentTracks} trackIndex={trackIndex} playing={playing} onPlayTrack={playTrack} />
          )}
          {tab === 'agents' && <AgentsTab agents={agents} />}
          {tab === 'more' && (
            <MoreTab state={state} act={act} networkPanel={<NetworkPanel />} />
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
          onNext={nextTrack}
          onSeek={seekFromEvent}
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
