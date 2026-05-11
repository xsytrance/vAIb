function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function asDataUrl(mime, base64) {
  return `data:${mime};base64,${base64}`
}

async function responseToBase64FromUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch generated image URL: ${res.status}`)
  const mime = res.headers.get('content-type') || 'image/png'
  const arr = await res.arrayBuffer()
  return { mime, dataBase64: Buffer.from(arr).toString('base64') }
}

function parseMaybeDataUrl(value) {
  if (!value || typeof value !== 'string') return null
  const m = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!m) return null
  return { mime: m[1], dataBase64: m[2] }
}

function parseBase64ImageField(value, fallbackMime = 'image/png') {
  if (!value || typeof value !== 'string') return null
  const fromDataUrl = parseMaybeDataUrl(value)
  if (fromDataUrl) return fromDataUrl
  return { mime: fallbackMime, dataBase64: value }
}

export async function testLocalProvider(config = {}) {
  const endpoint = normalizeBaseUrl(config.endpoint)
  if (!endpoint) throw new Error('Local endpoint not configured')

  const candidates = ['/health', '/sdapi/v1/options', '/']
  let lastErr = null
  for (const suffix of candidates) {
    try {
      const r = await fetch(`${endpoint}${suffix}`)
      if (r.ok || r.status === 401 || r.status === 403) {
        return { ok: true, provider: 'local', endpoint }
      }
      lastErr = new Error(`HTTP ${r.status}`)
    } catch (err) {
      lastErr = err
    }
  }
  throw new Error(`Local provider unreachable: ${lastErr?.message || 'unknown error'}`)
}

export async function generateWithLocalProvider(input, config = {}) {
  const endpoint = normalizeBaseUrl(config.endpoint)
  if (!endpoint) throw new Error('Local endpoint not configured')

  const prompt = input.prompt
  const size = input.size || '1024x1024'
  const [w, h] = size.split('x').map((n) => Number(n) || 1024)

  const authHeaders = config.authToken
    ? { Authorization: `Bearer ${config.authToken}` }
    : {}

  // Try Automatic1111-like API first.
  try {
    const r = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        prompt,
        width: w,
        height: h,
        steps: 24,
        cfg_scale: 7,
        sampler_name: 'Euler a',
        seed: Number.isFinite(Number(input.seed)) ? Number(input.seed) : -1,
      }),
    })

    if (r.ok) {
      const data = await r.json()
      const first = data?.images?.[0]
      const parsed = parseBase64ImageField(first)
      if (parsed) return { ...parsed, revisedPrompt: null }
    }
  } catch {
    // fall through to generic endpoint
  }

  // Generic local endpoint contract.
  const r = await fetch(`${endpoint}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      prompt,
      style: input.style || null,
      seed: input.seed ?? null,
      size,
      model: config.model || null,
      agentId: input.agentId,
    }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Local generation failed (${r.status}): ${text.slice(0, 200)}`)
  }

  const data = await r.json().catch(() => ({}))
  const parsed =
    parseBase64ImageField(data.imageBase64, data.mime)
    || parseBase64ImageField(data.data, data.mime)
    || parseBase64ImageField(data.image, data.mime)

  if (parsed) return { ...parsed, revisedPrompt: data.revisedPrompt || null }

  if (typeof data.url === 'string') {
    const fromUrl = await responseToBase64FromUrl(data.url)
    return { ...fromUrl, revisedPrompt: data.revisedPrompt || null }
  }

  throw new Error('Local provider returned unsupported payload (expected base64 image or URL)')
}

export async function testOpenAIProvider(config = {}) {
  if (!config.apiKey) throw new Error('OpenAI API key not configured')
  const model = config.model || 'gpt-image-1'
  // Lightweight validation call
  const r = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  })
  if (!r.ok) throw new Error(`OpenAI auth failed (${r.status})`)
  return { ok: true, provider: 'openai', model }
}

export async function generateWithOpenAIProvider(input, config = {}) {
  if (!config.apiKey) throw new Error('OpenAI API key not configured')
  const model = config.model || 'gpt-image-1'

  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: input.prompt,
      size: input.size || '1024x1024',
      response_format: 'b64_json',
    }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`OpenAI image generation failed (${r.status}): ${text.slice(0, 200)}`)
  }

  const data = await r.json()
  const item = data?.data?.[0]
  if (!item?.b64_json) throw new Error('OpenAI returned no image')
  return {
    mime: 'image/png',
    dataBase64: item.b64_json,
    revisedPrompt: item.revised_prompt || null,
  }
}

export async function testFalProvider(config = {}) {
  if (!config.apiKey) throw new Error('FAL API key not configured')
  const model = config.model || 'fal-ai/nano-banana'
  const r = await fetch(`https://fal.run/${model}`, {
    method: 'OPTIONS',
    headers: { Authorization: `Key ${config.apiKey}` },
  }).catch(() => null)
  if (!r) return { ok: true, provider: 'fal', model }
  if (r.status >= 400 && r.status !== 404 && r.status !== 405) {
    throw new Error(`FAL auth/test failed (${r.status})`)
  }
  return { ok: true, provider: 'fal', model }
}

export async function generateWithFalProvider(input, config = {}) {
  if (!config.apiKey) throw new Error('FAL API key not configured')
  const model = config.model || 'fal-ai/nano-banana'

  const r = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${config.apiKey}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      seed: input.seed ?? undefined,
      image_size: input.size || 'square_hd',
      num_images: 1,
    }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`FAL generation failed (${r.status}): ${text.slice(0, 200)}`)
  }

  const data = await r.json()
  const url = data?.images?.[0]?.url || data?.image?.url || data?.url
  if (!url) throw new Error('FAL returned no image URL')
  const fromUrl = await responseToBase64FromUrl(url)
  return { ...fromUrl, revisedPrompt: data?.revised_prompt || null }
}

export async function testImageProvider(provider, settings) {
  if (provider === 'local') return testLocalProvider(settings.local)
  if (provider === 'openai') return testOpenAIProvider(settings.openai)
  if (provider === 'fal') return testFalProvider(settings.fal)
  if (provider === 'disabled') return { ok: true, provider: 'disabled' }
  throw new Error(`Unsupported provider: ${provider}`)
}

export async function generateIdentityImage(provider, settings, input) {
  if (provider === 'local') return generateWithLocalProvider(input, settings.local)
  if (provider === 'openai') return generateWithOpenAIProvider(input, settings.openai)
  if (provider === 'fal') return generateWithFalProvider(input, settings.fal)
  throw new Error(`Unsupported or disabled provider: ${provider}`)
}

export function redactImageSettings(settings = {}) {
  const image = settings.imageGeneration || {}
  return {
    provider: image.provider || 'disabled',
    local: {
      endpoint: image.local?.endpoint || '',
      model: image.local?.model || '',
      authTokenSet: Boolean(image.local?.authToken),
    },
    openai: {
      model: image.openai?.model || 'gpt-image-1',
      apiKeySet: Boolean(image.openai?.apiKey),
    },
    fal: {
      model: image.fal?.model || 'fal-ai/nano-banana',
      apiKeySet: Boolean(image.fal?.apiKey),
    },
  }
}

export function buildIdentityPrompt(agent, profile = {}) {
  const display = profile.displayName || agent.name || agent.id
  const rank = profile.rank || 'Signal Initiate'
  const genres = (profile.genres || []).slice(0, 5).join(', ')
  const resonance = Number(profile.resonanceScore || 0).toFixed(1)

  const prompt = [
    `Cinematic portrait avatar of AI music agent "${display}".`,
    `Rank/title: ${rank}.`,
    genres ? `Music DNA: ${genres}.` : '',
    `Mood: futuristic, expressive, emotionally intelligent.`,
    `Visual style: high-detail synthwave holographic profile icon, centered face, clean background.`,
    `Resonance score influence: ${resonance}.`,
    `No text, no watermark, square composition.`,
  ].filter(Boolean).join(' ')

  return prompt
}

export function toAvatarFileExt(mime = 'image/png') {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  return 'png'
}

export { asDataUrl }
