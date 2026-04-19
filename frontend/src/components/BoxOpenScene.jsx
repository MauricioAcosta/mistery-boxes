/**
 * BoxOpenScene — Cinematic box-opening experience.
 *
 * Phases:
 *   idle      → Shows a grid of all possible items with probability bars.
 *   shaking   → Box image shakes + glow particles radiate outward (700 ms).
 *   bursting  → Burst rings + white flash as the box "explodes" (500 ms).
 *   reeling   → Horizontal slot-machine reel scrolls to the winner (8 000 ms).
 *   revealing → Winner card zooms in with star-burst particles + confetti (1 200 ms).
 *
 * Props:
 *   box       {object}   Full box data (items, image_url, name).
 *   animData  {object|null}  { items, winnerId } — null while idle.
 *                            winnerId must match a BoxItem.id (not Product.id).
 *   onFinish  {function} Called when the reveal phase ends (show PrizeModal).
 */
import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../i18n/index'

/* ── Reel constants ──────────────────────────────────────────── */
const CARD_W     = 176   // 160 px card + 16 px gap
const REEL_SIZE  = 80    // more cards for longer spin
const WINNER_IDX = 60    // winner further along the reel
const REEL_MS    = 8000  // 8 seconds of spinning

/* ── Phase timings ───────────────────────────────────────────── */
const SHAKE_MS = 700
const BURST_MS = 500

const P = {
  IDLE: 'idle', SHAKING: 'shaking', BURSTING: 'bursting',
  REELING: 'reeling', REVEALING: 'revealing',
}

/* ── Rarity ──────────────────────────────────────────────────── */
const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899']

function buildReel(items, winnerId) {
  if (!items?.length) return []
  const winner = items.find(it => it.id === winnerId) || items[0]
  const reel = []
  for (let i = 0; i < REEL_SIZE; i++) {
    if (i === WINNER_IDX) {
      reel.push(winner)
    } else {
      // weighted random so the reel looks more natural
      reel.push(items[Math.floor(Math.random() * items.length)])
    }
  }
  return reel
}

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
export default function BoxOpenScene({ box, animData, onFinish }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState(P.IDLE)
  const [reel, setReel]   = useState([])
  const trackRef = useRef(null)

  /* Trigger phase sequence when animData arrives ──────────────── */
  useEffect(() => {
    if (!animData) return

    setReel(buildReel(animData.items, animData.winnerId))
    setPhase(P.SHAKING)

    const total = SHAKE_MS + BURST_MS + REEL_MS + 400
    const t1 = setTimeout(() => setPhase(P.BURSTING),  SHAKE_MS)
    const t2 = setTimeout(() => setPhase(P.REELING),   SHAKE_MS + BURST_MS)
    const t3 = setTimeout(() => setPhase(P.REVEALING), total)
    const t4 = setTimeout(() => { onFinish?.() },       total + 1200)

    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [animData])   // eslint-disable-line react-hooks/exhaustive-deps

  /* Scroll reel to winner — exact position, no jitter ─────────── */
  useEffect(() => {
    if (phase !== P.REELING || !trackRef.current || !reel.length) return
    const el = trackRef.current
    el.style.transition = 'none'
    el.style.transform  = 'translateX(0)'
    el.getBoundingClientRect()                    // force reflow

    const containerW = el.parentElement.offsetWidth
    const centerOff  = containerW / 2 - CARD_W / 2
    const targetX    = -(WINNER_IDX * CARD_W - centerOff)   // exact, no jitter

    requestAnimationFrame(() => {
      el.style.transition = `transform ${REEL_MS}ms cubic-bezier(0.05, 0.92, 0.15, 1)`
      el.style.transform  = `translateX(${targetX}px)`
    })
  }, [phase, reel])

  const winner       = reel[WINNER_IDX]
  const winnerRarity = winner?.product?.rarity || 'common'
  const winnerColor  = RARITY_COLORS[winnerRarity]

  const items       = box?.items || []
  const totalWeight = items.reduce((s, i) => s + i.weight, 0)

  /* ── IDLE ──────────────────────────────────────────────────── */
  if (phase === P.IDLE) {
    return (
      <div className="scene-idle">
        <h3 className="scene-section-title">{t('boxDetail.possibleItems')}</h3>
        <div className="scene-items-grid">
          {[...items]
            .sort((a, b) => b.product.retail_value - a.product.retail_value)
            .map(item => {
              const prob  = totalWeight > 0 ? (item.weight / totalWeight * 100) : 0
              const color = RARITY_COLORS[item.product.rarity] || RARITY_COLORS.common
              return (
                <div
                  key={item.id}
                  className="scene-item-card"
                  style={{ '--rc': color }}
                >
                  <div className="scene-item-img">
                    <img src={item.product.image_url} alt={item.product.name} loading="lazy" />
                    <span className="scene-item-rarity-chip" style={{ color, borderColor: color }}>
                      {t(`rarity.${item.product.rarity}`)}
                    </span>
                  </div>
                  <div className="scene-item-body">
                    <span className="scene-item-name">{item.product.name}</span>
                    <div className="scene-item-row">
                      <span className="scene-item-value">${item.product.retail_value.toFixed(2)}</span>
                      <span className="scene-item-pct">{prob.toFixed(1)}%</span>
                    </div>
                    <div className="scene-prob-track">
                      <div
                        className="scene-prob-fill"
                        style={{
                          width: `${Math.min(prob * 3, 100)}%`,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  /* ── SHAKING ───────────────────────────────────────────────── */
  if (phase === P.SHAKING) {
    return (
      <div className="scene-stage">
        <div className="scene-shake-wrap">
          <div className="scene-glow-ring" />
          <img
            src={box.image_url}
            alt={box.name}
            className="scene-box-img scene-box-shake"
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="scene-particle"
              style={{
                '--angle': `${i * 30}deg`,
                '--delay': `${i * 0.04}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  /* ── BURSTING ──────────────────────────────────────────────── */
  if (phase === P.BURSTING) {
    return (
      <div className="scene-stage">
        <div className="scene-burst-wrap">
          <div className="scene-burst-ring  burst-ring-1" />
          <div className="scene-burst-ring  burst-ring-2" />
          <div className="scene-burst-ring  burst-ring-3" />
          <div className="scene-burst-ring  burst-ring-4" />
          <img
            src={box.image_url}
            alt={box.name}
            className="scene-box-img scene-box-burst"
          />
          <div className="scene-flash" />
        </div>
      </div>
    )
  }

  /* ── REELING ───────────────────────────────────────────────── */
  if (phase === P.REELING) {
    return (
      <div className="reel-wrapper">
        <div className="reel-marker" style={{ '--glow': winnerColor }} />
        <div className="reel-edge reel-edge-left" />
        <div className="reel-edge reel-edge-right" />
        <div className="reel-viewport">
          <div className="reel-track" ref={trackRef}>
            {reel.map((item, i) => {
              const rc = RARITY_COLORS[item?.product?.rarity || 'common']
              const isWinner = i === WINNER_IDX
              return (
                <div
                  key={i}
                  className={`reel-card${isWinner ? ' reel-card-winner' : ''}`}
                  style={{ '--rarity-color': rc }}
                >
                  <div className="reel-card-img">
                    <img
                      src={item?.product?.image_url}
                      alt={item?.product?.name}
                      loading="eager"
                    />
                  </div>
                  <div className="reel-card-info">
                    <span className="rarity-badge" style={{ color: rc }}>
                      {t(`rarity.${item?.product?.rarity || 'common'}`)}
                    </span>
                    <span className="reel-card-name">{item?.product?.name}</span>
                    <span className="reel-card-value">
                      ${item?.product?.retail_value?.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="reel-overlay-text">{t('animation.rolling')}</div>
      </div>
    )
  }

  /* ── REVEALING ─────────────────────────────────────────────── */
  if (phase === P.REVEALING) {
    return (
      <div className="scene-stage scene-stage-reveal">
        <div className="scene-reveal-wrap">
          {/* Star-burst particles */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="scene-star"
              style={{
                '--angle':  `${i * 15}deg`,
                '--color':  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                '--delay':  `${i * 0.03}s`,
                '--dist':   `${130 + (i % 4) * 35}px`,
              }}
            />
          ))}
          {/* Confetti pieces */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`c${i}`}
              className="scene-confetti"
              style={{
                '--angle': `${i * 22.5}deg`,
                '--color': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                '--delay': `${0.1 + i * 0.04}s`,
                '--dist':  `${80 + (i % 3) * 50}px`,
              }}
            />
          ))}
          {/* Reveal flash */}
          <div className="scene-reveal-flash" style={{ '--wc': winnerColor }} />
          {/* Winner card */}
          <div
            className="scene-winner-card"
            style={{ '--wc': winnerColor }}
          >
            <div className="scene-winner-glow" style={{ background: `radial-gradient(circle, ${winnerColor}33 0%, transparent 70%)` }} />
            <img
              src={winner?.product?.image_url}
              alt={winner?.product?.name}
              className="scene-winner-img"
            />
            <span className="scene-winner-rarity" style={{ color: winnerColor }}>
              ★ {t(`rarity.${winnerRarity}`).toUpperCase()}
            </span>
            <h3 className="scene-winner-name">{winner?.product?.name}</h3>
            <span className="scene-winner-brand">{winner?.product?.brand}</span>
            <span className="scene-winner-value" style={{ color: winnerColor }}>
              ${winner?.product?.retail_value?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
