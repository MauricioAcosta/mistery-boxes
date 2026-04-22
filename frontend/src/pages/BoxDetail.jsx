import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SlotReel from '../components/SlotReel'

const RARITY = {
  common:    { color: '#94a3b8', label: 'Común'      },
  uncommon:  { color: '#22c55e', label: 'Poco común' },
  rare:      { color: '#3b82f6', label: 'Raro'       },
  epic:      { color: '#a855f7', label: 'Épico'      },
  legendary: { color: '#f59e0b', label: 'Legendario' },
}

export default function BoxDetail() {
  const { id } = useParams()
  const { user, wallet, refreshWallet } = useAuth()
  const navigate = useNavigate()

  const [box, setBox]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [opening, setOpening]   = useState(false)
  const [openData, setOpenData] = useState(null)   // respuesta API → activa SlotReel
  const [error, setError]       = useState('')
  const [payMethod, setPayMethod] = useState('usd')

  useEffect(() => {
    api.get(`/boxes/${id}`)
      .then(r => setBox(r.data))
      .catch(() => setError('Caja no encontrada.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleOpen = async () => {
    if (!user) { navigate('/login'); return }
    if (opening || openData) return
    setError(''); setOpening(true)
    try {
      const r = await api.post(`/boxes/${id}/open`, { payment_method: payMethod })
      setOpenData(r.data)
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al abrir la caja.')
    } finally { setOpening(false) }
  }

  const handleClose = () => setOpenData(null)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!box)   return <div className="page"><div className="empty-state">{error || 'Caja no encontrada.'}</div></div>

  const balance      = parseFloat(wallet?.balance || 0)
  const coins        = wallet?.coins || 0
  const canAffordUsd = balance >= box.price
  const canAffordCoins = box.price_coins != null && coins >= box.price_coins
  const canAfford    = payMethod === 'coins' ? canAffordCoins : canAffordUsd

  const btnLabel = () => {
    if (opening)  return '⏳ Procesando…'
    if (!user)    return '🔐 Inicia sesión para jugar'
    if (payMethod === 'coins') {
      if (!box.price_coins) return 'Sin opción de monedas'
      if (!canAffordCoins)  return `Faltan 🪙 ${box.price_coins - coins}`
      return `🎰 ¡Abrir Caja! — 🪙 ${box.price_coins}`
    }
    if (!canAffordUsd) return `Faltan $${(box.price - balance).toFixed(2)}`
    return `🎰 ¡Abrir Caja! — $${box.price.toFixed(2)}`
  }

  const items       = box.items || []
  const totalWeight = items.reduce((s, i) => s + i.weight, 0)

  return (
    <>
      <div className="page box-detail-page">

        {/* ── Hero de la caja ───────────────────────────────── */}
        <div className="bd-hero">
          <div className="bd-hero-img-wrap">
            <div className="bd-hero-glow" />
            <img src={box.image_url} alt={box.name} className="bd-hero-img"
              onError={e => { e.target.src = '/placeholder.svg' }} />
          </div>

          <div className="bd-hero-info">
            <h1 className="bd-hero-name">{box.name}</h1>
            {box.description && <p className="bd-hero-desc">{box.description}</p>}

            <div className="bd-stats">
              <div className="bd-stat">
                <span className="bd-stat-label">Precio</span>
                <span className="bd-stat-val price">${box.price.toFixed(2)}</span>
              </div>
              <div className="bd-stat">
                <span className="bd-stat-label">RTP</span>
                <span className="bd-stat-val rtp">{box.rtp_pct}%</span>
              </div>
              <div className="bd-stat">
                <span className="bd-stat-label">Valor esperado</span>
                <span className="bd-stat-val">${box.expected_value.toFixed(2)}</span>
              </div>
              <div className="bd-stat">
                <span className="bd-stat-label">Aperturas</span>
                <span className="bd-stat-val">{box.total_openings.toLocaleString()}</span>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Selector de pago */}
            {user && box.price_coins && (
              <div className="payment-selector">
                <button className={`payment-opt${payMethod === 'usd' ? ' active' : ''}`}
                  onClick={() => setPayMethod('usd')}>
                  💵 ${box.price.toFixed(2)}
                </button>
                <button className={`payment-opt${payMethod === 'coins' ? ' active' : ''}`}
                  onClick={() => setPayMethod('coins')}>
                  🪙 {box.price_coins}
                </button>
              </div>
            )}

            <button className="btn btn-primary bd-open-btn"
              onClick={handleOpen}
              disabled={opening || (user && !canAfford)}>
              {btnLabel()}
            </button>

            {user && !canAfford && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: '0.6rem', width: '100%' }}
                onClick={() => navigate('/wallet')}>
                💳 Recargar Billetera
              </button>
            )}
          </div>
        </div>

        {/* ── Posibles premios ─────────────────────────────── */}
        <div className="bd-items-section">
          <h2 className="bd-items-title">🎁 Posibles Premios</h2>
          <div className="bd-items-grid">
            {[...items]
              .sort((a, b) => b.product.retail_value - a.product.retail_value)
              .map(item => {
                const prob  = totalWeight > 0 ? item.weight / totalWeight * 100 : 0
                const rar   = RARITY[item.product.rarity] || RARITY.common
                return (
                  <div key={item.id} className="bd-item-card" style={{ '--rc': rar.color }}>
                    <div className="bd-item-img">
                      <img src={item.product.image_url} alt={item.product.name} loading="lazy"
                        onError={e => { e.target.src = '/placeholder.svg' }} />
                      <span className="bd-item-rarity" style={{ color: rar.color }}>{rar.label}</span>
                    </div>
                    <div className="bd-item-body">
                      <span className="bd-item-name">{item.product.name}</span>
                      <div className="bd-item-row">
                        <span className="bd-item-val">${item.product.retail_value.toFixed(2)}</span>
                        <span className="bd-item-pct">{prob.toFixed(1)}%</span>
                      </div>
                      <div className="bd-prob-track">
                        <div className="bd-prob-fill"
                          style={{ width: `${Math.min(prob * 4, 100)}%`, background: rar.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Overlay de apertura */}
      {openData && (
        <SlotReel box={box} opening={openData} onClose={handleClose} />
      )}
    </>
  )
}
