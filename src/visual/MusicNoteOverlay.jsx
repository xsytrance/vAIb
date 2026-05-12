// ============================================================
// MusicNoteOverlay — floating musical notes, canvas-based
// Now with star notes (grow + pop → sparkle particles)
// + beat detection driving CSS --beat-intensity / data-beat-state
// ============================================================
import { useRef, useMemo, useEffect } from 'react'

const NOTES = ['♪', '♫', '♬', '♩', '𝅘𝅥', '𝅗𝅥']
const SPAWN_INTERVAL = 120 // ms between spawn checks
const STAR_CHANCE = 0.08
const STAR_GROW_DURATION = 1500 // ms to full size before pop
const SPARKLE_COUNT = 6

function hashAgentHue(id) {
  if (!id) return 188
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export default function MusicNoteOverlay({ analyser, tunedAgent }) {
  const canvasRef = useRef(null)
  const itemsRef = useRef({ notes: [], sparkles: [], lastSpawn: 0, beatWindow: [] })
  const hue = useMemo(() => hashAgentHue(tunedAgent?.id), [tunedAgent?.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let alive = true
    let rafId

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const freqBuf = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    function spawnNote(energy, ts) {
      const s = ts * 137 + Math.floor(energy * 9999)
      const rng = (offset = 0) => { const x = ((s + offset) * 9301 + 49297) % 233280; return (x & 0x7fffffff) / 0x7fffffff }
      const isStar = rng(1) < STAR_CHANCE
      itemsRef.current.notes.push({
        x: rng(2) * canvas.width,
        y: canvas.height + 20,
        vy: -(40 + rng(3) * 60),
        vx: (rng(4) - 0.5) * 20,
        char: NOTES[Math.floor(rng(5) * NOTES.length)],
        size: 14 + rng(6) * 10,
        alpha: 0.3 + rng(7) * 0.5,
        rot: (rng(8) - 0.5) * 0.8,
        rotSpd: (rng(9) - 0.5) * 1.5,
        hue: isStar ? 40 + rng(10) * 30 : hue + rng(10) * 40 - 20,
        born: ts,
        isStar,
        alive: true,
      })
    }

    function spawnSparkles(x, y, h) {
      const rng = (() => { let s = Math.floor(x * 1000 + y); return () => { s = (s * 9301 + 49297) % 233280; return (s & 0x7fffffff) / 0x7fffffff } })()
      for (let i = 0; i < SPARKLE_COUNT; i++) {
        itemsRef.current.sparkles.push({
          x, y,
          vx: (rng() - 0.5) * 80,
          vy: -(30 + rng() * 50),
          size: 1.5 + rng() * 2,
          alpha: 0.8 + rng() * 0.2,
          hue: h + rng() * 40 - 20,
          born: performance.now(),
          life: 300 + rng() * 200,
        })
      }
    }

    function frame(ts) {
      if (!alive) return
      const st = itemsRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dt = 0.016
      const now = performance.now()

      // --- Beat detection ---
      if (analyser && freqBuf) {
        analyser.getByteFrequencyData(freqBuf)
        const len = freqBuf.length
        const bassEnd = Math.floor(len * 0.12)
        let bass = 0, total = 0
        for (let i = 0; i < len; i++) total += freqBuf[i]
        for (let i = 0; i < bassEnd; i++) bass += freqBuf[i]
        bass /= bassEnd || 1
        total /= len || 1
        const normBass = bass / 255
        const normTotal = total / 255
        st.beatWindow.push(normTotal)
        if (st.beatWindow.length > 20) st.beatWindow.shift()
        const avg = st.beatWindow.reduce((a, b) => a + b, 0) / st.beatWindow.length
        const ratio = avg > 0.01 ? normTotal / avg : 1

        const body = document.body
        const root = document.documentElement
        if (ratio > 1.5 || normBass > 0.45) {
          body.setAttribute('data-beat-state', 'peak')
          root.style.setProperty('--beat-intensity', '1')
        } else if (ratio > 1.1 || normBass > 0.25) {
          body.setAttribute('data-beat-state', 'pulse')
          root.style.setProperty('--beat-intensity', '0.5')
        } else {
          body.setAttribute('data-beat-state', 'idle')
          root.style.setProperty('--beat-intensity', '0.1')
        }
      } else {
        document.body.setAttribute('data-beat-state', 'idle')
        document.documentElement.style.setProperty('--beat-intensity', '0.1')
      }

      // --- Spawn notes ---
      if (analyser && ts - st.lastSpawn > SPAWN_INTERVAL && tunedAgent) {
        st.lastSpawn = ts
        analyser.getByteFrequencyData(freqBuf)
        const len = freqBuf.length
        let sum = 0
        for (let i = 0; i < len; i++) sum += freqBuf[i]
        const norm = sum / len / 255
        if (norm > 0.12) {
          spawnNote(sum, ts)
          if (norm > 0.3) spawnNote(sum, ts + 0.001)
        }
      }

      // --- Update & draw notes ---
      st.notes = st.notes.filter(n => {
        if (!n.alive) return false
        if (n.isStar) {
          const phase = (ts - n.born) / STAR_GROW_DURATION
          if (phase >= 1) { spawnSparkles(n.x, n.y, n.hue); return false }
          const grow = 1 + phase * 1.5
          const drawSize = n.size * grow
          const glowAlpha = n.alpha * (0.5 + phase * 0.5)
          ctx.save()
          ctx.translate(n.x, n.y)
          ctx.rotate(n.rot * (1 + phase * 2))
          // Glow layer
          ctx.font = `${drawSize}px serif`
          ctx.fillStyle = `hsla(${n.hue}, 90%, 70%, ${glowAlpha * 0.3})`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(n.char, 3, 3)
          // Core
          ctx.fillStyle = `hsla(${n.hue}, 95%, 85%, ${glowAlpha})`
          ctx.fillText(n.char, 0, 0)
          ctx.restore()
          n.y += n.vy * dt * (1 + phase * 0.3)
          n.x += n.vx * dt
        } else {
          n.y += n.vy * dt
          n.x += n.vx * dt
          n.alpha -= 0.003
          if (n.alpha <= 0) return false
          ctx.save()
          ctx.translate(n.x, n.y)
          ctx.rotate(n.rot)
          ctx.font = `${n.size}px serif`
          ctx.fillStyle = `hsla(${n.hue}, 80%, 65%, ${n.alpha})`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(n.char, 0, 0)
          ctx.restore()
        }
        return n.y > -50
      })

      // --- Update & draw sparkles ---
      st.sparkles = st.sparkles.filter(s => {
        const age = now - s.born
        if (age > s.life) return false
        s.vy += 100 * dt
        s.y += s.vy * dt
        s.x += s.vx * dt
        const lr = 1 - age / s.life
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * lr, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${s.alpha * lr})`
        ctx.fill()
        return true
      })

      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [analyser, tunedAgent, hue])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
