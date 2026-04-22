import { useRef, useEffect, useMemo, useCallback } from 'react'

const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}
const TWO_PI = Math.PI * 2

function playTick(ctx, vol = 0.15) {
  if (!ctx) return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'triangle'
    o.frequency.value = 550 + Math.random() * 350
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    o.start(); o.stop(ctx.currentTime + 0.07)
  } catch (_) {}
}

export default function RouletteWheel({ items, winnerItemId, onSpinComplete }) {
  const canvasRef = useRef(null)
  const st = useRef({
    rot: 0, phase: 'idle',
    startTime: null, startRot: 0, targetRot: 0, duration: 5800,
    lastSeg: -1, audioCtx: null,
  })
  const rafRef = useRef(null)
  const imgs = useRef({})

  const segs = useMemo(() => {
    if (!items?.length) return []
    const total = items.reduce((s, i) => s + i.weight, 0)
    let cum = 0
    return items.map(item => {
      const arc = (item.weight / total) * TWO_PI
      const seg = { item, arc, start: cum, center: cum + arc / 2 }
      cum += arc
      return seg
    })
  }, [items])

  // Preload images
  useEffect(() => {
    items?.forEach(item => {
      const url = item.product?.image_url
      if (!url || imgs.current[url]) return
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { imgs.current[url] = img }
      img.onerror = () => {} // silently ignore
      img.src = url
    })
  }, [items])

  // Trigger spin
  useEffect(() => {
    if (winnerItemId == null) {
      st.current.phase = 'idle'
      return
    }
    const idx = items?.findIndex(it => it.id === winnerItemId) ?? -1
    if (idx < 0 || !segs[idx]) return

    if (!st.current.audioCtx) {
      try { st.current.audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch (_) {}
    }
    st.current.audioCtx?.resume?.()

    const c = segs[idx].center
    const curRot = st.current.rot
    const curMod = ((curRot % TWO_PI) + TWO_PI) % TWO_PI
    const needed = ((TWO_PI - c) - curMod + TWO_PI) % TWO_PI
    const targetRot = curRot + needed + 9 * TWO_PI

    st.current.phase = 'spinning'
    st.current.startTime = null
    st.current.startRot = curRot
    st.current.targetRot = targetRot
    st.current.lastSeg = -1
  }, [winnerItemId, items, segs])

  const drawFrame = useCallback((ts) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = st.current

    const parent = canvas.parentElement
    const size = parent ? Math.min(parent.offsetWidth - 8, 360) : 300
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size; canvas.height = size
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    const cx = size / 2, cy = size / 2, r = size / 2 - 22

    // Update rotation
    if (s.phase === 'idle') {
      s.rot += 0.006
    } else if (s.phase === 'spinning') {
      if (s.startTime == null) s.startTime = ts
      const progress = Math.min((ts - s.startTime) / s.duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      s.rot = s.startRot + (s.targetRot - s.startRot) * eased

      // Tick on segment cross
      const mod = ((s.rot % TWO_PI) + TWO_PI) % TWO_PI
      const cur = segs.findIndex((sg, i) => {
        const end = i < segs.length - 1 ? segs[i + 1].start : TWO_PI
        return mod >= sg.start && mod < end
      })
      if (cur >= 0 && cur !== s.lastSeg) {
        playTick(s.audioCtx, progress < 0.6 ? 0.25 : 0.12)
        s.lastSeg = cur
      }
      if (progress >= 1) {
        s.rot = s.targetRot
        s.phase = 'done'
        playTick(s.audioCtx, 0.4)
        setTimeout(() => onSpinComplete?.(), 400)
      }
    }

    // Outer glow ring
    ctx.save()
    ctx.shadowColor = 'rgba(249,115,22,0.5)'
    ctx.shadowBlur = 20
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, TWO_PI)
    ctx.fillStyle = '#111827'; ctx.fill()
    ctx.restore()

    // Segments
    segs.forEach((seg, i) => {
      const a0 = seg.start - Math.PI / 2 + s.rot
      const a1 = a0 + seg.arc
      const rc = RARITY_COLORS[seg.item.product?.rarity || 'common']

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, a0, a1)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a'
      ctx.fill()

      // Rarity glow strip on outer edge
      const mid = a0 + seg.arc / 2
      const gr = ctx.createLinearGradient(
        cx + Math.cos(mid) * r * 0.5, cy + Math.sin(mid) * r * 0.5,
        cx + Math.cos(mid) * r, cy + Math.sin(mid) * r
      )
      gr.addColorStop(0, 'transparent')
      gr.addColorStop(1, rc + '55')
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, a0, a1)
      ctx.closePath()
      ctx.fillStyle = gr; ctx.fill()

      ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 0.8; ctx.stroke()

      // Content: image + price
      if (seg.arc > 0.15) {
        const imgDist = r * 0.70
        const imgX = cx + Math.cos(mid) * imgDist
        const imgY = cy + Math.sin(mid) * imgDist
        const imgUrl = seg.item.product?.image_url
        const img = imgs.current[imgUrl]

        ctx.save()
        ctx.translate(imgX, imgY)
        ctx.rotate(mid + Math.PI / 2)

        if (img && seg.arc > 0.22) {
          const isz = Math.min(24, r * 0.14)
          ctx.drawImage(img, -isz / 2, -isz - 2, isz, isz)
        }
        ctx.fillStyle = rc
        ctx.font = `bold ${Math.max(8, Math.min(11, r * 0.07))}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`$${seg.item.product?.retail_value?.toFixed(0)}`, 0, img && seg.arc > 0.22 ? 6 : 0)
        ctx.restore()
      }
    })

    // Outer ring + dots at segment edges
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI)
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.stroke()

    segs.forEach(seg => {
      const a = seg.start - Math.PI / 2 + s.rot
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TWO_PI)
      ctx.fillStyle = '#f97316'; ctx.fill()
    })

    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TWO_PI)
    const cg = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 26)
    cg.addColorStop(0, '#374151'); cg.addColorStop(1, '#0f172a')
    ctx.fillStyle = cg; ctx.fill()
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke()

    ctx.fillStyle = '#f97316'
    ctx.font = 'bold 15px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('★', cx, cy)

    // Pointer triangle at top
    const py = cy - r - 4
    ctx.beginPath()
    ctx.moveTo(cx - 11, py - 15)
    ctx.lineTo(cx + 11, py - 15)
    ctx.lineTo(cx, py + 4)
    ctx.closePath()
    ctx.fillStyle = '#f97316'
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke()

    rafRef.current = requestAnimationFrame(drawFrame)
  }, [segs, onSpinComplete])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame)
    return () => { rafRef.current && cancelAnimationFrame(rafRef.current) }
  }, [drawFrame])

  return (
    <div className="roulette-wrap">
      <div className="roulette-label">
        {st.current.phase === 'idle' ? '🎰 Gira siempre — ¡ábrela para ganar!' : '⚡ Girando…'}
      </div>
      <canvas ref={canvasRef} className="roulette-canvas" />
    </div>
  )
}
