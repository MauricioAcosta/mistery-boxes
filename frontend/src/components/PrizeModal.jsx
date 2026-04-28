import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'

const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#34d399',
  rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24',
}

const EXCHANGE_RATE  = 0.70
const SHIPPING_COST  = 20.00

export default function PrizeModal({ opening, onClose }) {
  const { setWallet } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [showShip, setShowShip] = useState(false)
  const [shipForm, setShipForm] = useState({
    full_name: '', address: '', city: '', country: '', postal_code: '',
  })
  const [err, setErr] = useState('')

  if (!opening) return null
  const { won, opening_id, proof } = opening
  const rarity       = won.rarity || 'common'
  const rarityColor  = RARITY_COLORS[rarity]
  const exchangeAmt  = (won.retail_value * EXCHANGE_RATE).toFixed(2)

  /* ── handlers ──────────────────────────────────────────── */
  const handleExchange = async () => {
    setLoading(true); setErr('')
    try {
      const res = await api.post('/exchange', { opening_id })
      setWallet(w => ({ ...w, balance: res.data.wallet_balance }))
      setResult({ type: 'exchange', amount: res.data.exchange_amount })
    } catch (e) {
      setErr(e.response?.data?.error || t('prize.exchangeFailed'))
    } finally { setLoading(false) }
  }

  const handleShip = async e => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const res = await api.post('/ship', { opening_id, ...shipForm })
      setWallet(w => ({ ...w, balance: res.data.wallet_balance }))
      setResult({ type: 'ship' })
    } catch (e) {
      setErr(e.response?.data?.error || t('prize.shipFailed'))
    } finally { setLoading(false) }
  }

  const shipFields  = ['full_name', 'address', 'city', 'country', 'postal_code']
  const fieldLabels = t('prize.fields')

  /* ── result screen ─────────────────────────────────────── */
  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal prize-modal" onClick={e => e.stopPropagation()}>
          <div className="prize-result">
            {result.type === 'exchange' && (
              <>
                <div className="result-icon">💰</div>
                <h2>{t('prize.exchangeSuccess')}</h2>
                <p className="prize-result-amount">+${result.amount.toFixed(2)}</p>
                <p className="muted">{t('prize.walletCredited')}</p>
              </>
            )}
            {result.type === 'ship' && (
              <>
                <div className="result-icon">📦</div>
                <h2>{t('prize.shipSuccess')}</h2>
                <p className="muted">{t('prize.shipDesc')}</p>
              </>
            )}
            <button className="btn btn-primary" onClick={() => { onClose(); navigate('/history') }}>
              {t('prize.viewHistory')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── ship address form ─────────────────────────────────── */
  if (showShip) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal prize-modal" onClick={e => e.stopPropagation()}>
          <h2 className="prize-modal-title">{t('prize.shippingAddress')}</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            {t('prize.shipOptionCost', { cost: SHIPPING_COST.toFixed(2) })}
          </p>
          {err && <p className="error-msg">{err}</p>}
          <form className="ship-form" onSubmit={handleShip}>
            {shipFields.map(field => (
              <input
                key={field}
                className="input"
                placeholder={fieldLabels?.[field] || field}
                value={shipForm[field]}
                onChange={e => setShipForm(p => ({ ...p, [field]: e.target.value }))}
                required
              />
            ))}
            <div className="ship-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('prize.submitting') : t('prize.confirmShipment', { cost: SHIPPING_COST.toFixed(2) })}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowShip(false)}>
                {t('prize.back')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  /* ── main prize options ────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prize-modal" onClick={e => e.stopPropagation()}>
        <h2 className="prize-modal-title">{t('prize.title')}</h2>
        <p className="prize-modal-subtitle muted">{t('prize.subtitle')}</p>

        {/* Product showcase */}
        <div className="prize-showcase" style={{ '--rarity': rarityColor }}>
          <img
            src={won.image_url}
            alt={won.name}
            className="prize-img"
            onError={e => { e.target.src = '/placeholder.svg' }}
          />
          <span className="prize-rarity-label" style={{ color: rarityColor }}>
            ★ {t(`rarity.${rarity}`).toUpperCase()}
          </span>
          <h3 className="prize-name">{won.name}</h3>
          <p className="prize-brand">{won.brand}</p>
          <p className="prize-retail">
            {t('prize.retailValue')} <strong>${won.retail_value.toFixed(2)}</strong>
          </p>
        </div>

        {err && <p className="error-msg">{err}</p>}

        <div className="prize-options">

          {/* Opción 1 — Canjear por créditos */}
          <div className="prize-option prize-option-sell" onClick={!loading ? handleExchange : undefined}>
            <span className="prize-option-badge">{t('prize.exchangeOptionBadge')}</span>
            <div className="prize-option-header">
              <span className="prize-option-title">{t('prize.exchangeOptionTitle')}</span>
              <span className="prize-option-amount sell-amount">+${exchangeAmt}</span>
            </div>
            <p className="prize-option-desc">
              {t('prize.exchangeOptionDesc')}
              <em> · {Math.round(EXCHANGE_RATE * 100)}% {t('prize.retailValue').replace(':', '')}</em>
            </p>
            <button className="btn btn-accent prize-option-btn" disabled={loading}>
              {loading ? t('prize.processing') : t('prize.exchangeBtn', { amount: exchangeAmt })}
            </button>
          </div>

          {/* Opción 2 — Envío físico */}
          <div className="prize-option" onClick={!loading ? () => setShowShip(true) : undefined}>
            <div className="prize-option-header">
              <span className="prize-option-title">{t('prize.shipOptionTitle')}</span>
              <span className="prize-option-cost">-${SHIPPING_COST.toFixed(2)}</span>
            </div>
            <p className="prize-option-desc">{t('prize.shipOptionDesc')}</p>
            <button className="btn btn-outline prize-option-btn" disabled={loading}>
              {t('prize.shipBtn')}
            </button>
          </div>

        </div>

        {/* Provably fair details */}
        <div className="prize-proof">
          <details>
            <summary>{t('prize.proof')}</summary>
            <div className="proof-grid">
              <span>{t('prize.serverSeed')}</span><code>{proof.server_seed}</code>
              <span>{t('prize.clientSeed')}</span><code>{proof.client_seed}</code>
              <span>{t('prize.nonce')}</span><code>{proof.nonce}</code>
              <span>{t('prize.result')}</span><code>{proof.result_float.toFixed(8)}</code>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
