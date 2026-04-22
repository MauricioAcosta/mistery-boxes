/**
 * SlotReel — Experiencia completa de apertura de caja.
 * Full-screen overlay: reel → winner → acciones (canjear / enviar).
 * No requiere modal separado.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

/* ── Constantes de reel ─────────────────────────────────────── */
const CARD_W     = 168   // px por tarjeta (ancho + gap)
const REEL_SIZE  = 52
const WINNER_IDX = 38
const SPIN_MS    = 6200

/* ── Paleta de rareza ───────────────────────────────────────── */
const RARITY = {
  common:    { color: '#94a3b8', label: 'Común',      glow: 'rgba(148,163,184,0.5)' },
  uncommon:  { color: '#22c55e', label: 'Poco común', glow: 'rgba(34,197,94,0.6)'   },
  rare:      { color: '#3b82f6', label: 'Raro',       glow: 'rgba(59,130,246,0.6)'  },
  epic:      { color: '#a855f7', label: 'Épico',      glow: 'rgba(168,85,247,0.7)'  },
  legendary: { color: '#f59e0b', label: 'Legendario', glow: 'rgba(245,158,11,0.8)'  },
}
const CONFETTI = ['#f59e0b','#ef4444','#a855f7','#3b82f6','#22c55e','#ec4899','#ffffff']

/* ── Audio sintetizado por rareza ───────────────────────────── */
function playTick(actx, vol = 0.15) {
  if (!actx) return
  try {
    const o = actx.createOscillator(), g = actx.createGain()
    o.connect(g); g.connect(actx.destination)
    o.type = 'triangle'; o.frequency.value = 650 + Math.random() * 350
    g.gain.setValueAtTime(vol, actx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.055)
    o.start(); o.stop(actx.currentTime + 0.06)
  } catch (_) {}
}

function playWin(actx, rarity) {
  if (!actx) return
  const scales = {
    common:    [[523, 0]],
    uncommon:  [[523, 0], [659, 120]],
    rare:      [[523, 0], [659, 110], [784, 220]],
    epic:      [[523, 0], [659, 100], [784, 200], [1047, 310]],
    legendary: [[523, 0], [659, 90],  [784, 180], [1047, 270], [1319, 360]],
  }
  const notes = scales[rarity] || scales.common
  notes.forEach(([freq, delay]) => {
    setTimeout(() => {
      try {
        const o = actx.createOscillator(), g = actx.createGain()
        o.connect(g); g.connect(actx.destination)
        o.type = rarity === 'legendary' ? 'sawtooth' : 'sine'
        o.frequency.value = freq
        g.gain.setValueAtTime(0.28, actx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.0)
        o.start(); o.stop(actx.currentTime + 1.1)
      } catch (_) {}
    }, delay)
  })
}

/* ── Construcción del reel (tarjetas de igual tamaño) ────────── */
function buildReel(items, winnerId) {
  const winner = items.find(it => it.id === winnerId) || items[0]
  return Array.from({ length: REEL_SIZE }, (_, i) =>
    i === WINNER_IDX ? winner : items[Math.floor(Math.random() * items.length)]
  )
}

/* ═══════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════ */
export default function SlotReel({ box, opening, onClose }) {
  const { refreshWallet } = useAuth()
  const trackRef    = useRef(null)
  const viewRef     = useRef(null)
  const actxRef     = useRef(null)
  const tickTimer   = useRef(null)

  const [phase, setPhase]         = useState('spin')   // spin | reveal | action | done
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [showShip, setShowShip]   = useState(false)
  const [addr, setAddr]           = useState({ full_name:'', address:'', city:'', country:'', postal_code:'' })
  const [shipErr, setShipErr]     = useState('')

  const reel   = useRef(buildReel(box.items, opening.winner_box_item_id)).current
  const winner = reel[WINNER_IDX]
  const rarity = winner?.product?.rarity || 'common'
  const rar    = RARITY[rarity] || RARITY.common

  /* ── Iniciar audio ────────────────────────────────────────── */
  useEffect(() => {
    try {
      actxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      actxRef.current.resume()
    } catch (_) {}
    return () => {
      clearInterval(tickTimer.current)
      actxRef.current?.close?.()
    }
  }, [])

  /* ── Lanzar animación del reel ────────────────────────────── */
  useEffect(() => {
    const track = trackRef.current
    const view  = viewRef.current
    if (!track || !view) return

    // Reset posición
    track.style.transition = 'none'
    track.style.transform  = 'translateX(0)'
    track.getBoundingClientRect()

    const containerW  = view.offsetWidth
    const centerOff   = containerW / 2 - CARD_W / 2
    const targetX     = -(WINNER_IDX * CARD_W - centerOff)

    // Ticks progresivos
    let tickInterval = 60
    let elapsed = 0
    tickTimer.current = setInterval(() => {
      elapsed += tickInterval
      const progress = elapsed / SPIN_MS
      playTick(actxRef.current, 0.12 + (1 - progress) * 0.15)
      // Aumentar intervalo (desacelerar ticks)
      tickInterval = Math.min(60 + elapsed / 60, 380)
      clearInterval(tickTimer.current)
      if (elapsed < SPIN_MS - 200) {
        tickTimer.current = setInterval(() => {}, tickInterval) // reinicia en próximo ciclo
        // La forma más simple: llamar recursivamente
      }
    }, tickInterval)

    // Limpiar y usar approach más simple para ticks
    clearInterval(tickTimer.current)
    let t = 0
    const doTick = () => {
      t += 1
      const progress = t / 80
      if (progress >= 1) { playTick(actxRef.current, 0.08); return }
      playTick(actxRef.current, 0.2 - progress * 0.12)
      const nextDelay = 40 + Math.pow(progress, 2) * 340
      setTimeout(doTick, nextDelay)
    }
    setTimeout(doTick, 80)

    // Scroll del reel
    requestAnimationFrame(() => {
      track.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.97, 0.06, 1)`
      track.style.transform  = `translateX(${targetX}px)`
    })

    // Fin de animación → reveal
    const t1 = setTimeout(() => {
      setPhase('reveal')
      playWin(actxRef.current, rarity)
    }, SPIN_MS + 150)

    const t2 = setTimeout(() => setPhase('action'), SPIN_MS + 1200)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [rarity])

  /* ── Acciones ─────────────────────────────────────────────── */
  const handleExchange = async () => {
    setActionBusy(true)
    try {
      const r = await api.post('/exchange', { opening_id: opening.opening_id })
      refreshWallet()
      setActionMsg(`💰 ¡Canjeado! +$${r.data.exchange_amount.toFixed(2)} en tu billetera`)
      setPhase('done')
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Error al canjear')
    } finally { setActionBusy(false) }
  }

  const handleShip = async (e) => {
    e.preventDefault()
    setShipErr(''); setActionBusy(true)
    try {
      await api.post('/ship', { opening_id: opening.opening_id, ...addr })
      refreshWallet()
      setActionMsg('📦 ¡Envío solicitado! Te contactamos en 24 h.')
      setPhase('done')
    } catch (e) {
      setShipErr(e.response?.data?.error || 'Error al solicitar envío')
    } finally { setActionBusy(false) }
  }

  const exchAmt = ((winner?.product?.retail_value || 0) * 0.70).toFixed(2)

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="slot-overlay" onClick={phase === 'done' ? onClose : undefined}>
      <div className="slot-container" onClick={e => e.stopPropagation()}>

        {/* ── Cabecera ──────────────────────────────────────── */}
        <div className="slot-header">
          <img src={box.image_url} alt={box.name} className="slot-header-img" />
          <span className="slot-header-name">{box.name}</span>
          {(phase === 'spin') && (
            <span className="slot-spin-badge">🎰 Girando…</span>
          )}
        </div>

        {/* ── Reel ──────────────────────────────────────────── */}
        <div className="slot-stage">
          {/* Marcador central */}
          <div className="slot-pointer-top" />
          <div className="slot-pointer-bottom" />
          {/* Degradados laterales */}
          <div className="slot-fade slot-fade-l" />
          <div className="slot-fade slot-fade-r" />

          <div className="slot-viewport" ref={viewRef}>
            <div className="slot-track" ref={trackRef}>
              {reel.map((item, i) => {
                const r2   = item?.product?.rarity || 'common'
                const isW  = i === WINNER_IDX && phase !== 'spin'
                const rc   = RARITY[r2] || RARITY.common
                return (
                  <div key={i}
                    className={`slot-card${isW ? ' slot-card--winner' : ''}`}
                    style={{ '--rc': rc.color, '--glow': rc.glow }}>
                    <div className="slot-card-img">
                      <img src={item?.product?.image_url} alt={item?.product?.name}
                        onError={e => { e.target.src = '/placeholder.svg' }} />
                    </div>
                    <div className="slot-card-rarity" style={{ color: rc.color }}>{rc.label}</div>
                    <div className="slot-card-name">{item?.product?.name}</div>
                    <div className="slot-card-val">${item?.product?.retail_value?.toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Winner reveal ─────────────────────────────────── */}
        {(phase === 'reveal' || phase === 'action' || phase === 'done') && (
          <div className="slot-winner-section" style={{ '--wc': rar.color, '--wg': rar.glow }}>
            {/* Partículas confetti */}
            {phase === 'reveal' && (
              <div className="slot-confetti">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="slot-confetti-piece"
                    style={{
                      '--angle': `${i * 15}deg`,
                      '--color': CONFETTI[i % CONFETTI.length],
                      '--dist':  `${70 + (i % 4) * 25}px`,
                      '--delay': `${i * 0.03}s`,
                    }} />
                ))}
              </div>
            )}

            <div className="slot-winner-card">
              <div className="slot-winner-glow" />
              <img src={winner?.product?.image_url} alt={winner?.product?.name}
                className="slot-winner-img"
                onError={e => { e.target.src = '/placeholder.svg' }} />
              <span className="slot-winner-rarity" style={{ color: rar.color }}>
                ★ {rar.label.toUpperCase()}
              </span>
              <h3 className="slot-winner-name">{winner?.product?.name}</h3>
              <span className="slot-winner-brand">{winner?.product?.brand}</span>
              <span className="slot-winner-value" style={{ color: rar.color }}>
                ${winner?.product?.retail_value?.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ── Acciones ──────────────────────────────────────── */}
        {phase === 'action' && !showShip && (
          <div className="slot-actions">
            <p className="slot-actions-title">¿Qué haces con tu premio?</p>
            <div className="slot-actions-btns">
              <button className="btn btn-primary slot-action-btn" disabled={actionBusy}
                onClick={handleExchange}>
                💰 Canjear — ${exchAmt}
                <span className="slot-action-note">70% del valor</span>
              </button>
              <button className="btn btn-outline slot-action-btn" disabled={actionBusy}
                onClick={() => setShowShip(true)}>
                📦 Envío Físico
                <span className="slot-action-note">Costo $5.00</span>
              </button>
            </div>
            {actionMsg && <p className="slot-msg">{actionMsg}</p>}
          </div>
        )}

        {/* ── Formulario de envío ───────────────────────────── */}
        {phase === 'action' && showShip && (
          <form className="slot-ship-form" onSubmit={handleShip}>
            <p className="slot-actions-title">📦 Dirección de Envío</p>
            {[['full_name','Nombre completo'],['address','Dirección'],['city','Ciudad'],
              ['country','País'],['postal_code','Código Postal']].map(([k,l]) => (
              <input key={k} className="input" placeholder={l} required
                value={addr[k]} onChange={e => setAddr(a => ({ ...a, [k]: e.target.value }))} />
            ))}
            {shipErr && <p className="slot-msg slot-msg--err">{shipErr}</p>}
            <div className="slot-ship-btns">
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setShowShip(false)}>← Volver</button>
              <button type="submit" className="btn btn-primary" disabled={actionBusy}>
                {actionBusy ? 'Enviando…' : 'Confirmar Envío — $5.00'}
              </button>
            </div>
          </form>
        )}

        {/* ── Resultado final ───────────────────────────────── */}
        {phase === 'done' && (
          <div className="slot-done">
            <p className="slot-msg slot-msg--ok">{actionMsg}</p>
            <button className="btn btn-primary" onClick={onClose}>Ver Historial</button>
          </div>
        )}

        {/* ── Cerrar (solo cuando haya terminado) ──────────── */}
        {phase === 'action' && (
          <button className="slot-close" onClick={onClose} title="Cerrar">✕</button>
        )}
      </div>
    </div>
  )
}
