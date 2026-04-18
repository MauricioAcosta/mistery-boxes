import { useState } from 'react'
import { api } from '../api/client'

export default function Verify() {
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
      setError(e.response?.data?.error || 'Verification failed. Check your inputs.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError('')
    setForm({ server_seed: '', client_seed: '', nonce: '', box_id: '' })
  }

  return (
    <div className="page verify-page">
      <h1 className="page-title">Provably Fair Verification</h1>
      <p className="page-desc">
        Every box opening is cryptographically verifiable. Enter the proof data
        from any opening to independently confirm the result was not manipulated.
        No account needed — anyone can verify any roll.
      </p>

      <div className="verify-form-card">
        <h2>Enter Opening Proof</h2>
        <form onSubmit={handleSubmit}>
          <div className="verify-grid">
            <div className="form-group">
              <label>Server Seed</label>
              <input
                className="input"
                name="server_seed"
                placeholder="64-char hex string"
                value={form.server_seed}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Client Seed</label>
              <input
                className="input"
                name="client_seed"
                placeholder="Your client seed"
                value={form.client_seed}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Nonce</label>
              <input
                className="input"
                name="nonce"
                type="number"
                min="0"
                placeholder="e.g. 0"
                value={form.nonce}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Box ID</label>
              <input
                className="input"
                name="box_id"
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={form.box_id}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : '🔍 Verify Opening'}
            </button>
            {result && (
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {result && <VerifyResult result={result} />}

      <div className="how-it-works-verify">
        <h3>How Provably Fair Works</h3>
        <div className="verify-steps">
          <div className="verify-step">
            <div className="verify-step-num">1</div>
            <p className="verify-step-text">
              Before you open a box, we commit to a <strong>server seed</strong> by showing you its
              SHA-256 hash. The actual seed is hidden until after the roll.
            </p>
          </div>
          <div className="verify-step">
            <div className="verify-step-num">2</div>
            <p className="verify-step-text">
              You provide a <strong>client seed</strong> (generated randomly or set by you).
              Combined with a sequential <strong>nonce</strong>, it ensures every roll is unique.
            </p>
          </div>
          <div className="verify-step">
            <div className="verify-step-num">3</div>
            <p className="verify-step-text">
              The result is computed as:{' '}
              <strong>HMAC-SHA256(server_seed, "client_seed:nonce")</strong>.
              The first 8 hex characters are converted to a float in [0, 1) that selects the prize.
            </p>
          </div>
          <div className="verify-step">
            <div className="verify-step-num">4</div>
            <p className="verify-step-text">
              After the roll, the raw <strong>server seed is revealed</strong>. You can hash it
              yourself to confirm it matches the hash shown before the roll — proving the outcome
              wasn't changed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyResult({ result }) {
  const winner = result.winning_item

  return (
    <div className="verify-result" style={{ marginBottom: '2rem' }}>
      <div className="verify-result-header">
        <span className="verify-check">✅</span>
        <div>
          <div className="verify-result-title">Verification Successful</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            This opening was fair and unmanipulated.
          </div>
        </div>
      </div>

      <div className="verify-result-body">
        <div className="verify-item">
          <span className="verify-item-label">Server Seed Hash</span>
          <span className="verify-item-value">{result.server_seed_hash}</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">Result Float</span>
          <span className="verify-item-value">{result.result_float.toFixed(10)}</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">Result Percentage</span>
          <span className="verify-item-value">{result.result_percentage}%</span>
        </div>
        <div className="verify-item">
          <span className="verify-item-label">Win Probability</span>
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
              {winner.brand} · <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{winner.rarity}</span>
            </div>
            <div className="verify-winner-value">Retail value: ${winner.retail_value.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
