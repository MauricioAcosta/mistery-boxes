import { useRef, useEffect, useMemo, useCallback } from 'react'

/* ── Colores de segmento — estilo casino vibrante ─────────── */
const PALETTE = [
  '#c0392b', // rojo casino
  '#1a3a5c', // azul noche
  '#1e8449', // verde mesa
  '#6c3483', // púrpura
  '#d35400', // naranja quemado
  '#117a65', // verde azulado
  '#922b21', // rojo oscuro
  '#1f618d', // azul real
  '#b7950b', // dorado oscuro
  '#5b2c6f', // violeta
]

const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}
const TWO_PI = Math.PI * 2

function playTick(ctx, vol = 0.2) {
  if (!ctx) return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'triangle'
    o.frequency.value = 600 + Math.random() * 400
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

  /* ── Segmentos ─────────────────────────────────────────────── */
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

  /* ── Precarga de imágenes ──────────────────────────────────── */
  useEffect(() => {
    items?.forEach(item => {
      const url = item.product?.image_url
      if (!url || imgs.current[url]) return
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { imgs.current[url] = img }
      img.src = url
    })
  }, [items])

  /* ── Disparar giro ─────────────────────────────────────────── */
  useEffect(() => {
    if (winnerItemId == null) { st.current.phase = 'idle'; return }
    const idx = items?.findIndex(it => it.id === winnerItemId) ?? -1
    if (idx < 0 || !segs[idx]) return

    if (!st.current.audioCtx) {
      try { st.current.audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch (_) {}
    }
    st.current.audioCtx?.resume?.()

    const c = segs[idx].center
    const curMod = ((st.current.rot % TWO_PI) + TWO_PI) % TWO_PI
    const needed = ((TWO_PI - c) - curMod + TWO_PI) % TWO_PI
    st.current.targetRot = st.current.rot + needed + 9 * TWO_PI
    st.current.phase = 'spinning'
    st.current.startTime = null
    st.current.startRot = st.current.rot
    st.current.lastSeg = -1
  }, [winnerItemId, items, segs])

  /* ── Dibujo por frame ──────────────────────────────────────── */
  const drawFrame = useCallback((ts) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = st.current

    const parent = canvas.parentElement
    const size = parent ? Math.min(parent.offsetWidth - 4, 360) : 300
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size; canvas.height = size
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    const cx = size / 2, cy = size / 2
    const rOuter = size / 2 - 4    // radio externo total
    const rWheel = rOuter - 14     // radio de los segmentos
    const rInner = rWheel * 0.22   // radio del círculo central

    /* ── Actualizar rotación ─────────────────────────────────── */
    if (s.phase === 'idle') {
      s.rot += 0.007
    } else if (s.phase === 'spinning') {
      if (s.startTime == null) s.startTime = ts
      const progress = Math.min((ts - s.startTime) / s.duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      s.rot = s.startRot + (s.targetRot - s.startRot) * eased

      const mod = ((s.rot % TWO_PI) + TWO_PI) % TWO_PI
      const cur = segs.findIndex((sg, i) => {
        const end = i < segs.length - 1 ? segs[i + 1].start : TWO_PI
        return mod >= sg.start && mod < end
      })
      if (cur >= 0 && cur !== s.lastSeg) {
        playTick(s.audioCtx, progress < 0.55 ? 0.3 : 0.14)
        s.lastSeg = cur
      }
      if (progress >= 1) {
        s.rot = s.targetRot
        s.phase = 'done'
        playTick(s.audioCtx, 0.45)
        setTimeout(() => onSpinComplete?.(), 400)
      }
    }

    /* ── Sombra exterior ─────────────────────────────────────── */
    ctx.save()
    ctx.shadowColor = 'rgba(249,115,22,0.6)'
    ctx.shadowBlur = 28
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, TWO_PI)
    ctx.fillStyle = '#0a0f1a'; ctx.fill()
    ctx.restore()

    /* ── Aro exterior dorado (rim) ───────────────────────────── */
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, TWO_PI)
    const rimGrad = ctx.createLinearGradient(cx - rOuter, cy, cx + rOuter, cy)
    rimGrad.addColorStop(0,   '#d4af37')
    rimGrad.addColorStop(0.5, '#f5d76e')
    rimGrad.addColorStop(1,   '#d4af37')
    ctx.fillStyle = rimGrad; ctx.fill()

    /* ── Segmentos ───────────────────────────────────────────── */
    segs.forEach((seg, i) => {
      const a0 = seg.start - Math.PI / 2 + s.rot
      const a1 = a0 + seg.arc
      const mid = a0 + seg.arc / 2
      const baseColor = PALETTE[i % PALETTE.length]

      /* Relleno del segmento */
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, rWheel, a0, a1)
      ctx.closePath()
      ctx.fillStyle = baseColor
      ctx.fill()

      /* Franja exterior clara (borde interior del rim) */
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, rWheel, a0, a1)
      ctx.closePath()
      const edgeGrad = ctx.createLinearGradient(
        cx + Math.cos(mid) * rWheel * 0.7, cy + Math.sin(mid) * rWheel * 0.7,
        cx + Math.cos(mid) * rWheel,       cy + Math.sin(mid) * rWheel
      )
      edgeGrad.addColorStop(0, 'transparent')
      edgeGrad.addColorStop(1, 'rgba(255,255,255,0.12)')
      ctx.fillStyle = edgeGrad; ctx.fill()

      /* Borde entre segmentos */
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(
        cx + Math.cos(a0) * rInner * 1.2,
        cy + Math.sin(a0) * rInner * 1.2
      )
      ctx.lineTo(cx + Math.cos(a0) * rWheel, cy + Math.sin(a0) * rWheel)
      ctx.stroke()

      /* Contenido: imagen + precio ───────────────────────────── */
      if (seg.arc > 0.18) {
        const contentDist = rWheel * 0.62
        const imgX = cx + Math.cos(mid) * contentDist
        const imgY = cy + Math.sin(mid) * contentDist
        const url  = seg.item.product?.image_url
        const img  = imgs.current[url]

        ctx.save()
        ctx.translate(imgX, imgY)
        ctx.rotate(mid + Math.PI / 2)

        /* Imagen circular con clip */
        if (img && seg.arc > 0.25) {
          const isz = Math.min(26, rWheel * 0.16)
          ctx.save()
          ctx.beginPath(); ctx.arc(0, -isz * 0.7, isz / 2, 0, TWO_PI)
          ctx.clip()
          ctx.drawImage(img, -isz / 2, -isz * 1.2, isz, isz)
          ctx.restore()
        }

        /* Precio en blanco con sombra */
        const price = `$${seg.item.product?.retail_value?.toFixed(0)}`
        const fs = Math.max(9, Math.min(13, rWheel * 0.075))
        ctx.font = `bold ${fs}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3
        ctx.fillStyle = '#ffffff'
        ctx.fillText(price, 0, img && seg.arc > 0.25 ? 10 : 0)
        ctx.shadowBlur = 0
        ctx.restore()
      }
    })

    /* ── Marcas en el aro (bolitas doradas) ──────────────────── */
    const nTicks = Math.max(segs.length * 2, 24)
    for (let i = 0; i < nTicks; i++) {
      const a = (i / nTicks) * TWO_PI - Math.PI / 2 + s.rot
      const tx = cx + Math.cos(a) * (rWheel + 7)
      const ty = cy + Math.sin(a) * (rWheel + 7)
      const isSegBound = segs.some(sg => {
        const diff = Math.abs(((sg.start - Math.PI / 2 + s.rot) % TWO_PI + TWO_PI) % TWO_PI -
                             ((a + TWO_PI) % TWO_PI))
        return diff < 0.05 || diff > TWO_PI - 0.05
      })
      ctx.beginPath()
      ctx.arc(tx, ty, isSegBound ? 4 : 2.5, 0, TWO_PI)
      ctx.fillStyle = isSegBound ? '#f5d76e' : 'rgba(255,255,255,0.5)'
      ctx.fill()
    }

    /* ── Círculo interior (plato central) ────────────────────── */
    // Sombra
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(cx, cy, rInner + 3, 0, TWO_PI)
    ctx.fillStyle = '#0a0f1a'; ctx.fill()
    ctx.restore()

    // Gradiente metálico
    const cg = ctx.createRadialGradient(cx - rInner * 0.3, cy - rInner * 0.3, 2, cx, cy, rInner + 3)
    cg.addColorStop(0, '#475569')
    cg.addColorStop(0.5, '#1e293b')
    cg.addColorStop(1, '#0f172a')
    ctx.beginPath(); ctx.arc(cx, cy, rInner + 3, 0, TWO_PI)
    ctx.fillStyle = cg; ctx.fill()

    // Aro dorado del centro
    ctx.beginPath(); ctx.arc(cx, cy, rInner + 3, 0, TWO_PI)
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.stroke()

    // Ícono central
    const iconSize = rInner * 0.85
    ctx.font = `${iconSize}px serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🎁', cx, cy + 1)

    /* ── Puntero ─────────────────────────────────────────────── */
    const py = cy - rOuter + 1
    // Sombra del puntero
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8
    // Cuerpo del puntero (rectángulo redondeado + triángulo)
    const pw = 16, ph = 22
    ctx.beginPath()
    ctx.moveTo(cx - pw / 2, py - ph)
    ctx.lineTo(cx + pw / 2, py - ph)
    ctx.lineTo(cx + pw / 2, py - 8)
    ctx.lineTo(cx, py + 4)
    ctx.lineTo(cx - pw / 2, py - 8)
    ctx.closePath()

    const pGrad = ctx.createLinearGradient(cx, py - ph, cx, py + 4)
    pGrad.addColorStop(0, '#ef4444')
    pGrad.addColorStop(1, '#b91c1c')
    ctx.fillStyle = pGrad; ctx.fill()

    // Borde blanco
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
    // Brillo superior
    ctx.beginPath()
    ctx.moveTo(cx - pw / 2 + 3, py - ph + 2)
    ctx.lineTo(cx + pw / 2 - 3, py - ph + 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()

    rafRef.current = requestAnimationFrame(drawFrame)
  }, [segs, onSpinComplete])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame)
    return () => { rafRef.current && cancelAnimationFrame(rafRef.current) }
  }, [drawFrame])

  return (
    <div className="roulette-wrap">
      <canvas ref={canvasRef} className="roulette-canvas" />
    </div>
  )
}
