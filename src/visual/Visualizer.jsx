import { useEffect, useRef, useState } from 'react'

// ============================================================
// vAIb Visualizer — amplitude-based coloring like the reference
// Tall bars = cyan, short bars = purple
// Modes: BARS | WAVE | RADIAL | SCOPE
// Touch: swipe L/R mode, swipe U/D sensitivity, tap pulse
// ============================================================

const MODES = ['BARS', 'WAVE', 'RADIAL', 'SCOPE']

function ampColor(val) {
  const r = Math.round(180 - val * 180)
  const g = Math.round(80 + val * 175)
  const b = Math.round(255 - val * 35)
  return [r, g, b]
}

function drawBars(ctx, w, h, freqData) {
  const count = 64
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

function drawRadial(ctx, w, h, freqData) {
  const cx = w / 2; const cy = h / 2
  const radius = Math.min(w, h) * 0.26
  const count = 96

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

export default function Visualizer({ analyser, compact = false }) {
  const canvasRef = useRef(null)
  const modeRef = useRef(0)
  const animRef = useRef(null)
  const sensitivityRef = useRef(1)
  const touchBoostRef = useRef(0)
  const rippleRef = useRef({ x: 0, y: 0, t: 0 })
  const gestureRef = useRef({ active: false, startX: 0, startY: 0, moved: false, pointerId: null })

  const [mode, setMode] = useState(0)
  const [sensitivity, setSensitivity] = useState(1)

  useEffect(() => {
    drawBars._peaks = null
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    sensitivityRef.current = sensitivity
  }, [sensitivity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return

    analyser.fftSize = 1024
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
      ctx.fillStyle = 'rgba(4,10,20,0.88)'
      ctx.fillRect(0, 0, w, h)

      const amp = Math.max(0.65, Math.min(1.85, sensitivityRef.current + touchBoostRef.current))
      for (let i = 0; i < freqData.length; i++) freqData[i] = Math.min(255, Math.round(freqData[i] * amp))

      const m = modeRef.current
      if (m === 0) drawBars(ctx, w, h, freqData)
      else if (m === 1) drawWave(ctx, w, h, timeData)
      else if (m === 2) drawRadial(ctx, w, h, freqData)
      else drawScope(ctx, w, h, timeData)

      const ripple = rippleRef.current
      const age = performance.now() - ripple.t
      if (age < 520) {
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
  }, [analyser])

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
        </div>
      )}
    </div>
  )
}
