import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'

export default function Register() {
  const { register } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(form.username, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || t('auth.registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🎁</span>
          <h1>{t('auth.createAccount')}</h1>
          <p className="muted">{t('auth.startOpening')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>{t('auth.username')}</label>
            <input
              className="input"
              type="text"
              placeholder={t('auth.usernamePlaceholder')}
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              className="input"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              className="input"
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
          </button>
        </form>

        <p className="auth-footer">
          {t('auth.alreadyAccount')} <Link to="/login">{t('auth.signInLink')}</Link>
        </p>
      </div>
    </div>
  )
}
