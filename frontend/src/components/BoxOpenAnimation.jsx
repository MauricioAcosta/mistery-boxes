import { useRef, useEffect, useState } from 'react'

const CARD_WIDTH = 176   // px  (160 content + 16 gap)
const REEL_SIZE = 60     // total items in reel
const WINNER_IDX = 44    // winner lands at this position (leaves 15 visible after center)
const ANIM_DURATION = 5500  // ms

const RARITY_GLOW = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

function buildReel(items, winnerId) {
  if (!items.length) return []
  const reel = []
  for (let i = 0; i < REEL_SIZE; i++) {
    if (i === WINNER_IDX) {
      reel.push(items.find(it => it.id === winnerId) || items[0])
    } else {
      reel.push(items[Math.floor(Math.random() * items.length)])
    }
  }
  return reel
}

export default function BoxOpenAnimation({ items, winnerId, onFinish }) {
  const trackRef = useRef(null)
  const [reel] = useState(() => buildReel(items, winnerId))
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!trackRef.current || !reel.length) return

    // Force a reflow before animating so the initial position is applied
    trackRef.current.style.transition = 'none'
    trackRef.current.style.transform = 'translateX(0)'
    // eslint-disable-next-line no-unused-expressions
    trackRef.current.getBoundingClientRect()

    const containerWidth = trackRef.current.parentElement.offsetWidth
    const centerOffset = containerWidth / 2 - CARD_WIDTH / 2
    // Random ±30 px offset so the reel never lands perfectly centred — looks natural
    const jitter = (Math.random() - 0.5) * 60
    const targetX = -(WINNER_IDX * CARD_WIDTH - centerOffset + jitter)

    requestAnimationFrame(() => {
      setSpinning(true)
      trackRef.current.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(0.12, 0.9, 0.2, 1)`
      trackRef.current.style.transform = `translateX(${targetX}px)`
    })

    const timer = setTimeout(() => {
      setSpinning(false)
      setDone(true)
      onFinish?.()
    }, ANIM_DURATION + 200)

    return () => clearTimeout(timer)
  }, []) // run once on mount

  const winner = reel[WINNER_IDX]
  const rarity = winner?.product?.rarity || 'common'

  return (
    <div className={`reel-wrapper ${done ? 'reel-done' : ''}`}>
      {/* Centre marker */}
      <div
        className="reel-marker"
        style={{ '--glow': RARITY_GLOW[rarity] }}
      />

      <div className="reel-viewport">
        <div className="reel-track" ref={trackRef}>
          {reel.map((item, i) => (
            <div
              key={i}
              className={`reel-card ${done && i === WINNER_IDX ? 'reel-card--winner' : ''}`}
              style={{ '--rarity-color': RARITY_GLOW[item?.product?.rarity || 'common'] }}
            >
              <div className="reel-card-img">
                <img
                  src={item?.product?.image_url}
                  alt={item?.product?.name}
                  loading="eager"
                />
              </div>
              <div className="reel-card-info">
                <span
                  className="rarity-badge"
                  style={{ color: RARITY_GLOW[item?.product?.rarity || 'common'] }}
                >
                  {item?.product?.rarity}
                </span>
                <span className="reel-card-name">{item?.product?.name}</span>
                <span className="reel-card-value">${item?.product?.retail_value?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {spinning && (
        <div className="reel-overlay-text">Rolling…</div>
      )}
    </div>
  )
}
