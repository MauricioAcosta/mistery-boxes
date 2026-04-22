import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError(''); setMsg('')
    try {
      const r = await api.post('/auth/forgot-password', { email })
      setMsg(r.data.message)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el correo. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🔑</span>
          <h1>¿Olvidaste tu contraseña?</h1>
          <p className="muted">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
        </div>

        {msg ? (
          <div className="reset-success">
            <span className="reset-success-icon">📬</span>
            <p>{msg}</p>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Revisa tu bandeja de entrada y también la carpeta de spam.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>Correo electrónico</label>
              <input
                className="input"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
