import { useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/index'

export default function Verify() {
  const { t } = useI18n()
  const [form, setForm] = useState({
    server_seed: '',
    client_seed: '',
    nonce: '',
    box_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.post('/verify', {
        server_seed: form.server_seed.trim(),
        client_seed: form.client_seed.trim(),
        nonce: parseInt(form.nonce, 10),
        box_id: parseInt(form.box_id, 10),
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.error || t('verify.failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError('')
    setForm({ server_seed: '', client_seed: '', nonce: '', box_id: '' })
  }

  const steps = t('verify.steps')   // returns the array

  return (
    <div className="page verify-page">
      <h1 className="page-title">{t('verify.title')}</h1>
      <p className="page-desc">{t('verify.desc')}</p>

      <div className="verify-form-card">
        <h2>{t('verify.enterProof')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="verify-grid">
            <div className="form-group">
              <label>{t('verify.serverSeed')}</label>
              <input
                className="input"
                name="server_seed"
                placeholder={t('verify.serverSeedPlaceholder')}
                value={form.server_seed}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>{t('verify.clientSeed')}</label>
              <input
                className="input"
                name="client_seed"
                placeholder={t('verify.clientSeedPlaceholder')}
                value={form.client_seed}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>{t('verify.nonce')}</label>
              <input
                className="input"
                name="nonce"
                type="number"
                min="0"
                placeholder={t('verify.noncePlaceholder')}
                value={form.nonce}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('verify.boxId')}</label>
              <input
                className="input"
                name="box_id"
                type="number"
                min="1"
                placeholder={t('verify.boxIdPlaceholder')}
                value={form.box_id}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('verify.verifying') : t('verify.verifyBtn')}
            </button>
            {result && (
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                {t('verify.reset')}
              </button>
            )}
          </div>
        </form>
      </div>

      {result && <VerifyResult result={result} />}

      <div className="how-it-works-verify">
        <h3>{t('verify.howItWorks')}</h3>
        <div className="verify-steps">
          {Array.isArray(steps) && steps.map((stepText, i) => (
            <div key={i} className="verify-step">
              <div className="verify-step-num">{i + 1}</div>
              <p
                className="verify-step-text"
                dangerouslySetInnerHTML={{ __html: stepText }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerifyResult({ result }) {
  const { t } = useI18n()
  const winner = result.winning_item

  return (
    <div className="verify-result" style={{ marginBottom: '2rem' }}>
      <div className="verify-result-header">
        <span className="verify-check">✅</span>
        <div>
          <div className="verify-result-title">{t('verify.successTitle')}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {t('verify.successDesc')}
          </div>
        </div>
      </div>

      <div className="verify-result-body">
        <div className="verify-item">
          <span className="verify-item-label">{t('verify.serverSeedHash')}</span>
          <span className="verify-item-value">{result.server_seed_hash}</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">{t('verify.resultFloat')}</span>
          <span className="verify-item-value">{result.result_float.toFixed(10)}</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">{t('verify.resultPct')}</span>
          <span className="verify-item-value">{result.result_percentage}%</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">{t('verify.winProb')}</span>
          <span className="verify-item-value">{result.winning_probability_pct}%</span>
        </div>
      </div>

      {winner && (
        <div className="verify-winner-card">
          <img
            src={winner.image_url}
            alt={winner.name}
            className="verify-winner-img"
          />
          <div>
            <div className="verify-winner-name">{winner.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {winner.brand} · <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {winner.rarity}
              </span>
            </div>
            <div className="verify-winner-value">
              {t('verify.retailValue')} <strong>${winner.retail_value.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
