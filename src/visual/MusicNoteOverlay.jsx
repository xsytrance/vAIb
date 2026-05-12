// ============================================================
// MusicNoteOverlay — floating musical notes, canvas-based
// ============================================================
import { useRef, useMemo, useEffect } from 'react'

function MusicNoteOverlay({ analyser, tunedAgent }) {
  const canvasRef = useRef(null)
  const notesRef = useRef([])
  const energyHistoryRef = useRef([])
  const rafRef = useRef(null)

  // Agent hue from the same hash used everywhere
  const hue = useMemo(() => {
    if (!tunedAgent?.id) return 188
    let h = 0
    const s = tunedAgent.id
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return Math.abs(h) % 360
  }, [tunedAgent?.id])

  const notes = ['♪', '♫', '♬', '♩', '𝅘𝅥', '𝅗𝅥']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio, 2)

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    // Energy smoothing — ignore tiny blips
    let smoothedEnergy = 0
    const SMOOTH_WINDOW = 8

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      // Measure audio energy (bass + low-mid)
      let rawEnergy = 0
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData)
        const bins = Math.min(freqData.length, 30)
        for (let i = 0; i < bins; i++) rawEnergy += freqData[i]
        rawEnergy /= bins / 255
      }
      energyHistoryRef.current.push(rawEnergy)
      if (energyHistoryRef.current.length > SMOOTH_WINDOW) energyHistoryRef.current.shift()
      smoothedEnergy = energyHistoryRef.current.reduce((a, b) => a + b, 0) / SMOOTH_WINDOW

      // Spawn notes when energy is high — cap active notes
      if (smoothedEnergy > 60 && notesRef.current.length < 15) {
        const count = smoothedEnergy > 180 ? 2 : 1
        for (let n = 0; n < count; n++) {
          notesRef.current.push({
            x: Math.random() * w,
            y: h + Math.random() * 20,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -(1.0 + Math.random() * 1.5),
            size: 12 + Math.random() * 10,
            alpha: 0.15 + Math.min(0.35, smoothedEnergy / 400),
            symbol: notes[Math.floor(Math.random() * notes.length)],
            drift: (Math.random() - 0.5) * 0.15,
            rot: (Math.random() - 0.5) * 0.3,
          })
        }
      }

      // Update & draw
      for (let i = notesRef.current.length - 1; i >= 0; i--) {
        const note = notesRef.current[i]
        note.y += note.vy
        note.x += note.vx + Math.sin(note.y * 0.02) * note.drift
        note.alpha *= 0.996

        if (note.y < -30 || note.alpha < 0.015) {
          notesRef.current.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, note.alpha)
        ctx.fillStyle = `hsl(${hue}, 75%, 70%)`
        ctx.font = `${note.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(note.symbol, note.x, note.y)
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [analyser, hue])

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

export default MusicNoteOverlay
