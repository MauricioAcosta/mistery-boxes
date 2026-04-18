import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const RARITY_COLORS = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export default function PrizeModal({ opening, onClose }) {
  const { refreshWallet } = useAuth()
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
      setErr(e.response?.data?.error || 'Exchange failed')
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
      setErr(e.response?.data?.error || 'Shipment request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prize-modal" onClick={e => e.stopPropagation()}>

        {result ? (
          <div className="prize-result">
            {result.type === 'exchange' ? (
              <>
                <div className="result-icon">💰</div>
                <h2>+${result.amount.toFixed(2)} added to wallet!</h2>
                <p className="muted">Commission of 10% was applied.</p>
              </>
            ) : (
              <>
                <div className="result-icon">📦</div>
                <h2>Shipment requested!</h2>
                <p className="muted">We'll email you tracking details within 24 hours.</p>
              </>
            )}
            <button className="btn btn-primary" onClick={() => { onClose(); navigate('/history') }}>
              View History
            </button>
          </div>
        ) : (
          <>
            <h2 className="prize-modal-title">You won!</h2>

            <div className="prize-showcase" style={{ '--rarity': rarityColor }}>
              <img src={won.image_url} alt={won.name} className="prize-img" />
              <span className="prize-rarity-label" style={{ color: rarityColor }}>
                ★ {rarity.toUpperCase()}
              </span>
              <h3 className="prize-name">{won.name}</h3>
              <p className="prize-brand">{won.brand}</p>
              <p className="prize-retail">Retail value: <strong>${won.retail_value.toFixed(2)}</strong></p>
            </div>

            {err && <p className="error-msg">{err}</p>}

            {!showShip ? (
              <div className="prize-actions">
                <button className="btn btn-primary" onClick={handleExchange} disabled={loading}>
                  {loading ? 'Processing…' : `Exchange for $${(won.retail_value * 0.9).toFixed(2)}`}
                </button>
                <button className="btn btn-outline" onClick={() => setShowShip(true)} disabled={loading}>
                  Ship to me (free)
                </button>
                <div className="prize-proof">
                  <details>
                    <summary>Provably Fair Proof</summary>
                    <div className="proof-grid">
                      <span>Server seed</span><code>{proof.server_seed}</code>
                      <span>Client seed</span><code>{proof.client_seed}</code>
                      <span>Nonce</span><code>{proof.nonce}</code>
                      <span>Result</span><code>{proof.result_float.toFixed(8)}</code>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              <form className="ship-form" onSubmit={handleShip}>
                <h4>Shipping Address</h4>
                {['full_name', 'address', 'city', 'country', 'postal_code'].map(field => (
                  <input
                    key={field}
                    className="input"
                    placeholder={field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    value={shipForm[field]}
                    onChange={e => setShipForm(p => ({ ...p, [field]: e.target.value }))}
                    required
                  />
                ))}
                <div className="ship-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Submitting…' : 'Confirm Shipment'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowShip(false)}>
                    Back
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
