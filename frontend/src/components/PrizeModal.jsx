import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'

const RARITY_COLORS = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export default function PrizeModal({ opening, onClose }) {
  const { refreshWallet } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showShip, setShowShip] = useState(false)
  const [shipForm, setShipForm] = useState({ full_name: '', address: '', city: '', country: '', postal_code: '' })
  const [err, setErr] = useState('')

  if (!opening) return null
  const { won, opening_id, proof } = opening
  const rarity = won.rarity || 'common'
  const rarityColor = RARITY_COLORS[rarity]

  const handleExchange = async () => {
    setLoading(true)
    setErr('')
    try {
      const res = await api.post('/exchange', { opening_id })
      setResult({ type: 'exchange', amount: res.data.exchange_amount })
      refreshWallet()
    } catch (e) {
      setErr(e.response?.data?.error || t('prize.exchangeFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleShip = async e => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await api.post('/ship', { opening_id, ...shipForm })
      setResult({ type: 'ship' })
    } catch (e) {
      setErr(e.response?.data?.error || t('prize.shipFailed'))
    } finally {
      setLoading(false)
    }
  }

  const shipFields = ['full_name', 'address', 'city', 'country', 'postal_code']
  const fieldLabels = t('prize.fields')   // returns the object

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prize-modal" onClick={e => e.stopPropagation()}>

        {result ? (
          <div className="prize-result">
            {result.type === 'exchange' ? (
              <>
                <div className="result-icon">💰</div>
                <h2>+${result.amount.toFixed(2)} {t('prize.walletCredited')}</h2>
                <p className="muted">{t('prize.commission')}</p>
              </>
            ) : (
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
        ) : (
          <>
            <h2 className="prize-modal-title">{t('prize.title')}</h2>

            <div className="prize-showcase" style={{ '--rarity': rarityColor }}>
              <img src={won.image_url} alt={won.name} className="prize-img" />
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

            {!showShip ? (
              <div className="prize-actions">
                <button className="btn btn-primary" onClick={handleExchange} disabled={loading}>
                  {loading
                    ? t('prize.processing')
                    : t('prize.exchangeBtn', { amount: (won.retail_value * 0.9).toFixed(2) })}
                </button>
                <button className="btn btn-outline" onClick={() => setShowShip(true)} disabled={loading}>
                  {t('prize.shipBtn')}
                </button>
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
            ) : (
              <form className="ship-form" onSubmit={handleShip}>
                <h4>{t('prize.shippingAddress')}</h4>
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
                    {loading ? t('prize.submitting') : t('prize.confirmShipment')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowShip(false)}>
                    {t('prize.back')}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
