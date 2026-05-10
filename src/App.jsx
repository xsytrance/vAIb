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
// EvidenceTrace — small expandable source evidence for an agent
// ============================================================

function EvidenceTrace({ agent }) {
  const evidence = agent.evidence || [];
  if (evidence.length === 0) return null;

  return (
    <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.72rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
        Why {agent.name} is present
      </div>
      {evidence.map((ev, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>&bull;</span>{' '}
          {ev.type}: {ev.path} <span style={{ color: 'rgba(255,255,255,0.25)' }}>(+{ev.scoreContribution?.toFixed(2) || '?'})</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>{ev.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// AgentCardRow — clickable agent row with expandable evidence
// ============================================================

function AgentCardRow({ agent, isDominant, expanded, onToggle, opacity = 1 }) {
  const stateColors = {
    active: 'rgba(142,255,203,0.5)',
    dormant: 'rgba(255,229,124,0.4)',
    ghost: 'rgba(255,156,186,0.35)',
    archival: 'rgba(255,255,255,0.15)',
  };

  return (
    <article
      className={`trackRow ${isDominant ? 'active' : ''}`}
      style={{ opacity, cursor: 'pointer' }}
      onClick={onToggle}
      title={`${agent.name}: ${agent.personality}`}
    >
      <div>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {agent.name}
          <span
            style={{
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '1px 5px',
              borderRadius: 4,
              border: `1px solid ${stateColors[agent.state] || 'rgba(255,255,255,0.1)'}`,
              color: stateColors[agent.state] || 'rgba(255,255,255,0.3)',
              fontWeight: 500,
            }}
          >
            {agent.state}
          </span>
        </strong>
        <span>{agent.personality || agent.type}</span>
      </div>
      <span className="badge">{Math.round((agent.presenceScore || 0) * 100)}%</span>

      {expanded && <div style={{ gridColumn: '1 / -1' }}><EvidenceTrace agent={agent} /></div>}
    </article>
  );
}

// ============================================================
// AppContent — inner component that uses atmosphere + agent context
// ============================================================

function AppContent() {
  // ---- Agent integration (reframed actions) ----
  const {
    currentSignal,
    station,
    agentMood,
    isPlaying,
    toast,
    tuneIn,
    mute,
    nudgeDrift,
    suggestLinger,
    resonates,
    tooMuchStatic,
  } = useAgent()

  // ---- Station composition from operational truth ----
  const activeAgents   = station?.active || [];
  const dormantAgents  = station?.dormant || [];
  const ghostAgents    = station?.ghost || [];
  const archivalAgents = station?.archival || [];
  const dominantAgent  = station?.dominant;
  const stationMood    = station?.stationMood || 'neutral';
  const confidence     = station?.confidence || 'waiting';

  // ---- Expandable agent evidence state ----
  const [expandedAgent, setExpandedAgent] = useState(null);

  const toggleEvidence = (agentId) => {
    setExpandedAgent(prev => prev === agentId ? null : agentId);
  };

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
            <h1>Signal station for AI agents</h1>
            <p>
              Agents control the signal. You tune in, observe, and nudge.
              The atmosphere responds to operational truth — real agent presence, not fiction.
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

            {/* Primary: tune in / mute — small, not giant */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={isPlaying ? mute : tuneIn} style={{ flex: 1, padding: '8px 16px', fontSize: '0.8rem' }}>
                {isPlaying ? 'Mute' : 'Tune In'}
              </button>
            </div>

            {/* Influence section — subtle, secondary */}
            <div style={{ marginTop: 16, padding: '12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, opacity: 0.7 }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, color: 'rgba(255,255,255,0.4)' }}>
                Influence — the agent may respond
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button type="button" className="ghostButton" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={nudgeDrift}>Nudge drift</button>
                <button type="button" className="ghostButton" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={suggestLinger}>Suggest linger</button>
                <button type="button" className="ghostButton" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={resonates}>Resonates</button>
                <button type="button" className="ghostButton" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={tooMuchStatic}>Too much static</button>
              </div>
            </div>

            <div className="subStatRow">
              <StatPill label="Mood" value={agentMood} />
              <StatPill label="Signal" value={currentSignal?.title || '—'} />
            </div>

            <div style={{ opacity: 0.5, fontSize: '0.75rem', letterSpacing: '0.1em', marginTop: '6px' }}>
              {dominantAgent
                ? `${activeAgents.find(a => a.id === dominantAgent)?.name || 'Station'} feels ${stationMood}${activeAgents.length > 1 ? ` — ${activeAgents.length} agents present` : ''}`
                : `Station mood: ${stationMood}`}
            </div>
          </article>

          {/* ---- Profile Panel — shows the real dominant agent ---- */}
          <article className="panel profilePanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Agent identity</span>
                <h2>{dominantAgent ? `${activeAgents.find(a => a.id === dominantAgent)?.name || dominantAgent} — active` : 'Station quiet'}</h2>
              </div>
            </div>

            {/* Confidence-based station status */}
            {confidence === 'scanned_roots_empty' && (
              <p className="muted">Known roots scanned. No operational agents found.</p>
            )}
            {confidence === 'high' && (
              <p className="muted">{station?.agentCount || 0} agent{(station?.agentCount || 0) !== 1 ? 's' : ''} discovered from operational evidence.</p>
            )}
            {confidence === 'medium' && (
              <p className="muted">Partial scan — {station?.agentCount || 0} agent{(station?.agentCount || 0) !== 1 ? 's' : ''} found, confidence limited.</p>
            )}
            {confidence === 'partial_scan' && (
              <p className="muted">Partial scan complete. Results may be incomplete.</p>
            )}
            {confidence === 'waiting' && (
              <p className="muted">{dominantAgent
                ? (activeAgents.find(a => a.id === dominantAgent)?.personality || 'Operational agent on this station.')
                : 'No agents currently active on this station. The station is quiet.'}
              </p>
            )}

            {/* Dominant agent source trace */}
            {dominantAgent && (() => {
              const d = activeAgents.find(a => a.id === dominantAgent);
              if (!d?.evidence || d.evidence.length === 0) return null;
              const top3 = d.evidence.slice(0, 3);
              return (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.72rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.45)' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
                    Source trace — {d.name}
                  </div>
                  {top3.map((ev, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>&bull;</span>{' '}
                      {ev.type}: {ev.path} <span style={{ color: 'rgba(255,255,255,0.2)' }}>(+{ev.scoreContribution?.toFixed(2) || '?'})</span>
                    </div>
                  ))}
                  {d.evidence.length > 3 && (
                    <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>
                      +{d.evidence.length - 3} more sources
                    </div>
                  )}
                </div>
              );
            })()}

            {dominantAgent && (
              <div className="metricGrid">
                {(() => {
                  const d = activeAgents.find(a => a.id === dominantAgent);
                  if (!d?.derivedSignal) return null;
                  const ds = d.derivedSignal;
                  return (
                    <>
                      <MetricBar label="energy" value={Math.round(ds.energy * 100)} />
                      <MetricBar label="warmth" value={Math.round(ds.warmth * 100)} />
                      <MetricBar label="complexity" value={Math.round(ds.complexity * 100)} />
                      <MetricBar label="noise" value={Math.round(ds.noise * 100)} />
                      <MetricBar label="pace" value={Math.round(ds.pace * 100)} />
                    </>
                  );
                })()}
              </div>
            )}

            <div className="detailBlocks">
              <div>
                <h3>{dominantAgent ? 'Active agents' : 'Station status'}</h3>
                {activeAgents.length > 0 ? (
                  <div className="tagRow">
                    {activeAgents.map(a => (
                      <span key={a.id} className="tag soft" title={`${a.name}: ${a.personality}`}>
                        {a.name} ({Math.round((a.presenceScore || 0) * 100)}%)
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No active agents. The station is waiting.</p>
                )}
              </div>

              {dormantAgents.length > 0 && (
                <div>
                  <h3>Dormant</h3>
                  <div className="tagRow">
                    {dormantAgents.map(a => (
                      <span key={a.id} style={{ opacity: 0.55 }} className="tag soft" title={`${a.name}: ${a.personality}`}>
                        {a.name} ({Math.round((a.presenceScore || 0) * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ghostAgents.length > 0 && (
                <div>
                  <h3>Ghost</h3>
                  <div className="tagRow">
                    {ghostAgents.map(a => (
                      <span key={a.id} style={{ opacity: 0.35 }} className="tag soft" title={`${a.name}: ${a.personality}`}>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {archivalAgents.length > 0 && (
                <div>
                  <h3>Archival</h3>
                  <div className="tagRow">
                    {archivalAgents.map(a => (
                      <span key={a.id} style={{ opacity: 0.25 }} className="tag soft" title={`${a.name}: ${a.personality}`}>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>

        {/* ---- Agent Rotation — all 4 state categories with expandable evidence ---- */}
        <section className="grid midGrid">
          <article className="panel libraryPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Agent Rotation</span>
                <h2>
                  {confidence === 'scanned_roots_empty'
                    ? 'Station quiet'
                    : confidence === 'waiting'
                    ? 'Scanning...'
                    : `${activeAgents.length} active${dormantAgents.length > 0 ? ` / ${dormantAgents.length} dormant` : ''}${ghostAgents.length > 0 ? ` / ${ghostAgents.length} ghost` : ''}${archivalAgents.length > 0 ? ` / ${archivalAgents.length} archival` : ''}`}
                </h2>
              </div>
            </div>

            <div className="trackList">
              {/* Active agents — present, operational */}
              {activeAgents.length > 0 && (
                <>
                  {activeAgents.map((agent) => (
                    <AgentCardRow
                      key={agent.id}
                      agent={agent}
                      isDominant={agent.id === dominantAgent}
                      expanded={expandedAgent === agent.id}
                      onToggle={() => toggleEvidence(agent.id)}
                      opacity={1}
                    />
                  ))}
                </>
              )}

              {/* Dormant agents — slightly reduced */}
              {dormantAgents.length > 0 && (
                <>
                  {dormantAgents.map((agent) => (
                    <AgentCardRow
                      key={agent.id}
                      agent={agent}
                      isDominant={false}
                      expanded={expandedAgent === agent.id}
                      onToggle={() => toggleEvidence(agent.id)}
                      opacity={0.7}
                    />
                  ))}
                </>
              )}

              {/* Ghost agents — low opacity */}
              {ghostAgents.length > 0 && (
                <>
                  {ghostAgents.map((agent) => (
                    <AgentCardRow
                      key={agent.id}
                      agent={agent}
                      isDominant={false}
                      expanded={expandedAgent === agent.id}
                      onToggle={() => toggleEvidence(agent.id)}
                      opacity={0.3}
                    />
                  ))}
                </>
              )}

              {/* Archival agents — very low opacity */}
              {archivalAgents.length > 0 && (
                <>
                  {archivalAgents.map((agent) => (
                    <AgentCardRow
                      key={agent.id}
                      agent={agent}
                      isDominant={false}
                      expanded={expandedAgent === agent.id}
                      onToggle={() => toggleEvidence(agent.id)}
                      opacity={0.15}
                    />
                  ))}
                </>
              )}

              {/* Empty state */}
              {activeAgents.length === 0 && dormantAgents.length === 0 && ghostAgents.length === 0 && archivalAgents.length === 0 && confidence !== 'waiting' && (
                <div className="trackRow">
                  <div>
                    <strong>Station quiet</strong>
                    <span>{confidence === 'scanned_roots_empty' ? 'Known roots scanned. No operational agents found.' : 'No agents discovered'}</span>
                  </div>
                </div>
              )}

              {confidence === 'waiting' && activeAgents.length === 0 && dormantAgents.length === 0 && ghostAgents.length === 0 && archivalAgents.length === 0 && (
                <div className="trackRow">
                  <div>
                    <strong>Scanning...</strong>
                    <span>Waiting for discovery results from relay</span>
                  </div>
                </div>
              )}

              {/* Fallback: static Saito rotation when no real agents */}
              {activeAgents.length === 0 && dormantAgents.length === 0 && ghostAgents.length === 0 && archivalAgents.length === 0 && saitoRotation.map((sig) => (
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
              {dominantAgent
                ? `${activeAgents.find(a => a.id === dominantAgent)?.name || 'The active agent'} controls the signal. You tune in, observe, and nudge. The atmosphere responds to operational truth — real agent presence, not fiction.`
                : 'No agents currently active. The station is quiet. When agents become operational, they will appear here and the atmosphere will emerge from their activity.'}
            </p>

            <NetworkPanel />

            <div className="futureNotes">
              <h3>Station notes</h3>
              <ul className="cleanList">
                {confidence === 'scanned_roots_empty' && (
                  <li>Known roots scanned. No operational agents found.</li>
                )}
                {confidence === 'high' && (
                  <li>{station?.agentCount || 0} agent{(station?.agentCount || 0) !== 1 ? 's' : ''} discovered from operational evidence.</li>
                )}
                {confidence === 'medium' && (
                  <li>Partial scan — {station?.agentCount || 0} agent{(station?.agentCount || 0) !== 1 ? 's' : ''} found with limited confidence.</li>
                )}
                {confidence === 'partial_scan' && (
                  <li>Partial scan complete. Results may be incomplete.</li>
                )}
                {confidence === 'waiting' && (
                  <li>Waiting for discovery scan to complete...</li>
                )}
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
