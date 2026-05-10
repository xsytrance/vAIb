import { useEffect, useRef, useState } from 'react'

// ============================================================
// vAIb Visualizer — 4 modes, Winamp-inspired
// Modes: BARS | WAVE | RADIAL | SCOPE
// ============================================================

const MODES = ['BARS', 'WAVE', 'RADIAL', 'SCOPE']

// Cyan → purple gradient stops matching the screenshot vibe
const BAR_COLORS = [
  { stop: 0.0, color: [0, 255, 220] },   // cyan
  { stop: 0.4, color: [80, 160, 255] },  // blue
  { stop: 0.8, color: [180, 80, 255] },  // purple
  { stop: 1.0, color: [255, 60, 180] },  // magenta
]

function lerpColor(colors, t) {
  for (let i = 0; i < colors.length - 1; i++) {
    const a = colors[i], b = colors[i + 1]
    if (t >= a.stop && t <= b.stop) {
      const f = (t - a.stop) / (b.stop - a.stop)
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * f),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * f),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * f),
      ]
    }
  }
  return colors[colors.length - 1].color
}

// ---- Renderers ----

function drawBars(ctx, w, h, freqData) {
  const count = Math.min(80, freqData.length)
  const barW = w / count
  const peaks = drawBars._peaks || (drawBars._peaks = new Float32Array(count))

  for (let i = 0; i < count; i++) {
    const val = freqData[i] / 255
    const barH = val * h * 0.95

    // Peak hold
    if (barH > (peaks[i] || 0)) peaks[i] = barH
    else peaks[i] = (peaks[i] || 0) * 0.94

    const x = i * barW
    const t = i / count

    // Main bar gradient
    const [r, g, b] = lerpColor(BAR_COLORS, t)
    const grad = ctx.createLinearGradient(x, h, x, h - barH)
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0.4)`)

    ctx.fillStyle = grad
    ctx.fillRect(x + 1, h - barH, barW - 2, barH)

    // Glow
    ctx.shadowColor = `rgb(${r},${g},${b})`
    ctx.shadowBlur = 8
    ctx.fillStyle = `rgba(${r},${g},${b},0.6)`
    ctx.fillRect(x + 1, h - barH, barW - 2, 2)
    ctx.shadowBlur = 0

    // Peak dot
    if (peaks[i] > 2) {
      const [pr, pg, pb] = lerpColor(BAR_COLORS, t)
      ctx.fillStyle = `rgba(${pr},${pg},${pb},0.95)`
      ctx.fillRect(x + 1, h - peaks[i] - 2, barW - 2, 2)
    }
  }
}
drawBars._peaks = null

function drawWave(ctx, w, h, timeData) {
  const sliceW = w / timeData.length
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, 'rgba(0,255,220,0.9)')
  grad.addColorStop(0.5, 'rgba(80,160,255,0.9)')
  grad.addColorStop(1, 'rgba(180,80,255,0.9)')

  ctx.strokeStyle = grad
  ctx.shadowColor = 'rgba(0,255,220,0.4)'
  ctx.shadowBlur = 12

  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[i] / 128
    const y = (v * h) / 2
    if (i === 0) ctx.moveTo(0, y)
    else ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // Mirror line below center
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[i] / 128
    const y = h - (v * h) / 2
    if (i === 0) ctx.moveTo(0, y)
    else ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawRadial(ctx, w, h, freqData) {
  const cx = w / 2, cy = h / 2
  const radius = Math.min(w, h) * 0.28
  const count = Math.min(120, freqData.length)

  for (let i = 0; i < count; i++) {
    const val = freqData[i] / 255
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const barLen = val * radius * 0.85

    const x1 = cx + Math.cos(angle) * radius
    const y1 = cy + Math.sin(angle) * radius
    const x2 = cx + Math.cos(angle) * (radius + barLen)
    const y2 = cy + Math.sin(angle) * (radius + barLen)

    const t = i / count
    const [r, g, b] = lerpColor(BAR_COLORS, t)

    ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + val * 0.5})`
    ctx.lineWidth = 2
    ctx.shadowColor = `rgb(${r},${g},${b})`
    ctx.shadowBlur = val * 12

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Inner circle
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(0,255,220,0.2)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function drawScope(ctx, w, h, timeData) {
  const cx = w / 2, cy = h / 2
  const scale = h * 0.4

  // Grid lines
  ctx.strokeStyle = 'rgba(0,255,220,0.06)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(0, (h / 4) * i)
    ctx.lineTo(w, (h / 4) * i)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo((w / 4) * i, 0)
    ctx.lineTo((w / 4) * i, h)
    ctx.stroke()
  }

  // Center line
  ctx.strokeStyle = 'rgba(0,255,220,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(w, cy)
  ctx.stroke()

  // Waveform
  const sliceW = w / timeData.length
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(0,255,180,0.9)'
  ctx.shadowColor = 'rgba(0,255,180,0.5)'
  ctx.shadowBlur = 10

  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const v = (timeData[i] - 128) / 128
    const y = cy + v * scale
    if (i === 0) ctx.moveTo(0, y)
    else ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

// ============================================================
// Component
// ============================================================

export default function Visualizer({ analyser }) {
  const canvasRef = useRef(null)
  const modeRef = useRef(0)
  const animRef = useRef(null)
  const [mode, setMode] = useState(0)

  // Reset bar peaks when mode switches
  useEffect(() => {
    drawBars._peaks = null
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return

    analyser.fftSize = 512
    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(analyser.fftSize)

    const dpr = Math.min(window.devicePixelRatio, 2)
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(freqData)
      analyser.getByteTimeDomainData(timeData)

      const ctx = canvas.getContext('2d')
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Dark background with fade trail
      ctx.fillStyle = 'rgba(5,12,22,0.85)'
      ctx.fillRect(0, 0, w, h)

      const m = modeRef.current
      if (m === 0) drawBars(ctx, w, h, freqData)
      else if (m === 1) drawWave(ctx, w, h, timeData)
      else if (m === 2) drawRadial(ctx, w, h, freqData)
      else if (m === 3) drawScope(ctx, w, h, timeData)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [analyser])

  return (
    <div className="visualizerWrap">
      <canvas ref={canvasRef} className="visualizerCanvas" />
      <div className="visualizerModes">
        {MODES.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`vizModeBtn ${mode === i ? 'active' : ''}`}
            onClick={() => setMode(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
