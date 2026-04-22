import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import RouletteWheel from '../components/RouletteWheel'
import PrizeModal from '../components/PrizeModal'

const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

export default function BoxDetail() {
  const { id } = useParams()
  const { user, wallet, refreshWallet } = useAuth()
  const navigate = useNavigate()

  const [box, setBox]                 = useState(null)
  const [loading, setLoading]         = useState(true)
  const [opening, setOpening]         = useState(false)
  const [winnerItemId, setWinnerItemId] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)
  const [currentOpening, setCurrentOpening] = useState(null)
  const [error, setError]             = useState('')
  const [paymentMethod, setPaymentMethod] = useState('usd')
  const scrollYRef = useRef(0)
  const spinning = winnerItemId != null

  useEffect(() => {
    api.get(`/boxes/${id}`)
      .then(res => setBox(res.data))
      .catch(() => setError('Caja no encontrada.'))
      .finally(() => setLoading(false))
  }, [id])

  // Scroll lock (works on iOS too)
  useEffect(() => {
    if (spinning) {
      scrollYRef.current = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollYRef.current}px`
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollYRef.current) window.scrollTo(0, scrollYRef.current)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [spinning])

  const handleOpen = async () => {
    if (!user) { navigate('/login'); return }
    if (opening || spinning) return
    setError('')
    setOpening(true)
    try {
      const res = await api.post(`/boxes/${id}/open`, { payment_method: paymentMethod })
      setPendingResult(res.data)
      setWinnerItemId(res.data.winner_box_item_id)
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al abrir la caja.')
    } finally {
      setOpening(false)
    }
  }

  const handleSpinComplete = () => {
    setWinnerItemId(null)
    setTimeout(() => {
      setCurrentOpening(pendingResult)
      setPendingResult(null)
    }, 300)
  }

  const handleModalClose = () => {
    setCurrentOpening(null)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!box)   return <div className="page"><div className="empty-state">{error || 'Caja no encontrada.'}</div></div>

  const balance       = parseFloat(wallet?.balance || 0)
  const coins         = wallet?.coins || 0
  const canAffordUsd  = balance >= box.price
  const canAffordCoins = box.price_coins != null && coins >= box.price_coins
  const canAfford     = paymentMethod === 'coins' ? canAffordCoins : canAffordUsd

  const btnLabel = () => {
    if (opening) return '⏳ Procesando…'
    if (spinning) return '🎰 Girando…'
    if (!user)   return '🔐 Inicia sesión para jugar'
    if (paymentMethod === 'coins') {
      if (!box.price_coins) return 'Sin opción de monedas'
      if (!canAffordCoins)  return `Faltan 🪙${box.price_coins - coins}`
      return `🎰 ¡Abrir Caja! — 🪙${box.price_coins}`
    }
    if (!canAffordUsd) return `Faltan $${(box.price - balance).toFixed(2)}`
    return `🎰 ¡Abrir Caja! — $${box.price.toFixed(2)}`
  }

  const items = box.items || []
  const totalWeight = items.reduce((s, i) => s + i.weight, 0)

  return (
    <>
      {/* Fullscreen spin overlay on mobile */}
      {spinning && <div className="spin-overlay" />}

      <div className={`page box-detail-page${spinning ? ' box-detail-page--spinning' : ''}`}>

        {/* ── Layout: roulette + panel ───────────────────────── */}
        <div className="box-detail-layout">

          {/* Roulette wheel — ALWAYS visible at top on mobile */}
          <div className="box-detail-wheel">
            <RouletteWheel
              items={items}
              winnerItemId={winnerItemId}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          {/* Info panel */}
          <div className="box-detail-panel">
            <img src={box.image_url} alt={box.name} className="box-detail-img" />
            <h1 className="box-detail-name">{box.name}</h1>
            {box.description && <p className="box-detail-desc muted">{box.description}</p>}

            <div className="box-detail-stats">
              <div className="stat-block">
                <span className="stat-block-label">Precio</span>
                <span className="stat-block-value price">${box.price.toFixed(2)}</span>
              </div>
              <div className="stat-block">
                <span className="stat-block-label">RTP</span>
                <span className="stat-block-value rtp">{box.rtp_pct}%</span>
              </div>
              <div className="stat-block">
                <span className="stat-block-label">Valor esperado</span>
                <span className="stat-block-value">${box.expected_value.toFixed(2)}</span>
              </div>
              <div className="stat-block">
                <span className="stat-block-label">Aperturas</span>
                <span className="stat-block-value">{box.total_openings.toLocaleString()}</span>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Payment selector */}
            {user && !spinning && box.price_coins && (
              <div className="payment-selector">
                <button className={`payment-opt${paymentMethod === 'usd' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('usd')}>
                  💵 ${box.price.toFixed(2)}
                </button>
                <button className={`payment-opt${paymentMethod === 'coins' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('coins')}>
                  🪙 {box.price_coins}
                </button>
              </div>
            )}

            <button
              className={`btn btn-primary btn-open${spinning ? ' btn-open--spinning' : ''}`}
              onClick={handleOpen}
              disabled={opening || spinning || (user && !canAfford)}
            >
              {btnLabel()}
            </button>

            {user && !canAfford && !spinning && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }}
                onClick={() => navigate('/wallet')}>
                💳 Recargar Billetera
              </button>
            )}
          </div>
        </div>

        {/* ── Possible items grid ─────────────────────────────── */}
        {!spinning && (
          <div className="scene-idle" style={{ marginTop: '2.5rem' }}>
            <h3 className="scene-section-title">Posibles Premios</h3>
            <div className="scene-items-grid">
              {[...items]
                .sort((a, b) => b.product.retail_value - a.product.retail_value)
                .map(item => {
                  const prob  = totalWeight > 0 ? (item.weight / totalWeight * 100) : 0
                  const color = RARITY_COLORS[item.product.rarity] || RARITY_COLORS.common
                  return (
                    <div key={item.id} className="scene-item-card" style={{ '--rc': color }}>
                      <div className="scene-item-img">
                        <img src={item.product.image_url} alt={item.product.name}
                          loading="lazy"
                          onError={e => { e.target.src = '/placeholder.svg' }} />
                        <span className="scene-item-rarity-chip" style={{ color, borderColor: color }}>
                          {item.product.rarity}
                        </span>
                      </div>
                      <div className="scene-item-body">
                        <span className="scene-item-name">{item.product.name}</span>
                        <div className="scene-item-row">
                          <span className="scene-item-value">${item.product.retail_value.toFixed(2)}</span>
                          <span className="scene-item-pct">{prob.toFixed(1)}%</span>
                        </div>
                        <div className="scene-prob-track">
                          <div className="scene-prob-fill"
                            style={{ width: `${Math.min(prob * 3, 100)}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {currentOpening && (
        <PrizeModal opening={currentOpening} onClose={handleModalClose} />
      )}
    </>
  )
}
