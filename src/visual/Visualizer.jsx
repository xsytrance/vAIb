import { useEffect, useRef, useState } from 'react'

// ============================================================
// vAIb Visualizer — amplitude-based coloring like the reference
// Tall bars = cyan, short bars = purple
// Modes: BARS | WAVE | RADIAL | SCOPE | TUNNEL | CONSTELLATION
// Touch: swipe L/R mode, swipe U/D sensitivity, tap pulse
// ============================================================

const MODES = ['BARS', 'WAVE', 'RADIAL', 'SCOPE', 'TUNNEL', 'CONSTELLATION']
const QUALITY_PRESETS = {
  HIGH: { fftSize: 1024, dprMax: 2, barCount: 64, radialCount: 96, tunnelRings: 20, starCount: 40 },
  BALANCED: { fftSize: 768, dprMax: 1.5, barCount: 52, radialCount: 72, tunnelRings: 15, starCount: 28 },
  BATTERY: { fftSize: 512, dprMax: 1.25, barCount: 40, radialCount: 52, tunnelRings: 11, starCount: 18 },
}

function ampColor(val) {
  const r = Math.round(180 - val * 180)
  const g = Math.round(80 + val * 175)
  const b = Math.round(255 - val * 35)
  return [r, g, b]
}

function drawBars(ctx, w, h, freqData, count = 64) {
  const gap = 2
  const barW = (w - gap * (count - 1)) / count
  const peaks = drawBars._peaks || (drawBars._peaks = new Float32Array(count))

  for (let i = 0; i < count; i++) {
    const dataI = Math.floor((i / count) * freqData.length * 0.75)
    const val = freqData[dataI] / 255
    const barH = Math.max(2, val * h * 0.92)

    if (barH > peaks[i]) peaks[i] = barH
    else peaks[i] = peaks[i] * 0.93

    const x = i * (barW + gap)
    const [r, g, b] = ampColor(val)

    const grad = ctx.createLinearGradient(x, h - barH, x, h)
    grad.addColorStop(0, `rgba(${r},${g},${b},1.0)`)
    grad.addColorStop(0.6, `rgba(${r},${g},${b},0.7)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0.2)`)
    ctx.fillStyle = grad
    ctx.fillRect(x, h - barH, barW, barH)

    ctx.shadowColor = `rgb(${r},${g},${b})`
    ctx.shadowBlur = 6
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`
    ctx.fillRect(x, h - barH, barW, 2)
    ctx.shadowBlur = 0

    if (peaks[i] > 4) {
      const [pr, pg, pb] = ampColor(peaks[i] / h)
      ctx.fillStyle = `rgba(${pr},${pg},${pb},0.9)`
      ctx.fillRect(x, h - peaks[i] - 2, barW, 2)
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
  ctx.shadowBlur = 10

  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const y = (timeData[i] / 128) * (h / 2)
    i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()

  ctx.globalAlpha = 0.25
  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const y = h - (timeData[i] / 128) * (h / 2)
    i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawRadial(ctx, w, h, freqData, count = 96) {
  const cx = w / 2; const cy = h / 2
  const radius = Math.min(w, h) * 0.26

  for (let i = 0; i < count; i++) {
    const dataI = Math.floor((i / count) * freqData.length * 0.8)
    const val = freqData[dataI] / 255
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const barLen = val * radius * 0.9
    const x1 = cx + Math.cos(angle) * radius
    const y1 = cy + Math.sin(angle) * radius
    const x2 = cx + Math.cos(angle) * (radius + barLen)
    const y2 = cy + Math.sin(angle) * (radius + barLen)
    const [r, g, b] = ampColor(val)

    ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + val * 0.5})`
    ctx.lineWidth = 2
    ctx.shadowColor = `rgb(${r},${g},${b})`
    ctx.shadowBlur = val * 10
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(0,255,220,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function drawScope(ctx, w, h, timeData) {
  const cy = h / 2
  const scale = h * 0.42

  ctx.strokeStyle = 'rgba(0,255,220,0.05)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke()
    ctx.beginPath(); ctx.moveTo((w / 4) * i, 0); ctx.lineTo((w / 4) * i, h); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(0,255,220,0.12)'
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()

  const sliceW = w / timeData.length
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(0,255,180,0.9)'
  ctx.shadowColor = 'rgba(0,255,180,0.5)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  for (let i = 0; i < timeData.length; i++) {
    const y = cy + ((timeData[i] - 128) / 128) * scale
    i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceW, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawTunnel(ctx, w, h, freqData, ts, rings = 20, motionScale = 1) {
  const cx = w / 2
  const cy = h / 2
  const low = (freqData[4] + freqData[8] + freqData[16]) / (3 * 255)
  const mid = (freqData[48] + freqData[64] + freqData[96]) / (3 * 255)
  const pulse = 1 + low * 0.35

  for (let i = 0; i < rings; i++) {
    const p = i / (rings - 1)
    const depth = (p + (ts * 0.00022 * (0.5 + low) * motionScale)) % 1
    const radius = (12 + depth * Math.min(w, h) * 0.55) * pulse
    const alpha = (1 - depth) * (0.12 + mid * 0.35)
    const hue = 170 + depth * 90

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue}, 95%, ${52 + low * 28}%, ${alpha})`
    ctx.lineWidth = 1 + (1 - depth) * 2.2
    ctx.shadowColor = `hsla(${hue},95%,62%,${alpha})`
    ctx.shadowBlur = 8 + (1 - depth) * 14
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

function drawConstellation(ctx, w, h, freqData, starsRef, starCount = 40, motionScale = 1) {
  if (!starsRef.current || starsRef.current.length !== starCount) {
    starsRef.current = Array.from({ length: starCount }, (_, i) => ({
      x: ((i * 97) % 1000) / 1000,
      y: ((i * 173) % 1000) / 1000,
      phase: ((i * 131) % 360) * (Math.PI / 180),
    }))
  }

  const stars = starsRef.current
  const energy = (freqData[10] + freqData[24] + freqData[48] + freqData[96]) / (4 * 255)
  const threshold = 100 + Math.round(energy * 70)

  ctx.fillStyle = 'rgba(7,16,28,0.28)'
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < stars.length; i++) {
    const a = stars[i]
    const ax = a.x * w
    const ay = a.y * h
    for (let j = i + 1; j < stars.length; j++) {
      const b = stars[j]
      const bx = b.x * w
      const by = b.y * h
      const dx = ax - bx
      const dy = ay - by
      const d = Math.hypot(dx, dy)
      if (d < threshold) {
        const alpha = (1 - d / threshold) * (0.15 + energy * 0.35)
        ctx.strokeStyle = `rgba(80,200,255,${alpha})`
        ctx.lineWidth = 0.8 + energy * 1.2
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
    }
  }

  stars.forEach((s, i) => {
    const drift = Math.sin(s.phase + i * 0.13) * 0.002 * motionScale
    s.x = (s.x + drift + 1) % 1
    s.y = (s.y + drift * 0.45 + 1) % 1
    s.phase += (0.01 + energy * 0.03) * motionScale
    const x = s.x * w
    const y = s.y * h
    const twinkle = 0.5 + Math.sin(s.phase) * 0.5
    const r = 1.1 + twinkle * 1.8 + energy * 1.4
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(200,245,255,${0.4 + twinkle * 0.5})`
    ctx.shadowColor = 'rgba(120,220,255,0.8)'
    ctx.shadowBlur = 5 + twinkle * 8
    ctx.fill()
  })
  ctx.shadowBlur = 0
}

export default function Visualizer({ analyser, compact = false }) {
  const canvasRef = useRef(null)
  const modeRef = useRef(0)
  const animRef = useRef(null)
  const sensitivityRef = useRef(1)
  const touchBoostRef = useRef(0)
  const rippleRef = useRef({ x: 0, y: 0, t: 0 })
  const gestureRef = useRef({ active: false, startX: 0, startY: 0, moved: false, pointerId: null })
  const starsRef = useRef(null)

  const [mode, setMode] = useState(0)
  const [sensitivity, setSensitivity] = useState(1)
  const [autoRotate, setAutoRotate] = useState(false)
  const [quality, setQuality] = useState('BALANCED')
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    drawBars._peaks = null
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    sensitivityRef.current = sensitivity
  }, [sensitivity])

  useEffect(() => {
    if (!autoRotate) return
    const id = setInterval(() => {
      setMode((prev) => (prev + 1) % MODES.length)
    }, 3600)
    return () => clearInterval(id)
  }, [autoRotate])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    if (reduceMotion) setAutoRotate(false)
  }, [reduceMotion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return

    const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.BALANCED
    analyser.fftSize = preset.fftSize
    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(analyser.fftSize)

    const dpr = Math.min(window.devicePixelRatio, preset.dprMax)
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
      ctx.fillStyle = 'rgba(4,10,20,0.88)'
      ctx.fillRect(0, 0, w, h)

      const amp = Math.max(0.65, Math.min(1.85, sensitivityRef.current + touchBoostRef.current))
      for (let i = 0; i < freqData.length; i++) freqData[i] = Math.min(255, Math.round(freqData[i] * amp))
      const motionScale = reduceMotion ? 0.35 : 1

      const m = modeRef.current
      if (m === 0) drawBars(ctx, w, h, freqData, preset.barCount)
      else if (m === 1) drawWave(ctx, w, h, timeData)
      else if (m === 2) drawRadial(ctx, w, h, freqData, preset.radialCount)
      else if (m === 3) drawScope(ctx, w, h, timeData)
      else if (m === 4) drawTunnel(ctx, w, h, freqData, performance.now(), preset.tunnelRings, motionScale)
      else drawConstellation(ctx, w, h, freqData, starsRef, preset.starCount, motionScale)

      const ripple = rippleRef.current
      const age = performance.now() - ripple.t
      if (!reduceMotion && age < 520) {
        const p = age / 520
        const radius = 16 + p * 62
        const alpha = (1 - p) * 0.34
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,255,220,${alpha.toFixed(3)})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      touchBoostRef.current *= 0.92
      if (touchBoostRef.current < 0.005) touchBoostRef.current = 0
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [analyser, quality, reduceMotion])

  const cycleMode = (delta) => {
    setMode((prev) => (prev + delta + MODES.length) % MODES.length)
  }

  const onPointerDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    gestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    }
    rippleRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
    touchBoostRef.current = Math.min(0.85, touchBoostRef.current + 0.32)
  }

  const onPointerMove = (e) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) g.moved = true
  }

  const onPointerUp = (e) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (absX > 44 && absX > absY) {
      cycleMode(dx < 0 ? 1 : -1)
    } else if (absY > 40 && absY > absX) {
      setSensitivity((prev) => {
        const next = prev + (dy < 0 ? 0.08 : -0.08)
        return Math.max(0.65, Math.min(1.85, Number(next.toFixed(2))))
      })
    } else if (!g.moved) {
      touchBoostRef.current = Math.min(0.95, touchBoostRef.current + 0.4)
    }

    gestureRef.current.active = false
    gestureRef.current.pointerId = null
  }

  return (
    <div className="visualizerWrap">
      <canvas
        ref={canvasRef}
        className="visualizerCanvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {!compact && (
        <div className="vizGestureHint">Swipe ◀/▶ mode · Swipe ▲/▼ sensitivity · Tap pulse</div>
      )}
      {!compact && (
        <div className="visualizerModes">
          {MODES.map((label, i) => (
            <button key={label} type="button"
              className={`vizModeBtn ${mode === i ? 'active' : ''}`}
              onClick={() => setMode(i)}>
              {label}
            </button>
          ))}
          <span className="vizSensitivity">SENS {Math.round(sensitivity * 100)}%</span>
          <button type="button" className={`vizModeBtn ${quality === 'HIGH' ? 'active' : ''}`} onClick={() => setQuality('HIGH')}>Q:H</button>
          <button type="button" className={`vizModeBtn ${quality === 'BALANCED' ? 'active' : ''}`} onClick={() => setQuality('BALANCED')}>Q:B</button>
          <button type="button" className={`vizModeBtn ${quality === 'BATTERY' ? 'active' : ''}`} onClick={() => setQuality('BATTERY')}>Q:P</button>
          <button type="button" className={`vizModeBtn ${reduceMotion ? 'active' : ''}`} onClick={() => setReduceMotion((v) => !v)}>RM</button>
          <button
            type="button"
            className={`vizModeBtn ${autoRotate ? 'active' : ''}`}
            disabled={reduceMotion}
            onClick={() => setAutoRotate((v) => !v)}
          >
            AUTO
          </button>
        </div>
      )}
    </div>
  )
}
