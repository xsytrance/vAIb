// server/music.mjs — Jamendo music API integration
// Get a free client_id at: https://developer.jamendo.com/v3.0
// Set env var: JAMENDO_CLIENT_ID=your_id_here

// Read lazily so .env loaded in api.mjs is visible by the time these functions run
const getClientId = () => process.env.JAMENDO_CLIENT_ID || ''
const BASE = 'https://api.jamendo.com/v3.0'

// Simple in-process cache so we don't hammer the API on every page load
const cache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function cacheGet(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null }
  return entry.value
}

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() })
}

export function isConfigured() {
  return Boolean(getClientId())
}

// Fetch atmospheric / instrumental / breakbeat tracks from Jamendo.
// Tags are searched with OR logic; vocalinstrumental=instrumental filters vocals.
export async function fetchTracks({ tags = 'atmospheric+instrumental+electronic', limit = 30 } = {}) {
  const cacheKey = `tracks:${tags}:${limit}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const CLIENT_ID = getClientId()
  if (!CLIENT_ID) {
    throw new Error('JAMENDO_CLIENT_ID not set — add it to your environment and restart the API server.')
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: 'json',
    limit: String(limit),
    tags,
    vocalinstrumental: 'instrumental',
    audioformat: 'mp32',
    include: 'musicinfo',
    groupby: 'artist_id',
    order: 'popularity_total',
  })

  const url = `${BASE}/tracks/?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`)

  const data = await res.json()
  if (data.headers?.status !== 'success') {
    throw new Error(`Jamendo returned error: ${data.headers?.error_message || 'unknown'}`)
  }

  const tracks = (data.results || []).map((t) => ({
    id: String(t.id),
    title: t.name,
    artist: t.artist_name,
    duration: t.duration, // seconds
    audioUrl: t.audio,
    tags: t.musicinfo?.tags?.genres || [],
    source: 'jamendo',
  }))

  cacheSet(cacheKey, tracks)
  return tracks
}

// Fetch a curated set split across moods to give variety
export async function fetchCuratedTracks() {
  const cacheKey = 'curated'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const [atmospheric, breakbeat, ambient] = await Promise.all([
    fetchTracks({ tags: 'atmospheric+electronic', limit: 15 }),
    fetchTracks({ tags: 'breakbeat+electronic', limit: 15 }),
    fetchTracks({ tags: 'ambient+downtempo', limit: 10 }),
  ])

  // Deduplicate by id, preserve order
  const seen = new Set()
  const merged = [...atmospheric, ...breakbeat, ...ambient].filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  cacheSet(cacheKey, merged)
  return merged
}
