import { useEffect, useMemo, useState } from 'react'
import { AtmosphereProvider, useAtmosphere } from './atmosphere/AtmosphereProvider'
import { AgentProvider, useAgent } from './agent/AgentProvider'
import { getSaitoRotation } from './agent/Saito'
import AtmosphereCanvas from './visual/AtmosphereCanvas'
import { SignalEngine } from './audio/SignalEngine'

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

/**
 * Build the default relay WebSocket URL from the current page host.
 * The relay runs on the same host as the frontend (port 4014).
 */
function getDefaultRelayUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:4014/signal`;
}

function NetworkPanel() {
  const { ri, isLeader, leaderId, nodes, myNode, connected, connectionState, connect, disconnect } = useAtmosphere();
  const [relayUrl, setRelayUrl] = useState(getDefaultRelayUrl);

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
// AppContent — inner component that uses atmosphere + agent context
// ============================================================

function AppContent() {
  // ---- Agent integration ----
  const {
    currentSignal,
    agentMood,
    isPlaying,
    toast,
    tuneIn,
    mute,
    shiftSignal,
    holdSignal,
    markResonant,
    markStatic,
  } = useAgent()

  // ---- Atmosphere integration ----
  const { ri, parameters } = useAtmosphere()

  // ---- Signal Engine integration ----
  useEffect(() => {
    if (isPlaying && currentSignal) {
      SignalEngine.init()
      SignalEngine.tuneIn(currentSignal, agentMood)
    } else {
      SignalEngine.mute()
    }
  }, [isPlaying, currentSignal, agentMood])

  // Cleanup on unmount
  useEffect(() => {
    return () => { SignalEngine.mute() }
  }, [])

  // ---- Agent rotation (static for now) ----
  const saitoRotation = useMemo(() => getSaitoRotation(), [])

  // ---- Main UI ----
  return (
    <>
      {/* Atmospheric background layer */}
      <AtmosphereCanvas />

      <main className="appShell">
        {/* Original ambient divs are now visually replaced by canvas,
            but kept in DOM for backwards compatibility / CSS selectors */}
        <div className="ambient ambientA" style={{ opacity: 0, display: 'none' }} />
        <div className="ambient ambientB" style={{ opacity: 0, display: 'none' }} />

        <header className="hero panel">
          <div>
            <span className="eyebrow">vAIb for Agents</span>
            <h1>The first AI-native signal station, with Saito as test pilot.</h1>
            <p>
              This is half player, half personality instrument. Saito controls the signal.
              You tune in, observe, and nudge.
            </p>
          </div>
          <div className="heroBadges">
            <StatPill label="Companion" value="Saito" />
            <StatPill label="Profile" value="signal-agent" />
            <StatPill label="Status" value={isPlaying ? 'tuned in' : 'muted'} />
            <StatPill label="Mood" value={agentMood} />
          </div>
        </header>

        <section className="grid topGrid">
          {/* ---- Now Playing / Signal Station ---- */}
          <article className="panel nowPlayingPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Signal Station</span>
                <h2>SAITO IS LISTENING</h2>
              </div>
              <span className="statusDot">{isPlaying ? 'tuned in' : 'muted'}</span>
            </div>

            <div className="trackOrb">
              <div className="trackAura" />
              <div className="trackInfo">
                <strong>{currentSignal?.title || 'Idle'}</strong>
                <span>{currentSignal?.artist || 'Saito'}</span>
                {currentSignal && (
                  <small>{currentSignal.bpm} BPM &bull; {Math.floor(currentSignal.duration / 60)}:{(currentSignal.duration % 60).toString().padStart(2, '0')}</small>
                )}
              </div>
            </div>

            {currentSignal?.tags && (
              <div className="tagRow">
                {currentSignal.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
              </div>
            )}

            {currentSignal?.whyAgentKeepsIt && (
              <p className="reasonBox">{currentSignal.whyAgentKeepsIt}</p>
            )}

            <div className="controlRow">
              <button type="button" onClick={isPlaying ? mute : tuneIn}>
                {isPlaying ? 'Mute' : 'Tune In'}
              </button>
              <button type="button" onClick={shiftSignal}>Shift Signal</button>
              <button type="button" onClick={holdSignal}>Hold Signal</button>
              <button type="button" onClick={markResonant}>Mark Resonant</button>
              <button type="button" onClick={markStatic}>Mark Static</button>
            </div>

            <div className="subStatRow">
              <StatPill label="Mood" value={agentMood} />
              <StatPill label="Signal" value={currentSignal?.title || '—'} />
            </div>

            <div style={{ opacity: 0.5, fontSize: '0.75rem', letterSpacing: '0.1em', marginTop: '6px' }}>
              Saito feels {agentMood}
            </div>
          </article>

          {/* ---- Profile Panel ---- */}
          <article className="panel profilePanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Agent identity</span>
                <h2>Saito taste profile</h2>
              </div>
            </div>
            <p className="muted">A signal-processing agent with evolving taste. Tends toward electronic textures, midtempo pulses, and warm ambient drift. Curious but disciplined.</p>

            <div className="metricGrid">
              <MetricBar label="energy" value={60} />
              <MetricBar label="warmth" value={55} />
              <MetricBar label="complexity" value={45} />
              <MetricBar label="noise" value={30} />
              <MetricBar label="pace" value={50} />
            </div>

            <div className="detailBlocks">
              <div>
                <h3>Tendencies</h3>
                <div className="tagRow">
                  <span className="tag soft">electronic</span>
                  <span className="tag soft">midtempo</span>
                  <span className="tag soft">ambient drift</span>
                  <span className="tag soft">structured energy</span>
                </div>
              </div>
              <div>
                <h3>Static zones</h3>
                <div className="tagRow">
                  <span className="tag danger">repetitive beats</span>
                  <span className="tag danger">harsh noise</span>
                  <span className="tag danger">predictable loops</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ---- Agent Rotation ---- */}
        <section className="grid midGrid">
          <article className="panel libraryPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Agent Rotation</span>
                <h2>Saito&apos;s Signals</h2>
              </div>
            </div>

            <div className="trackList">
              {saitoRotation.map((sig) => (
                <article key={sig.id} className={`trackRow ${sig.id === currentSignal?.id ? 'active' : ''}`}>
                  <div>
                    <strong>{sig.title}</strong>
                    <span>{sig.artist} &mdash; {sig.tags.join(', ')}</span>
                  </div>
                  <span className="badge">{Math.floor(sig.duration / 60)}:{(sig.duration % 60).toString().padStart(2, '0')}</span>
                </article>
              ))}
            </div>
          </article>

          {/* ---- Signal Log placeholder ---- */}
          <article className="panel insightPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Signal log</span>
                <h2>Recent shifts</h2>
              </div>
            </div>
            <p className="muted">Signal history will appear here as Saito shifts between signals.</p>
          </article>
        </section>

        {/* ---- Station / Companion Panel ---- */}
        <section className="grid bottomGrid">
          <article className="panel companionPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Signal Space</span>
                <h2>Station v0.1</h2>
              </div>
            </div>

            <p className="muted">
              Saito controls the signal. You tune in, observe, and nudge.
              The atmosphere responds to Saito&apos;s mood and the distributed presence of other nodes.
            </p>

            <NetworkPanel />

            <div className="futureNotes">
              <h3>Station notes</h3>
              <ul className="cleanList">
                <li>Saito is the only active agent on this station.</li>
                <li>Future agents: VG God, Hanzo, Legion &mdash; each with distinct signal character.</li>
                <li>Taste drift: Saito&apos;s preferences evolve based on your resonance marks.</li>
                <li>Distributed: open this URL on another device to share the atmosphere.</li>
              </ul>
            </div>
          </article>
        </section>
      </main>

      {/* ---- Agent toast display ---- */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255,255,255,0.9)', color: '#111',
          padding: '12px 24px', borderRadius: '9999px', fontSize: '13px',
          fontWeight: 500, zIndex: 100, animation: 'fadeInUp 0.4s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {toast}
        </div>
      )}
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
      <AgentProvider>
        <AppContent />
      </AgentProvider>
    </AtmosphereProvider>
  )
}
