import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
  const [searchParams]            = useSearchParams()
  const navigate                  = useNavigate()
  const token                     = searchParams.get('token') || ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer. El enlace puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-icon">⚠️</span>
            <h1>Enlace inválido</h1>
            <p className="muted">Este enlace de recuperación no es válido.</p>
          </div>
          <p className="auth-footer"><Link to="/forgot-password">Solicitar un nuevo enlace</Link></p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-icon">✅</span>
            <h1>¡Contraseña actualizada!</h1>
            <p className="muted">Serás redirigido al inicio de sesión en unos segundos…</p>
          </div>
          <p className="auth-footer"><Link to="/login">Ir al login ahora</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🔐</span>
          <h1>Nueva contraseña</h1>
          <p className="muted">Elige una contraseña segura de al menos 8 caracteres.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input
              className="input"
              type="password"
              placeholder="8+ caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input
              className="input"
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
