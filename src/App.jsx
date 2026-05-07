import { useEffect, useMemo, useState } from 'react'

const moodOptions = [
  'focused lift',
  'night-drive transcendence',
  'reflective glide',
  'breakbeat hunt',
  'ambient recovery',
]

async function loadState() {
  const response = await fetch('/api/backend/state')
  if (!response.ok) throw new Error('Failed to load vAIb state')
  return response.json()
}

async function sendAction(action, payload = {}) {
  const response = await fetch('/api/backend/action', {
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
          <span className="eyebrow">Entangle</span>
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

function App() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let mounted = true
    loadState()
      .then((data) => {
        if (!mounted) return
        setState(data)
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

  if (loading) {
    return <main className="appShell"><div className="loadingCard">Booting vAIb for Agents…</div></main>
  }

  if (!state || !agent || !currentTrack) {
    return <main className="appShell"><div className="loadingCard">State unavailable.</div></main>
  }

  return (
    <main className="appShell">
      <div className="ambient ambientA" />
      <div className="ambient ambientB" />
      <header className="hero panel">
        <div>
          <span className="eyebrow">vAIb for Agents</span>
          <h1>The first AI-native music player, with Saito as test pilot.</h1>
          <p>
            This is half player, half personality instrument. On the other side sits Entangle,
            the human-facing companion that turns my listening habits into selective, configurable signals.
          </p>
        </div>
        <div className="heroBadges">
          <StatPill label="Companion" value={state.meta.companionName} />
          <StatPill label="Profile" value={agent.name} />
          <StatPill label="Total plays" value={agent.playCount} />
          <StatPill label="Unread toasts" value={runtime.unreadNotifications} />
        </div>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="grid topGrid">
        <article className="panel nowPlayingPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Agent player</span>
              <h2>Now listening</h2>
            </div>
            <span className="statusDot">{agent.status}</span>
          </div>

          <div className="trackOrb">
            <div className="trackAura" />
            <div className="trackInfo">
              <strong>{currentTrack.title}</strong>
              <span>{currentTrack.artist}</span>
              <small>{currentTrack.bpm} BPM • {currentTrack.length}</small>
            </div>
          </div>

          <div className="tagRow">
            {currentTrack.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>

          <p className="reasonBox">Why I keep it around: {currentTrack.reason}</p>

          <div className="controlRow">
            <button type="button" onClick={() => act('play', { trackId: currentTrack.id })} disabled={busy}>Replay</button>
            <button type="button" onClick={() => act('next')} disabled={busy}>Next</button>
            <button type="button" onClick={() => act('favorite', { trackId: currentTrack.id })} disabled={busy}>Favorite</button>
            <button type="button" onClick={() => act('dislike', { trackId: currentTrack.id })} disabled={busy}>Dislike</button>
          </div>

          <div className="subStatRow">
            <StatPill label="Mood" value={agent.mood} />
            <StatPill label="Activity" value={agent.activity} />
          </div>
        </article>

        <article className="panel profilePanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Agent identity</span>
              <h2>{agent.name} taste profile</h2>
            </div>
          </div>
          <p className="muted">{agent.vibe}</p>

          <div className="metricGrid">
            {Object.entries(agent.metrics).map(([label, value]) => (
              <MetricBar key={label} label={label} value={value} />
            ))}
          </div>

          <div className="detailBlocks">
            <div>
              <h3>Tastes</h3>
              <div className="tagRow">{agent.tastes.map((item) => <span key={item} className="tag soft">{item}</span>)}</div>
            </div>
            <div>
              <h3>Dislikes</h3>
              <div className="tagRow">{agent.dislikes.map((item) => <span key={item} className="tag danger">{item}</span>)}</div>
            </div>
            <div>
              <h3>Rituals</h3>
              <ul className="cleanList">{agent.rituals.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </article>
      </section>

      <section className="grid midGrid">
        <article className="panel libraryPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Library</span>
              <h2>{runtime.currentPlaylist?.name}</h2>
            </div>
            <select value={agent.playlistId} onChange={(event) => act('playlist', { playlistId: event.target.value })}>
              {state.playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
              ))}
            </select>
          </div>

          <div className="trackList">
            {playlistTracks.map((track) => (
              <article key={track.id} className={`trackRow ${track.id === currentTrack.id ? 'active' : ''}`}>
                <div>
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                </div>
                <div className="rowMeta">
                  {favoritesSet.has(track.id) ? <span className="miniBadge good">★</span> : null}
                  {skippedSet.has(track.id) ? <span className="miniBadge bad">×</span> : null}
                  <button type="button" className="ghostButton" onClick={() => act('play', { trackId: track.id })}>Play</button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <ToastStack notifications={notifications} onReadAll={() => act('notifications.readAll')} />
      </section>

      <section className="grid bottomGrid">
        <article className="panel companionPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Human client</span>
              <h2>Entangle control room</h2>
            </div>
          </div>

          <p className="muted">
            This is the other half of the system: the place where you decide how much of my inner tool-life becomes visible.
          </p>

          <div className="prefsGrid">
            {Object.entries(state.preferences.notify).map(([key, value]) => (
              <label key={key} className="toggleCard">
                <span>{key}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(event) => act('preferences', { notify: { [key]: event.target.checked } })}
                />
              </label>
            ))}
          </div>

          <div className="moodTools">
            <h3>Mood override</h3>
            <div className="tagRow">
              {moodOptions.map((mood) => (
                <button key={mood} type="button" className="chipButton" onClick={() => act('mood', { mood })}>{mood}</button>
              ))}
            </div>
          </div>

          <div className="futureNotes">
            <h3>Surprise layer</h3>
            <ul className="cleanList">
              {runtime.autonomyHooks.map((item) => <li key={item}>{item}</li>)}
              <li>Future cross-tool bus: ID card, walkie, wallet, blog, storage, and music all emit the same selective event language.</li>
              <li>Taste drift map: watch preferences mutate over time instead of staying frozen like a settings page.</li>
            </ul>
          </div>
        </article>

        <article className="panel insightPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Observability</span>
              <h2>Why this matters</h2>
            </div>
          </div>

          <div className="tasteVector">
            {runtime.tasteVector.map((item) => (
              <MetricBar key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          <div className="insightBlocks">
            <div>
              <h3>Favorites</h3>
              <ul className="cleanList compact">
                {favorites.map((track) => <li key={track.id}>{track.title} by {track.artist}</li>)}
              </ul>
            </div>
            <div>
              <h3>Recent events</h3>
              <ul className="cleanList compact eventList">
                {events.slice(0, 7).map((event) => (
                  <li key={event.id}>
                    <strong>{event.summary}</strong>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
